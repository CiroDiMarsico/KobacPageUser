const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // En produccion la DB se alcanza por la VIP de la red overlay de Swarm, y el
    // balanceador IPVS descarta sin avisar las conexiones TCP que pasan ~15 min
    // sin trafico: el pool se queda con sockets muertos que parecen vivos.
    // mysql2 ya prende keepalive, pero sin delay explicito la primera sonda sale
    // recien a las 2hs (tcp_keepalive_time del host), demasiado tarde.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Y ademas dejamos casi nada ocioso dando vueltas.
    idleTimeout: 60000,
    maxIdle: 2
})

// Errores que significan "esta conexion esta muerta", no "esta query esta mal".
const ERRORES_DE_CONEXION = new Set([
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    'PROTOCOL_SEQUENCE_TIMEOUT'
])

const esErrorDeConexion = (error) => ERRORES_DE_CONEXION.has(error?.code)

const INTENTOS = 3
const espera = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Solo las lecturas se pueden reintentar a ciegas: si una escritura se corta no
// sabemos si el servidor llego a aplicarla, y reintentarla duplicaria una venta.
const LECTURAS = /^\s*(?:\(|SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i
const esLectura = (sql) => LECTURAS.test(typeof sql === 'string' ? sql : sql?.sql ?? '')

// getConnection que verifica la conexion antes de entregarla. Una transaccion no se
// puede reintentar a mitad de camino, asi que la validacion tiene que pasar antes
// del beginTransaction.
const getConnection = async () => {
    let ultimoError
    for (let intento = 1; intento <= INTENTOS; intento++) {
        const conn = await pool.getConnection()
        try {
            await conn.ping()
            return conn
        } catch (error) {
            conn.destroy()
            if (!esErrorDeConexion(error)) throw error
            ultimoError = error
            console.warn(`MySQL: conexion muerta al validar (${error.code}), intento ${intento}/${INTENTOS}`)
            if (intento < INTENTOS) await espera(100 * intento)
        }
    }
    throw ultimoError
}

// Escrituras: no se reintentan, pero corren sobre una conexion recien validada,
// lo que cierra casi toda la ventana de fallo sin arriesgar duplicados.
const ejecutarValidado = async (metodo, args) => {
    const conn = await getConnection()
    let murio = false
    try {
        return await conn[metodo](...args)
    } catch (error) {
        murio = esErrorDeConexion(error)
        throw error
    } finally {
        if (murio) conn.destroy()
        else conn.release()
    }
}

// Lecturas: se reintentan. Cada fallo fatal hace que mysql2 descarte esa conexion,
// asi que el intento siguiente agarra una nueva.
const conReintento = (metodo) => async (...args) => {
    if (!esLectura(args[0])) return ejecutarValidado(metodo, args)

    let ultimoError
    for (let intento = 1; intento <= INTENTOS; intento++) {
        try {
            return await pool[metodo](...args)
        } catch (error) {
            if (!esErrorDeConexion(error)) throw error
            ultimoError = error
            console.warn(`MySQL: conexion caida (${error.code}), reintento ${intento}/${INTENTOS}`)
            if (intento < INTENTOS) await espera(100 * intento)
        }
    }
    throw ultimoError
}

module.exports = {
    query: conReintento('query'),
    execute: conReintento('execute'),
    getConnection,
    end: (...args) => pool.end(...args),
    pool
}
