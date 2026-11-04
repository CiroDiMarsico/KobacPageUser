const webpush = require('web-push')
const pushModel = require('../models/pushModel')

// ─── Claves VAPID ─────────────────────────────────────────────────────────────
// Se generan solas la primera vez y quedan guardadas en la base.
let vapidListo = null
const asegurarVapid = () => {
    if (!vapidListo) {
        vapidListo = (async () => {
            let keys = await pushModel.getVapid()
            if (!keys) keys = await pushModel.saveVapid(webpush.generateVAPIDKeys())
            webpush.setVapidDetails('https://kobacdelivery.com', keys.publicKey, keys.privateKey)
            return keys.publicKey
        })().catch(e => { vapidListo = null; throw e })
    }
    return vapidListo
}

// ─── Envio ────────────────────────────────────────────────────────────────────
const enviarATodos = async (payload) => {
    await asegurarVapid()
    const subs = await pushModel.getSubscriptions()
    const body = JSON.stringify(payload)

    const resultados = await Promise.allSettled(subs.map(s =>
        webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60, urgency: 'high' }
        )
    ))

    // 404/410 = el celular desinstalo la app o revoco el permiso: se borra.
    let enviados = 0
    await Promise.all(resultados.map((r, i) => {
        if (r.status === 'fulfilled') { enviados++; return null }
        const code = r.reason?.statusCode
        if (code === 404 || code === 410) return pushModel.deleteSubscription(subs[i].endpoint)
        console.error('Push: error enviando', code, r.reason?.body || r.reason?.message)
        return null
    }))
    return { enviados, total: subs.length }
}

const PAGOS = { cash: 'Efectivo', transfer: 'Transferencia' }
const plata = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR')

const armarNotificacionVenta = (venta) => {
    const lineas = []
    const promosVistas = new Set()
    for (const it of venta.items) {
        if (it.promo_id) {
            if (promosVistas.has(it.promo_id)) continue
            promosVistas.add(it.promo_id)
            lineas.push(`• Promo ${it.promo_name ?? ''}`.trim())
        } else if (it.product_name) {
            const variante = it.variant_name && it.variant_name !== it.product_name ? ` ${it.variant_name}` : ''
            lineas.push(`• ${it.quantity}x ${it.product_name}${variante}`)
        }
    }

    const pago = (venta.methods || '').split(',').filter(Boolean).map(m => PAGOS[m] ?? m).join(' + ')
    const hora = venta.scheduled_for ? new Date(venta.scheduled_for) : null
    const reserva = hora && `🕐 RESERVADO para las ${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`
    const body = [
        reserva,
        venta.client_name,
        ...lineas,
        pago && `Pago: ${pago}`,
        venta.location && `📍 ${venta.location}`,
    ].filter(Boolean).join('\n')

    return {
        title: `🛒 Nueva venta ${venta.rubro === 'vapes' ? '💨' : '🍾'} ${plata(venta.total)}`,
        body,
        tag: `venta-${venta.id}`,
        url: '/admin/dashboard',
    }
}

// Se llama despues de confirmar la venta. Nunca tira error: una notificacion
// que falla no puede afectar a la venta.
const notificarVenta = async (saleId) => {
    try {
        const venta = await pushModel.getSaleSummary(saleId)
        if (!venta) return
        await enviarATodos(armarNotificacionVenta(venta))
    } catch (e) {
        console.error('Push: no se pudo notificar la venta', saleId, e)
    }
}

// ─── Endpoints (admin) ────────────────────────────────────────────────────────
const getPublicKey = async (req, res) => {
    try {
        res.json({ publicKey: await asegurarVapid() })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al obtener la clave' })
    }
}

const subscribe = async (req, res) => {
    try {
        const { endpoint, keys } = req.body || {}
        if (!endpoint || !keys?.p256dh || !keys?.auth)
            return res.status(400).json({ error: 'Suscripción inválida' })
        await pushModel.upsertSubscription({
            adminId: req.admin.id,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: (req.headers['user-agent'] || '').slice(0, 255),
        })
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al guardar la suscripción' })
    }
}

const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body || {}
        if (endpoint) await pushModel.deleteSubscription(endpoint)
        res.json({ ok: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error al borrar la suscripción' })
    }
}

module.exports = { notificarVenta, getPublicKey, subscribe, unsubscribe }
