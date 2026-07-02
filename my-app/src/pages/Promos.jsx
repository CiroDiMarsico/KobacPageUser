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
    <div className="w-[95%] bg-[#1E1E1E] rounded-3xl flex flex-col items-center justify-between p-4 font-['prompt'] gap-4">

      {/* Imagen */}
      <img
        src={promo.img}
        alt={promo.name}
        className="rounded-2xl w-full object-cover mask-b-from-90% mask-b-to-100%"
      />

      {/* Info */}
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="font-bold text-[18px] leading-none text-center">{promo.name.toUpperCase()}</h1>
        <h3 className="font-bold text-[20px] text-[#00FF1E]">${promo.price.toLocaleString("es-AR")}</h3>

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
      <Button
        text="AGREGAR"
        width="130px"
        height="36px"
        color="#C32CFF"
        textColor="#FFFFFF"
        textSize="17px"
        click={abrirPopover}
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
  );
};

export default Promos;