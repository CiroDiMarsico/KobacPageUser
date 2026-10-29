const express = require('express')
const router = express.Router()
const discountController = require('../controllers/discountController')

router.get('/validate/:code', discountController.validate)
router.get('/spin/status', discountController.spinStatus)
router.post('/spin', discountController.spin)

module.exports = router