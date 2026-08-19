import { useState, useEffect } from "react";
import Button from "./Button";

const Popover = ({ product, onClose, onAgregar, quantities, setQuantities, getStockDisponible }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const cerrar = (cb) => {
    setVisible(false);
    setTimeout(cb, 200);
  };

  const handleClose = () => cerrar(onClose);
  const handleAgregar = () => cerrar(() => onAgregar(quantities));

  const increment = (id) => {
    const stockDisp = getStockDisponible(String(id));
    if (quantities[String(id)] >= stockDisp) return;
    setQuantities(q => ({ ...q, [String(id)]: (q[String(id)] ?? 0) + 1 }));
  };

  const decrement = (id) =>
    setQuantities(q => ({ ...q, [String(id)]: Math.max(0, (q[String(id)] ?? 0) - 1) }));

  return (
    <div
      className={`fixed inset-0 z-60 flex items-center justify-center p-4 transition-colors duration-200 ${visible ? "bg-black/70" : "bg-black/0"}`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-[#11111F] rounded-3xl p-6 w-[85vw] max-w-[500px] h-[80vh] max-h-[700px] flex flex-col items-center gap-4 font-['prompt'] transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
        onClick={e => e.stopPropagation()}
      >

        {product.img && (
          <img
            src={product.img}
            alt={product.name}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] h-[70%] object-contain opacity-30 blur-[3px] select-none pointer-events-none z-0"
          />
        )}

        <div className="flex flex-col items-center gap-1 z-10 mt-2 mb-1 shrink-0">
          <h1 className="font-bold text-[28px] leading-none text-center px-6">{product.name.toUpperCase()}</h1>
          <h3 className="font-bold text-[18px] text-[#00FF1E] leading-none mt-1">${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(product.salePrice)}</h3>
        </div>

        <div className="w-full flex-1 overflow-y-auto z-10 pr-1 pt-5 flex flex-col gap-5 custom-scrollbar">
          {product.variants
            .filter(variant => variant.isActive)
            .map(variant =>
              <div key={variant.id} className="w-full flex items-center justify-between gap-5 py-1 border-b border-white/5 last:border-0 shrink-0">
                <div className="flex flex-col gap-0.5 max-w-[60%]">
                  <h1 className="font-[koulen] text-[22px] leading-tight break-words">{variant.name}</h1>
                  {variant.description && (
                    <p className="font-['prompt'] text-[13px] text-white/50 leading-tight break-words">{variant.description}</p>
                  )}
                </div>

                {variant.stock === 0 &&
                  <div className="flex items-center gap-4 relative shrink-0">
                    <h1 className="font-[koulen] text-[24px] text-[#C32CFF]">AGOTADO</h1>
                    {(quantities[String(variant.id)] ?? 0) > 0 && (
                      <>
                        <h1 className="font-[koulen] text-[22px] w-4 text-center">{quantities[String(variant.id)]}</h1>
                        <button
                          onClick={() => decrement(variant.id)}
                          className="bg-[#C32CFF] rounded-full w-[45px] h-[45px] text-4xl flex items-center justify-center active:scale-95 transition-transform"
                        >-</button>
                      </>
                    )}
                  </div>
                }

                {variant.stock > 0 &&
                  <div className="flex items-center gap-4 relative shrink-0">
                    <button
                      onClick={() => increment(variant.id)}
                      disabled={
                        quantities[String(variant.id)] >= getStockDisponible(variant.id) ||
                        getStockDisponible(variant.id) === 0
                      }
                      className="bg-[#C32CFF] rounded-full w-[45px] h-[45px] text-3xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    >+</button>
                    <h1 className="font-[koulen] text-[22px] w-4 text-center">{quantities[String(variant.id)] ?? 0}</h1>
                    {(quantities[String(variant.id)] >= getStockDisponible(variant.id) || getStockDisponible(variant.id) === 0) && (
                      <span className="font-['koulen'] text-[11px] absolute text-center -top-[18px] left-1/2 -translate-x-1/2 text-[#FF4444] whitespace-nowrap bg-[#11111F] px-1 rounded">
                        SIN STOCK DISPONIBLE
                      </span>
                    )}
                    <button
                      onClick={() => decrement(variant.id)}
                      className="bg-[#C32CFF] rounded-full w-[45px] h-[45px] text-4xl flex items-center justify-center active:scale-95 transition-transform"
                    >-</button>
                  </div>
                }
              </div>
            )}
        </div>

        <div className="z-10 shrink-0 pt-2 pb-2">
          <Button
            text="CONFIRMAR"
            width="150px"
            height="38px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            click={handleAgregar}
          />
        </div>

        <div className="z-10 absolute top-4 right-5">
          <button className="text-2xl text-[#C32CFF] font-semibold hover:scale-110 active:scale-90 transition-transform" onClick={handleClose}>X</button>
        </div>
      </div>
    </div>
  );
}

export default Popover;