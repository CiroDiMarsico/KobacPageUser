const express = require('express')
const router = express.Router()
const deliveryCtrl = require('../controllers/deliveryController')
const pushCtrl = require('../controllers/pushController')
const { requireDelivery } = require('../middleware/requireAuth')

router.post('/login', deliveryCtrl.login)
router.get('/me', requireDelivery, deliveryCtrl.me)

router.get('/orders',              requireDelivery, deliveryCtrl.getOrders)
router.get('/week-summary',        requireDelivery, deliveryCtrl.getWeekSummary)
router.patch('/orders/:id/status', requireDelivery, deliveryCtrl.updateStatus)

// Notificaciones de pedidos confirmados
router.get('/push/public-key',   requireDelivery, pushCtrl.getPublicKey)
router.post('/push/subscribe',   requireDelivery, pushCtrl.subscribeDelivery)
router.post('/push/unsubscribe', requireDelivery, pushCtrl.unsubscribe)

module.exports = router
