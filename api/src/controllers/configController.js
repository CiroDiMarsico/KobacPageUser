const configModel = require('../models/configModel')

const getConfig = async (req, res) => {
    try {
        const config = await configModel.getConfig()
        res.json(config)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al obtener configuración' })
    }
}

module.exports = { getConfig }