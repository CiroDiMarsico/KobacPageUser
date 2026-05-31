const promoModel = require('../models/promoModel')

const getAll = async (req, res) => {
    try {
        const { rubro } = req.query
        const promos = await promoModel.getAll(rubro)
        res.json(promos)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener promos' })
    }
}

module.exports = { getAll }