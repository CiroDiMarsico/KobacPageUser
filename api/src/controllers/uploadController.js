const path = require('path')
const fs = require('fs')

const uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' })
    }
    const folder = req.params.folder || 'product-images'
    const url = `/${folder}/${req.file.filename}`
    res.json({ url })
}

const deleteImage = (req, res) => {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL requerida' })

    const validFolders = ['product-images', 'promo-images', 'carousel-images']
    const folder = validFolders.find(f => url.startsWith(`/${f}/`))
    if (!folder) return res.status(400).json({ error: 'Carpeta inválida' })

    const filename = path.basename(url)
    if (filename.includes('..') || filename.includes('/')) return res.status(400).json({ error: 'Archivo inválido' })

    const filePath = path.join(__dirname, `../../public/${folder}`, filename)
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al eliminar imagen' })
    }
}

module.exports = { uploadImage, deleteImage }