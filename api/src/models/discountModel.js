const pool = require('../db/connection')

const validate = async (code) => {
    const [[discount]] = await pool.query(`
        SELECT * FROM discount_codes
        WHERE code = ?
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [code])
    return discount || null
}

const deactivate = async (conn, code) => {
    const db = (code !== undefined) ? conn : pool
    const targetCode = (code !== undefined) ? code : conn
    await db.query(`
        UPDATE discount_codes SET is_active = FALSE
        WHERE code = ?
    `, [targetCode])
}

// Cupon generado por la ruleta del home. Devuelve false si el codigo random
// choco con uno existente, para que el controller pruebe con otro.
const createSpinCode = async ({ code, discountType, discountValue, expiresAt }) => {
    try {
        await pool.query(`
            INSERT INTO discount_codes (code, discount_type, discount_value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [code, discountType, discountValue, expiresAt])
        return true
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return false
        throw e
    }
}

module.exports = { validate, deactivate, createSpinCode }