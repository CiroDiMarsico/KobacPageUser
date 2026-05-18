import { useState, useEffect } from "react";
import PopoverPromo from "../components/PopoverPromo";
import Button from "../components/Button";

const Promos = ({ promos, data, carrito, agregarPromoAlCarrito, getStockDisponible }) => {
  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="grid grid-cols-2 gap-6 justify-items-center">
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

  return (
    <div className="w-[170px] h-[300px] bg-[#1E1E1E] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt']">
      <div className="rounded-3xl h-[150px] w-full flex items-center justify-center">
        <img src={promo.img} alt={promo.name} className="rounded-3xl w-full flex items-center justify-center object-contain" />
      </div>
      <div className="flex flex-col items-center gap-1 mt-2">
        <h1 className="font-bold text-[16px] leading-none text-center">{promo.name}</h1>
        <h3 className="font-bold text-[16px] text-[#00FF1E]">${promo.price.toLocaleString("es-AR")}</h3>
      </div>
      <Button
        text="AGREGAR"
        width="120px"
        height="34px"
        color="#C32CFF"
        textColor="#FFFFFF"
        textSize="16px"
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