//npm install mysql2
//npm install dotenv
const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
app.use(cors({ origin: 'http://localhost:5173' }))

app.use(express.json())

// -------------------------------
//-------------ROUTES-------------
// -------------------------------
const productRoutes = require('./src/routes/productRoutes')
app.use('/api/products', productRoutes)

const promoRoutes = require('./src/routes/promoRoutes')
app.use('/api/promos', promoRoutes)

const configRoutes = require('./src/routes/configRoutes')
app.use('/api/config', configRoutes)
// -------------------------------

//port
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})