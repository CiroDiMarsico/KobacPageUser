import Button from "./Button";
import Popover from "./Popover";
import { useState, useEffect } from "react";

const Product = ({
  product,
  agregarAlCarrito,
  getStockDisponible,
  carrito
}) => {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const abrirPopover = () => {
    setSnapshot({ ...quantities }); // guardás el estado actual
    setOpen(true);
  };

  const cerrarSinGuardar = () => {
    if (snapshot) setQuantities(snapshot); // revertís
    setSnapshot(null);
    setOpen(false);
  };

  const confirmarAgregar = (q) => {
    agregarAlCarrito(product, q);
    setSnapshot(null);
    setOpen(false);
  };
  const [quantities, setQuantities] = useState(() => {
    const itemEnCarrito = carrito?.find(i => i.idProduct === product.id);
    if (itemEnCarrito?.variants) return itemEnCarrito.variants;

    // fallback a localStorage si no está en carrito
    const saved = localStorage.getItem("carrito");
    if (!saved) return Object.fromEntries(
      product.variants.filter(v => v.isActive && v.stock > 0).map(v => [String(v.id), 0])
    );
    const carritoGuardado = JSON.parse(saved);
    const itemGuardado = carritoGuardado?.find(i => i.idProduct === product.id);
    return itemGuardado?.variants ?? Object.fromEntries(
      product.variants.filter(v => v.isActive && v.stock > 0).map(v => [String(v.id), 0])
    );
  });

  useEffect(() => {
    const itemEnCarrito = carrito?.find(i => i.idProduct === product.id);
    if (itemEnCarrito?.variants) {
      setQuantities(itemEnCarrito.variants);
    } else {
      // si se eliminó del carrito, resetea a 0
      setQuantities(Object.fromEntries(
        product.variants.filter(v => v.isActive && v.stock > 0).map(v => [String(v.id), 0])
      ));
    }
  }, [carrito]);

  const isLongText = product.name.length >= 20;

  return (
    <div className="w-[170px] max-[370px]:w-[150px] bg-[#1E1E1E] min-h-[300px] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt']">
      <div className="bg-[#fff] rounded-3xl h-[150px] w-[100%] flex items-center justify-center">
        <img src={product.img} alt={product.name} className=" h-[150px]" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className={`font-bold leading-none text-center transition-all duration-200 ${isLongText ? 'text-[14px]' : 'text-[20px]'
          }`}>
          {product.name.toUpperCase()}
        </h1>
        <h3 className="font-bold text-[18px] text-[#00FF1E] leading-none">
          ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(product.salePrice)}
        </h3>
      </div>
      <Button text="AGREGAR" width="120px" height="34px" color="#C32CFF" textColor="#FFFFFF" textSize="18px" click={abrirPopover} />
      {open && (
        <Popover
          product={product}
          quantities={quantities}
          setQuantities={setQuantities}
          onClose={cerrarSinGuardar}
          onAgregar={confirmarAgregar}
          getStockDisponible={(variantId) => getStockDisponible(variantId, null, product.id)}
        />
      )}
    </div>
  );
}

export default Product;