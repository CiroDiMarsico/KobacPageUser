const express = require('express')
const upload = require('../middleware/upload')
const router = express.Router()
const productCtrl = require('../controllers/adminProductController')
const promoCtrl   = require('../controllers/adminPromoController')
const stockCtrl   = require('../controllers/adminStockController')
const salesCtrl   = require('../controllers/adminSalesController')
const pageUserCtrl = require('../controllers/adminPageUserController')
const dashCtrl = require('../controllers/adminDashboardController')
const clientesCtrl = require('../controllers/adminClientesController')
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

// ─── Page User ────────────────────────────────────────────────────────────────
router.get('/page-user/carousel',              pageUserCtrl.getCarousel)
router.post('/page-user/carousel',             upload.single('image'), pageUserCtrl.uploadAndAddCarousel)
router.post('/page-user/carousel/reorder',     pageUserCtrl.reorderCarousel)
router.put('/page-user/carousel/:id',          pageUserCtrl.updateCarouselImage)
router.delete('/page-user/carousel/:id',       pageUserCtrl.deleteCarouselImage)

router.get('/page-user/marquee',               pageUserCtrl.getMarquee)
router.post('/page-user/marquee',              pageUserCtrl.addMarqueeItem)
router.post('/page-user/marquee/reorder',      pageUserCtrl.reorderMarquee)
router.put('/page-user/marquee/:id',           pageUserCtrl.updateMarqueeItem)
router.delete('/page-user/marquee/:id',        pageUserCtrl.deleteMarqueeItem)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/sales-chart',   dashCtrl.getSalesChart)
router.get('/dashboard/kpis',          dashCtrl.getKPIs)
router.get('/dashboard/top-products',  dashCtrl.getTopProducts)
router.get('/dashboard/low-stock',     dashCtrl.getLowStock)
router.get('/dashboard/last-prices',   dashCtrl.getLastPrices)
router.get('/clientes/stats',       clientesCtrl.getStatsGenerales)
router.get('/clientes/top',         clientesCtrl.getTopClientes)
router.get('/clientes/:id',         clientesCtrl.getClienteDetalle)



module.exports = router
