const adminPromoModel = require('../models/adminPromoModel')

const getAll = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        const promos = await adminPromoModel.getAll(rubro)
        res.json(promos)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener promos' })
    }
}

const create = async (req, res) => {
    try {
        const { name, image, price, rubro, items } = req.body
        if (!name || !price || !rubro) return res.status(400).json({ error: 'Nombre, precio y rubro son obligatorios' })
        if (!items || items.length === 0) return res.status(400).json({ error: 'La promo debe tener al menos un producto' })
        const id = await adminPromoModel.create({ name, image, price, rubro, items })
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al crear promo' })
    }
}

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { name, image, price, isActive, items } = req.body
        await adminPromoModel.update(id, { name, image, price, isActive, items })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al editar promo' })
    }
}

module.exports = { getAll, create, update }
