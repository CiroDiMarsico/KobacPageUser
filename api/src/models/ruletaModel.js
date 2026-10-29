const pool = require('../db/connection')

// La tabla se crea sola la primera vez, asi el deploy no necesita correr
// nada a mano contra la base.
let tablaLista = null
const asegurarTabla = () => {
    if (!tablaLista) {
        tablaLista = pool.query(`
            CREATE TABLE IF NOT EXISTS ruleta_giros (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(64) NOT NULL,
                huella CHAR(64) NULL,
                premio VARCHAR(16) NOT NULL,
                segmento TINYINT NOT NULL,
                code VARCHAR(32) NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_device (device_id),
                INDEX idx_huella (huella)
            )
        `).catch(e => { tablaLista = null; throw e })
    }
    return tablaLista
}

// Giros que todavia bloquean a este dispositivo/huella: los de las ultimas
// 12hs y los que dieron un cupon. cupon_activo dice si ese cupon sigue sin usar.
const getGirosBloqueantes = async ({ deviceId, huella, desde }) => {
    await asegurarTabla()
    const [rows] = await pool.query(`
        SELECT g.segmento, g.premio, g.code, g.created_at,
               (dc.id IS NOT NULL) AS cupon_activo
        FROM ruleta_giros g
        LEFT JOIN discount_codes dc
               ON dc.code = g.code
              AND dc.is_active = TRUE
              AND (dc.expires_at IS NULL OR dc.expires_at > NOW())
        WHERE (g.device_id = ? OR g.huella = ?)
          AND (g.created_at > ? OR g.code IS NOT NULL)
        ORDER BY g.created_at DESC
        LIMIT 20
    `, [deviceId, huella, desde])
    return rows
}

const registrarGiro = async ({ deviceId, huella, premio, segmento, code, fecha }) => {
    await asegurarTabla()
    await pool.query(`
        INSERT INTO ruleta_giros (device_id, huella, premio, segmento, code, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [deviceId, huella, premio, segmento, code, fecha])
}

module.exports = { getGirosBloqueantes, registrarGiro }
