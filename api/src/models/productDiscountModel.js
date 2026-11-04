const pool = require('../db/connection')

// Descuento por producto (% entero 0-99). La columna se crea sola la primera
// vez, asi el deploy no necesita correr nada a mano contra la base.
let columnaLista = null
const asegurarColumna = () => {
    if (!columnaLista) {
        columnaLista = (async () => {
            const [[existe]] = await pool.query(`
                SELECT 1 AS ok FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'discount_percent'
            `)
            if (!existe) {
                await pool.query(
                    `ALTER TABLE products ADD COLUMN discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0`
                ).catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') throw e })
            }
        })().catch(e => { columnaLista = null; throw e })
    }
    return columnaLista
}

// Precio final con descuento. La tienda lo recibe ya calculado (salePrice).
const precioConDescuento = (precio, porcentaje) =>
    Math.round(Number(precio) * (100 - (Number(porcentaje) || 0)) / 100)

// Expresion SQL del precio final (alias p = products).
const SQL_PRECIO_FINAL = `ROUND(p.sale_price * (100 - p.discount_percent) / 100)`

const setDiscount = async (ids, percent) => {
    await asegurarColumna()
    const [r] = await pool.query(
        `UPDATE products SET discount_percent = ? WHERE id IN (?)`,
        [percent, ids]
    )
    return r.affectedRows
}

module.exports = { asegurarColumna, precioConDescuento, SQL_PRECIO_FINAL, setDiscount }
