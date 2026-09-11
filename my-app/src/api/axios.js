import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 12000
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

// ---------------------------------------------------------------------------
// Reintento automatico
// ---------------------------------------------------------------------------
// La mayoria del trafico es celular con 4G: un micro corte de red dejaba la
// pagina vacia hasta que el cliente recargaba a mano. Reintentamos solo los
// metodos idempotentes — un POST /sales reintentado duplicaria la venta.
const METODOS_REINTENTABLES = ['get', 'head', 'options']
const MAX_REINTENTOS = 2
const DEMORA_BASE = 500

const espera = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const esReintentable = (error) => {
    const config = error?.config
    if (!config) return false
    if (axios.isCancel?.(error) || error.code === 'ERR_CANCELED') return false
    if (!METODOS_REINTENTABLES.includes((config.method || 'get').toLowerCase())) return false

    // Sin respuesta = corte de red o timeout.
    if (!error.response) return true
    // 5xx = la API contesto pero fallo (ej: conexion muerta contra MySQL).
    return error.response.status >= 500
}

api.interceptors.response.use(null, async (error) => {
    if (!esReintentable(error)) return Promise.reject(error)

    const config = error.config
    config.__reintentos = (config.__reintentos || 0) + 1
    if (config.__reintentos > MAX_REINTENTOS) return Promise.reject(error)

    // Backoff exponencial: 500ms, 1s. Con 3 intentos de 12s el peor caso son
    // ~37s antes de mostrar el error, en vez de mas de un minuto.
    await espera(DEMORA_BASE * 2 ** (config.__reintentos - 1))
    return api(config)
})

export default api
