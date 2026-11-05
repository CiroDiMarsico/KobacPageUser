const pool = require('../db/connection')
const reservaModel = require('./reservaModel')

// ─── helpers ──────────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const buildWeekCode = (date = new Date()) => {
    // Usar año ISO para que semanas que caen entre dos meses/años sean únicas
    // Ej: semana 1 de 2025 puede empezar en diciembre 2024 → usamos el año de la semana ISO
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const isoYear = d.getUTCFullYear()
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${isoYear}-W${week}`
}

// ─── armar ventas desde rows ──────────────────────────────────────────────────
const buildSales = (rows) => {
    const map = {}
    const sales = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                rubro: row.rubro,
                isWholesale: Boolean(row.is_wholesale),
                status: row.status,
                cancelReason: row.cancel_reason,
                total: Number(row.total),
                shippingPrice: Number(row.shipping_price),
                location: row.location,
                scheduledFor: row.scheduled_for ?? null,
                discountAmount: Number(row.discount_amount),
                discountCode: row.discount_code ?? null,
                exchangeRate: row.exchange_rate ? Number(row.exchange_rate) : null,
                weekCode: row.week_code,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                departureAt: row.departure_at,
                arrivedAt: row.arrived_at,
                clientName: row.client_name,
                clientPhone: row.client_phone,
                payments: [],
                items: [],
                costTotal: 0,
                gainTotal: 0,
            }
            sales.push(map[row.id])
        }

        const sale = map[row.id]

        if (row.item_id && !sale.items.find(i => i.id === row.item_id)) {
            sale.items.push({
                id: row.item_id,
                variantId: row.variant_id,
                variantName: row.variant_name,
                productName: row.product_name,
                promoId: row.promo_id,
                promoName: row.promo_name,
                quantity: row.item_quantity,
                unitPrice: Number(row.unit_price),
                purchasePrice: Number(row.purchase_price ?? 0),
                discountAmount: Number(row.discount_amount),
                discountCode: row.discount_code ?? null,
            })
        }
    }

    // ganancia = total venta (sin envío, sin descuento) - costo
    // el envío lo abona el cliente y se lo queda el cadete, no entra en ganancia
    sales.forEach(sale => {
        sale.costTotal = sale.items.reduce((acc, i) => acc + i.purchasePrice, 0)
        sale.gainTotal = sale.total - sale.costTotal
    })

    return sales
}

// ─── query base ───────────────────────────────────────────────────────────────
const BASE_QUERY = `
    SELECT
        s.id, s.rubro, s.is_wholesale, s.status, s.cancel_reason, s.total,
        s.shipping_price, s.location, s.discount_amount, s.week_code,
        s.created_at, s.updated_at, s.departure_at, s.arrived_at, s.scheduled_for,
        s.exchange_rate,
        s.discount_amount,
        dc.code AS discount_code,
        c.name  AS client_name,
        c.phone AS client_phone,
        si.id            AS item_id,
        si.variant_id,
        si.promo_id,
        si.quantity      AS item_quantity,
        si.unit_price,
        v.name           AS variant_name,
        p.name           AS product_name,
        pr.name          AS promo_name,
        (
            SELECT COALESCE(SUM(sm.quantity * l.purchase_price), 0)
            FROM stock_movements sm
            JOIN lots l ON l.id = sm.lot_id
            WHERE sm.sale_item_id = si.id
            AND sm.type = 'out'
            AND sm.reason = 'sale'
        ) AS purchase_price
    FROM sales s
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN variants v ON v.id = si.variant_id
    LEFT JOIN products p ON p.id = v.product_id
    LEFT JOIN promos pr ON pr.id = si.promo_id
    LEFT JOIN discount_codes dc ON dc.id = s.discount_code_id
`

const attachPayments = async (sales) => {
    if (sales.length === 0) return
    const ids = sales.map(s => s.id)
    const [payments] = await pool.query(
        `SELECT id, sale_id, method, amount FROM sale_payments WHERE sale_id IN (?)`, [ids]
    )
    payments.forEach(p => {
        const sale = sales.find(s => s.id === p.sale_id)
        if (sale) sale.payments.push({ id: p.id, method: p.method, amount: Number(p.amount) })
    })
}

// ─── GET IN PROCESS ───────────────────────────────────────────────────────────
const getInProcess = async (rubro) => {
    await reservaModel.asegurarColumna()
    const [rows] = await pool.query(
        BASE_QUERY + `
        WHERE s.rubro = ? AND s.status NOT IN ('delivered', 'cancelled')
        ORDER BY s.created_at DESC, si.id
        `, [rubro]
    )
    const sales = buildSales(rows)
    await attachPayments(sales)
    return sales
}

// ─── PEDIDOS PARA EL CADETE ───────────────────────────────────────────────────
// Confirmados y en camino de todos los rubros, primero los más urgentes
// (reservados por su hora, el resto por cuándo se pidieron).
const getForDelivery = async () => {
    await reservaModel.asegurarColumna()
    const [rows] = await pool.query(
        BASE_QUERY + `
        WHERE s.status IN ('paid', 'shipping')
        ORDER BY COALESCE(s.scheduled_for, s.created_at) ASC, s.id, si.id
        `
    )
    const sales = buildSales(rows)
    await attachPayments(sales)
    return sales
}

// Resumen de la semana para el cadete: pedidos entregados y suma de envíos,
// de lunes 00:00 a hoy, con el detalle por día.
const getDeliveryWeekSummary = async () => {
    const lunes = new Date()
    lunes.setHours(0, 0, 0, 0)
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))

    const [dias] = await pool.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia,
               COUNT(*) AS pedidos,
               COALESCE(SUM(shipping_price), 0) AS envios
        FROM sales
        WHERE status = 'delivered' AND created_at >= ?
        GROUP BY dia
        ORDER BY dia
    `, [lunes])

    const porDia = dias.map(d => ({ dia: d.dia, pedidos: Number(d.pedidos), envios: Number(d.envios) }))
    return {
        desde: lunes,
        pedidos: porDia.reduce((a, d) => a + d.pedidos, 0),
        envios: porDia.reduce((a, d) => a + d.envios, 0),
        porDia,
    }
}

// ─── GET HISTORY ──────────────────────────────────────────────────────────────
// solo ventas entregadas o canceladas, filtrando canceladas del conteo de ganancias
const getHistory = async (rubro, weeks, date) => {
    await reservaModel.asegurarColumna()
    let whereExtra = ''
    const params = [rubro]

    if (date) {
        // filtrar por día específico
        whereExtra = `AND DATE(s.created_at) = ?`
        params.push(date)
    } else {
        whereExtra = `AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? WEEK)`
        params.push(Number(weeks) || 1)
    }

    const [rows] = await pool.query(
        BASE_QUERY + `
        WHERE s.rubro = ?
          AND s.status IN ('delivered', 'cancelled')
          ${whereExtra}
        ORDER BY s.created_at DESC, si.id
        `, params
    )
    const sales = buildSales(rows)
    await attachPayments(sales)
    return sales
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
const updateStatus = async (id, status, cancelReason = null) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        let extraFields = ''
        const params = [status]

        if (status === 'pending') {
            // Volver a pendiente: la salida y llegada se registran de nuevo
            extraFields = ', departure_at = NULL, arrived_at = NULL'
        } else if (status === 'shipping') {
            extraFields = ', departure_at = CASE WHEN departure_at IS NULL THEN NOW() ELSE departure_at END'
        } else if (status === 'delivered') {
            extraFields = ', arrived_at = CASE WHEN arrived_at IS NULL THEN NOW() ELSE arrived_at END'
        } else if (status === 'cancelled') {
            extraFields = ', cancel_reason = ?'
            params.push(cancelReason)

            // devolver stock al lote original
            const [movements] = await conn.query(`
                SELECT sm.lot_id, sm.variant_id, sm.quantity
                FROM stock_movements sm
                JOIN sale_items si ON si.id = sm.sale_item_id
                WHERE si.sale_id = ? AND sm.type = 'out' AND sm.reason = 'sale'
            `, [id])

            for (const mov of movements) {
                // restaurar remaining_quantity en el lote original
                await conn.query(`
                    UPDATE lots SET remaining_quantity = remaining_quantity + ?
                    WHERE id = ?
                `, [mov.quantity, mov.lot_id])

                // restaurar stock en variants
                await conn.query(`
                    UPDATE variants SET stock = stock + ?
                    WHERE id = ?
                `, [mov.quantity, mov.variant_id])

                // registrar movement de devolución
                await conn.query(`
                    INSERT INTO stock_movements (variant_id, lot_id, type, quantity, reason)
                    VALUES (?, ?, 'in', ?, 'return')
                `, [mov.variant_id, mov.lot_id, mov.quantity])
            }
        }

        params.push(id)
        await conn.query(
            `UPDATE sales SET status = ? ${extraFields} WHERE id = ?`, params
        )

        await conn.commit()
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── REOPEN ───────────────────────────────────────────────────────────────────
// Una venta entregada vuelve a en proceso como PENDIENTE. Se borran las horas
// de salida y llegada para que se registren de nuevo. Devuelve el estado nuevo,
// o null si la venta no estaba entregada.
const reopen = async (id) => {
    const [result] = await pool.query(`
        UPDATE sales
        SET status = 'pending', departure_at = NULL, arrived_at = NULL
        WHERE id = ? AND status = 'delivered'
    `, [id])
    if (result.affectedRows === 0) return null
    const [[venta]] = await pool.query(`SELECT status FROM sales WHERE id = ?`, [id])
    return venta.status
}

// ─── UPDATE SHIPPING ──────────────────────────────────────────────────────────
const updateShipping = async (id, shippingPrice) => {
    await pool.query(`UPDATE sales SET shipping_price = ? WHERE id = ?`, [shippingPrice, id])
}

// ─── UPDATE SALE (precio items + pagos) ──────────────────────────────────────
// scheduledTime: undefined = no tocar, null/"" = quitar reserva, "HH:MM" = reservar
const updateSale = async (id, { itemPrices, payments, total, scheduledTime }) => {
    await reservaModel.asegurarColumna()
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        if (scheduledTime !== undefined) {
            let scheduledFor = null
            if (scheduledTime) {
                const [[venta]] = await conn.query(`SELECT created_at FROM sales WHERE id = ?`, [id])
                const fecha = venta && reservaModel.resolverHorarioAdmin(scheduledTime, venta.created_at)
                if (!fecha) {
                    const err = new Error('Horario de reserva invalido')
                    err.code = 'SCHEDULE_INVALID'
                    throw err
                }
                scheduledFor = reservaModel.aSQL(fecha)
            }
            await conn.query(`UPDATE sales SET scheduled_for = ? WHERE id = ?`, [scheduledFor, id])
        }

        // actualizar precio de cada item
        if (itemPrices) {
            for (const [itemId, unitPrice] of Object.entries(itemPrices)) {
                await conn.query(
                    `UPDATE sale_items SET unit_price = ? WHERE id = ? AND sale_id = ?`,
                    [unitPrice, itemId, id]
                )
            }
        }

        // reemplazar pagos
        if (payments) {
            await conn.query(`DELETE FROM sale_payments WHERE sale_id = ?`, [id])
            for (const p of payments) {
                await conn.query(
                    `INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, ?, ?)`,
                    [id, p.method, p.amount]
                )
            }
        }

        // actualizar total
        if (total != null) {
            await conn.query(`UPDATE sales SET total = ? WHERE id = ?`, [total, id])
        }

        await conn.commit()
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── CREATE MANUAL ────────────────────────────────────────────────────────────
// Asegurate que la función lo recibe:
// Reemplazar SOLO la función createManual en adminSalesModel.js
// Cambios: acepta totalOverride y lo usa en lugar del calculado si viene

const createManual = async ({ clientName, clientPhone, location, rubro, items, payments, shippingPrice, discountAmount, isWholesale, exchangeRate, totalOverride, saleDate }) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        let clientId = null

        if (clientName || clientPhone) {
            if (clientPhone) {
                const [[existing]] = await conn.query(`SELECT id FROM clients WHERE phone = ?`, [clientPhone])
                if (existing) {
                    clientId = existing.id
                    if (clientName) await conn.query(`UPDATE clients SET name = ? WHERE id = ?`, [clientName, clientId])
                } else {
                    const [res] = await conn.query(
                        `INSERT INTO clients (name, phone) VALUES (?, ?)`,
                        [clientName || '', clientPhone]
                    )
                    clientId = res.insertId
                }
            } else if (clientName) {
                const [res] = await conn.query(
                    `INSERT INTO clients (name, phone) VALUES (?, NULL)`, [clientName]
                )
                clientId = res.insertId
            }
        }

        const itemsTotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
        const calculatedTotal = itemsTotal + Number(shippingPrice || 0) - Number(discountAmount || 0)
        const total = totalOverride != null ? totalOverride : calculatedTotal

        // Si viene saleDate (YYYY-MM-DD), usarla para week_code y created_at
        const dateForCode = saleDate ? new Date(saleDate + 'T12:00:00') : new Date()
        const weekCode = buildWeekCode(dateForCode)

        // Si hay fecha manual, sobreescribir created_at
        const createdAtField = saleDate ? `, created_at` : ''
        const createdAtValue = saleDate ? `, ?` : ''
        const createdAtParam = saleDate ? [saleDate + ' 12:00:00'] : []

        const [saleRes] = await conn.query(`
            INSERT INTO sales (rubro, client_id, is_wholesale, status, total, shipping_price, location, discount_amount, week_code, exchange_rate${createdAtField})
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?${createdAtValue})
        `, [rubro, clientId, isWholesale ? 1 : 0, total, shippingPrice || 0, location || null, discountAmount || 0, weekCode, exchangeRate ?? null, ...createdAtParam])

        const saleId = saleRes.insertId

        for (const item of items) {
            const [siRes] = await conn.query(`
                INSERT INTO sale_items (sale_id, variant_id, promo_id, quantity, unit_price)
                VALUES (?, ?, ?, ?, ?)
            `, [saleId, item.variantId, item.promoId || null, item.quantity, item.unitPrice])
            await descontarFIFO(conn, item.variantId, item.quantity, siRes.insertId)
        }

        for (const payment of payments) {
            await conn.query(
                `INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, ?, ?)`,
                [saleId, payment.method, payment.amount]
            )
        }

        await conn.commit()
        return saleId
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── EDITAR PRODUCTOS DE UNA VENTA EN PROCESO ─────────────────────────────────
// Cambios que llegan del admin:
//   quantities:   { itemId: nuevaCantidad }   productos sueltos (0 = quitar)
//   removePromos: [promoId]                   saca la promo completa
//   addItems:     [{ variantId, quantity, unitPrice }]
//   addPromos:    [{ promoId, variants: [{ variantId, quantity }] }]
// El stock se devuelve/descuenta por lote y el total se ajusta por diferencia,
// así los descuentos que ya tenía la venta se mantienen.

const errorEdicion = (mensaje) => Object.assign(new Error(mensaje), { code: 'EDIT_INVALID' })

// Devuelve `cantidad` unidades de un item al stock, empezando por los últimos
// lotes usados. Ajusta los movimientos de salida para que el costo de la venta
// siga siendo correcto, y deja un movimiento de devolución.
const devolverStockItem = async (conn, item, cantidad) => {
    const [movs] = await conn.query(`
        SELECT id, lot_id, quantity FROM stock_movements
        WHERE sale_item_id = ? AND type = 'out' AND reason = 'sale'
        ORDER BY id DESC FOR UPDATE
    `, [item.id])

    let falta = cantidad
    for (const mov of movs) {
        if (falta <= 0) break
        const q = Math.min(mov.quantity, falta)
        if (q === mov.quantity) await conn.query(`DELETE FROM stock_movements WHERE id = ?`, [mov.id])
        else await conn.query(`UPDATE stock_movements SET quantity = quantity - ? WHERE id = ?`, [q, mov.id])
        await conn.query(`UPDATE lots SET remaining_quantity = remaining_quantity + ? WHERE id = ?`, [q, mov.lot_id])
        await conn.query(`
            INSERT INTO stock_movements (variant_id, lot_id, type, quantity, reason)
            VALUES (?, ?, 'in', ?, 'return')
        `, [item.variant_id, mov.lot_id, q])
        falta -= q
    }
    await conn.query(`UPDATE variants SET stock = stock + ? WHERE id = ?`, [cantidad, item.variant_id])
}

const verificarStock = async (conn, variantId, cantidad) => {
    const [[v]] = await conn.query(`
        SELECT v.stock, v.name, p.name AS product_name FROM variants v
        JOIN products p ON p.id = v.product_id WHERE v.id = ? FOR UPDATE
    `, [variantId])
    if (!v) throw errorEdicion('Producto inexistente')
    if (v.stock < cantidad)
        throw errorEdicion(`No hay stock suficiente de ${v.product_name} ${v.name} (quedan ${v.stock})`)
}

// Cuántas promos completas representan las unidades de una promo en la venta
const cantidadDePromos = async (conn, promoId, unidades) => {
    const [[r]] = await conn.query(`SELECT SUM(quantity) AS por_promo FROM promo_items WHERE promo_id = ?`, [promoId])
    const porPromo = Number(r?.por_promo) || 0
    return porPromo > 0 ? Math.max(1, Math.round(unidades / porPromo)) : 1
}

const editItems = async (id, { quantities = {}, removePromos = [], addItems = [], addPromos = [] }) => {
    await reservaModel.asegurarColumna()
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const [[venta]] = await conn.query(`SELECT id, status, total FROM sales WHERE id = ? FOR UPDATE`, [id])
        if (!venta) throw errorEdicion('La venta no existe')
        if (['delivered', 'cancelled'].includes(venta.status))
            throw errorEdicion('Solo se pueden editar los productos de ventas en proceso')

        const [items] = await conn.query(`SELECT id, variant_id, promo_id, quantity, unit_price FROM sale_items WHERE sale_id = ?`, [id])
        let delta = 0

        // Productos sueltos: cambiar cantidad o quitar
        for (const [itemId, nueva] of Object.entries(quantities)) {
            const item = items.find(i => i.id === Number(itemId) && !i.promo_id)
            const cantidad = Number(nueva)
            if (!item || !Number.isInteger(cantidad) || cantidad < 0) throw errorEdicion('Cantidad inválida')
            const diferencia = cantidad - item.quantity
            if (diferencia === 0) continue

            if (diferencia < 0) await devolverStockItem(conn, item, -diferencia)
            else {
                await verificarStock(conn, item.variant_id, diferencia)
                await descontarFIFO(conn, item.variant_id, diferencia, item.id)
            }
            if (cantidad === 0) await conn.query(`DELETE FROM sale_items WHERE id = ?`, [item.id])
            else await conn.query(`UPDATE sale_items SET quantity = ? WHERE id = ?`, [cantidad, item.id])
            delta += diferencia * Number(item.unit_price)
        }

        // Promos: se sacan completas
        for (const promoId of removePromos) {
            const itemsPromo = items.filter(i => i.promo_id === Number(promoId))
            if (itemsPromo.length === 0) throw errorEdicion('La promo no está en la venta')
            const unidades = itemsPromo.reduce((a, i) => a + i.quantity, 0)
            const veces = await cantidadDePromos(conn, promoId, unidades)
            const [[promo]] = await conn.query(`SELECT price FROM promos WHERE id = ?`, [promoId])
            for (const item of itemsPromo) {
                await devolverStockItem(conn, item, item.quantity)
                await conn.query(`DELETE FROM sale_items WHERE id = ?`, [item.id])
            }
            delta -= Number(promo?.price ?? 0) * veces
        }

        // Productos nuevos
        for (const nuevo of addItems) {
            const cantidad = Number(nuevo.quantity)
            const precio = Number(nuevo.unitPrice)
            if (!Number.isInteger(cantidad) || cantidad <= 0 || !(precio >= 0)) throw errorEdicion('Producto inválido')
            await verificarStock(conn, nuevo.variantId, cantidad)
            const [r] = await conn.query(`
                INSERT INTO sale_items (sale_id, variant_id, promo_id, quantity, unit_price) VALUES (?, ?, NULL, ?, ?)
            `, [id, nuevo.variantId, cantidad, precio])
            await descontarFIFO(conn, nuevo.variantId, cantidad, r.insertId)
            delta += cantidad * precio
        }

        // Promos nuevas: tienen que venir completas (por cada producto de la promo,
        // variantes de ese producto que sumen exactamente la cantidad que pide)
        for (const nueva of addPromos) {
            const [[promo]] = await conn.query(`SELECT id, price FROM promos WHERE id = ?`, [nueva.promoId])
            if (!promo) throw errorEdicion('La promo no existe')
            const [requeridos] = await conn.query(`SELECT product_id, quantity FROM promo_items WHERE promo_id = ?`, [promo.id])
            if (requeridos.length === 0) throw errorEdicion('La promo no tiene productos cargados')

            const elegidas = (nueva.variants || []).filter(v => Number(v.quantity) > 0)
            const porProducto = {}
            for (const v of elegidas) {
                const [[variante]] = await conn.query(`SELECT product_id FROM variants WHERE id = ?`, [v.variantId])
                if (!variante) throw errorEdicion('Producto inexistente en la promo')
                porProducto[variante.product_id] = (porProducto[variante.product_id] || 0) + Number(v.quantity)
            }
            const completa = requeridos.every(r => porProducto[r.product_id] === r.quantity)
                && Object.keys(porProducto).length === requeridos.length
            if (!completa) throw errorEdicion('La promo tiene que ir completa')

            for (const v of elegidas) {
                const cantidad = Number(v.quantity)
                await verificarStock(conn, v.variantId, cantidad)
                const [r] = await conn.query(`
                    INSERT INTO sale_items (sale_id, variant_id, promo_id, quantity, unit_price) VALUES (?, ?, ?, ?, 0)
                `, [id, v.variantId, promo.id, cantidad])
                await descontarFIFO(conn, v.variantId, cantidad, r.insertId)
            }
            delta += Number(promo.price)
        }

        const [[quedan]] = await conn.query(`SELECT COUNT(*) AS n FROM sale_items WHERE sale_id = ?`, [id])
        if (quedan.n === 0) throw errorEdicion('La venta tiene que tener al menos un producto. Si no, cancelala.')

        // Total y pago: se ajustan por la diferencia. Con un solo pago se ajusta
        // su monto; con pago mixto se deja para corregir desde EDITAR.
        const nuevoTotal = Math.max(0, Number(venta.total) + delta)
        await conn.query(`UPDATE sales SET total = ? WHERE id = ?`, [nuevoTotal, id])
        const [pagos] = await conn.query(`SELECT id, amount FROM sale_payments WHERE sale_id = ?`, [id])
        if (pagos.length === 1) {
            await conn.query(`UPDATE sale_payments SET amount = ? WHERE id = ?`,
                [Math.max(0, Number(pagos[0].amount) + delta), pagos[0].id])
        }

        await conn.commit()
        return { total: nuevoTotal, delta, pagoMixto: pagos.length > 1 }
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── FIFO ─────────────────────────────────────────────────────────────────────
const descontarFIFO = async (conn, variantId, quantity, saleItemId) => {
    const [lots] = await conn.query(`
        SELECT id, remaining_quantity FROM lots
        WHERE variant_id = ? AND remaining_quantity > 0
        ORDER BY created_at ASC FOR UPDATE
    `, [variantId])

    let remaining = quantity
    for (const lot of lots) {
        if (remaining <= 0) break
        const toDiscount = Math.min(lot.remaining_quantity, remaining)
        await conn.query(`UPDATE lots SET remaining_quantity = remaining_quantity - ? WHERE id = ?`, [toDiscount, lot.id])
        await conn.query(`
            INSERT INTO stock_movements (variant_id, lot_id, sale_item_id, type, quantity, reason)
            VALUES (?, ?, ?, 'out', ?, 'sale')
        `, [variantId, lot.id, saleItemId, toDiscount])
        remaining -= toDiscount
    }
    await conn.query(`UPDATE variants SET stock = stock - ? WHERE id = ?`, [quantity, variantId])
}

module.exports = { getDeliveryWeekSummary, getForDelivery, getInProcess, getHistory, updateStatus, updateShipping, updateSale, createManual, reopen, editItems }