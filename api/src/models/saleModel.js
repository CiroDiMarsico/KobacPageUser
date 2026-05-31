const pool = require('../db/connection')

const create = async (conn, { clientId, rubro, total, discountCodeId, discountAmount, weekCode }) => {
    const [result] = await conn.query(`
        INSERT INTO sales (rubro, client_id, is_wholesale, status, total, discount_code_id, discount_amount, week_code)
        VALUES (?, ?, FALSE, 'pending', ?, ?, ?, ?)
    `, [rubro, clientId, total, discountCodeId || null, discountAmount || 0, weekCode])
    return result.insertId
}

const createItems = async (conn, items) => {
    for (const item of items) {
        const [result] = await conn.query(`
            INSERT INTO sale_items (sale_id, variant_id, promo_id, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?)
        `, [item.saleId, item.variantId, item.promoId || null, item.quantity, item.unitPrice])

        // descontar stock FIFO
        await descontarFIFO(conn, item.variantId, item.quantity, result.insertId)
    }
}

const createPayments = async (conn, saleId, payments) => {
    for (const payment of payments) {
        await conn.query(`
            INSERT INTO sale_payments (sale_id, method, amount)
            VALUES (?, ?, ?)
        `, [saleId, payment.method, payment.amount])
    }
}

const descontarFIFO = async (conn, variantId, quantity, saleItemId) => {
    const [lots] = await conn.query(`
        SELECT id, remaining_quantity FROM lots
        WHERE variant_id = ? AND remaining_quantity > 0
        ORDER BY created_at ASC
        FOR UPDATE
    `, [variantId])

    let remaining = quantity

    for (const lot of lots) {
        if (remaining <= 0) break

        const toDiscount = Math.min(lot.remaining_quantity, remaining)

        await conn.query(`
            UPDATE lots SET remaining_quantity = remaining_quantity - ?
            WHERE id = ?
        `, [toDiscount, lot.id])

        await conn.query(`
            INSERT INTO stock_movements (variant_id, lot_id, sale_item_id, type, quantity, reason)
            VALUES (?, ?, ?, 'out', ?, 'sale')
        `, [variantId, lot.id, saleItemId, toDiscount])

        remaining -= toDiscount
    }

    await conn.query(`
        UPDATE variants SET stock = stock - ?
        WHERE id = ?
    `, [quantity, variantId])
}

module.exports = { create, createItems, createPayments }