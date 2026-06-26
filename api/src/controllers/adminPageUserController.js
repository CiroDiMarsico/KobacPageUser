const path = require('path')
const fs   = require('fs')
const model = require('../models/adminPageUserModel')

const IMAGES_DIR = path.join(__dirname, '../../public/product-images')

// Borra el archivo físico si la URL apunta a /product-images/
const tryDeleteFile = (url) => {
    const validFolders = ['product-images', 'promo-images', 'carousel-images']
    const folder = validFolders.find(f => url?.startsWith(`/${f}/`))
    if (!folder) return

    const filename = path.basename(url)
    if (filename.includes('..') || filename.includes('/')) return

    const filePath = path.join(__dirname, `../../public/${folder}`, filename)
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (e) {
        console.error('No se pudo borrar el archivo:', filePath, e.message)
    }
}

// ─── CAROUSEL ─────────────────────────────────────────────────────────────────

const getCarousel = async (req, res) => {
    try {
        res.json(await model.getCarousel())
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener carrusel' })
    }
}

// Sube la imagen a /product-images/ y la registra en carousel_images en un paso
const uploadAndAddCarousel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })
        const url = `/carousel-images/${req.file.filename}`
        const id = await model.addCarouselImage(url)
        res.status(201).json({ ok: true, id, url })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al agregar imagen al carrusel' })
    }
}

const updateCarouselImage = async (req, res) => {
    try {
        const { id } = req.params
        const { url, sortOrder, isActive } = req.body
        await model.updateCarouselImage(id, { url, sortOrder, isActive })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar imagen' })
    }
}

// Elimina de la BD y borra el archivo físico del servidor
const deleteCarouselImage = async (req, res) => {
    try {
        const { id } = req.params
        const url = await model.deleteCarouselImage(id)
        tryDeleteFile(url)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al eliminar imagen' })
    }
}

const reorderCarousel = async (req, res) => {
    try {
        const { orderedIds } = req.body
        if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds debe ser un array' })
        await model.reorderCarousel(orderedIds)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al reordenar carrusel' })
    }
}

// ─── MARQUEE ──────────────────────────────────────────────────────────────────

const getMarquee = async (req, res) => {
    try {
        res.json(await model.getMarquee())
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener marquee' })
    }
}

const addMarqueeItem = async (req, res) => {
    try {
        const { text } = req.body
        if (!text) return res.status(400).json({ error: 'Texto requerido' })
        const id = await model.addMarqueeItem(text)
        res.status(201).json({ ok: true, id })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al agregar item' })
    }
}

const updateMarqueeItem = async (req, res) => {
    try {
        const { id } = req.params
        const { text, sortOrder, isActive } = req.body
        await model.updateMarqueeItem(id, { text, sortOrder, isActive })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al actualizar item' })
    }
}

const deleteMarqueeItem = async (req, res) => {
    try {
        const { id } = req.params
        await model.deleteMarqueeItem(id)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al eliminar item' })
    }
}

const reorderMarquee = async (req, res) => {
    try {
        const { orderedIds } = req.body
        if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds debe ser un array' })
        await model.reorderMarquee(orderedIds)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al reordenar marquee' })
    }
}

module.exports = {
    getCarousel, uploadAndAddCarousel, updateCarouselImage, deleteCarouselImage, reorderCarousel,
    getMarquee, addMarqueeItem, updateMarqueeItem, deleteMarqueeItem, reorderMarquee
}
