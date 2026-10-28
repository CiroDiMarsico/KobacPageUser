import { useState, useEffect } from "react";
import PopoverPromo from "../components/PopoverPromo";
import Button from "../components/Button";

const Promos = ({ promos, data, carrito, agregarPromoAlCarrito, getStockDisponible }) => {
  return (
    <div className="flex flex-col gap-6 px-4">
      {promos.length === 0 && (
        <p className="font-['koulen'] text-[20px] text-white/30 tracking-widest text-center py-10">
          NO HAY PROMOS DISPONIBLES
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 justify-items-center">
        {promos.map(promo => (
          <PromoItem
            key={promo.id}
            promo={promo}
            data={data}
            carrito={carrito}
            agregarPromoAlCarrito={agregarPromoAlCarrito}
            getStockDisponible={getStockDisponible}
          />
        ))}
      </div>
    </div>
  );
};

const PromoItem = ({ promo, data, carrito = [], agregarPromoAlCarrito, getStockDisponible }) => {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  // Precio real = suma de precio de venta de cada producto * cantidad que pide la promo
  const precioReal = promo.items.reduce((acc, item) => {
    const producto = data.find(p => p.id === item.idProduct);
    const precioUnitario = producto?.salePrice ?? producto?.sale_price ?? 0;
    return acc + precioUnitario * item.quantity;
  }, 0);

  const itemEnCarrito = carrito.find(i => i.isPromo && i.idPromo === promo.id);
  const key = `promo_${promo.id}`;

  const initSelecciones = () =>
    Object.fromEntries(
      promo.items.map(item => {
        const producto = data.find(p => p.id === item.idProduct);
        const variantesDisponibles = producto?.variants.filter(v => v.isActive && v.stock > 0) ?? [];
        return [
          item.idProduct,
          Object.fromEntries(variantesDisponibles.map(v => [String(v.id), 0]))
        ];
      })
    );

  const [selecciones, setSelecciones] = useState(() =>
    itemEnCarrito?.selecciones ?? initSelecciones()
  );
  const [cantidad, setCantidad] = useState(itemEnCarrito?.cantidad ?? 0);

  // Sincroniza cuando el carrito cambia desde afuera (ej: edición desde Cart)
  useEffect(() => {
    const item = carrito.find(i => i.isPromo && i.idPromo === promo.id);
    if (item) {
      setCantidad(Number(item.cantidad) ?? 0);
      setSelecciones(item.selecciones);
    } else {
      setCantidad(0);
      setSelecciones(initSelecciones());
    }
  }, [carrito]);

  const abrirPopover = () => {
    setSnapshot({ cantidad, selecciones: JSON.parse(JSON.stringify(selecciones)) });
    setOpen(true);
  };

  const cerrarSinGuardar = () => {
    if (snapshot) {
      setCantidad(snapshot.cantidad);
      setSelecciones(snapshot.selecciones);
    }
    setSnapshot(null);
    setOpen(false);
  };

  const confirmarAgregar = ({ cantidad: nuevaCantidad, selecciones: nuevasSelecciones }) => {
    agregarPromoAlCarrito(promo, { cantidad: nuevaCantidad, selecciones: nuevasSelecciones }, key);
    setSnapshot(null);
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="w-[95%] bg-[#1E1E1E] border border-[#FF6600]/20 shadow-[0_2px_8px_rgba(255,102,0,0.08)] rounded-3xl flex flex-col items-center justify-between p-4 font-['prompt'] gap-4 relative overflow-hidden" onClick={abrirPopover}>

    {/*
      <div className="w-[95%] bg-[#1E1E1E] rounded-3xl flex flex-col items-center justify-between p-4 font-['prompt'] gap-4 relative overflow-hidden" onClick={abrirPopover}>


        <img
          src={promo.img}
          alt={promo.name}
          className="rounded-2xl w-full object-cover mask-b-from-90% mask-b-to-100%"
        />
        {promo.name.toLowerCase().includes("combo del finde") ? (
          <span className="text-[17px] text-white leading-none font-bold flex flex-col items-center justify-center bg-red-500/70 px-2 w-[180px] h-[42px] absolute right-[-50px] top-[10px] rotate-[35deg]">
            <p>¡COMBO</p>
            <p>DEL FINDE!</p>
          </span>
        ) : (
          <span className="text-[17px] text-white line-through leading-none font-bold flex items-center justify-center bg-red-500/70 px-2 w-[180px] h-[42px] absolute right-[-50px] top-[10px] rotate-[35deg]">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(precioReal)}
          </span>
        )}

        <div className="flex flex-col items-center gap-1 w-full flex-1">
          <h1 className="font-bold text-[18px] leading-none text-center">{promo.name.toUpperCase().replace("DEL FINDE", "")}</h1>

          <div className="flex flex-col items-center gap-0">
            <h3 className="font-bold text-[20px] text-[#00FF1E]">
              ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(promo.price)}
            </h3>
          </div>


          <div className="w-full grid grid-cols-2 gap-2">
            {promo.items.map(item => {
              const producto = data.find(p => p.id === item.idProduct);
              return (
                <div key={item.idProduct} className="flex items-center justify-between px-2">
                  <span className="font-['koulen'] text-[14px] text-white/60">
                    {producto?.name ?? '—'}
                  </span>
                  <span className="font-['koulen'] text-[14px] text-[#C32CFF]">
                    x{item.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>


        <Button
          text="AGREGAR"
          width="130px"
          height="36px"
          color="#C32CFF"
          textColor="#FFFFFF"
          textSize="17px"
        />

        {open && (
          <PopoverPromo
            promo={promo}
            data={data}
            initialQuantities={{ cantidad, selecciones }}
            onClose={cerrarSinGuardar}
            onAgregar={confirmarAgregar}
            getStockDisponible={(variantId) => getStockDisponible(variantId, key)}
          />
        )}
      </div>
        */}
      {/* Tela de araña grande en la esquina inferior derecha */}
      <svg className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none opacity-20 text-[#FF6600] rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
        <line x1="0" y1="0" x2="100" y2="0" />
        <line x1="0" y1="0" x2="0" y2="100" />
        <line x1="0" y1="0" x2="85" y2="85" />
        <line x1="0" y1="0" x2="100" y2="45" />
        <line x1="0" y1="0" x2="45" y2="100" />
        <line x1="0" y1="0" x2="95" y2="20" />
        <line x1="0" y1="0" x2="20" y2="95" />
        <path d="M 20 0 Q 15 15 0 20" />
        <path d="M 40 0 Q 30 30 0 40" />
        <path d="M 60 0 Q 45 45 0 60" />
        <path d="M 80 0 Q 60 60 0 80" />
        <path d="M 100 0 Q 75 75 0 100" />
      </svg>

      {/* Imagen */}
      <img
        src={promo.img}
        alt={promo.name}
        className="rounded-2xl w-full object-cover mask-b-from-90% mask-b-to-100% relative z-10"
      />

      {/* Etiqueta con estilo Halloween manteniendo tipografía original */}
      {promo.name.toLowerCase().includes("combo del finde") ? (
        <span className="text-[17px] text-[#FFCC00] leading-none font-bold flex flex-col items-center justify-center bg-[#990000] border-y border-[#FF6600]/50 px-2 w-[180px] h-[42px] absolute right-[-50px] top-[10px] rotate-[35deg] shadow-md z-20">
          <p className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">¡COMBO</p>
          <p className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">DEL FINDE!</p>
        </span>
      ) : (
        <span className="text-[17px] text-[#FFCC00] line-through leading-none font-bold flex items-center justify-center bg-[#990000] border-y border-[#FF6600]/50 px-2 w-[180px] h-[42px] absolute right-[-50px] top-[10px] rotate-[35deg] shadow-md z-20">
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(precioReal)}</span>
        </span>
      )}

      {/* Info */}
      <div className="flex flex-col items-center gap-1 w-full flex-1 relative z-10">
        <h1 className="font-bold text-[18px] leading-none text-center text-white">{promo.name.toUpperCase().replace("DEL FINDE", "")}</h1>

        <div className="flex flex-col items-center gap-0">
          <h3 className="font-bold text-[20px] text-[#00FF1E]">
            ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(promo.price)}
          </h3>
        </div>

        {/* Productos */}
        <div className="w-full grid grid-cols-2 gap-2">
          {promo.items.map(item => {
            const producto = data.find(p => p.id === item.idProduct);
            return (
              <div key={item.idProduct} className="flex items-center justify-between px-2">
                <span className="font-['koulen'] text-[14px] text-white/60">
                  {producto?.name ?? '—'}
                </span>
                <span className="font-['koulen'] text-[14px] text-[#C32CFF]">
                  x{item.quantity}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón */}
      <div className="relative z-10">
        <Button
          text="AGREGAR"
          width="130px"
          height="36px"
          color="#C32CFF"
          textColor="#FFFFFF"
          textSize="17px"
        />
      </div>

      {open && (
        <PopoverPromo
          promo={promo}
          data={data}
          initialQuantities={{ cantidad, selecciones }}
          onClose={cerrarSinGuardar}
          onAgregar={confirmarAgregar}
          getStockDisponible={(variantId) => getStockDisponible(variantId, key)}
        />
      )}
    </div>
  );
};

export default Promos;