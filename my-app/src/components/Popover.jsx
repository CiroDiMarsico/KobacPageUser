import Button from "./Button";

const Popover = ({ product, onClose, onAgregar, quantities, setQuantities, getStockDisponible }) => {

  const increment = (id) => {
    const stockDisp = getStockDisponible(String(id));
    if (quantities[String(id)] >= stockDisp) return;
    setQuantities(q => ({ ...q, [String(id)]: (q[String(id)] ?? 0) + 1 }));
  };

  const decrement = (id) =>
    setQuantities(q => ({ ...q, [String(id)]: Math.max(0, (q[String(id)] ?? 0) - 1) }));

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative bg-[#11111F] rounded-3xl p-6 w-[85vw] h-[80vh] flex flex-col items-center gap-4 font-['prompt']" onClick={e => e.stopPropagation()}>
        <img
          src={product.img}
          alt={product.name}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] h-[70%] object-contain opacity-50 blur-[3px] select-none pointer-events-none z-0"
        />
        <div className="flex flex-col items-center gap-1 z-10 my-4">
          <h1 className="font-bold text-[32px] leading-none text-center">{product.name}</h1>
          <h3 className="font-bold text-[18px] text-[#00FF1E] leading-none">${product.salePrice}</h3>
        </div>
        <div className="flex flex-col items-center gap-5 z-10">
          {product.variants
            .filter(variant => variant.isActive)
            .map(variant =>
              <div key={variant.id} className="w-full flex items-center justify-between gap-5">
                <h1 className="font-[koulen] text-[22px]">{variant.name}</h1>
                {variant.stock === 0 &&
                  <h1 className="font-[koulen] text-[24px] text-[#C32CFF]">AGOTADO</h1>
                }
                {variant.stock > 0 &&
                  <div className="flex items-center gap-4 relative">
                    <button
                      onClick={() => increment(variant.id)}
                      disabled={
                        quantities[String(variant.id)] >= getStockDisponible(variant.id) ||
                        getStockDisponible(variant.id) === 0
                      }
                      className="bg-[#C32CFF] rounded-full w-[45px] h-[45px] text-3xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >+</button>
                    <h1 className="font-[koulen] text-[22px] w-4 text-center">{quantities[String(variant.id)] ?? 0}</h1>
                    {/* Aviso de stock máximo */}
                    {(quantities[String(variant.id)] >= getStockDisponible(variant.id) || getStockDisponible(variant.id) === 0) && (
                      <span className="font-['koulen'] text-[13px] absolute text-center top-[-10px] left-1/2 -translate-x-1/2 text-[#FF4444]/80">
                        {`max ${getStockDisponible(variant.id)}`}
                      </span>
                    )}
                    <button
                      onClick={() => decrement(variant.id)}
                      className="bg-[#C32CFF] rounded-full w-[45px] h-[45px] text-4xl flex items-center justify-center"
                    >-</button>
                  </div>
                }
              </div>
            )}
        </div>
        <div className="z-10 absolute bottom-10">
          <Button
            text="AGREGAR"
            width="150px"
            height="38px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            click={() => onAgregar(quantities)}
          />
        </div>
        <div className="z-10 absolute top-4 right-5">
          <button className="text-2xl text-[#C32CFF] font-semibold" onClick={onClose}>X</button>
        </div>
      </div>
    </div>
  );
}

export default Popover;