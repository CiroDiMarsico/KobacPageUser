const discountModel = require('../models/discountModel')

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

// Ultimo giro por dispositivo ({ fecha, resultado }). En memoria: se pierde si
// se reinicia la API, pero alcanza para frenar al que borra el localStorage y
// vuelve a girar.
const ultimoGiro = new Map()

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

const spin = async (req, res) => {
    try {
        const deviceId = String(req.body?.deviceId || '').slice(0, 64)
        if (!deviceId) return res.status(400).json({ error: 'Falta deviceId' })

        const ahora = Date.now()
        const anterior = ultimoGiro.get(deviceId)
        // Mientras el cupon ganado siga sin usar no se puede volver a girar,
        // aunque hayan pasado las 12hs. Se lo devolvemos para que lo vuelva a ver.
        if (anterior?.resultado.code && await discountModel.validate(anterior.resultado.code)) {
            return res.status(429).json({ error: 'Tenes un cupon sin usar', cupon: anterior.resultado })
        }
        if (anterior && ahora - anterior.fecha < ESPERA_MS) {
            return res.status(429).json({ error: 'Ya giraste la ruleta', proximoGiro: anterior.fecha + ESPERA_MS })
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

        const resultado = { segmento, premio, code }
        ultimoGiro.set(deviceId, { fecha: ahora, resultado })
        res.json(resultado)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error al girar la ruleta' })
    }
}

module.exports = { validate, deactivate, spin }