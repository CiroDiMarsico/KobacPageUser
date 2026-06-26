// api/src/routes/aiRoutes.js

const express = require('express')
const router = express.Router()
const { scanReceipt } = require('../controllers/aiController')
const { requireAuth } = require('../middleware/requireAuth')

// POST /api/ai/scan-receipt
// Recibe la imagen en base64, la manda a Gemini y devuelve los items detectados
router.post('/scan-receipt', requireAuth, scanReceipt)

module.exports = router
