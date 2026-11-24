const pool = require('../db/connection')

// Códigos ilimitados (no se desactivan al usarse). La columna se crea sola la
// primera vez, asi el deploy no necesita correr nada a mano contra la base.
let columnaLista = null
const asegurarColumna = () => {
    if (!columnaLista) {
        columnaLista = (async () => {
            const [[existe]] = await pool.query(`
                SELECT 1 AS ok FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_codes' AND COLUMN_NAME = 'is_unlimited'
            `)
            if (!existe) {
                await pool.query(
                    `ALTER TABLE discount_codes ADD COLUMN is_unlimited BOOLEAN NOT NULL DEFAULT FALSE`
                ).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e })
            }
        })().catch(e => { columnaLista = null; throw e })
    }
    return columnaLista
}

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

module.exports = { asegurarColumna, validate, deactivate }
