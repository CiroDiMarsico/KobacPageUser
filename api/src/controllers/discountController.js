const discountModel = require('../models/discountModel')

const validate = async (req, res) => {
    try {
        const { code } = req.params
        const discount = await discountModel.validate(code)
        if (!discount) return res.status(404).json({ error: 'Código inválido o expirado' })
        res.json(discount)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al validar código' })
    }
}

const deactivate = async (req, res) => {
    try {
        const { code } = req.params
        await discountModel.deactivate(code)
        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al desactivar código' })
    }
}

module.exports = { validate, deactivate }