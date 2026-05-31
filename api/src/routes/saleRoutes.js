const express = require('express')
const router = express.Router()
const saleController = require('../controllers/saleController')

router.post('/', saleController.create)

module.exports = router