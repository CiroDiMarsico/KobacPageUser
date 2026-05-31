const productModel = require('../models/productModel')

const getAll = async (req, res) => {
    try {
        const { rubro } = req.query
        const products = await productModel.getAll(rubro)
        res.json(products)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener productos' })
    }
}

module.exports = { getAll }