const uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' })
    }
    // devuelve la ruta pública para guardar en la BD
    const url = `/product-images/${req.file.filename}`
    res.json({ url })
}

module.exports = { uploadImage }
