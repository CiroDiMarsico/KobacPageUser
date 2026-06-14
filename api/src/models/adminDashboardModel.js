const pool = require('../db/connection')

// ─── DASHBOARD GANANCIAS ──────────────────────────────────────────────────────

const getSalesChart = async (rubro, period, date) => {
    let groupExpr, labelExpr, interval

    if (period === 'dias') {
        groupExpr = 'DATE(s.created_at)'
        labelExpr = "DATE_FORMAT(s.created_at, '%d/%m')"
        interval  = '14 DAY'
    } else if (period === 'semanas') {
        groupExpr = 'YEARWEEK(s.created_at, 1)'
        labelExpr = "CONCAT('S', WEEK(s.created_at, 1))"
        interval  = '8 WEEK'
    } else {
        groupExpr = "DATE_FORMAT(s.created_at, '%Y-%m')"
        labelExpr = "DATE_FORMAT(s.created_at, '%b')"
        interval  = '6 MONTH'
    }

    const [rows] = await pool.query(`
        SELECT
            ${labelExpr}                               AS label,
            SUM(s.total - s.discount_amount)           AS ventas,
            SUM(
                (SELECT COALESCE(SUM(si2.quantity * COALESCE(
                    (SELECT l.purchase_price FROM lots l WHERE l.variant_id = si2.variant_id ORDER BY l.created_at DESC LIMIT 1), 0
                )), 0) FROM sale_items si2 WHERE si2.sale_id = s.id)
            )                                          AS costo,
            SUM(s.total - s.discount_amount) - SUM(
                (SELECT COALESCE(SUM(si2.quantity * COALESCE(
                    (SELECT l.purchase_price FROM lots l WHERE l.variant_id = si2.variant_id ORDER BY l.created_at DESC LIMIT 1), 0
                )), 0) FROM sale_items si2 WHERE si2.sale_id = s.id)
            )                                          AS ganancia,
            COUNT(*)                                   AS cantidad
        FROM sales s
        WHERE s.rubro = ?
          AND s.status = 'delivered'
          AND s.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
        GROUP BY ${groupExpr}
        ORDER BY ${groupExpr} ASC
    `, [rubro])

    return rows.map(r => ({
        label:    r.label,
        ventas:   Number(r.ventas ?? 0),
        costo:    Number(r.costo ?? 0),
        ganancia: Number(r.ganancia ?? 0),
        cantidad: Number(r.cantidad ?? 0),
    }))
}

const getKPIs = async (rubro, period) => {
    const intervalMap = { dias: '30 DAY', semanas: '8 WEEK', mes: '6 MONTH' }
    const interval = intervalMap[period] ?? '30 DAY'

    const [[kpis]] = await pool.query(`
        SELECT
            COUNT(DISTINCT s.id)                              AS totalVentas,
            COALESCE(SUM(s.total - s.discount_amount), 0)    AS totalVentasAmt,
            COALESCE(SUM(
                (SELECT COALESCE(SUM(si2.quantity * COALESCE(
                    (SELECT l.purchase_price FROM lots l WHERE l.variant_id = si2.variant_id ORDER BY l.created_at DESC LIMIT 1), 0
                )), 0) FROM sale_items si2 WHERE si2.sale_id = s.id)
            ), 0)                                             AS totalCosto
        FROM sales s
        WHERE s.rubro = ?
          AND s.status = 'delivered'
          AND s.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
    `, [rubro])

    const [[stock]] = await pool.query(`
        SELECT
            COALESCE(SUM(l.remaining_quantity * l.purchase_price), 0) AS valorCompra,
            COALESCE(SUM(l.remaining_quantity * p.sale_price), 0)      AS valorVenta
        FROM lots l
        JOIN variants v ON v.id = l.variant_id
        JOIN products p ON p.id = v.product_id
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE (root.name = ? OR c.name = ?)
          AND l.remaining_quantity > 0
    `, [rubro, rubro])

    const totalVentas   = Number(kpis.totalVentasAmt)
    const totalCosto    = Number(kpis.totalCosto)
    const totalGanancia = totalVentas - totalCosto

    return {
        totalVentas,
        totalCosto,
        totalGanancia,
        cantidadVentas:   Number(kpis.totalVentas),
        stockValorCompra: Number(stock.valorCompra),
        stockValorVenta:  Number(stock.valorVenta),
    }
}

// ─── DASHBOARD PRODUCTOS ──────────────────────────────────────────────────────

// Productos más vendidos — con ganancia real por producto
const getTopProducts = async (rubro, period) => {
    const intervalMap = { siempre: null, mes: '1 MONTH', semana: '1 WEEK' }
    const interval = intervalMap[period]
    const whereDate = interval ? `AND s.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})` : ''

    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.name                                   AS productName,
            p.image,
            SUM(si.quantity)                         AS totalUnidades,
            SUM(si.quantity * si.unit_price)         AS totalVentas,
            COUNT(DISTINCT s.id)                     AS cantidadVentas,
            COALESCE(SUM(
                si.quantity * COALESCE((
                    SELECT l.purchase_price
                    FROM stock_movements sm
                    JOIN lots l ON l.id = sm.lot_id
                    WHERE sm.sale_item_id = si.id AND sm.type = 'out'
                    ORDER BY sm.id ASC LIMIT 1
                ), (
                    SELECT l.purchase_price FROM lots l
                    WHERE l.variant_id = si.variant_id
                    ORDER BY l.created_at DESC LIMIT 1
                ), 0)
            ), 0)                                    AS totalCosto
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN variants v ON v.id = si.variant_id
        JOIN products p ON p.id = v.product_id
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE s.rubro = ?
          AND s.status = 'delivered'
          ${whereDate}
        GROUP BY p.id, p.name, p.image
        ORDER BY totalUnidades DESC
        LIMIT 10
    `, [rubro])

    return rows.map(r => {
        const totalVentas   = Number(r.totalVentas)
        const totalCosto    = Number(r.totalCosto)
        const totalGanancia = totalVentas - totalCosto
        const margen        = totalVentas > 0 ? Math.round((totalGanancia / totalVentas) * 100) : 0
        return {
            id:             r.id,
            productName:    r.productName,
            image:          r.image,
            totalUnidades:  Number(r.totalUnidades),
            totalVentas,
            totalCosto,
            totalGanancia,
            margen,
            cantidadVentas: Number(r.cantidadVentas),
        }
    })
}

const getLowStock = async (rubro, threshold = 5) => {
    const [rows] = await pool.query(`
        SELECT
            p.name  AS productName,
            v.name  AS variantName,
            v.stock,
            COALESCE(
                (SELECT l.purchase_price FROM lots l WHERE l.variant_id = v.id ORDER BY l.created_at DESC LIMIT 1),
                0
            ) AS lastPrice
        FROM variants v
        JOIN products p ON p.id = v.product_id
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE (root.name = ? OR c.name = ?)
          AND v.is_active = TRUE
          AND v.stock <= ?
        ORDER BY v.stock ASC, p.name ASC
    `, [rubro, rubro, threshold])

    return rows.map(r => ({
        productName: r.productName,
        variantName: r.variantName,
        stock:       Number(r.stock),
        lastPrice:   Number(r.lastPrice),
    }))
}

const getLastPrices = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT
            p.name  AS productName,
            v.name  AS variantName,
            l.purchase_price,
            l.created_at
        FROM lots l
        JOIN variants v ON v.id = l.variant_id
        JOIN products p ON p.id = v.product_id
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE (root.name = ? OR c.name = ?)
        ORDER BY l.created_at DESC
        LIMIT 20
    `, [rubro, rubro])

    return rows.map(r => ({
        productName:   r.productName,
        variantName:   r.variantName,
        purchasePrice: Number(r.purchase_price),
        date:          r.created_at,
    }))
}

module.exports = { getSalesChart, getKPIs, getTopProducts, getLowStock, getLastPrices }
