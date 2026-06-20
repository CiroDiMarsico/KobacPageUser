const pool = require('../db/connection')

const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM discount_codes ORDER BY created_at DESC`
        )
        res.json(rows)
    } catch (e) { res.status(500).json({ error: 'Error' }) }
}

const create = async (req, res) => {
    try {
        const { code, discountType, discountValue, expiresAt } = req.body
        await pool.query(
            `INSERT INTO discount_codes (code, discount_type, discount_value, expires_at)
             VALUES (?, ?, ?, ?)`,
            [code, discountType, discountValue, expiresAt || null]
        )
        res.status(201).json({ ok: true })
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El código ya existe' })
        res.status(500).json({ error: 'Error al crear' })
    }
}

const toggle = async (req, res) => {
    try {
        const { id } = req.params
        const { isActive } = req.body
        await pool.query(`UPDATE discount_codes SET is_active = ? WHERE id = ?`, [isActive, id])
        res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
}

const remove = async (req, res) => {
    try {
        const { id } = req.params
        await pool.query(`DELETE FROM discount_codes WHERE id = ?`, [id])
        res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
}

module.exports = { getAll, create, toggle, remove }