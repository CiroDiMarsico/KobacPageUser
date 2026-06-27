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

module.exports = { validate, deactivate }