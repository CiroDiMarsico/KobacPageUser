const pool = require('../db/connection')

// ─── CAROUSEL ─────────────────────────────────────────────────────────────────

const getCarousel = async () => {
    const [rows] = await pool.query(
        `SELECT id, url, sort_order, is_active FROM carousel_images ORDER BY sort_order ASC`
    )
    return rows.map(r => ({
        id: r.id,
        url: r.url,
        sortOrder: r.sort_order,
        isActive: Boolean(r.is_active)
    }))
}

const addCarouselImage = async (url) => {
    const [[{ maxOrder }]] = await pool.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM carousel_images`
    )
    const [result] = await pool.query(
        `INSERT INTO carousel_images (url, sort_order, is_active) VALUES (?, ?, TRUE)`,
        [url, maxOrder + 1]
    )
    return result.insertId
}

const updateCarouselImage = async (id, { url, sortOrder, isActive }) => {
    await pool.query(
        `UPDATE carousel_images SET url = ?, sort_order = ?, is_active = ? WHERE id = ?`,
        [url, sortOrder, isActive, id]
    )
}

// Devuelve la URL antes de borrar, para que el controller pueda eliminar el archivo físico
const deleteCarouselImage = async (id) => {
    const [[row]] = await pool.query(`SELECT url FROM carousel_images WHERE id = ?`, [id])
    await pool.query(`DELETE FROM carousel_images WHERE id = ?`, [id])
    return row?.url ?? null
}

const reorderCarousel = async (orderedIds) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        for (let i = 0; i < orderedIds.length; i++) {
            await conn.query(
                `UPDATE carousel_images SET sort_order = ? WHERE id = ?`,
                [i + 1, orderedIds[i]]
            )
        }
        await conn.commit()
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

// ─── MARQUEE ──────────────────────────────────────────────────────────────────

const getMarquee = async () => {
    const [rows] = await pool.query(
        `SELECT id, text, sort_order, is_active FROM marquee_items ORDER BY sort_order ASC`
    )
    return rows.map(r => ({
        id: r.id,
        text: r.text,
        sortOrder: r.sort_order,
        isActive: Boolean(r.is_active)
    }))
}

const addMarqueeItem = async (text) => {
    const [[{ maxOrder }]] = await pool.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM marquee_items`
    )
    const [result] = await pool.query(
        `INSERT INTO marquee_items (text, sort_order, is_active) VALUES (?, ?, TRUE)`,
        [text, maxOrder + 1]
    )
    return result.insertId
}

const updateMarqueeItem = async (id, { text, sortOrder, isActive }) => {
    await pool.query(
        `UPDATE marquee_items SET text = ?, sort_order = ?, is_active = ? WHERE id = ?`,
        [text, sortOrder, isActive, id]
    )
}

const deleteMarqueeItem = async (id) => {
    await pool.query(`DELETE FROM marquee_items WHERE id = ?`, [id])
}

const reorderMarquee = async (orderedIds) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        for (let i = 0; i < orderedIds.length; i++) {
            await conn.query(
                `UPDATE marquee_items SET sort_order = ? WHERE id = ?`,
                [i + 1, orderedIds[i]]
            )
        }
        await conn.commit()
    } catch (e) {
        await conn.rollback()
        throw e
    } finally {
        conn.release()
    }
}

module.exports = {
    getCarousel, addCarouselImage, updateCarouselImage, deleteCarouselImage, reorderCarousel,
    getMarquee, addMarqueeItem, updateMarqueeItem, deleteMarqueeItem, reorderMarquee
}
