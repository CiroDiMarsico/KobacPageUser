const model = require('../models/adminCierreModel')

const getAvailableWeeks = async (req, res) => {
    try {
        const { rubro = 'bebidas', n = 12 } = req.query
        res.json(await model.getAvailableWeeks(rubro, Number(n)))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener semanas' })
    }
}

const getComparativa = async (req, res) => {
    try {
        const { rubro = 'bebidas', weeks } = req.query
        if (!weeks) return res.status(400).json({ error: 'weeks requerido (array de weekCodes)' })
        const weekCodes = Array.isArray(weeks) ? weeks : weeks.split(',')
        res.json(await model.getComparativa(rubro, weekCodes))
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener comparativa' })
    }
}

const upsertRegistro = async (req, res) => {
    try {
        const { rubro, weekCode, disponibilidad, savings, salaries } = req.body
        if (!rubro || !weekCode) return res.status(400).json({ error: 'rubro y weekCode requeridos' })
        await model.upsertRegistro(rubro, weekCode, { disponibilidad, savings, salaries })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al guardar' })
    }
}

module.exports = { getAvailableWeeks, getComparativa, upsertRegistro }
