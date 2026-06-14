// seed_ventas.js
// Corré con: node seed_ventas.js
// Desde la carpeta /api

const pool = require('./src/db/connection')

// ─── helpers ──────────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const buildWeekCode = (date) => {
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${date.getFullYear()}-M${date.getMonth() + 1}-W${week}`
}

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Fecha aleatoria dentro de los últimos N días
const randomDate = (daysAgo) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(rnd(9, 22), rnd(0, 59), 0, 0)
    return d
}

// ─── seed ─────────────────────────────────────────────────────────────────────
const seed = async () => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        // 1. Traer variantes disponibles con stock > 0 y su precio de venta
        const [variants] = await conn.query(`
            SELECT v.id, v.stock, v.name AS variantName, p.sale_price, p.name AS productName
            FROM variants v
            JOIN products p ON p.id = v.product_id
            WHERE v.is_active = TRUE AND v.stock > 0
        `)

        if (variants.length === 0) {
            console.log('⚠ No hay variantes con stock. Agregá productos y stock primero.')
            await conn.rollback()
            return
        }

        console.log(`✓ ${variants.length} variantes disponibles`)

        // Traer los lotes disponibles por variante
        const variantIds = variants.map(v => v.id)
        const [lots] = await conn.query(`
            SELECT id, variant_id, remaining_quantity, purchase_price
            FROM lots
            WHERE variant_id IN (?) AND remaining_quantity > 0
            ORDER BY created_at ASC
        `, [variantIds])

        // Mapear lotes por variante
        const lotsByVariant = {}
        lots.forEach(l => {
            if (!lotsByVariant[l.variant_id]) lotsByVariant[l.variant_id] = []
            lotsByVariant[l.variant_id].push({ ...l })
        })

        // 2. Generar ventas distribuidas en los últimos 90 días
        // ~3-7 ventas por semana × 13 semanas ≈ 50-90 ventas
        const salesCreated = []
        let totalSkipped = 0

        // Distribuir: más ventas en semanas recientes
        const weeks = [
            { daysFrom: 84, daysTo: 77, count: rnd(2, 4) },
            { daysFrom: 77, daysTo: 70, count: rnd(2, 4) },
            { daysFrom: 70, daysTo: 63, count: rnd(3, 5) },
            { daysFrom: 63, daysTo: 56, count: rnd(3, 5) },
            { daysFrom: 56, daysTo: 49, count: rnd(4, 6) },
            { daysFrom: 49, daysTo: 42, count: rnd(4, 6) },
            { daysFrom: 42, daysTo: 35, count: rnd(4, 7) },
            { daysFrom: 35, daysTo: 28, count: rnd(5, 8) },
            { daysFrom: 28, daysTo: 21, count: rnd(5, 8) },
            { daysFrom: 21, daysTo: 14, count: rnd(6, 9) },
            { daysFrom: 14, daysTo:  7, count: rnd(6, 9) },
            { daysFrom:  7, daysTo:  0, count: rnd(5, 8) },
        ]

        const rubros = ['bebidas', 'vapes']

        for (const week of weeks) {
            for (let s = 0; s < week.count; s++) {
                const daysAgo = rnd(week.daysTo, week.daysFrom)
                const saleDate = randomDate(daysAgo)
                const rubro = pick(rubros)

                // Filtrar variantes del rubro correcto con lotes disponibles
                const [rubVariants] = await conn.query(`
                    SELECT v.id, v.name AS variantName, p.sale_price, p.name AS productName
                    FROM variants v
                    JOIN products p ON p.id = v.product_id
                    JOIN categories c ON c.id = p.category_id
                    LEFT JOIN categories root ON root.id = c.parent_id
                    WHERE (root.name = ? OR c.name = ?)
                      AND v.is_active = TRUE AND v.stock > 0
                `, [rubro, rubro])

                if (rubVariants.length === 0) { totalSkipped++; continue }

                // 1-3 items por venta
                const itemCount = rnd(1, Math.min(3, rubVariants.length))
                const chosenVariants = [...rubVariants].sort(() => 0.5 - Math.random()).slice(0, itemCount)

                const items = []
                let canMakeSale = true

                for (const v of chosenVariants) {
                    const vLots = lotsByVariant[v.id] ?? []
                    const availableStock = vLots.reduce((a, l) => a + l.remaining_quantity, 0)
                    if (availableStock <= 0) continue
                    const qty = rnd(1, Math.min(3, availableStock))
                    items.push({ variantId: v.id, quantity: qty, unitPrice: Number(v.sale_price) })
                }

                if (items.length === 0) { totalSkipped++; continue }

                const shippingPrice = pick([0, 0, 0, 500, 800, 1000])
                const itemsTotal    = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
                const total         = itemsTotal + shippingPrice
                const weekCode      = buildWeekCode(saleDate)
                const method        = pick(['cash', 'transfer', 'cash', 'transfer', 'cash'])

                // Insertar venta directamente con fecha artificial
                const [saleRes] = await conn.query(`
                    INSERT INTO sales
                      (rubro, status, total, shipping_price, location, discount_amount, week_code, created_at, updated_at, arrived_at)
                    VALUES (?, 'delivered', ?, ?, ?, 0, ?, ?, ?, ?)
                `, [rubro, total, shippingPrice, pick(['Alta Gracia', 'Centro', 'Los Artesanos', null]),
                    weekCode, saleDate, saleDate, saleDate])

                const saleId = saleRes.insertId

                // Insertar items y descontar FIFO de los lotes en memoria
                for (const item of items) {
                    const [siRes] = await conn.query(`
                        INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price)
                        VALUES (?, ?, ?, ?)
                    `, [saleId, item.variantId, item.quantity, item.unitPrice])

                    const saleItemId = siRes.insertId
                    let remaining = item.quantity
                    const vLots = lotsByVariant[item.variantId] ?? []

                    for (const lot of vLots) {
                        if (remaining <= 0) break
                        if (lot.remaining_quantity <= 0) continue
                        const toDiscount = Math.min(lot.remaining_quantity, remaining)

                        await conn.query(`
                            UPDATE lots SET remaining_quantity = remaining_quantity - ? WHERE id = ?
                        `, [toDiscount, lot.id])

                        await conn.query(`
                            INSERT INTO stock_movements (variant_id, lot_id, sale_item_id, type, quantity, reason)
                            VALUES (?, ?, ?, 'out', ?, 'sale')
                        `, [item.variantId, lot.id, saleItemId, toDiscount])

                        lot.remaining_quantity -= toDiscount
                        remaining -= toDiscount
                    }

                    await conn.query(`
                        UPDATE variants SET stock = GREATEST(0, stock - ?) WHERE id = ?
                    `, [item.quantity, item.variantId])
                }

                // Pago
                await conn.query(`
                    INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, ?, ?)
                `, [saleId, method, total])

                salesCreated.push(saleId)
            }
        }

        await conn.commit()
        console.log(`✓ ${salesCreated.length} ventas creadas (${totalSkipped} saltadas por falta de stock)`)
        console.log('  IDs:', salesCreated.join(', '))

    } catch (e) {
        await conn.rollback()
        console.error('✗ Error en seed:', e.message)
        throw e
    } finally {
        conn.release()
        await pool.end()
    }
}

seed()
