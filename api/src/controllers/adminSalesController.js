const adminSalesModel = require('../models/adminSalesModel')

const getInProcess = async (req, res) => {
    try {
        const { rubro = 'bebidas' } = req.query
        res.json(await adminSalesModel.getInProcess(rubro))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener ventas' })
    }
}

const getHistory = async (req, res) => {
    try {
        const { rubro = 'bebidas', weeks = 1, date } = req.query
        res.json(await adminSalesModel.getHistory(rubro, Number(weeks), date || null))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener historial' })
    }
}

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status, cancelReason } = req.body
        const valid = ['pending', 'paid', 'shipping', 'delivered', 'cancelled']
        if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' })
        await adminSalesModel.updateStatus(id, status, cancelReason)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar estado' })
    }
}

const updateShipping = async (req, res) => {
    try {
        const { id } = req.params
        const { shippingPrice } = req.body
        if (shippingPrice == null) return res.status(400).json({ error: 'Precio requerido' })
        await adminSalesModel.updateShipping(id, shippingPrice)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar envío' })
    }
}

const updateSale = async (req, res) => {
    try {
        const { id } = req.params
        const { itemPrices, payments, total } = req.body
        await adminSalesModel.updateSale(id, { itemPrices, payments, total })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al editar venta' })
    }
}

const createManual = async (req, res) => {
    try {
        const {
            clientName, clientPhone, location, rubro,
            items, payments, shippingPrice, discountAmount,
            isWholesale, exchangeRate,
            total,    // ← total manual opcional desde el admin
            saleDate  // ← fecha manual opcional (YYYY-MM-DD)
        } = req.body

        if (!items || items.length === 0)
            return res.status(400).json({ error: 'La venta debe tener al menos un item' })
        if (!payments || payments.length === 0)
            return res.status(400).json({ error: 'Indicá el método de pago' })

        const id = await adminSalesModel.createManual({
            clientName, clientPhone, location, rubro,
            items, payments, shippingPrice, discountAmount,
            isWholesale, exchangeRate,
            totalOverride: total != null ? Number(total) : null,
            saleDate: saleDate || null
        })
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al crear venta' })
    }
}

module.exports = { getInProcess, getHistory, updateStatus, updateShipping, updateSale, createManual }