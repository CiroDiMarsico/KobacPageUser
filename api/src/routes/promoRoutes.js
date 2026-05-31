const express = require('express')
const router = express.Router()
const promoController = require('../controllers/promoController')

router.get('/', promoController.getAll)

module.exports = router