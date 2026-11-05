const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const pool = require('../db/connection')
const adminSalesModel = require('../models/adminSalesModel')

// Panel del cadete: entra con una contraseña propia (DELIVERY_PASSWORD), sin
// acceso al admin. Solo ve pedidos confirmados / en camino y solo puede
// marcarlos "en camino" o "entregado".

const DURACION_SESION = '30d'
const firmarToken = () => jwt.sign({ role: 'delivery' }, process.env.JWT_SECRET, { expiresIn: DURACION_SESION })

const mismaClave = (a, b) => {
    const ha = crypto.createHash('sha256').update(String(a)).digest()
    const hb = crypto.createHash('sha256').update(String(b)).digest()
    return crypto.timingSafeEqual(ha, hb)
}

const login = async (req, res) => {
    const clave = process.env.DELIVERY_PASSWORD
    if (!clave) return res.status(503).json({ error: 'El acceso de delivery no está configurado' })

    const { password } = req.body || {}
    if (!password || !mismaClave(password, clave))
        return res.status(401).json({ error: 'Contraseña incorrecta' })

    res.json({ token: firmarToken() })
}

// Sesión deslizante, como el admin: cada vez que se abre la app se entrega un
// token nuevo de 30 días, así el cadete no vuelve a loguearse mientras la use.
const me = (req, res) => res.json({ token: firmarToken() })

// Solo lo que necesita el cadete (sin costos ni ganancias)
const paraCadete = (s) => ({
    id: s.id,
    rubro: s.rubro,
    status: s.status,
    total: s.total,
    shippingPrice: s.shippingPrice,
    location: s.location,
    scheduledFor: s.scheduledFor,
    createdAt: s.createdAt,
    departureAt: s.departureAt,
    clientName: s.clientName,
    clientPhone: s.clientPhone,
    payments: s.payments,
    items: s.items.map(i => ({
        id: i.id,
        productName: i.productName,
        variantName: i.variantName,
        promoId: i.promoId,
        promoName: i.promoName,
        quantity: i.quantity,
    })),
})

const getOrders = async (req, res) => {
    try {
        const sales = await adminSalesModel.getForDelivery()
        res.json(sales.map(paraCadete))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener pedidos' })
    }
}

const getWeekSummary = async (req, res) => {
    try {
        res.json(await adminSalesModel.getDeliveryWeekSummary())
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener el resumen' })
    }
}

// Pasos que puede hacer el cadete: confirmado → en camino → entregado
const PASOS = {
    shipping: ['paid'],
    delivered: ['paid', 'shipping'],
}

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body || {}
        if (!PASOS[status]) return res.status(400).json({ error: 'Estado inválido' })

        const [[venta]] = await pool.query(`SELECT status FROM sales WHERE id = ?`, [id])
        if (!venta) return res.status(404).json({ error: 'El pedido no existe' })
        if (venta.status === status) return res.json({ ok: true })
        if (!PASOS[status].includes(venta.status))
            return res.status(409).json({ error: 'El pedido ya no está disponible para delivery' })

        await adminSalesModel.updateStatus(id, status)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar el pedido' })
    }
}

module.exports = { me, login, getOrders, getWeekSummary, updateStatus }
