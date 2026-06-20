const model = require('../models/adminGastosModel')

const getAll = async (req, res) => {
    try {
        const { rubro = 'bebidas', weeks = 1, date } = req.query
        res.json(await model.getAll(rubro, Number(weeks), date || null))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener gastos' })
    }
}

const getCategories = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        res.json(await model.getCategories(rubro))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener categorías' })
    }
}

const create = async (req, res) => {
    try {
        const { rubro, category, description, unitPrice, quantity, total, date } = req.body
        if (!rubro || !category || total == null)
            return res.status(400).json({ error: 'Rubro, categoría y total son obligatorios' })
        const id = await model.create({ rubro, category, description, unitPrice, quantity, total, date })
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al crear gasto' })
    }
}

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { category, description, unitPrice, quantity, total, date } = req.body
        if (!category || total == null)
            return res.status(400).json({ error: 'Categoría y total son obligatorios' })
        await model.update(id, { category, description, unitPrice, quantity, total, date })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar gasto' })
    }
}

const remove = async (req, res) => {
    try {
        const { id } = req.params
        await model.remove(id)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al eliminar gasto' })
    }
}

const getStats = async (req, res) => {
    try {
        const { rubro = 'bebidas', weeks = 4 } = req.query
        res.json(await model.getStats(rubro, Number(weeks)))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener estadísticas' })
    }
}

module.exports = { getAll, getCategories, create, update, remove, getStats }
