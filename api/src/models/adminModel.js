const pool = require('../db/connection')
const bcrypt = require('bcryptjs')

const findByUsername = async (username) => {
    const [[admin]] = await pool.query(
        `SELECT * FROM admins WHERE username = ?`, [username]
    )
    return admin || null
}

const verifyPassword = async (plainPassword, hash) => {
    return bcrypt.compare(plainPassword, hash)
}

module.exports = { findByUsername, verifyPassword }
