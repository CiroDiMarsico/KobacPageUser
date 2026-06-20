const pool = require('../db/connection')

// ─── helpers ──────────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const buildWeekCode = (date = new Date()) => {
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${date.getFullYear()}-M${date.getMonth() + 1}-W${week}`
}

const periodFromWeekCode = (weekCode) => {
    const match = weekCode.match(/^(\d{4})-M\d+-W(\d+)$/)
    if (!match) {
        const today = new Date().toISOString().split('T')[0]
        return { periodStart: today, periodEnd: today }
    }
    const year = parseInt(match[1])
    const week = parseInt(match[2])
    const jan4    = new Date(Date.UTC(year, 0, 4))
    const jan4Day = jan4.getUTCDay() || 7
    const monday  = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7)
    const sunday  = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    return {
        periodStart: monday.toISOString().split('T')[0],
        periodEnd:   sunday.toISOString().split('T')[0],
    }
}

const dateStr = (v) => {
    if (!v) return null
    if (v instanceof Date) return v.toISOString().split('T')[0]
    return String(v).split('T')[0]
}

// ─── GET semanas disponibles ──────────────────────────────────────────────────
const getAvailableWeeks = async (rubro, n = 12) => {
    const [rows] = await pool.query(`
        SELECT DISTINCT week_code FROM (
            SELECT week_code FROM sales          WHERE rubro = ? AND status = 'delivered'
            UNION
            SELECT week_code FROM purchases      WHERE rubro = ?
            UNION
            SELECT week_code FROM expenses       WHERE rubro = ?
            UNION
            SELECT week_code FROM cash_registers WHERE rubro = ?
        ) t
        ORDER BY week_code DESC
        LIMIT ?
    `, [rubro, rubro, rubro, rubro, n])

    const currentWeek = buildWeekCode(new Date())
    const codes = rows.map(r => r.week_code)
    if (!codes.includes(currentWeek)) codes.unshift(currentWeek)
    return codes.slice(0, n)
}

// ─── GET DATA DE UNA SEMANA ───────────────────────────────────────────────────
const getWeekData = async (rubro, weekCode) => {

    // ventas minoristas entregadas (is_wholesale = FALSE)
    const [[minorista]] = await pool.query(`
        SELECT
            COALESCE(SUM(s.total - s.discount_amount), 0) AS total,
            COUNT(DISTINCT s.id)                           AS cantidad
        FROM sales s
        WHERE s.rubro = ? AND s.week_code = ?
          AND s.status = 'delivered' AND s.is_wholesale = FALSE
    `, [rubro, weekCode])

    // ventas mayoristas entregadas (is_wholesale = TRUE)
    const [[mayorista]] = await pool.query(`
        SELECT
            COALESCE(SUM(s.total - s.discount_amount), 0) AS total,
            COUNT(DISTINCT s.id)                           AS cantidad
        FROM sales s
        WHERE s.rubro = ? AND s.week_code = ?
          AND s.status = 'delivered' AND s.is_wholesale = TRUE
    `, [rubro, weekCode])

    // compras
    const [[compras]] = await pool.query(`
        SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
        FROM purchases
        WHERE rubro = ? AND week_code = ?
    `, [rubro, weekCode])

    // gastos (con detalle por categoría)
    const [[gastos]] = await pool.query(`
        SELECT COALESCE(SUM(total), 0) AS total
        FROM expenses
        WHERE rubro = ? AND week_code = ?
    `, [rubro, weekCode])

    const [gastosCat] = await pool.query(`
        SELECT category, SUM(total) AS total, COUNT(*) AS cantidad
        FROM expenses
        WHERE rubro = ? AND week_code = ?
        GROUP BY category ORDER BY total DESC
    `, [rubro, weekCode])

    // registro guardado (savings, salaries, disponibilidad manual override)
    const [[registro]] = await pool.query(`
        SELECT id, prev_cash, prev_transfer, savings, salaries, period_start, period_end
        FROM cash_registers
        WHERE rubro = ? AND week_code = ?
    `, [rubro, weekCode])

    const savings  = Number(registro?.savings  ?? 0)
    const salaries = Number(registro?.salaries ?? 0)

    const ventasMinorista = Number(minorista.total)
    const ventasMayorista = Number(mayorista.total)
    const totalCompras    = Number(compras.total)
    const totalGastos     = Number(gastos.total)

    const { periodStart: calcStart, periodEnd: calcEnd } = periodFromWeekCode(weekCode)

    return {
        weekCode,
        periodStart: dateStr(registro?.period_start) ?? calcStart,
        periodEnd:   dateStr(registro?.period_end)   ?? calcEnd,
        registroId:  registro?.id ?? null,

        ventas: {
            minorista: ventasMinorista,
            cantidadMinorista: Number(minorista.cantidad),
            mayorista: ventasMayorista,
            cantidadMayorista: Number(mayorista.cantidad),
            total: ventasMinorista + ventasMayorista,
        },
        compras: {
            total: totalCompras,
            cantidad: Number(compras.cantidad),
        },
        gastos: {
            total: totalGastos,
            categorias: gastosCat.map(g => ({
                category: g.category,
                total:    Number(g.total),
                cantidad: Number(g.cantidad),
            })),
        },
        savings,
        salaries,
    }
}

// ─── GET TABLA COMPARATIVA (N semanas) ───────────────────────────────────────
// Devuelve columnas ordenadas ASC con disponibilidad encadenada
const getComparativa = async (rubro, weekCodes) => {
    // ordenar ASC para encadenar disponibilidad
    const sorted = [...weekCodes].sort()

    const cols = []
    let disponibilidad = 0   // TOTAL de la semana anterior

    for (const wc of sorted) {
        const d = await getWeekData(rubro, wc)

        // el registro puede tener un override manual de disponibilidad (prev_cash + prev_transfer)
        const [[reg]] = await pool.query(
            `SELECT prev_cash, prev_transfer FROM cash_registers WHERE rubro = ? AND week_code = ?`,
            [rubro, wc]
        )
        // si hay override guardado lo usamos, sino encadenamos el total anterior
        const dispGuardada = reg ? Number(reg.prev_cash ?? 0) + Number(reg.prev_transfer ?? 0) : null
        const disp = dispGuardada !== null && dispGuardada !== 0 ? dispGuardada : disponibilidad

        const subtotalEntradas = disp + d.ventas.minorista + d.ventas.mayorista - d.salaries - d.savings
        const subtotalSalidas  = d.compras.total + d.gastos.total
        const total            = subtotalEntradas - subtotalSalidas

        cols.push({
            weekCode:          wc,
            disponibilidad:    disp,
            ventas:            d.ventas.minorista,
            cantidadVentas:    d.ventas.cantidadMinorista,
            mayorista:         d.ventas.mayorista,
            cantidadMayorista: d.ventas.cantidadMayorista,
            salaries:          d.salaries,
            savings:           d.savings,
            subtotalEntradas,
            compras:           d.compras.total,
            cantidadCompras:   d.compras.cantidad,
            gastos:            d.gastos.total,
            gastosCat:         d.gastos.categorias,
            subtotalSalidas,
            total,
            // datos crudos por si el front los necesita
            raw: d,
        })

        disponibilidad = total   // encadenar
    }

    // devolver en orden DESC para mostrar la semana más reciente primero
    return cols.reverse()
}

// ─── UPSERT registro (disponibilidad override, savings, salaries) ─────────────
const upsertRegistro = async (rubro, weekCode, { disponibilidad, savings, salaries }) => {
    const { periodStart, periodEnd } = periodFromWeekCode(weekCode)

    await pool.query(`
        INSERT INTO cash_registers
            (rubro, week_code, period_start, period_end, prev_cash, prev_transfer, savings, salaries)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        ON DUPLICATE KEY UPDATE
            prev_cash     = VALUES(prev_cash),
            prev_transfer = 0,
            savings       = VALUES(savings),
            salaries      = VALUES(salaries),
            period_start  = VALUES(period_start),
            period_end    = VALUES(period_end)
    `, [rubro, weekCode, periodStart, periodEnd,
        disponibilidad ?? 0,
        savings  ?? 0,
        salaries ?? 0])
}

module.exports = { getWeekData, getComparativa, upsertRegistro, getAvailableWeeks, buildWeekCode }
