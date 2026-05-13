import Button from "./Button";
import Popover from "./Popover";
import { useState } from "react";

const Product = ({
  product,
  agregarAlCarrito
}) => {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState(() => {
    const saved = localStorage.getItem("carrito");

    const defaultQuantities = Object.fromEntries(
      product.variants
        .filter(v => v.isActive && v.stock > 0)
        .map(v => [String(v.id), 0])
    );

    if (!saved) return defaultQuantities;

    const carrito = JSON.parse(saved);
    const itemGuardado = carrito?.find(item => item.idProduct === product.id);

    return itemGuardado?.variants ?? defaultQuantities;
  });

  return (
    <div className="w-[160px] bg-[#1E1E1E] h-[300px] rounded-3xl flex flex-col items-center justify-between p-3 font-['prompt']">
      <div className="bg-white rounded-3xl h-[150px] w-[100%] flex items-center justify-center">
        <img src={product.img} alt={product.name} className=" h-[150px]" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="font-bold text-[20px] leading-none">{product.name}</h1>
        <h3 className="font-bold text-[18px] text-[#00FF1E] leading-none">${product.salePrice.toLocaleString("es-AR")}</h3>
      </div>
      <Button text="AGREGAR" width="120px" height="34px" color="#C32CFF" textColor="#FFFFFF" textSize="18px" click={() => { setOpen(true) }} />
      {open && (
        <Popover
          product={product}
          quantities={quantities}
          setQuantities={setQuantities}
          onClose={() => setOpen(false)}
          onAgregar={(q) => {
            agregarAlCarrito(product, q);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default Product;