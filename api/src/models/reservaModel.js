const pool = require('../db/connection')

// Pedidos reservados para una hora de la misma noche.
// Se trabaja viernes y sábados de 22:00 a 02:00. Tiene que coincidir con
// my-app/src/utils/reserva.js

const DIAS_ABIERTOS = [5, 6]   // viernes, sábado (Date.getDay)
const APERTURA = 22 * 60       // 22:00, en minutos
const CIERRE = 26 * 60         // 02:00 del día siguiente
const INTERVALO = 15
const TOLERANCIA_MS = 10 * 60 * 1000 // por si el cliente tarda en confirmar

// La columna se crea sola la primera vez.
let columnaLista = null
const asegurarColumna = () => {
    if (!columnaLista) {
        columnaLista = (async () => {
            const [[existe]] = await pool.query(`
                SELECT 1 AS ok FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'scheduled_for'
            `)
            if (!existe) {
                await pool.query(`ALTER TABLE sales ADD COLUMN scheduled_for DATETIME NULL`)
                    .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e })
            }
        })().catch(e => { columnaLista = null; throw e })
    }
    return columnaLista
}

// La "noche" a la que pertenece un momento: antes de las 02:00 es la del día anterior.
const nocheDe = (ahora) => {
    const d = new Date(ahora)
    if (d.getHours() < 2) d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    return d
}

// Convierte "HH:MM" a la fecha de esta noche. Devuelve null si no es un horario
// válido: fuera de viernes/sábado, fuera de 22:00-02:00, no múltiplo de 15 o ya pasado.
const resolverHorario = (hhmm, ahora = new Date()) => {
    const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm ?? ''))
    if (!m) return null
    const horas = Number(m[1]), minutos = Number(m[2])
    if (horas > 23 || minutos > 59 || minutos % INTERVALO !== 0) return null

    const noche = nocheDe(ahora)
    if (!DIAS_ABIERTOS.includes(noche.getDay())) return null

    // 00:00-02:00 cuenta como después de medianoche de esa misma noche
    const minutosNoche = horas < 12 ? (horas + 24) * 60 + minutos : horas * 60 + minutos
    if (minutosNoche < APERTURA || minutosNoche > CIERRE) return null

    const fecha = new Date(noche)
    fecha.setMinutes(minutosNoche)
    if (fecha.getTime() < ahora.getTime() - TOLERANCIA_MS) return null
    return fecha
}

// "YYYY-MM-DD HH:MM:00" en hora local (el proceso corre con TZ de Argentina)
const aSQL = (fecha) => {
    const p = (n) => String(n).padStart(2, '0')
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())} ${p(fecha.getHours())}:${p(fecha.getMinutes())}:00`
}

module.exports = { asegurarColumna, resolverHorario, aSQL }
