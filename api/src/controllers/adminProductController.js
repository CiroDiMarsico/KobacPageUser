const adminProductModel = require('../models/adminProductModel')

const getAll = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        const products = await adminProductModel.getAll(rubro)
        res.json(products)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener productos' })
    }
}

const getCategories = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        const categories = await adminProductModel.getCategories(rubro)
        res.json(categories)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener categorías' })
    }
}

const create = async (req, res) => {
    try {
        const { name, categoryId, image, salePrice } = req.body
        if (!name || !salePrice) {
            return res.status(400).json({ error: 'Nombre y precio requeridos' })
        }
        const id = await adminProductModel.create({ name, categoryId, image, salePrice })
        res.status(201).json({ ok: true, id })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear producto' })
    }
}

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { name, categoryId, image, salePrice, isActive } = req.body
        await adminProductModel.update(id, { name, categoryId, image, salePrice, isActive })
        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al editar producto' })
    }
}

const createVariant = async (req, res) => {
    try {
        const { id } = req.params
        const { name } = req.body
        if (!name) return res.status(400).json({ error: 'Nombre requerido' })
        const variantId = await adminProductModel.createVariant(id, { name })
        res.status(201).json({ ok: true, id: variantId })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear variante' })
    }
}

const updateVariant = async (req, res) => {
    try {
        const { id } = req.params
        const { name, isActive } = req.body
        await adminProductModel.updateVariant(id, { name, isActive })
        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al editar variante' })
    }
}

const createCategory = async (req, res) => {
    try {
        const { name, parentId } = req.body
        if (!name) return res.status(400).json({ error: 'Nombre requerido' })
        const id = await adminProductModel.createCategory({ name, parentId })
        res.status(201).json({ ok: true, id })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear categoría' })
    }
}

module.exports = { getAll, getCategories, create, update, createVariant, updateVariant, createCategory }
