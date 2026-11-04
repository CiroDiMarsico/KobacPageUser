const formatear = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)

// Precio de un producto. Con descuento: el precio normal tachado en rojo y más
// chico, y abajo el precio final en verde. product.salePrice ya viene con el
// descuento aplicado desde la API.
const PrecioProducto = ({ product, className = "text-[18px]" }) => {
  const conDescuento = product.discountPercent > 0 && product.originalPrice > product.salePrice

  return (
    <div className="flex flex-col items-center leading-none">
      {conDescuento && (
        <span className="text-[13px] font-semibold text-[#FF3B3B] line-through decoration-[#FF3B3B] mb-0.5">
          ${formatear(product.originalPrice)}
        </span>
      )}
      <h3 className={`font-bold text-[#00FF1E] leading-none ${className}`}>
        ${formatear(product.salePrice)}
      </h3>
    </div>
  )
}

export default PrecioProducto
