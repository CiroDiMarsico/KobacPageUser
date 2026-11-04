const pool = require('../db/connection')
const { asegurarColumna, SQL_PRECIO_FINAL } = require('./productDiscountModel')

const getAll = async (rubro) => {
    await asegurarColumna()
    const [rows] = await pool.query(`
        SELECT 
            p.id,
            p.name,
            p.image AS img,
            ${SQL_PRECIO_FINAL} AS salePrice,
            p.sale_price AS originalPrice,
            p.discount_percent AS discountPercent,
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
            CASE WHEN LOWER(?) = 'vapes' THEN p.sale_price END DESC,
            c.name ASC, 
            p.name ASC,
            v.stock DESC
    `, [rubro, rubro, rubro]);

    const map = {}
    const products = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                img: row.img,
                // salePrice ya trae el descuento aplicado: todo el carrito lo usa
                salePrice: Number(row.salePrice),
                originalPrice: Number(row.originalPrice),
                discountPercent: Number(row.discountPercent) || 0,
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