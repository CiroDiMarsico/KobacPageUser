const express = require('express')
const router = express.Router()
const createUpload = require('../middleware/upload')
const { uploadImage, deleteImage } = require('../controllers/uploadController')
const { requireAuth } = require('../middleware/requireAuth')

const ALLOWED_FOLDERS = ['product-images', 'promo-images', 'carousel-images']

router.post('/upload-image/:folder', requireAuth, (req, res, next) => {
    const folder = ALLOWED_FOLDERS.includes(req.params.folder)
        ? req.params.folder
        : 'product-images'
    createUpload(folder).single('image')(req, res, next)
}, uploadImage)

router.delete('/upload-image', requireAuth, deleteImage)

module.exports = router