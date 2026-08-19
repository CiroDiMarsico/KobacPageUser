import { useState, useEffect } from "react";
import Button from "./Button";

const PopoverPromo = ({ promo, data, onClose, onAgregar, initialQuantities, getStockDisponible }) => {
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
  const handleAgregar = () => cerrar(() => onAgregar({ cantidad, selecciones }));

  const [cantidad, setCantidad] = useState(initialQuantities?.cantidad ?? 1);

  const initSelecciones = (cant) =>
    Object.fromEntries(
      promo.items.map(item => {
        const producto = data.find(p => p.id === item.idProduct);
        const variantesDisponibles = producto?.variants.filter(v => v.isActive && v.stock > 0) ?? [];
        const requerido = item.quantity * cant;

        return [
          item.idProduct,
          Object.fromEntries(variantesDisponibles.map((v, _, arr) => {
            const stockDisp = getStockDisponible(String(v.id));
            // Si hay una sola variante, la ponemos al máximo requerido automáticamente
            const esUnica = arr.length === 1;
            const valorInicial = esUnica
              ? Math.min(requerido, stockDisp)
              : Math.min(
                initialQuantities?.selecciones?.[item.idProduct]?.[String(v.id)] ?? 0,
                stockDisp
              );
            return [String(v.id), valorInicial];
          }))
        ];
      })
    );

  const [selecciones, setSelecciones] = useState(() => initSelecciones(cantidad));

  const increment = (idProduct, variantId) => {
    const item = promo.items.find(i => i.idProduct === idProduct);
    const maxPorVariante = item.quantity * cantidad;
    const totalActual = Object.values(selecciones[idProduct]).reduce((a, b) => a + b, 0);
    const yaElegido = selecciones[idProduct][variantId] ?? 0;
    const stockDisp = getStockDisponible(variantId);

    if (totalActual >= maxPorVariante) return;
    if (yaElegido >= stockDisp) return;

    setSelecciones(prev => ({
      ...prev,
      [idProduct]: { ...prev[idProduct], [variantId]: yaElegido + 1 }
    }));
  };

  const decrement = (idProduct, variantId) => {
    setSelecciones(prev => ({
      ...prev,
      [idProduct]: { ...prev[idProduct], [variantId]: Math.max(0, (prev[idProduct][variantId] ?? 0) - 1) }
    }));
  };

  const handleCantidad = (nuevaCantidad) => {
    setCantidad(nuevaCantidad);
    setSelecciones(initSelecciones(nuevaCantidad));
  };

  const validacion = promo.items.map(item => {
    const total = Object.values(selecciones[item.idProduct] ?? {}).reduce((a, b) => a + b, 0);
    const requerido = item.quantity * cantidad;
    return { idProduct: item.idProduct, total, requerido, ok: total === requerido || cantidad === 0 };
  });
  const todoOk = validacion.every(v => v.ok);

  const puedeAgregarMasPromos = () => {
    return promo.items.every(item => {
      const producto = data.find(p => p.id === item.idProduct);
      if (!producto) return false;
      const stockTotalProducto = producto.variants
        .filter(v => v.isActive)
        .reduce((acc, v) => acc + (getStockDisponible(String(v.id)) ?? 0), 0);
      return stockTotalProducto >= item.quantity * (cantidad + 1);
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-200 ${visible ? "bg-black/70" : "bg-black/0"}`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-[#11111F] rounded-3xl p-6 w-[85vw] max-w-[500px] h-[80vh] flex flex-col gap-4 font-['prompt'] overflow-hidden transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
        onClick={e => e.stopPropagation()}
      >

        {promo.img && (
          <img
            src={promo.img}
            alt={promo.name}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] object-contain opacity-20 blur-[3px] select-none pointer-events-none z-0"
          />
        )}

        {/* Cabecera Fija */}
        <div className="flex flex-col items-center gap-1 z-10 shrink-0">
          <h1 className="font-bold text-[26px] md:text-[28px] leading-none text-center px-4">{promo.name.toUpperCase()}</h1>
          <h3 className="font-bold text-[18px] text-[#00FF1E]">${(promo.price * cantidad).toLocaleString("es-AR")}</h3>
        </div>

        {/* Selector de cantidad Fijo */}
        <div className="flex items-center justify-between z-10 bg-white/5 rounded-2xl px-4 py-3 shrink-0">
          <div className="flex flex-col">
            <span className="font-['koulen'] text-[18px]">CANTIDAD DE COMBOS</span>
            {!puedeAgregarMasPromos() && (
              <span className="font-['koulen'] text-[12px] text-[#FF4444] leading-none mt-0.5">NO HAY SUFICIENTE STOCK</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCantidad(Math.max(0, cantidad - 1))}
              className="bg-[#C32CFF] rounded-full w-[38px] h-[38px] text-3xl flex items-center justify-center active:scale-95 transition-transform"
            >-</button>
            <span className="font-['koulen'] text-[20px] w-5 text-center">{cantidad}</span>
            <button
              onClick={() => handleCantidad(cantidad + 1)}
              disabled={!puedeAgregarMasPromos()}
              className="bg-[#C32CFF] rounded-full w-[38px] h-[38px] text-3xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >+</button>
          </div>
        </div>

        {/* CONTENEDOR CON SCROLL: Ahora este bloque es el único que scrollea internamente */}
        <div className="flex-1 overflow-y-auto z-10 pr-1 flex flex-col gap-5 my-1 scrollbar-none">
          {cantidad > 0 && (
            <div className="flex flex-col gap-5">
              {promo.items.map(item => {
                const producto = data.find(p => p.id === item.idProduct);
                if (!producto) return null;
                const variantesDisponibles = producto.variants.filter(v => v.isActive && v.stock > 0);
                const totalElegido = Object.values(selecciones[item.idProduct] ?? {}).reduce((a, b) => a + b, 0);
                const requerido = item.quantity * cantidad;

                return (
                  <div key={item.idProduct} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between sticky top-0 py-1 z-20">
                      <span className="font-['koulen'] text-[20px] text-white">{producto.name}</span>
                      <span className={`font-['koulen'] text-[14px] px-2 py-0.5 rounded-md ${totalElegido === requerido ? 'text-[#00FF1E] bg-[#00FF1E]/10' : 'text-white/40 bg-white/5'}`}>
                        {totalElegido}/{requerido}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 pl-1">
                      {variantesDisponibles.map(variant => {
                        const stockDisp = getStockDisponible(String(variant.id));
                        const yaElegido = selecciones[item.idProduct]?.[String(variant.id)] ?? 0;
                        const llegueAlMax = yaElegido > 0 && yaElegido >= stockDisp;

                        return (
                          <div key={variant.id} className="flex items-center justify-between gap-2 py-1">
                            <div className="flex flex-col max-w-[55%]">
                              <h1 className="font-['koulen'] text-[17px] text-white/70 leading-tight">{variant.name}</h1>
                              {llegueAlMax && (
                                <span className="font-['koulen'] text-[11px] text-[#FF4444] leading-none mt-0.5">SIN STOCK DISPONIBLE</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => decrement(item.idProduct, String(variant.id))}
                                className="bg-[#C32CFF] rounded-full w-[36px] h-[36px] text-2xl flex items-center justify-center active:scale-95 transition-transform"
                                disabled={yaElegido === 0}
                              >-</button>
                              <span className="font-['koulen'] text-[18px] w-5 text-center">{yaElegido}</span>
                              <button
                                onClick={() => increment(item.idProduct, String(variant.id))}
                                disabled={totalElegido >= requerido || yaElegido >= stockDisp}
                                className="bg-[#C32CFF] rounded-full w-[36px] h-[36px] text-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                              >+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-b border-white/5 pt-1" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón de acción Fijo en el footer */}
        <div className="z-10 flex justify-center pt-2 pb-1 shrink-0 mt-auto">
          <Button
            text="CONFIRMAR"
            width="150px"
            height="38px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            disabled={!todoOk}
            click={handleAgregar}
          />
        </div>

        <button className="font-['koulen'] text-2xl text-[#C32CFF] z-20 absolute top-4 right-5 p-1 hover:scale-110 transition-transform" onClick={handleClose}>X</button>
      </div>
    </div>
  );
};

export default PopoverPromo;