const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/adminProductController')
const { requireAuth } = require('../middleware/requireAuth')

// Todas las rutas admin requieren token válido
router.use(requireAuth)

router.get('/products',              ctrl.getAll)
router.post('/products',             ctrl.create)
router.put('/products/:id',          ctrl.update)
router.post('/products/:id/variants', ctrl.createVariant)
router.put('/variants/:id',          ctrl.updateVariant)
router.get('/categories',            ctrl.getCategories)
router.post('/categories',           ctrl.createCategory)

module.exports = router
