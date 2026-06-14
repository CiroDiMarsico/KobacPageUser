const model = require('../models/adminClientesModel')

const getTopClientes = async (req, res) => {
    try {
        const { rubro = 'todos', period = 'siempre', orderBy = 'totalGastado' } = req.query
        res.json(await model.getTopClientes(rubro, period, orderBy))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener ranking de clientes' })
    }
}

const getClienteDetalle = async (req, res) => {
    try {
        const { id } = req.params
        const data = await model.getClienteDetalle(id)
        if (!data) return res.status(404).json({ error: 'Cliente no encontrado' })
        res.json(data)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener detalle del cliente' })
    }
}

const getStatsGenerales = async (req, res) => {
    try {
        res.json(await model.getStatsGenerales())
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener stats de clientes' })
    }
}

module.exports = { getTopClientes, getClienteDetalle, getStatsGenerales }
