const pool = require('../db/connection')

// ─── GET STOCK ────────────────────────────────────────────────────────────────
// Productos con variantes, stock actual, lotes y último precio de compra
const getStock = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.image,
            c.name AS category,
            v.id        AS variantId,
            v.name      AS variantName,
            v.is_active AS variantActive,
            v.stock,
            v.description AS variantDescription,
            (
                SELECT l.purchase_price
                FROM lots l
                WHERE l.variant_id = v.id
                ORDER BY l.created_at DESC
                LIMIT 1
            ) AS lastPurchasePrice,
            (
                SELECT pi.price_usd
                FROM lots l
                JOIN purchase_items pi ON pi.id = l.purchase_item_id
                WHERE l.variant_id = v.id
                AND pi.price_usd IS NOT NULL
                ORDER BY l.created_at DESC
                LIMIT 1
            ) AS lastPriceUsd,
            (
                SELECT pi.exchange_rate
                FROM lots l
                JOIN purchase_items pi ON pi.id = l.purchase_item_id
                WHERE l.variant_id = v.id
                AND pi.exchange_rate IS NOT NULL
                ORDER BY l.created_at DESC
                LIMIT 1
            ) AS lastExchangeRate
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories root ON root.id = c.parent_id
        LEFT JOIN variants v ON v.product_id = p.id
        WHERE (root.name = ? OR c.name = ?)
        ORDER BY p.id, v.id
    `, [rubro, rubro])

    // lotes por variante
    const [lots] = await pool.query(`
        SELECT
            l.id,
            l.variant_id,
            l.initial_quantity,
            l.remaining_quantity,
            l.purchase_price,
            l.created_at,
            pi.price_usd AS priceUsd,
            pi.exchange_rate AS exchangeRate
        FROM lots l
        LEFT JOIN purchase_items pi ON pi.id = l.purchase_item_id
        JOIN variants v ON v.product_id IN (
            SELECT p.id FROM products p
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories root ON root.id = c.parent_id
            WHERE root.name = ? OR c.name = ?
        ) AND l.variant_id = v.id
        WHERE l.remaining_quantity > 0
        ORDER BY l.variant_id, l.created_at ASC
    `, [rubro, rubro])

    const lotsMap = {}
    lots.forEach(l => {
        if (!lotsMap[l.variant_id]) lotsMap[l.variant_id] = []
        lotsMap[l.variant_id].push({
            id: l.id,
            initialQuantity: l.initial_quantity,
            remainingQuantity: l.remaining_quantity,
            purchasePrice: Number(l.purchase_price),
            createdAt: l.created_at,
            priceUsd: l.priceUsd ? Number(l.priceUsd) : null,
            exchangeRate: l.exchangeRate ? Number(l.exchangeRate) : null,
        })
    })

    // último precio de compra por variante
    const [lastPrices] = await pool.query(`
        SELECT l.variant_id, l.purchase_price, pi.price_usd, pi.exchange_rate
        FROM lots l
        LEFT JOIN purchase_items pi ON pi.id = l.purchase_item_id
        WHERE l.id IN (
            SELECT MAX(id) FROM lots GROUP BY variant_id
        )
    `)
    const lastPriceMap = {}
    lastPrices.forEach(r => { lastPriceMap[r.variant_id] = Number(r.purchase_price) })

    const lastPriceUsdMap = {}
    const lastExchangeRateMap = {}
    lastPrices.forEach(r => {
        if (r.price_usd) lastPriceUsdMap[r.variant_id] = Number(r.price_usd)
        if (r.exchange_rate) lastExchangeRateMap[r.variant_id] = Number(r.exchange_rate)
    })

    const map = {}
    const products = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                image: row.image,
                category: row.category,
                variants: []
            }
            products.push(map[row.id])
        }
        if (row.variantId) {
            map[row.id].variants.push({
                id: row.variantId,
                name: row.variantName,
                isActive: Boolean(row.variantActive),
                stock: row.stock,
                lastPurchasePrice: lastPriceMap[row.variantId] !== undefined
                    ? lastPriceMap[row.variantId]
                    : null,
                lots: lotsMap[row.variantId] ?? [],
                description: row.variantDescription ?? null,
                lastPriceUsd: lastPriceUsdMap[row.variantId] ?? null,
                lastExchangeRate: lastExchangeRateMap[row.variantId] ?? null,
            })
        }
    }

    return products
}

// ─── GET SUPPLIERS ────────────────────────────────────────────────────────────
const getSuppliers = async () => {
    const [rows] = await pool.query(`SELECT id, name, phone FROM suppliers ORDER BY name`)
    return rows
}

// ─── CREATE SUPPLIER ─────────────────────────────────────────────────────────
const createSupplier = async (name, phone) => {
    const [result] = await pool.query(
        `INSERT INTO suppliers (name, phone) VALUES (?, ?)`, [name, phone || null]
    )
    return result.insertId
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────
// items: [{ variantId, quantity, unitPrice }]
const createPurchase = async ({ supplierId, rubro, items }) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        // calcular total
        const total = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)

        // week_code
        const now = new Date()
        const weekCode = buildWeekCode(now)

        // cabecera de compra
        const [purchaseResult] = await conn.query(`
            INSERT INTO purchases (supplier_id, rubro, total, week_code)
            VALUES (?, ?, ?, ?)
        `, [supplierId || null, rubro, total, weekCode])
        const purchaseId = purchaseResult.insertId

        for (const item of items) {
            // purchase_item
            const [piResult] = await conn.query(`
                INSERT INTO purchase_items (purchase_id, variant_id, quantity, unit_price, price_usd, exchange_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [purchaseId, item.variantId, item.quantity, item.unitPrice, item.priceUsd ?? null, item.exchangeRate ?? null])

            // lote nuevo
            await conn.query(`
                INSERT INTO lots (variant_id, purchase_item_id, initial_quantity, remaining_quantity, purchase_price)
                VALUES (?, ?, ?, ?, ?)
            `, [item.variantId, piResult.insertId, item.quantity, item.quantity, item.unitPrice])

            // stock_movement in
            const [lotResult] = await conn.query(
                `SELECT id FROM lots WHERE purchase_item_id = ?`, [piResult.insertId]
            )
            await conn.query(`
                INSERT INTO stock_movements (variant_id, lot_id, purchase_item_id, type, quantity, reason)
                VALUES (?, ?, ?, 'in', ?, 'purchase')
            `, [item.variantId, lotResult[0].id, piResult.insertId, item.quantity])

            // actualizar stock en variants
            await conn.query(`
                UPDATE variants SET stock = stock + ? WHERE id = ?
            `, [item.quantity, item.variantId])
        }

        await conn.commit()
        return purchaseId
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── AJUSTE DE STOCK ──────────────────────────────────────────────────────────
// stockReal: lo que hay físicamente
const adjustStock = async (variantId, stockReal, reason = '') => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const [[variant]] = await conn.query(
            `SELECT stock FROM variants WHERE id = ?`, [variantId]
        )
        const diff = stockReal - variant.stock  // positivo = sobra, negativo = falta

        if (diff === 0) { conn.release(); return }

        const type = diff > 0 ? 'in' : 'out'
        const qty = Math.abs(diff)

        await conn.query(`
            INSERT INTO stock_movements (variant_id, type, quantity, reason)
            VALUES (?, ?, ?, 'adjustment')
        `, [variantId, type, qty])

        await conn.query(`
            UPDATE variants SET stock = ? WHERE id = ?
        `, [stockReal, variantId])

        // si es ajuste positivo, crear un lote con precio 0
        if (diff > 0) {
            const [[lastLot]] = await conn.query(`
                SELECT purchase_price FROM lots
                WHERE variant_id = ?
                ORDER BY created_at DESC LIMIT 1
            `, [variantId])
            const lastPrice = lastLot?.purchase_price ?? 0
            await conn.query(`
        INSERT INTO lots (variant_id, initial_quantity, remaining_quantity, purchase_price)
        VALUES (?, ?, ?, ?)
    `, [variantId, qty, qty, lastPrice])
        } else {
            // negativo — descontar de lotes más viejos primero (FIFO)
            let remaining = qty
            const [lots] = await conn.query(`
        SELECT id, remaining_quantity FROM lots
        WHERE variant_id = ? AND remaining_quantity > 0
        ORDER BY created_at ASC
    `, [variantId])

            for (const lot of lots) {
                if (remaining <= 0) break
                const toDiscount = Math.min(lot.remaining_quantity, remaining)
                await conn.query(`
            UPDATE lots SET remaining_quantity = remaining_quantity - ?
            WHERE id = ?
        `, [toDiscount, lot.id])
                await conn.query(`
            INSERT INTO stock_movements (variant_id, lot_id, type, quantity, reason)
            VALUES (?, ?, 'out', ?, 'adjustment')
        `, [variantId, lot.id, toDiscount])
                remaining -= toDiscount
            }
        }

        await conn.commit()
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── helper semana ────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const buildWeekCode = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const isoYear = d.getUTCFullYear()
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${isoYear}-W${week}`
}

module.exports = { getStock, getSuppliers, createSupplier, createPurchase, adjustStock }