const pool = require('../db/connection')

const findOrCreate = async (nombre, telefono) => {
    const [[existing]] = await pool.query(
        `SELECT id FROM clients WHERE phone = ?`, [telefono]
    )
    if (existing) return existing.id

    const [result] = await pool.query(
        `INSERT INTO clients (name, phone) VALUES (?, ?)`, [nombre, telefono]
    )
    return result.insertId
}

module.exports = { findOrCreate }