const clientModel = require('../models/clientModel')
const saleModel = require('../models/saleModel')
const discountModel = require('../models/discountModel')
const pool = require('../db/connection')

const create = async (req, res) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const { informacion, carrito, rubro, discount, payments, location } = req.body

        const clientId = await clientModel.findOrCreate(informacion.nombre, informacion.telefono)

        const now = new Date()
        const weekCode = buildWeekCode(now)

        // Recalcular subtotal en el servidor desde la base de datos
        let calculatedSubtotal = 0
        const items = []

        for (const item of carrito) {
            if (item.isPromo) {
                const [[promo]] = await conn.query(
                    `SELECT price FROM promos WHERE id = ? AND is_active = TRUE`,
                    [item.idPromo]
                )
                const promoPrice = promo ? Number(promo.price) : 0
                const promoQty = item.cantidad || 1
                calculatedSubtotal += promoPrice * promoQty

                for (const [productId, variants] of Object.entries(item.selecciones || {})) {
                    for (const [variantId, quantity] of Object.entries(variants)) {
                        if (quantity > 0) {
                            items.push({
                                variantId: Number(variantId),
                                promoId: item.idPromo,
                                quantity: Number(quantity),
                                unitPrice: 0
                            })
                        }
                    }
                }
            } else {
                for (const [variantId, quantity] of Object.entries(item.variants || {})) {
                    if (quantity > 0) {
                        const [[product]] = await conn.query(
                            `SELECT p.sale_price FROM products p
                             JOIN variants v ON v.product_id = p.id
                             WHERE v.id = ?`,
                            [variantId]
                        )
                        const unitPrice = product ? Number(product.sale_price) : 0
                        calculatedSubtotal += unitPrice * Number(quantity)
                        items.push({
                            variantId: Number(variantId),
                            promoId: null,
                            quantity: Number(quantity),
                            unitPrice
                        })
                    }
                }
            }
        }

        // Validar código de descuento en servidor si fue proporcionado
        let discountCodeId = null
        let discountAmount = 0

        if (discount?.code) {
            const [[validDiscount]] = await conn.query(`
                SELECT * FROM discount_codes
                WHERE code = ? AND is_active = TRUE
                AND (expires_at IS NULL OR expires_at > NOW())
            `, [discount.code])

            if (validDiscount) {
                discountCodeId = validDiscount.id
                if (validDiscount.discount_type === 'percentage') {
                    discountAmount = Math.round((calculatedSubtotal * Number(validDiscount.discount_value)) / 100)
                } else {
                    discountAmount = Number(validDiscount.discount_value)
                }
            }
        }

        const calculatedTotal = Math.max(0, calculatedSubtotal - discountAmount)

        const saleId = await saleModel.create(conn, {
            clientId, rubro, total: calculatedTotal, discountCodeId, discountAmount, weekCode,
            location: location || null
        })

        // Asignar saleId a cada item
        for (const item of items) {
            item.saleId = saleId
        }

        const adjustedPayments = (payments || []).map(p => ({
            ...p,
            amount: calculatedTotal
        }))

        await saleModel.createItems(conn, items)
        await saleModel.createPayments(conn, saleId, adjustedPayments)

        if (discount?.code && discountCodeId) {
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

const buildWeekCode = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const isoYear = d.getUTCFullYear()
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${isoYear}-W${week}`
}

module.exports = { create }