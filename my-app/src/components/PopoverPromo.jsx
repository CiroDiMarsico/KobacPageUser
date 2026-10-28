import { useState, useEffect } from "react";
import Button from "./Button";
import { tarjetasOtros, precioConDescuentoPromo, totalExtras } from "../utils/otros";

const DURACION_MS = 300;

const PopoverPromo = ({ promo, data, onClose, onAgregar, initialQuantities, getStockDisponible }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const cerrar = (cb) => {
    setVisible(false);
    setTimeout(cb, DURACION_MS);
  };

  const handleClose = () => cerrar(onClose);
  const handleAgregar = () => cerrar(() => onAgregar({ cantidad, selecciones, extras: cantidad > 0 ? extras : [] }));

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

  // ─── Completá tu previa: productos de "otros" con 10% off ──────────────────
  const [extras, setExtras] = useState(initialQuantities?.extras ?? []);
  const otros = tarjetasOtros(data);

  const cantidadExtra = (variantId) => extras.find(e => e.variantId === variantId)?.cantidad ?? 0;

  const cambiarExtra = (tarjeta, delta) => {
    const actual = cantidadExtra(tarjeta.variantId);
    const nueva = Math.max(0, Math.min(actual + delta, getStockDisponible(tarjeta.variantId)));
    setExtras(prev => {
      const resto = prev.filter(e => e.variantId !== tarjeta.variantId);
      if (nueva === 0) return resto;
      return [...resto, {
        idProduct: tarjeta.producto.id,
        variantId: tarjeta.variantId,
        nombre: tarjeta.nombre,
        precio: precioConDescuentoPromo(tarjeta.producto.salePrice),
        cantidad: nueva,
      }];
    });
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

  const totalPopover = promo.price * cantidad + (cantidad > 0 ? totalExtras({ extras }) : 0);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${visible ? "bg-black/70" : "bg-black/0"}`}
      onClick={handleClose}
    >
      {/* Sale desde abajo de la pantalla */}
      <div
        className={`relative bg-[#16162A] border border-white/10 border-b-0 rounded-t-3xl px-5 pt-6 pb-5 w-full max-w-[500px] h-[88dvh] flex flex-col gap-4 font-['prompt'] overflow-hidden transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera Fija */}
        <div className="flex flex-col items-center gap-1 z-10 shrink-0">
          <h1 className="font-bold text-[24px] md:text-[26px] leading-none text-center px-8">{promo.name.toUpperCase()}</h1>
          <h3 className="font-bold text-[18px] text-[#00FF1E]">${(promo.price * cantidad).toLocaleString("es-AR")}</h3>
        </div>

        {/* Selector de cantidad Fijo */}
        <div className="flex items-center justify-between z-10 bg-white/5 rounded-2xl px-4 py-3 shrink-0">
          <div className="flex flex-col">
            <span className="font-bold text-[13px] tracking-wide">CANTIDAD DE COMBOS</span>
            {!puedeAgregarMasPromos() && (
              <span className="font-['koulen'] text-[12px] text-[#FF4444] leading-none mt-0.5">NO HAY SUFICIENTE STOCK</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCantidad(Math.max(0, cantidad - 1))}
              className="bg-[#C32CFF] rounded-full w-[34px] h-[34px] text-2xl flex items-center justify-center active:scale-95 transition-transform"
            >-</button>
            <span className="font-bold text-[18px] w-5 text-center">{cantidad}</span>
            <button
              onClick={() => handleCantidad(cantidad + 1)}
              disabled={!puedeAgregarMasPromos()}
              className="bg-[#C32CFF] rounded-full w-[34px] h-[34px] text-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >+</button>
          </div>
        </div>

        {/* Bloque con scroll */}
        <div className="flex-1 overflow-y-auto z-10 pr-1 flex flex-col gap-5 my-1 scrollbar-none">
          {promo.img && (
            <img
              src={promo.img}
              alt={promo.name}
              className="w-full h-[150px] object-cover rounded-2xl bg-white/5 shrink-0"
            />
          )}

          {cantidad > 0 && (
            <div className="flex flex-col gap-5">
              {promo.items.map(item => {
                const producto = data.find(p => p.id === item.idProduct);
                if (!producto) return null;
                const variantesDisponibles = producto.variants.filter(v => v.isActive && v.stock > 0);
                const totalElegido = Object.values(selecciones[item.idProduct] ?? {}).reduce((a, b) => a + b, 0);
                const requerido = item.quantity * cantidad;

                // Sin sabores para elegir: el producto ya va sumado
                if (variantesDisponibles.length <= 1) {
                  const completo = totalElegido === requerido;
                  return (
                    <div key={item.idProduct} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-['koulen'] text-[20px] text-white leading-tight">{producto.name}</span>
                        {!completo && (
                          <span className="font-['koulen'] text-[12px] text-[#FF4444] leading-none">SIN STOCK SUFICIENTE</span>
                        )}
                      </div>
                      <span className={`font-['koulen'] text-[16px] px-2 py-0.5 rounded-md ${completo ? 'text-[#00FF1E] bg-[#00FF1E]/10' : 'text-[#FF4444] bg-[#FF4444]/10'}`}>
                        {completo ? `✓ x${requerido}` : `${totalElegido}/${requerido}`}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={item.idProduct} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between py-1">
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
                                className="bg-[#C32CFF] rounded-full w-[34px] h-[34px] text-2xl flex items-center justify-center active:scale-95 transition-transform"
                                disabled={yaElegido === 0}
                              >-</button>
                              <span className="font-['koulen'] text-[18px] w-5 text-center">{yaElegido}</span>
                              <button
                                onClick={() => increment(item.idProduct, String(variant.id))}
                                disabled={totalElegido >= requerido || yaElegido >= stockDisp}
                                className="bg-[#C32CFF] rounded-full w-[34px] h-[34px] text-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
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

              {/* Completá tu previa */}
              {otros.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="font-bold text-[18px] leading-tight">COMPLETÁ TU PREVIA</h2>
                    <span className="text-[12px] text-white/60 text-right leading-tight">10% off sumándolo con esta promo</span>
                  </div>
                  {otros.map(tarjeta => {
                    const cant = cantidadExtra(tarjeta.variantId);
                    const sinStock = cant >= getStockDisponible(tarjeta.variantId);
                    return (
                      <div key={tarjeta.variantId} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                        <div className="w-[48px] h-[48px] rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                          {tarjeta.producto.img && <img src={tarjeta.producto.img} alt="" className="h-full object-contain" />}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-bold text-[14px] leading-tight truncate">{tarjeta.nombre}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-[16px] text-[#00FF1E]">${precioConDescuentoPromo(tarjeta.producto.salePrice).toLocaleString("es-AR")}</span>
                            <span className="text-[12px] text-white/40 line-through">${tarjeta.producto.salePrice.toLocaleString("es-AR")}</span>
                          </div>
                        </div>
                        {cant === 0 ? (
                          <button
                            onClick={() => cambiarExtra(tarjeta, 1)}
                            className="bg-[#C32CFF] rounded-full px-4 h-[36px] font-bold text-[13px] shrink-0 active:scale-95 transition-transform"
                          >+ SUMAR</button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => cambiarExtra(tarjeta, -1)}
                              className="bg-[#C32CFF] rounded-full w-[32px] h-[32px] text-xl flex items-center justify-center active:scale-95 transition-transform"
                            >-</button>
                            <span className="font-bold text-[16px] w-4 text-center">{cant}</span>
                            <button
                              onClick={() => cambiarExtra(tarjeta, 1)}
                              disabled={sinStock}
                              className="bg-[#C32CFF] rounded-full w-[32px] h-[32px] text-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                            >+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón de acción Fijo en el footer */}
        <div className="z-10 flex justify-center pt-2 shrink-0 mt-auto">
          <Button
            text={cantidad > 0 ? `CONFIRMAR · $${totalPopover.toLocaleString("es-AR")}` : "CONFIRMAR"}
            width="100%"
            height="48px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="18px"
            disabled={!todoOk}
            click={handleAgregar}
          />
        </div>

        <button className="font-['koulen'] text-2xl text-[#C32CFF] z-20 absolute top-5 right-5 p-1 hover:scale-110 transition-transform" onClick={handleClose}>X</button>
      </div>
    </div>
  );
};

export default PopoverPromo;
