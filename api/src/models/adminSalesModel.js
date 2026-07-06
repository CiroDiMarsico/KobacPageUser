const pool = require('../db/connection')

// ─── helpers ──────────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const buildWeekCode = (date = new Date()) => {
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${date.getFullYear()}-M${date.getMonth() + 1}-W${week}`
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
        s.created_at, s.updated_at, s.departure_at, s.arrived_at,
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

// ─── GET HISTORY ──────────────────────────────────────────────────────────────
// solo ventas entregadas o canceladas, filtrando canceladas del conteo de ganancias
const getHistory = async (rubro, weeks, date) => {
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

        if (status === 'shipping') {
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

// ─── UPDATE SHIPPING ──────────────────────────────────────────────────────────
const updateShipping = async (id, shippingPrice) => {
    await pool.query(`UPDATE sales SET shipping_price = ? WHERE id = ?`, [shippingPrice, id])
}

// ─── UPDATE SALE (precio items + pagos) ──────────────────────────────────────
const updateSale = async (id, { itemPrices, payments, total }) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

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

const createManual = async ({ clientName, clientPhone, location, rubro, items, payments, shippingPrice, discountAmount, isWholesale, exchangeRate, totalOverride }) => {
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

        // Si viene totalOverride (total editado manualmente en el admin), usarlo
        // Si no, usar el calculado normalmente
        const total = totalOverride != null ? totalOverride : calculatedTotal

        const weekCode = buildWeekCode()

        const [saleRes] = await conn.query(`
            INSERT INTO sales (rubro, client_id, is_wholesale, status, total, shipping_price, location, discount_amount, week_code, exchange_rate)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
        `, [rubro, clientId, isWholesale ? 1 : 0, total, shippingPrice || 0, location || null, discountAmount || 0, weekCode, exchangeRate ?? null])

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

module.exports = { getInProcess, getHistory, updateStatus, updateShipping, updateSale, createManual }
