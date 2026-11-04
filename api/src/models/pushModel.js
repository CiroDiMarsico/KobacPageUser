const pool = require('../db/connection')

// Las tablas se crean solas la primera vez, asi el deploy no necesita correr
// nada a mano contra la base.
let tablasListas = null
const asegurarTablas = () => {
    if (!tablasListas) {
        tablasListas = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    admin_id INT NULL,
                    endpoint VARCHAR(512) NOT NULL,
                    p256dh VARCHAR(255) NOT NULL,
                    auth VARCHAR(255) NOT NULL,
                    user_agent VARCHAR(255) NULL,
                    created_at DATETIME NOT NULL,
                    UNIQUE KEY uq_endpoint (endpoint)
                )
            `)
            // Claves VAPID: identifican a este servidor ante Apple/Google. Se
            // generan una sola vez y se guardan, porque si cambian todas las
            // suscripciones existentes dejan de funcionar.
            await pool.query(`
                CREATE TABLE IF NOT EXISTS push_config (
                    id TINYINT PRIMARY KEY,
                    public_key VARCHAR(255) NOT NULL,
                    private_key VARCHAR(255) NOT NULL
                )
            `)
        })().catch(e => { tablasListas = null; throw e })
    }
    return tablasListas
}

const getVapid = async () => {
    await asegurarTablas()
    const [[row]] = await pool.query(`SELECT public_key, private_key FROM push_config WHERE id = 1`)
    return row ? { publicKey: row.public_key, privateKey: row.private_key } : null
}

// INSERT IGNORE: si dos procesos generan a la vez, gana el primero y ambos
// leen el mismo par despues.
const saveVapid = async ({ publicKey, privateKey }) => {
    await asegurarTablas()
    await pool.query(
        `INSERT IGNORE INTO push_config (id, public_key, private_key) VALUES (1, ?, ?)`,
        [publicKey, privateKey]
    )
    return getVapid()
}

const upsertSubscription = async ({ adminId, endpoint, p256dh, auth, userAgent }) => {
    await asegurarTablas()
    await pool.query(`
        INSERT INTO push_subscriptions (admin_id, endpoint, p256dh, auth, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE admin_id = VALUES(admin_id), p256dh = VALUES(p256dh),
            auth = VALUES(auth), user_agent = VALUES(user_agent)
    `, [adminId, endpoint, p256dh, auth, userAgent])
}

const deleteSubscription = async (endpoint) => {
    await asegurarTablas()
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint])
}

const getSubscriptions = async () => {
    await asegurarTablas()
    const [rows] = await pool.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions`)
    return rows
}

// Resumen de una venta para armar la notificacion.
const getSaleSummary = async (saleId) => {
    const [[sale]] = await pool.query(`
        SELECT s.id, s.rubro, s.total, s.location, s.scheduled_for, c.name AS client_name,
               (SELECT GROUP_CONCAT(DISTINCT sp.method) FROM sale_payments sp WHERE sp.sale_id = s.id) AS methods
        FROM sales s
        LEFT JOIN clients c ON c.id = s.client_id
        WHERE s.id = ?
    `, [saleId])
    if (!sale) return null

    // Productos sueltos por variante, y cada promo una sola vez (sus items
    // internos son las elecciones de la promo, no lineas aparte).
    const [items] = await pool.query(`
        SELECT si.promo_id, si.quantity, v.name AS variant_name, p.name AS product_name, pr.name AS promo_name
        FROM sale_items si
        LEFT JOIN variants v ON v.id = si.variant_id
        LEFT JOIN products p ON p.id = v.product_id
        LEFT JOIN promos pr ON pr.id = si.promo_id
        WHERE si.sale_id = ?
        ORDER BY si.id
    `, [saleId])

    return { ...sale, items }
}

module.exports = {
    getVapid, saveVapid, upsertSubscription, deleteSubscription, getSubscriptions, getSaleSummary
}
