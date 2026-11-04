const adminProductModel = require('../models/adminProductModel')
const productDiscountModel = require('../models/productDiscountModel')

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
        const { name, description } = req.body
        if (!name) return res.status(400).json({ error: 'Nombre requerido' })
        const variantId = await adminProductModel.createVariant(id, { name, description })
        res.status(201).json({ ok: true, id: variantId })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al crear variante' })
    }
}

const updateVariant = async (req, res) => {
    try {
        const { id } = req.params
        const { name, isActive, description } = req.body
        await adminProductModel.updateVariant(id, { name, isActive, description })
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

// Aplica (o quita, con 0) un % de descuento a varios productos a la vez
const setDiscount = async (req, res) => {
    try {
        const { ids, percent } = req.body || {}
        const pct = Number(percent)
        const idsValidos = Array.isArray(ids) ? ids.map(Number).filter(n => Number.isInteger(n) && n > 0) : []
        if (idsValidos.length === 0) return res.status(400).json({ error: 'Elegí al menos un producto' })
        if (!Number.isInteger(pct) || pct < 0 || pct > 99)
            return res.status(400).json({ error: 'El descuento tiene que ser un número entero entre 0 y 99' })
        const actualizados = await productDiscountModel.setDiscount(idsValidos, pct)
        res.json({ ok: true, actualizados })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al aplicar el descuento' })
    }
}

module.exports = { setDiscount, getAll, getCategories, create, update, createVariant, updateVariant, createCategory }
