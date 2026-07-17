const pool = require('../db/connection')

const getAll = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.image AS img,
            p.price,
            pi.product_id AS idProduct,
            pi.quantity
        FROM promos p
        LEFT JOIN promo_items pi ON pi.promo_id = p.id
        WHERE p.rubro = ? AND p.is_active = TRUE
        ORDER BY p.name DESC
    `, [rubro])

    const map = {}
    const promos = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                img: row.img,
                price: row.price,
                items: []
            }
            promos.push(map[row.id])
        }
        map[row.id].items.push({
            idProduct: row.idProduct,
            quantity: row.quantity
        })
    }

    return promos
}

module.exports = { getAll }