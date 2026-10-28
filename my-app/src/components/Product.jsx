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

  //const bebidas = [5, 6, 7, 8, 9, 10, 13];
  //const vapes = [3, 4, 11, 12];

  return (
    <div className="w-[170px] max-[370px]:w-[150px] bg-[#1E1E1E] border border-[#FF6600]/20 shadow-[0_2px_8px_rgba(255,102,0,0.08)] min-h-[300px] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt'] relative overflow-hidden" onClick={abrirPopover}>

      {/*
      <div className="w-[170px] max-[370px]:w-[150px] bg-[#1E1E1E] min-h-[300px] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt'] relative overflow-hidden" onClick={abrirPopover}>
      {totalStock > 0 && totalStock <= 2 && (
        <div className="text-[14px] text-white leading-none font-bold flex flex-col items-center justify-center bg-red-500/70 px-2 w-[180px] h-[34px] absolute right-[-57px] top-[10px] rotate-[35deg]">
          <p>¡ULTIMAS</p>
          <p>UNIDADES!</p>
        </div>
      )}
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
      <Button text={textoBoton} width="120px" height="34px" color="#C32CFF" textColor="#FFFFFF" textSize="18px" disabled={totalStock === 0} />
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
      */}
      {/* Tela de araña grande ocupando media tarjeta */}
      <svg className="absolute top-0 left-0 w-40 h-40 pointer-events-none opacity-20 text-[#FF6600]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
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

      {totalStock > 0 && totalStock <= 2 && (
        <div className="text-[14px] text-[#FFCC00] leading-none font-bold flex flex-col items-center justify-center bg-[#990000] border-y border-[#FF6600]/50 px-2 w-[180px] h-[34px] absolute right-[-57px] top-[10px] rotate-[35deg] shadow-md z-20">
          <p className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">¡ULTIMAS</p>
          <p className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">UNIDADES!</p>
        </div>
      )}

      <div className="bg-[#fff] rounded-3xl h-[150px] w-[100%] flex items-center justify-center relative z-10">
        {product.img && <img src={product.img} alt={product.name} className="h-[150px] object-contain" loading="lazy" />}
      </div>

      <div className="flex flex-col items-center gap-1 relative z-10">
        <h1 className={`font-bold leading-none text-center transition-all duration-200 text-white ${isLongText ? 'text-[14px]' : 'text-[20px]'}`}>
          {product.name.toUpperCase()}
        </h1>
        <h3 className="font-bold text-[18px] text-[#00FF1E] leading-none">
          ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(product.salePrice)}
        </h3>
      </div>

      <div className="relative z-10">
        <Button text={textoBoton} width="120px" height="34px" color="#C32CFF" textColor="#FFFFFF" textSize="18px" disabled={totalStock === 0} />
      </div>

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