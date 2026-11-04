// Reservar el pedido para una hora de la misma noche.
// Se trabaja viernes y sábados de 22:00 a 02:00. Tiene que coincidir con
// api/src/models/reservaModel.js

const DIAS_ABIERTOS = [5, 6]   // viernes, sábado (Date.getDay)
const APERTURA = 22 * 60       // 22:00, en minutos
const CIERRE = 26 * 60         // 02:00 del día siguiente
const INTERVALO = 15

const dosDigitos = (n) => String(n).padStart(2, "0")

// La "noche" a la que pertenece un momento: antes de las 02:00 es la del día anterior.
const nocheDe = (ahora) => {
  const d = new Date(ahora)
  if (d.getHours() < 2) d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Todos los horarios de una noche: 22:00, 22:15 ... 02:00 (para el admin)
export const TODOS_LOS_HORARIOS = Array.from(
  { length: (CIERRE - APERTURA) / INTERVALO + 1 },
  (_, i) => {
    const min = (APERTURA + i * INTERVALO) % (24 * 60)
    return `${dosDigitos(Math.floor(min / 60))}:${dosDigitos(min % 60)}`
  }
)

// "HH:MM" de una fecha (o "" si no hay)
export const aHHMM = (fecha) => {
  if (!fecha) return ""
  const d = new Date(fecha)
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
}

// Horarios que todavía se pueden elegir esta noche, cada 15 minutos.
// Vacío si hoy no se trabaja (la opción de reservar no se muestra).
export const horariosDisponibles = (ahora = new Date()) => {
  const noche = nocheDe(ahora)
  if (!DIAS_ABIERTOS.includes(noche.getDay())) return []

  const horarios = []
  for (let min = APERTURA; min <= CIERRE; min += INTERVALO) {
    const fecha = new Date(noche)
    fecha.setMinutes(min)
    if (fecha <= ahora) continue
    horarios.push(`${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`)
  }
  return horarios
}
