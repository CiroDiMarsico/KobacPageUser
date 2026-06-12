const clientModel = require('../models/clientModel')
const saleModel = require('../models/saleModel')
const discountModel = require('../models/discountModel')
const pool = require('../db/connection')

const create = async (req, res) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const { informacion, carrito, rubro, discount, payments, total, location } = req.body

        // 1. cliente
        const clientId = await clientModel.findOrCreate(informacion.nombre, informacion.telefono)

        // 2. week_code
        const now = new Date()
        const year = now.getFullYear()
        const week = String(getWeekNumber(now)).padStart(2, '0')
        const month = now.getMonth() + 1
        const weekCode = `${year}-M${month}-W${week}`

        // 3. total y descuento
        const discountCodeId = discount?.id || null
        const discountAmount = discount?.amount || 0

        // 4. crear venta con location
        const saleId = await saleModel.create(conn, {
            clientId, rubro, total, discountCodeId, discountAmount, weekCode,
            location: location || null
        })

        // 5. armar sale_items desde el carrito
        const items = []

        for (const item of carrito) {
            if (item.isPromo) {
                for (const [productId, variants] of Object.entries(item.selecciones)) {
                    for (const [variantId, quantity] of Object.entries(variants)) {
                        if (quantity > 0) {
                            items.push({
                                saleId,
                                variantId: Number(variantId),
                                promoId: item.idPromo,
                                quantity,
                                unitPrice: 0
                            })
                        }
                    }
                }
            } else {
                for (const [variantId, quantity] of Object.entries(item.variants)) {
                    items.push({
                        saleId,
                        variantId: Number(variantId),
                        promoId: null,
                        quantity,
                        unitPrice: item.precio
                    })
                }
            }
        }

        // 6. crear items y descontar stock FIFO
        await saleModel.createItems(conn, items)

        // 7. pagos
        await saleModel.createPayments(conn, saleId, payments)

        // 8. desactivar código de descuento
        if (discount?.code) {
            await discountModel.deactivate(conn, discount.code)
        }

        await conn.commit()
        res.json({ ok: true, saleId })

    } catch (error) {
        await conn.rollback()
        console.error(error)
        res.status(500).json({ error: 'Error al registrar la venta' })
    } finally {
        conn.release()
    }
}

const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

module.exports = { create }
