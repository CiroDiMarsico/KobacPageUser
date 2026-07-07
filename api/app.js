//npm install mysql2
//npm install dotenv
//npm install express
//npm install cors
//npm install nodemon
//npm install multer

process.env.TZ = 'America/Argentina/Buenos_Aires'

const express = require('express')
const path = require('path')
require('dotenv').config()
const app = express()
const cors = require('cors')
app.use(cors({ origin: '*' }))

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ limit: '20mb', extended: true }))

app.use(express.static(path.join(__dirname, 'public')))
// -------------------------------
//-------------ROUTES-------------
// -------------------------------
const productRoutes = require('./src/routes/productRoutes')
app.use('/api/products', productRoutes)

const promoRoutes = require('./src/routes/promoRoutes')
app.use('/api/promos', promoRoutes)

const configRoutes = require('./src/routes/configRoutes')
app.use('/api/config', configRoutes)

const discountRoutes = require('./src/routes/discountRoutes')
app.use('/api/discounts', discountRoutes)

const saleRoutes = require('./src/routes/saleRoutes')
app.use('/api/sales', saleRoutes)

const authRoutes = require('./src/routes/authRoutes')
app.use('/api/auth', authRoutes)

const adminRoutes = require('./src/routes/adminRoutes')
app.use('/api/admin', adminRoutes)

const uploadRoutes = require('./src/routes/uploadRoutes')
app.use('/api/admin', uploadRoutes)

const aiRoutes = require('./src/routes/aiRoutes')
app.use('/api/ai', aiRoutes)
// -------------------------------

//port
const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})