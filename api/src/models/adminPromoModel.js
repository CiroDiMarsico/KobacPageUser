const pool = require('../db/connection')

// ─── GET ALL ──────────────────────────────────────────────────────────────────
const getAll = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.image,
            p.price,
            p.rubro,
            p.is_active,
            pi.id         AS itemId,
            pi.product_id AS itemProductId,
            pi.quantity   AS itemQuantity,
            pr.name       AS itemProductName
        FROM promos p
        LEFT JOIN promo_items pi ON pi.promo_id = p.id
        LEFT JOIN products pr ON pr.id = pi.product_id
        WHERE p.rubro = ?
        ORDER BY p.id, pi.id
    `, [rubro])

    // costo promedio por producto (promedio del último precio de compra de sus variantes activas)
    const [costRows] = await pool.query(`
        SELECT
            v.product_id,
            AVG(last_price.purchase_price) AS avgCost
        FROM variants v
        JOIN (
            SELECT l.variant_id, l.purchase_price
            FROM lots l
            WHERE l.id = (
                SELECT l2.id FROM lots l2
                WHERE l2.variant_id = l.variant_id
                ORDER BY l2.created_at DESC
                LIMIT 1
            )
        ) last_price ON last_price.variant_id = v.id
        WHERE v.is_active = TRUE
        GROUP BY v.product_id
    `)
    const costMap = {}
    costRows.forEach(r => { costMap[r.product_id] = Number(r.avgCost) })

    const map = {}
    const promos = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                image: row.image,
                price: Number(row.price),
                rubro: row.rubro,
                isActive: Boolean(row.is_active),
                items: []
            }
            promos.push(map[row.id])
        }
        if (row.itemId) {
            map[row.id].items.push({
                id: row.itemId,
                productId: row.itemProductId,
                productName: row.itemProductName,
                quantity: row.itemQuantity,
                avgCost: costMap[row.itemProductId] ?? null
            })
        }
    }

    // calcular costo total, ganancia, markup y margen por promo
    promos.forEach(promo => {
        const allHaveCost = promo.items.length > 0 && promo.items.every(i => i.avgCost != null)

        if (allHaveCost) {
            const costoTotal = promo.items.reduce((acc, i) => acc + i.avgCost * i.quantity, 0)
            const ganancia = promo.price - costoTotal
            promo.costoTotal = Math.round(costoTotal)
            promo.ganancia = Math.round(ganancia)
            promo.markup = Number(((ganancia / costoTotal) * 100).toFixed(1))
            promo.margen = Number(((ganancia / promo.price) * 100).toFixed(1))
        } else {
            promo.costoTotal = null
            promo.ganancia = null
            promo.markup = null
            promo.margen = null
        }
    })

    return promos
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
const create = async ({ name, image, price, rubro, items }) => {
    const conn = await require('../db/connection').getConnection()
    try {
        await conn.beginTransaction()
        const [result] = await conn.query(`
            INSERT INTO promos (name, image, price, rubro)
            VALUES (?, ?, ?, ?)
        `, [name, image || null, price, rubro])
        const promoId = result.insertId
        for (const item of items) {
            await conn.query(`
                INSERT INTO promo_items (promo_id, product_id, quantity)
                VALUES (?, ?, ?)
            `, [promoId, item.productId, item.quantity])
        }
        await conn.commit()
        return promoId
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const update = async (id, { name, image, price, isActive, items }) => {
    const conn = await require('../db/connection').getConnection()
    try {
        await conn.beginTransaction()
        await conn.query(`
            UPDATE promos SET name = ?, image = ?, price = ?, is_active = ?
            WHERE id = ?
        `, [name, image || null, price, isActive ?? true, id])
        if (items) {
            await conn.query(`DELETE FROM promo_items WHERE promo_id = ?`, [id])
            for (const item of items) {
                await conn.query(`
                    INSERT INTO promo_items (promo_id, product_id, quantity)
                    VALUES (?, ?, ?)
                `, [id, item.productId, item.quantity])
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

module.exports = { getAll, create, update }
