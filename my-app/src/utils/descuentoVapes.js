// Descuento automático de vapes: 25% off en cada unidad par (2da, 4ta, 6ta...).
// Se cuentan todas las unidades del carrito juntas, sin importar producto, sabor
// ni precio, en el orden del carrito. El backend (saleController.js) recorre el
// carrito en el mismo orden y redondea igual, así que los montos coinciden.

export const PORCENTAJE_DESCUENTO_VAPES = 25

// Devuelve { total, porProducto: { [idProduct]: { unidades, monto } } }
export const calcDescuentoVapes = (carrito) => {
  let unidad = 0
  let total = 0
  const porProducto = {}

  for (const item of carrito) {
    if (item.isPromo || !item.variants) continue
    const descuentoUnidad = Math.round(item.precio * PORCENTAJE_DESCUENTO_VAPES / 100)
    let unidades = 0
    for (const cant of Object.values(item.variants)) {
      for (let i = 0; i < Number(cant); i++) {
        unidad++
        if (unidad % 2 === 0) unidades++
      }
    }
    if (unidades > 0) {
      porProducto[item.idProduct] = { unidades, monto: unidades * descuentoUnidad }
      total += unidades * descuentoUnidad
    }
  }

  return { total, porProducto }
}
