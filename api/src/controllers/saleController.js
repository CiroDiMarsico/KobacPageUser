const clientModel = require('../models/clientModel')
const saleModel = require('../models/saleModel')
const discountModel = require('../models/discountModel')
const pool = require('../db/connection')

// Vapes: 25% off en cada unidad par (2da, 4ta...), contando todas las unidades de
// vapes del carrito juntas en el orden en que vienen. Tiene que coincidir con
// my-app/src/utils/descuentoVapes.js.
const PORCENTAJE_DESCUENTO_VAPES = 25

// Productos de "otros" sumados desde una promo: 10% off. Tiene que coincidir con
// my-app/src/utils/otros.js.
const PORCENTAJE_DESCUENTO_EXTRAS_PROMO = 10

const create = async (req, res) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const { informacion, carrito, rubro, discount, payments, location } = req.body

        const clientId = await clientModel.findOrCreate(informacion.nombre, informacion.telefono)

        const now = new Date()
        const weekCode = buildWeekCode(now)

        // Recalcular subtotal en el servidor desde la base de datos
        let subtotalProductos = 0
        let subtotalPromos = 0
        let unidadesVapes = 0
        let descuentoVapes = 0
        const items = []

        for (const item of carrito) {
            if (item.isPromo) {
                const [[promo]] = await conn.query(
                    `SELECT price FROM promos WHERE id = ? AND is_active = TRUE`,
                    [item.idPromo]
                )
                const promoPrice = promo ? Number(promo.price) : 0
                const promoQty = item.cantidad || 1
                subtotalPromos += promoPrice * promoQty  // NO entra al subtotal con descuento

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

                // Extras de "otros" sumados desde la promo: 10% off si la promo existe.
                // Van al subtotal de promos, asi el cupon no se les aplica encima.
                for (const extra of item.extras || []) {
                    const quantity = Number(extra.cantidad)
                    if (!(quantity > 0)) continue
                    const [[product]] = await conn.query(
                        `SELECT p.sale_price, LOWER(c.name) = 'otros' AS is_otros
                 FROM products p
                 JOIN variants v ON v.product_id = p.id
                 LEFT JOIN categories c ON c.id = p.category_id
                 WHERE v.id = ?`,
                        [extra.variantId]
                    )
                    const salePrice = product ? Number(product.sale_price) : 0
                    const conDescuento = promo && product?.is_otros
                    const unitPrice = conDescuento
                        ? Math.round(salePrice * (100 - PORCENTAJE_DESCUENTO_EXTRAS_PROMO) / 100)
                        : salePrice
                    if (conDescuento) subtotalPromos += unitPrice * quantity
                    else subtotalProductos += unitPrice * quantity
                    items.push({
                        variantId: Number(extra.variantId),
                        promoId: null,
                        quantity,
                        unitPrice
                    })
                }
            } else {
                for (const [variantId, quantity] of Object.entries(item.variants || {})) {
                    if (quantity > 0) {
                        const [[product]] = await conn.query(
                            `SELECT p.sale_price,
                            (LOWER(c.name) = 'vapes' OR LOWER(root.name) = 'vapes') AS is_vape
                     FROM products p
                     JOIN variants v ON v.product_id = p.id
                     LEFT JOIN categories c ON c.id = p.category_id
                     LEFT JOIN categories root ON root.id = c.parent_id
                     WHERE v.id = ?`,
                            [variantId]
                        )
                        const unitPrice = product ? Number(product.sale_price) : 0
                        subtotalProductos += unitPrice * Number(quantity)  // SÍ entra al subtotal con descuento

                        if (product?.is_vape) {
                            const descuentoUnidad = Math.round(unitPrice * PORCENTAJE_DESCUENTO_VAPES / 100)
                            for (let i = 0; i < Number(quantity); i++) {
                                unidadesVapes++
                                if (unidadesVapes % 2 === 0) descuentoVapes += descuentoUnidad
                            }
                        }
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

        // El descuento de vapes queda dentro del total (no en discount_amount, que es del cupón)
        subtotalProductos -= descuentoVapes

        // Validar código de descuento — se calcula SOLO sobre subtotalProductos
        let discountCodeId = null
        let discountAmount = 0

        if (discount?.code) {
            const [[validDiscount]] = await conn.query(`
        SELECT * FROM discount_codes
        WHERE code = ?
        FOR UPDATE
    `, [discount.code])

            const isValid = validDiscount
                && validDiscount.is_active
                && (!validDiscount.expires_at || new Date(validDiscount.expires_at) > new Date())

            if (!isValid) {
                const err = new Error('Discount code invalid')
                err.code = 'DISCOUNT_INVALID'
                throw err
            }

            discountCodeId = validDiscount.id
            if (validDiscount.discount_type === 'percentage') {
                discountAmount = Math.round((subtotalProductos * Number(validDiscount.discount_value)) / 100)
            } else {
                discountAmount = Number(validDiscount.discount_value)
            }
            // Nunca descontar más de lo que hay en productos (evita que "se lleve" plata de las promos)
            discountAmount = Math.min(discountAmount, subtotalProductos)
        }

        const calculatedTotal = Math.max(0, subtotalProductos - discountAmount) + subtotalPromos

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
        if (error.code === 'DISCOUNT_INVALID') {
            return res.status(409).json({ code: 'DISCOUNT_INVALID' })
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