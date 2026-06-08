const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')
const { uploadImage } = require('../controllers/uploadController')
const { requireAuth } = require('../middleware/requireAuth')

// POST /api/admin/upload-image
router.post('/upload-image', requireAuth, upload.single('image'), uploadImage)

module.exports = router
