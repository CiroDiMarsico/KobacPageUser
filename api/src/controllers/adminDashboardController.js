const model = require('../models/adminDashboardModel')

const getSalesChart = async (req, res) => {
    try {
        const { rubro = 'bebidas', period = 'dias' } = req.query
        res.json(await model.getSalesChart(rubro, period))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener gráfico de ventas' })
    }
}

const getKPIs = async (req, res) => {
    try {
        const { rubro = 'bebidas', period = 'dias' } = req.query
        res.json(await model.getKPIs(rubro, period))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener KPIs' })
    }
}

const getTopProducts = async (req, res) => {
    try {
        const { rubro = 'bebidas', period = 'siempre' } = req.query
        res.json(await model.getTopProducts(rubro, period))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener top productos' })
    }
}

const getLowStock = async (req, res) => {
    try {
        const { rubro = 'bebidas', threshold = 5 } = req.query
        res.json(await model.getLowStock(rubro, Number(threshold)))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener stock bajo' })
    }
}

const getLastPrices = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        res.json(await model.getLastPrices(rubro))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener últimos precios' })
    }
}

module.exports = { getSalesChart, getKPIs, getTopProducts, getLowStock, getLastPrices }
