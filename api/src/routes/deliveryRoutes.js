const express = require('express')
const router = express.Router()
const deliveryCtrl = require('../controllers/deliveryController')
const { requireDelivery } = require('../middleware/requireAuth')

router.post('/login', deliveryCtrl.login)

router.get('/orders',              requireDelivery, deliveryCtrl.getOrders)
router.get('/week-summary',        requireDelivery, deliveryCtrl.getWeekSummary)
router.patch('/orders/:id/status', requireDelivery, deliveryCtrl.updateStatus)

module.exports = router
