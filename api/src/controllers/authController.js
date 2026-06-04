const adminModel = require('../models/adminModel')
const jwt = require('jsonwebtoken')

const login = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
        }

        const admin = await adminModel.findByUsername(username)
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        const valid = await adminModel.verifyPassword(password, admin.password_hash)
        if (!valid) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        res.json({ token, username: admin.username })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al iniciar sesión' })
    }
}

// Verifica que el token sigue siendo válido (para el front al cargar)
const me = async (req, res) => {
    res.json({ id: req.admin.id, username: req.admin.username })
}

module.exports = { login, me }
