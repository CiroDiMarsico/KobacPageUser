const adminModel = require('../models/adminModel')
const jwt = require('jsonwebtoken')

// Sesion deslizante: el token dura 30 dias y /me entrega uno nuevo cada vez
// que se abre el panel, asi el admin instalado en el celular no pide login
// mientras se use al menos una vez por mes.
const DURACION_SESION = '30d'

const firmarToken = (admin) => jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: DURACION_SESION }
)

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

        const token = firmarToken(admin)

        res.json({ token, username: admin.username })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al iniciar sesión' })
    }
}

// Verifica que el token sigue siendo válido (para el front al cargar) y lo renueva
const me = async (req, res) => {
    const { id, username } = req.admin
    res.json({ id, username, token: firmarToken({ id, username }) })
}

module.exports = { login, me }
