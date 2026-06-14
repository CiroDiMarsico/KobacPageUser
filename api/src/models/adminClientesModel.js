const pool = require('../db/connection')

// ─── RANKING CLIENTES ─────────────────────────────────────────────────────────

const getTopClientes = async (rubro, period, orderBy = 'totalGastado') => {
    const intervalMap = { siempre: null, mes: '1 MONTH', semana: '1 WEEK' }
    const interval = intervalMap[period]
    const whereDate = interval ? `AND s.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})` : ''
    const whereRubro = rubro !== 'todos' ? `AND s.rubro = '${rubro}'` : ''

    const orderMap = {
        totalGastado: 'totalGastado DESC',
        cantidadPedidos: 'cantidadPedidos DESC',
        ticketPromedio: 'ticketPromedio DESC',
    }
    const order = orderMap[orderBy] ?? 'totalGastado DESC'

    const [rows] = await pool.query(`
        SELECT
            c.id,
            c.name                                          AS nombre,
            c.phone                                         AS telefono,
            COUNT(DISTINCT s.id)                            AS cantidadPedidos,
            COALESCE(SUM(s.total - s.discount_amount), 0)  AS totalGastado,
            COALESCE(AVG(s.total - s.discount_amount), 0)  AS ticketPromedio,
            MAX(s.created_at)                               AS ultimaCompra,
            GROUP_CONCAT(DISTINCT s.rubro ORDER BY s.rubro) AS rubros
        FROM clients c
        JOIN sales s ON s.client_id = c.id
        WHERE s.status = 'delivered'
          ${whereRubro}
          ${whereDate}
        GROUP BY c.id, c.name, c.phone
        ORDER BY ${order}
        LIMIT 20
    `)

    return rows.map(r => ({
        id:               r.id,
        nombre:           r.nombre,
        telefono:         r.telefono,
        cantidadPedidos:  Number(r.cantidadPedidos),
        totalGastado:     Number(r.totalGastado),
        ticketPromedio:   Number(r.ticketPromedio),
        ultimaCompra:     r.ultimaCompra,
        rubros:           r.rubros ? r.rubros.split(',') : [],
    }))
}

// ─── DETALLE DE UN CLIENTE ────────────────────────────────────────────────────

const getClienteDetalle = async (clienteId) => {
    // Info básica + stats globales
    const [[info]] = await pool.query(`
        SELECT
            c.id,
            c.name                                          AS nombre,
            c.phone                                         AS telefono,
            c.created_at                                    AS createdAt,
            COUNT(DISTINCT s.id)                            AS totalPedidos,
            COALESCE(SUM(s.total - s.discount_amount), 0)  AS totalGastado,
            COALESCE(AVG(s.total - s.discount_amount), 0)  AS ticketPromedio,
            MIN(s.created_at)                               AS primeraCompra,
            MAX(s.created_at)                               AS ultimaCompra,
            SUM(CASE WHEN s.rubro = 'bebidas' THEN 1 ELSE 0 END) AS pedidosBebidas,
            SUM(CASE WHEN s.rubro = 'vapes'   THEN 1 ELSE 0 END) AS pedidosVapes,
            SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelados
        FROM clients c
        LEFT JOIN sales s ON s.client_id = c.id
        WHERE c.id = ?
        GROUP BY c.id, c.name, c.phone, c.created_at
    `, [clienteId])

    if (!info) return null

    // Últimas 10 ventas
    const [ventas] = await pool.query(`
        SELECT
            s.id, s.rubro, s.status, s.total, s.discount_amount,
            s.shipping_price, s.location, s.created_at,
            GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS productos
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN variants v ON v.id = si.variant_id
        LEFT JOIN products p ON p.id = v.product_id
        WHERE s.client_id = ?
        GROUP BY s.id, s.rubro, s.status, s.total, s.discount_amount, s.shipping_price, s.location, s.created_at
        ORDER BY s.created_at DESC
        LIMIT 10
    `, [clienteId])

    // Productos más comprados
    const [topProductos] = await pool.query(`
        SELECT
            p.name          AS productName,
            SUM(si.quantity) AS totalUnidades,
            SUM(si.quantity * si.unit_price) AS totalGastado
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN variants v ON v.id = si.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE s.client_id = ? AND s.status = 'delivered'
        GROUP BY p.id, p.name
        ORDER BY totalUnidades DESC
        LIMIT 5
    `, [clienteId])

    return {
        id:             info.id,
        nombre:         info.nombre,
        telefono:       info.telefono,
        createdAt:      info.createdAt,
        totalPedidos:   Number(info.totalPedidos ?? 0),
        totalGastado:   Number(info.totalGastado ?? 0),
        ticketPromedio: Number(info.ticketPromedio ?? 0),
        primeraCompra:  info.primeraCompra,
        ultimaCompra:   info.ultimaCompra,
        pedidosBebidas: Number(info.pedidosBebidas ?? 0),
        pedidosVapes:   Number(info.pedidosVapes ?? 0),
        cancelados:     Number(info.cancelados ?? 0),
        ventas: ventas.map(v => ({
            id:             v.id,
            rubro:          v.rubro,
            status:         v.status,
            total:          Number(v.total),
            discountAmount: Number(v.discount_amount),
            shippingPrice:  Number(v.shipping_price),
            location:       v.location,
            createdAt:      v.created_at,
            productos:      v.productos ?? '—',
        })),
        topProductos: topProductos.map(p => ({
            productName:  p.productName,
            totalUnidades: Number(p.totalUnidades),
            totalGastado:  Number(p.totalGastado),
        })),
    }
}

// ─── STATS GENERALES ─────────────────────────────────────────────────────────

const getStatsGenerales = async () => {
    const [[stats]] = await pool.query(`
        SELECT
            COUNT(DISTINCT c.id)                                    AS totalClientes,
            COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN c.id END) AS clientesActivos,
            COALESCE(AVG(sub.totalGastado), 0)                      AS gastoPromedioPorCliente,
            COALESCE(AVG(sub.cantidadPedidos), 0)                   AS pedidosPromedioPorCliente
        FROM clients c
        LEFT JOIN sales s ON s.client_id = c.id
        LEFT JOIN (
            SELECT client_id,
                   SUM(total - discount_amount) AS totalGastado,
                   COUNT(*) AS cantidadPedidos
            FROM sales WHERE status = 'delivered' GROUP BY client_id
        ) sub ON sub.client_id = c.id
    `)

    // Retención: clientes con más de 1 pedido
    const [[retencion]] = await pool.query(`
        SELECT
            COUNT(*) AS totalConPedidos,
            SUM(CASE WHEN cantidadPedidos > 1 THEN 1 ELSE 0 END) AS recurrentes
        FROM (
            SELECT client_id, COUNT(*) AS cantidadPedidos
            FROM sales WHERE status = 'delivered' AND client_id IS NOT NULL
            GROUP BY client_id
        ) sub
    `)

    const recurrentes   = Number(retencion.recurrentes ?? 0)
    const totalConPedidos = Number(retencion.totalConPedidos ?? 0)
    const tasaRetencion = totalConPedidos > 0 ? Math.round((recurrentes / totalConPedidos) * 100) : 0

    return {
        totalClientes:             Number(stats.totalClientes ?? 0),
        clientesActivos:           Number(stats.clientesActivos ?? 0),
        gastoPromedioPorCliente:   Number(stats.gastoPromedioPorCliente ?? 0),
        pedidosPromedioPorCliente: Number(stats.pedidosPromedioPorCliente ?? 0),
        tasaRetencion,
        recurrentes,
    }
}

module.exports = { getTopClientes, getClienteDetalle, getStatsGenerales }
