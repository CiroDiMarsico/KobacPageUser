const pool = require('../db/connection')

const getAll = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT 
            p.id,
            p.name,
            p.image AS img,
            p.sale_price AS salePrice,
            c.name AS category,
            v.id AS variantId,
            v.name AS variantName,
            v.is_active AS isActive,
            v.stock,
            v.description AS variantDescription
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN variants v ON v.product_id = p.id
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE v.is_active = TRUE
        AND (root.name = ? OR c.name = ?)
        ORDER BY 
            CASE WHEN LOWER(?) = 'vapes' THEN p.sale_price END ASC,
            c.name ASC, 
            p.name ASC
    `, [rubro, rubro, rubro]);

    const map = {}
    const products = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                img: row.img,
                salePrice: row.salePrice,
                category: row.category,
                variants: []
            }
            products.push(map[row.id])
        }
        map[row.id].variants.push({
            id: row.variantId,
            name: row.variantName,
            isActive: row.isActive,
            stock: row.stock,
            description: row.variantDescription ?? null
        })
    }

    return products
}

module.exports = { getAll }