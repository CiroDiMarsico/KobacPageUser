const express = require('express')
const router = express.Router()
const discountController = require('../controllers/discountController')

router.get('/validate/:code', discountController.validate)

module.exports = router