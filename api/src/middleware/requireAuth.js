const jwt = require('jsonwebtoken')

const leerToken = (req) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token>
    if (!token) return { error: [401, 'Token requerido'] }
    try {
        return { decoded: jwt.verify(token, process.env.JWT_SECRET) }
    } catch (error) {
        return { error: [403, 'Token inválido o expirado'] }
    }
}

// Admin: el token del cadete (role: 'delivery') no sirve para el panel
const requireAuth = (req, res, next) => {
    const { decoded, error } = leerToken(req)
    if (error) return res.status(error[0]).json({ error: error[1] })
    if (decoded.role === 'delivery') return res.status(403).json({ error: 'Sin acceso' })
    req.admin = decoded
    next()
}

// Delivery: entra el cadete o un admin
const requireDelivery = (req, res, next) => {
    const { decoded, error } = leerToken(req)
    if (error) return res.status(error[0]).json({ error: error[1] })
    req.user = decoded
    next()
}

module.exports = { requireAuth, requireDelivery }
