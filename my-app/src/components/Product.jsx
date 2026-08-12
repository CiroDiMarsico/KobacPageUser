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

  const isLongText = product.name.length >= 18;

  const sinSabores =
    product.variants.length === 1 &&
    product.variants[0].name.trim().toLowerCase() === product.name.trim().toLowerCase();

  const totalStock = product.variants
    .filter(v => v.isActive)
    .reduce((acc, v) => acc + v.stock, 0);

  const textoBoton = totalStock === 0 ? "AGOTADO" : sinSabores ? "AGREGAR" : "SABORES";


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

  const ALLOWED_CATEGORIES = ["5", "6", "7", "8", "9", "10", "13"];
  const ALLOWED_CATEGORIES2 = ["3", "4", "11", "12"];
  console.log("Categoría del producto:", product.category_id, "Tipo:", typeof product.category_id);

  return (
    <div className="w-[170px] max-[370px]:w-[150px] bg-[#1E1E1E] min-h-[300px] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt'] relative overflow-hidden">
      {totalStock > 0 && totalStock <= 2 && ALLOWED_CATEGORIES.includes(String(product.category_id)) && (
        <div className="text-[14px] text-white leading-none font-bold flex flex-col items-center justify-center bg-red-500/70 px-2 w-[180px] h-[34px] absolute right-[-57px] top-[10px] rotate-[35deg]">
          <p>¡ULTIMAS</p>
          <p>UNIDADES!</p>
        </div>
      )}

      {
        //20 off
        ALLOWED_CATEGORIES2.includes(String(product.category_id)) &&
        <span className="text-[14px] text-white leading-none font-bold flex flex-col items-center justify-center bg-red-500/70 px-2 w-[180px] h-[34px] absolute right-[-57px] top-[10px] rotate-[35deg]">
          <p>20% OFF</p>
        </span>
      }
      <div className="bg-[#fff] rounded-3xl h-[150px] w-[100%] flex items-center justify-center">
        {product.img && <img src={product.img} alt={product.name} className=" h-[150px]" loading="lazy" />}
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
      <Button text={textoBoton} width="120px" height="34px" color="#C32CFF" textColor="#FFFFFF" textSize="18px" click={abrirPopover} disabled={totalStock === 0} />
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