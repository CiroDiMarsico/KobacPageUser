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
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const isoYear = d.getUTCFullYear()
    const week = String(getWeekNumber(date)).padStart(2, '0')
    return `${isoYear}-W${week}`
}

// ─── GET (filtrar por rubro + semanas o fecha exacta) ─────────────────────────
const getAll = async (rubro, weeks, date) => {
    let whereExtra = ''
    const params = [rubro]

    if (date) {
        whereExtra = `AND DATE(e.date) = ?`
        params.push(date)
    } else {
        whereExtra = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)`
        params.push(Number(weeks) || 1)
    }

    const [rows] = await pool.query(`
        SELECT
            e.id,
            e.rubro,
            e.category,
            e.description,
            e.unit_price,
            e.quantity,
            e.total,
            e.week_code,
            e.date,
            e.created_at
        FROM expenses e
        WHERE e.rubro = ?
          ${whereExtra}
        ORDER BY e.date DESC, e.id DESC
    `, params)

    return rows.map(r => {
        // MySQL devuelve DATE como objeto Date — lo normalizamos a YYYY-MM-DD
        const dateStr = r.date instanceof Date
            ? r.date.toISOString().split('T')[0]
            : String(r.date ?? '').split('T')[0]

        return ({
        id:          r.id,
        rubro:       r.rubro,
        category:    r.category,
        description: r.description,
        unitPrice:   r.unit_price != null ? Number(r.unit_price) : null,
        quantity:    Number(r.quantity),
        total:       Number(r.total),
        weekCode:    r.week_code,
        date:        dateStr,
        createdAt:   r.created_at,
        })
    })
}

// ─── GET CATEGORIES (distintas para autocompletar) ────────────────────────────
const getCategories = async (rubro) => {
    const [rows] = await pool.query(`
        SELECT DISTINCT category FROM expenses
        WHERE rubro = ?
        ORDER BY category ASC
    `, [rubro])
    return rows.map(r => r.category)
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
const create = async ({ rubro, category, description, unitPrice, quantity, total, date }) => {
    const dateObj  = date ? new Date(date) : new Date()
    const weekCode = buildWeekCode(dateObj)

    const [result] = await pool.query(`
        INSERT INTO expenses (rubro, category, description, unit_price, quantity, total, week_code, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        rubro,
        category,
        description || null,
        unitPrice  != null ? unitPrice : null,
        quantity   || 1,
        total,
        weekCode,
        date || dateObj.toISOString().split('T')[0]
    ])

    return result.insertId
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const update = async (id, { category, description, unitPrice, quantity, total, date }) => {
    const dateObj  = date ? new Date(date) : new Date()
    const weekCode = buildWeekCode(dateObj)

    await pool.query(`
        UPDATE expenses
        SET category    = ?,
            description = ?,
            unit_price  = ?,
            quantity    = ?,
            total       = ?,
            week_code   = ?,
            date        = ?
        WHERE id = ?
    `, [
        category,
        description || null,
        unitPrice != null ? unitPrice : null,
        quantity  || 1,
        total,
        weekCode,
        date || dateObj.toISOString().split('T')[0],
        id
    ])
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
const remove = async (id) => {
    await pool.query(`DELETE FROM expenses WHERE id = ?`, [id])
}

// ─── STATS por semana (para el resumen) ───────────────────────────────────────
const getStats = async (rubro, weeks) => {
    const [rows] = await pool.query(`
        SELECT
            week_code,
            SUM(total)   AS totalSemana,
            COUNT(*)     AS cantidad
        FROM expenses
        WHERE rubro = ?
          AND date >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        GROUP BY week_code
        ORDER BY week_code DESC
    `, [rubro, Number(weeks) || 4])

    return rows.map(r => ({
        weekCode:    r.week_code,
        total:       Number(r.totalSemana),
        cantidad:    Number(r.cantidad),
    }))
}

module.exports = { getAll, getCategories, create, update, remove, getStats }