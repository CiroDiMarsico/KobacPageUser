const adminStockModel = require('../models/adminStockModel')

const getStock = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        const stock = await adminStockModel.getStock(rubro)
        res.json(stock)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener stock' })
    }
}

const getSuppliers = async (req, res) => {
    try {
        const suppliers = await adminStockModel.getSuppliers()
        res.json(suppliers)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener proveedores' })
    }
}

const createSupplier = async (req, res) => {
    try {
        const { name, phone } = req.body
        if (!name) return res.status(400).json({ error: 'Nombre requerido' })
        const id = await adminStockModel.createSupplier(name, phone)
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al crear proveedor' })
    }
}

const createPurchase = async (req, res) => {
    try {
        const { supplierId, rubro, items } = req.body
        if (!items || items.length === 0)
            return res.status(400).json({ error: 'La compra debe tener al menos un item' })
        if (items.some(i => !i.variantId || !i.quantity || !i.unitPrice))
            return res.status(400).json({ error: 'Cada item necesita variante, cantidad y precio' })
        const id = await adminStockModel.createPurchase({ supplierId, rubro, items })
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al registrar compra' })
    }
}

const adjustStock = async (req, res) => {
    try {
        const { variantId } = req.params
        const { stockReal } = req.body
        if (stockReal == null || stockReal < 0)
            return res.status(400).json({ error: 'Stock real inválido' })
        await adminStockModel.adjustStock(variantId, stockReal)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al ajustar stock' })
    }
}

module.exports = { getStock, getSuppliers, createSupplier, createPurchase, adjustStock }
