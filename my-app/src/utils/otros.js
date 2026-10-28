// Productos de la categoria "otros" (hielo, vasos, chicles...) que se ofrecen
// para sumar desde el carrito y desde las promos.
// Los que se suman desde una promo quedan guardados en la promo (item.extras)
// con 10% off. El backend (saleController.js) recalcula ese precio.

export const DESCUENTO_EXTRAS_PROMO = 10

export const esOtros = (producto) => producto?.category?.toLowerCase() === "otros"

export const precioConDescuentoPromo = (precio) =>
  Math.round(precio * (100 - DESCUENTO_EXTRAS_PROMO) / 100)

// Cada variante con stock es una tarjeta: si el producto tiene una sola
// variante se muestra solo el nombre del producto.
export const tarjetasOtros = (data = []) =>
  data.filter(esOtros).flatMap(producto => {
    const variantes = producto.variants.filter(v => v.isActive && v.stock > 0)
    return variantes.map(v => ({
      producto,
      variantId: String(v.id),
      nombre: variantes.length > 1 ? `${producto.name} ${v.name}` : producto.name,
    }))
  })

// Total de los extras de una promo del carrito
export const totalExtras = (item) =>
  (item.extras ?? []).reduce((acc, e) => acc + e.precio * e.cantidad, 0)
