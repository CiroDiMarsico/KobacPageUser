const express = require('express')
const router = express.Router()
const productCtrl = require('../controllers/adminProductController')
const promoCtrl   = require('../controllers/adminPromoController')
const stockCtrl   = require('../controllers/adminStockController')
const salesCtrl   = require('../controllers/adminSalesController')
const { requireAuth } = require('../middleware/requireAuth')

router.use(requireAuth)

// ─── Productos ────────────────────────────────────────────────────────────────
router.get('/products',               productCtrl.getAll)
router.post('/products',              productCtrl.create)
router.put('/products/:id',           productCtrl.update)
router.post('/products/:id/variants', productCtrl.createVariant)
router.put('/variants/:id',           productCtrl.updateVariant)
router.get('/categories',             productCtrl.getCategories)
router.post('/categories',            productCtrl.createCategory)

// ─── Promos ───────────────────────────────────────────────────────────────────
router.get('/promos',       promoCtrl.getAll)
router.post('/promos',      promoCtrl.create)
router.put('/promos/:id',   promoCtrl.update)

// ─── Stock ────────────────────────────────────────────────────────────────────
router.get('/stock',                        stockCtrl.getStock)
router.get('/suppliers',                    stockCtrl.getSuppliers)
router.post('/suppliers',                   stockCtrl.createSupplier)
router.post('/purchases',                   stockCtrl.createPurchase)
router.patch('/variants/:variantId/adjust', stockCtrl.adjustStock)

// ─── Ventas ───────────────────────────────────────────────────────────────────
router.get('/sales/inprocess',      salesCtrl.getInProcess)
router.get('/sales/history',        salesCtrl.getHistory)
router.post('/sales',               salesCtrl.createManual)
router.patch('/sales/:id/status',   salesCtrl.updateStatus)
router.patch('/sales/:id/shipping', salesCtrl.updateShipping)
router.put('/sales/:id',            salesCtrl.updateSale)

module.exports = router
