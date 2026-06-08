const pool = require('../db/connection')

// ─── GET ALL ──────────────────────────────────────────────────────────────────
const getAll = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT
            p.id,
            p.name,
            p.image,
            p.sale_price,
            c.id   AS categoryId,
            c.name AS category,
            v.id          AS variantId,
            v.name        AS variantName,
            v.is_active   AS variantActive,
            v.stock,
            (
                SELECT l.purchase_price
                FROM lots l
                WHERE l.variant_id = v.id
                ORDER BY l.created_at DESC
                LIMIT 1
            ) AS lastPurchasePrice
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories root ON root.id = c.parent_id
        LEFT JOIN variants v ON v.product_id = p.id
        WHERE (root.name = ? OR c.name = ?)
        ORDER BY p.id, v.id
    `, [rubro, rubro])

    const map = {}
    const products = []

    for (const row of rows) {
        if (!map[row.id]) {
            map[row.id] = {
                id: row.id,
                name: row.name,
                image: row.image,
                salePrice: Number(row.sale_price),
                categoryId: row.categoryId,
                category: row.category,
                variants: []
            }
            products.push(map[row.id])
        }

        if (row.variantId) {
            const salePrice = Number(row.sale_price)
            const purchasePrice = Number(row.lastPurchasePrice ?? 0)
            const ganancia = salePrice - purchasePrice
            const porcentaje = purchasePrice > 0
                ? ((ganancia / purchasePrice) * 100).toFixed(1)
                : null

            map[row.id].variants.push({
                id: row.variantId,
                name: row.variantName,
                isActive: Boolean(row.variantActive),
                stock: row.stock,
                lastPurchasePrice: purchasePrice || null,
                ganancia: ganancia || null,
                porcentaje: porcentaje ? Number(porcentaje) : null
            })
        }
    }

    // isActive del producto se deriva de sus variantes
    products.forEach(p => {
        p.isActive = p.variants.some(v => v.isActive)
    })

    return products
}

// ─── GET CATEGORIES ───────────────────────────────────────────────────────────
const getCategories = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT c.id, c.name, c.parent_id
        FROM categories c
        LEFT JOIN categories root ON root.id = c.parent_id
        WHERE root.name = ? OR (c.name = ? AND c.parent_id IS NULL)
        ORDER BY c.id
    `, [rubro, rubro])
    return rows
}

// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────
const create = async ({ name, categoryId, image, salePrice }) => {
    const [result] = await pool.query(`
        INSERT INTO products (name, category_id, image, sale_price)
        VALUES (?, ?, ?, ?)
    `, [name, categoryId || null, image || null, salePrice])
    return result.insertId
}

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────
const update = async (id, { name, categoryId, image, salePrice }) => {
    await pool.query(`
        UPDATE products
        SET name = ?, category_id = ?, image = ?, sale_price = ?
        WHERE id = ?
    `, [name, categoryId || null, image || null, salePrice, id])
}

// ─── CREATE VARIANT ───────────────────────────────────────────────────────────
const createVariant = async (productId, { name }) => {
    const [result] = await pool.query(`
        INSERT INTO variants (product_id, name)
        VALUES (?, ?)
    `, [productId, name])
    return result.insertId
}

// ─── UPDATE VARIANT ───────────────────────────────────────────────────────────
const updateVariant = async (id, { name, isActive }) => {
    await pool.query(`
        UPDATE variants
        SET name = ?, is_active = ?
        WHERE id = ?
    `, [name, isActive ?? true, id])
}

// ─── CREATE CATEGORY ──────────────────────────────────────────────────────────
const createCategory = async ({ name, parentId }) => {
    const [result] = await pool.query(`
        INSERT INTO categories (name, parent_id)
        VALUES (?, ?)
    `, [name, parentId || null])
    return result.insertId
}

module.exports = {
    getAll,
    getCategories,
    create,
    update,
    createVariant,
    updateVariant,
    createCategory
}
