const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { requireAuth } = require('../middleware/requireAuth')

router.post('/login', authController.login)
router.get('/me', requireAuth, authController.me)

module.exports = router
