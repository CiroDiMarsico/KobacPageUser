import { useState } from "react";
import Button from "./Button";

const PopoverPromo = ({ promo, data, onClose, onAgregar, initialQuantities, getStockDisponible }) => {
  const [cantidad, setCantidad] = useState(initialQuantities?.cantidad ?? 1);

  const initSelecciones = (cant) =>
    Object.fromEntries(
      promo.items.map(item => {
        const producto = data.find(p => p.id === item.idProduct);
        const variantesDisponibles = producto?.variants.filter(v => v.isActive && v.stock > 0) ?? [];
        return [
          item.idProduct,
          Object.fromEntries(variantesDisponibles.map(v => [
            String(v.id),
            Math.min(
              initialQuantities?.selecciones?.[item.idProduct]?.[String(v.id)] ?? 0,
              getStockDisponible(String(v.id))  // 👈 no puede superar el stock disponible
            )
          ]))
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
      // Suma el stock disponible de todas las variantes del producto
      const producto = data.find(p => p.id === item.idProduct);
      if (!producto) return false;
      const stockTotalProducto = producto.variants
        .filter(v => v.isActive)
        .reduce((acc, v) => acc + (getStockDisponible(String(v.id)) ?? 0), 0);
      // Necesitás quantity * (cantidad+1) unidades disponibles
      return stockTotalProducto >= item.quantity * (cantidad + 1);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="relative bg-[#11111F] rounded-3xl p-6 w-[85vw] max-h-[85vh] overflow-y-auto flex flex-col gap-4 font-['prompt']"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={promo.img}
          alt={promo.name}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] object-contain opacity-20 blur-[3px] select-none pointer-events-none z-0"
        />

        <div className="flex flex-col items-center gap-1 z-10">
          <h1 className="font-bold text-[28px] leading-none text-center">{promo.name}</h1>
          <h3 className="font-bold text-[18px] text-[#00FF1E]">${(promo.price * cantidad).toLocaleString("es-AR")}</h3>
        </div>

        <div className="flex items-center justify-between z-10 bg-white/5 rounded-2xl px-4 py-3">
          <span className="font-['koulen'] text-[18px]">CANTIDAD</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCantidad(Math.max(0, cantidad - 1))}
              className="bg-[#C32CFF] rounded-full w-[38px] h-[38px] text-3xl flex items-center justify-center"
            >-</button>
            <span className="font-['koulen'] text-[20px] w-5 text-center">{cantidad}</span>
            <button
              onClick={() => handleCantidad(cantidad + 1)}
              disabled={!puedeAgregarMasPromos()}
              className="bg-[#C32CFF] rounded-full w-[38px] h-[38px] text-3xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >+</button>
          </div>
        </div>



        {cantidad > 0 && (
          <div className="flex flex-col gap-5 z-10">
            {promo.items.map(item => {
              const producto = data.find(p => p.id === item.idProduct);
              if (!producto) return null;
              const variantesDisponibles = producto.variants.filter(v => v.isActive && v.stock > 0);
              const totalElegido = Object.values(selecciones[item.idProduct] ?? {}).reduce((a, b) => a + b, 0);
              const requerido = item.quantity * cantidad;

              return (
                <div key={item.idProduct} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-['koulen'] text-[20px]">{producto.name}</span>
                    <span className={`font-['koulen'] text-[14px] ${totalElegido === requerido ? 'text-[#00FF1E]' : 'text-white/40'}`}>
                      {totalElegido}/{requerido}
                    </span>
                  </div>

                  {variantesDisponibles.map(variant => {
                    const stockDisp = getStockDisponible(String(variant.id));
                    const yaElegido = selecciones[item.idProduct]?.[String(variant.id)] ?? 0;
                    const llegueAlMax = yaElegido > 0 && yaElegido >= stockDisp;

                    return (
                      <div key={variant.id} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <h1 className="font-['koulen'] text-[18px]">{variant.name}</h1>
                          {llegueAlMax && (
                            <span className="font-['koulen'] text-[11px] text-[#FF4444]">máx {stockDisp}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => increment(item.idProduct, String(variant.id))}
                            disabled={totalElegido >= requerido || yaElegido >= stockDisp}
                            className="bg-[#C32CFF] rounded-full w-[40px] h-[40px] text-3xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          >+</button>
                          <span className="font-['koulen'] text-[18px] w-4 text-center">{yaElegido}</span>
                          <button
                            onClick={() => decrement(item.idProduct, String(variant.id))}
                            className="bg-[#C32CFF] rounded-full w-[40px] h-[40px] text-3xl flex items-center justify-center"
                          >-</button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-b border-white/10" />
                </div>
              );
            })}
          </div>
        )}

        <div className="z-10 flex justify-center">
          <Button
            text="AGREGAR"
            width="150px"
            height="38px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            disabled={!todoOk}
            click={() => onAgregar({ cantidad, selecciones })}
          />
        </div>

        <button className="font-['koulen'] text-2xl text-[#C32CFF] z-10 absolute top-4 right-5" onClick={onClose}>X</button>
      </div>
    </div >
  );
};

export default PopoverPromo;