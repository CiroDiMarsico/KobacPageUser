const crypto = require('crypto')
const discountModel = require('../models/discountModel')
const ruletaModel = require('../models/ruletaModel')

const validate = async (req, res) => {
    try {
        const { code } = req.params
        const discount = await discountModel.validate(code)
        if (!discount) return res.status(404).json({ error: 'Código inválido o expirado' })
        res.json(discount)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al validar código' })
    }
}

const deactivate = async (req, res) => {
    try {
        const { code } = req.params
        await discountModel.deactivate(code)
        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al desactivar código' })
    }
}

// ------------------------------
// --------RULETA DEL HOME--------
// ------------------------------
// El premio se elige aca y no en el front: si lo eligiera el navegador,
// cualquiera podria pegarle al endpoint pidiendo el 100%.
// El orden tiene que coincidir con SEGMENTOS en components/Ruleta.jsx.
const SEGMENTOS = [
    { premio: 'p5' },
    { premio: 'perdiste' },
    { premio: 'p10' },
    { premio: 'perdiste' },
    { premio: 'p15' },
    { premio: 'perdiste' },
    { premio: 'p100' },
    { premio: 'perdiste' },
    { premio: 'envio' },
    { premio: 'perdiste' },
]

// Probabilidad de cada premio (suman 100). El 100% no sale nunca.
const PROBABILIDADES = {
    perdiste: 70,
    p5: 13.75,
    p10: 7.25,
    p15: 3.75,
    envio: 5.25,
    p100: 0,
}

const PREMIOS = {
    p5:    { prefijo: 'TRAGO5',  discountType: 'percentage', discountValue: 5 },
    p10:   { prefijo: 'TRAGO10', discountType: 'percentage', discountValue: 10 },
    p15:   { prefijo: 'TRAGO15', discountType: 'percentage', discountValue: 15 },
    // Envio gratis: cupon de $0, se reconoce por el prefijo ENVIO.
    envio: { prefijo: 'ENVIO',   discountType: 'fixed',      discountValue: 0 },
}

const VIGENCIA_DIAS = 7
const ESPERA_MS = 12 * 60 * 60 * 1000

// ------------------------------
// ¿Quien esta girando?
// ------------------------------
// El deviceId vive en el localStorage, y los navegadores internos de Instagram
// y WhatsApp lo borran al cerrar el link: con eso solo, cerrar y volver a abrir
// alcanzaba para girar de nuevo. Por eso tambien se guarda una huella de
// IP + navegador, que sobrevive aunque se borre el storage.
const IP_PRIVADA = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd]|fe80)/i

const getIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    return (forwarded || req.socket?.remoteAddress || '').replace(/^::ffff:/, '')
}

// Si la IP es interna (la del proxy y no la del cliente) la huella seria la
// misma para todos y bloquearia a cualquiera: en ese caso no se usa.
const getHuella = (req) => {
    const ip = getIp(req)
    if (!ip || IP_PRIVADA.test(ip)) return null
    const ua = String(req.headers['user-agent'] || '')
    return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex')
}

// Devuelve por que no puede girar ({ cupon } o { proximoGiro }), o null si puede.
const getBloqueo = async ({ deviceId, huella, ahora }) => {
    const giros = await ruletaModel.getGirosBloqueantes({
        deviceId, huella, desde: new Date(ahora - ESPERA_MS),
    })

    // Mientras el cupon ganado siga sin usar no se puede volver a girar,
    // aunque hayan pasado las 12hs. Se lo devolvemos para que lo vuelva a ver.
    const conCupon = giros.find(g => g.cupon_activo)
    if (conCupon) {
        const { segmento, premio, code } = conCupon
        return { cupon: { segmento, premio, code } }
    }

    const reciente = giros.find(g => new Date(g.created_at).getTime() > ahora - ESPERA_MS)
    if (reciente) return { proximoGiro: new Date(reciente.created_at).getTime() + ESPERA_MS }

    return null
}

const getDeviceId = (valor) => String(valor || '').slice(0, 64)

// Sin 0/O/1/I para que no se confundan al copiarlo a mano.
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomChars = (n) => Array.from({ length: n }, () =>
    CARACTERES[Math.floor(Math.random() * CARACTERES.length)]
).join('')

const sortearPremio = () => {
    let r = Math.random() * 100
    for (const [premio, prob] of Object.entries(PROBABILIDADES)) {
        if (r < prob) return premio
        r -= prob
    }
    return 'perdiste'
}

// El front pregunta esto al abrir la pagina para decidir si muestra la
// ruleta, el cartel con el cupon sin usar, o nada.
const spinStatus = async (req, res) => {
    try {
        const deviceId = getDeviceId(req.query.deviceId)
        if (!deviceId) return res.status(400).json({ error: 'Falta deviceId' })
        const bloqueo = await getBloqueo({ deviceId, huella: getHuella(req), ahora: Date.now() })
        res.json({ puedeGirar: !bloqueo, ...bloqueo })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al consultar la ruleta' })
    }
}

const spin = async (req, res) => {
    try {
        const deviceId = getDeviceId(req.body?.deviceId)
        if (!deviceId) return res.status(400).json({ error: 'Falta deviceId' })

        const ahora = Date.now()
        const huella = getHuella(req)
        const bloqueo = await getBloqueo({ deviceId, huella, ahora })
        if (bloqueo) {
            return res.status(429).json({ error: 'Ya giraste la ruleta', ...bloqueo })
        }

        const premio = sortearPremio()
        const indices = SEGMENTOS.map((s, i) => s.premio === premio ? i : -1).filter(i => i !== -1)
        const segmento = indices[Math.floor(Math.random() * indices.length)]

        let code = null
        if (premio !== 'perdiste') {
            const { prefijo, discountType, discountValue } = PREMIOS[premio]
            const expiresAt = new Date(ahora + VIGENCIA_DIAS * 24 * 60 * 60 * 1000)
            for (let intento = 0; intento < 5 && !code; intento++) {
                const candidato = `${prefijo}-${randomChars(5)}`
                if (await discountModel.createSpinCode({ code: candidato, discountType, discountValue, expiresAt })) {
                    code = candidato
                }
            }
            if (!code) throw new Error('No se pudo generar un codigo unico')
        }

        await ruletaModel.registrarGiro({ deviceId, huella, premio, segmento, code, fecha: new Date(ahora) })
        res.json({ segmento, premio, code })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al girar la ruleta' })
    }
}

module.exports = { validate, deactivate, spin, spinStatus }