const clientModel = require('../models/clientModel')
const saleModel = require('../models/saleModel')
const discountModel = require('../models/discountModel')
const pool = require('../db/connection')

const create = async (req, res) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const { informacion, carrito, rubro, discount, payments, total, location } = req.body

        const clientId = await clientModel.findOrCreate(informacion.nombre, informacion.telefono)

        const now = new Date()
        const year = now.getFullYear()
        const week = String(getWeekNumber(now)).padStart(2, '0')
        const month = now.getMonth() + 1
        const weekCode = `${year}-M${month}-W${week}`

        const discountCodeId = discount?.id || null
        const discountAmount = discount?.amount || 0

        const saleId = await saleModel.create(conn, {
            clientId, rubro, total, discountCodeId, discountAmount, weekCode,
            location: location || null
        })

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
                                quantity: Number(quantity),
                                unitPrice: 0
                            })
                        }
                    }
                }
            } else {
                for (const [variantId, quantity] of Object.entries(item.variants)) {
                    if (quantity > 0) {
                        items.push({
                            saleId,
                            variantId: Number(variantId),
                            promoId: null,
                            quantity: Number(quantity),
                            unitPrice: item.precio
                        })
                    }
                }
            }
        }

        await saleModel.createItems(conn, items)
        await saleModel.createPayments(conn, saleId, payments)

        if (discount?.code) {
            await discountModel.deactivate(conn, discount.code)
        }

        await conn.commit()
        res.json({ ok: true, saleId })

    } catch (error) {
        await conn.rollback()
        console.error(error)
        if (error.code === 'OUT_OF_STOCK') {
            return res.status(409).json({
                code: 'OUT_OF_STOCK',
                agotados: error.agotados,
                parciales: error.parciales
            })
        }
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