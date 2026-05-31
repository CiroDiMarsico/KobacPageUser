const pool = require('../db/connection')

const getConfig = async () => {
    const [carousel] = await pool.query(`
        SELECT url AS img
        FROM carousel_images
        WHERE is_active = TRUE
        ORDER BY sort_order ASC
    `)

    const [marquee] = await pool.query(`
        SELECT text
        FROM marquee_items
        WHERE is_active = TRUE
        ORDER BY sort_order ASC
    `)

    return { carousel, marquee }
}

module.exports = { getConfig }