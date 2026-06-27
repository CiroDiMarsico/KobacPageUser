import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Popover from "./Popover";
import PopoverPromo from "./PopoverPromo";
import Button from "./Button";

const Cart = ({ carrito = [], data, promos = [], agregarAlCarrito, agregarPromoAlCarrito, getStockDisponible, rubro = "bebidas" }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const total = carrito.reduce((acc, item) => {
    if (item.isPromo) return acc + item.precio * item.cantidad;
    if (!item.variants) return acc;
    const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
    return acc + item.precio * cantTotal;
  }, 0);

  const totalVariantes = carrito.reduce((acc, item) => {
    if (item.isPromo) return acc + item.cantidad;
    if (!item.variants) return acc;
    return acc + Object.values(item.variants).reduce((a, b) => a + b, 0);
  }, 0);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [editQuantities, setEditQuantities] = useState({});
  const abrirEditarProducto = (productoData) => {
    const itemEnCarrito = carrito.find(i => i.idProduct === productoData.id);
    setEditQuantities(itemEnCarrito?.variants ?? Object.fromEntries(
      productoData.variants.filter(v => v.isActive && v.stock > 0).map(v => [String(v.id), 0])
    ));
    setProductoSeleccionado(productoData);
  };

  const [promoDataEditando, setPromoDataEditando] = useState(null);

  const abrirEditarPromo = (item) => {
    const promo = promos.find(p => p.id === item.idPromo);
    setPromoDataEditando({ promo, initialQuantities: { cantidad: item.cantidad, selecciones: item.selecciones }, key: item.key });
  };

  return (
    <div>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bg-[#6F3784] rounded-full w-[65px] h-[65px] flex items-center justify-center bottom-10 z-50 shadow-lg transition-all duration-300 ${open ? "right-[290px] md:right-[380px]" : "right-5"}`}
      >
        {total > 0 && (
          <p className={`font-['koulen'] text-[19px] absolute bottom-[-20px] leading-none text-[#00FF1E] bg-[#6F3784] rounded-3xl p-1.5 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"} transition-all duration-300`}>${total.toLocaleString("es-AR")}</p>
        )}
        {totalVariantes == 0 && (
          <img src="/assets/carritoVacio.png" alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 1 && totalVariantes <= 2 && (
          <img src="/assets/carritoMedio.png" alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 3 && totalVariantes <= 4 && (
          <img src="/assets/carritoLleno.png" alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 5 && (
          <img src="/assets/carritoRelleno.png" alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        <span className={`font-['koulen'] text-[28px] leading-none absolute transition-all duration-300 ${open ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          &gt;
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Panel lateral */}
      <aside className={`fixed top-0 right-0 h-[100%] w-[310px] md:w-[400px] bg-[#11111F] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}>

        <h1 className="font-['prompt'] text-[42px] text-center pt-6 pb-2 font-semibold">CARRITO</h1>

        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5 py-4">
          {carrito
            .filter(item => !item.isPromo && item.variants && Object.values(item.variants).some(cant => cant > 0))
            .map(item => {
              const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
              const productoData = data.find(p => p.id === item.idProduct);
              return (
                <div
                  key={item.idProduct}
                  onClick={() => abrirEditarProducto(productoData)}
                  className="cursor-pointer active:opacity-70 transition-opacity"
                >
                  <div className="flex justify-between items-center mb-1">
                    <h2 className="font-['koulen'] text-[22px]">{item.nombre}</h2>
                    <span className="font-['koulen'] text-[20px] text-[#00FF1E]">
                      ${(item.precio * cantTotal).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    {Object.entries(item.variants)
                      .filter(([_, cant]) => cant > 0)
                      .map(([idVariant, cant]) => (
                        <div key={idVariant} className="flex items-center gap-2">
                          <span className="font-['koulen'] text-[14px] text-white/80 uppercase tracking-wider">
                            {productoData?.variants.find(v => String(v.id) === idVariant)?.name}
                          </span>
                          <div className="flex-1 border-b border-white/20" />
                          <span className="font-['koulen'] text-[16px]">{cant}</span>
                        </div>
                      ))}
                  </div>
                  <div className="border-b border-white/10 mt-3" />
                </div>
              );
            })}

          {/* Promos */}
          {carrito.filter(item => item.isPromo).map(item => {
            const promo = promos.find(p => p.id === item.idPromo);
            return (
              <div
                key={item.key}
                onClick={() => abrirEditarPromo(item)}
                className="cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-['koulen'] text-[22px]">{item.nombre}</h2>
                  <span className="font-['koulen'] text-[20px] text-[#00FF1E]">
                    ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-1">
                  {promo?.items.map(promoItem => {
                    const producto = data.find(p => p.id === promoItem.idProduct);
                    return Object.entries(item.selecciones[promoItem.idProduct] ?? {})
                      .filter(([_, cant]) => cant > 0)
                      .map(([variantId, cant]) => {
                        const variante = producto?.variants.find(v => String(v.id) === variantId);
                        return (
                          <div key={variantId} className="flex items-center gap-2">
                            <span className="font-['koulen'] text-[14px] text-white/80 uppercase tracking-wider">
                              {producto?.name}
                            </span>
                            <div className="flex-1 border-b border-white/20" />
                            <span className="font-['koulen'] text-[16px]">{variante?.name} x{cant}</span>
                          </div>
                        );
                      });
                  })}
                </div>
                <div className="border-b border-white/10 mt-3" />
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-white/10">
          <div className="border-t border-white/20 mb-4" />
          <div className="flex justify-between items-center">
            <span className="font-['koulen'] text-[26px] tracking-widest">TOTAL:</span>
            <span className="font-['koulen'] text-[26px] text-[#00FF1E]">${total.toLocaleString("es-AR")}</span>
          </div>
          <p className="text-white/90 text-[14px] text-right font-['prompt'] mb-4">+ ENVIO</p>
          <Button
            text="CONFIRMAR"
            width="100%"
            height="44px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            disabled={carrito.length === 0}
            click={() => navigate("/location", { state: { carrito, data, promos, rubro } })}
          />
        </div>
      </aside>

      {/* Popover para editar producto */}
      {productoSeleccionado && (
        <Popover
          product={productoSeleccionado}
          quantities={editQuantities}
          setQuantities={setEditQuantities}
          onClose={() => setProductoSeleccionado(null)}
          onAgregar={(q) => {
            agregarAlCarrito(productoSeleccionado, q);
            setProductoSeleccionado(null);
          }}
          getStockDisponible={(variantId) => getStockDisponible(variantId, null, productoSeleccionado.id)}
        />
      )}

      {/* Popover edición promo */}
      {promoDataEditando && (
        <PopoverPromo
          promo={promoDataEditando.promo}
          data={data}
          onClose={() => setPromoDataEditando(null)}
          initialQuantities={promoDataEditando.initialQuantities}
          onAgregar={(seleccion) => {
            agregarPromoAlCarrito(promoDataEditando.promo, seleccion, promoDataEditando.key);
            setPromoDataEditando(null);
          }}
          getStockDisponible={(variantId) => getStockDisponible(variantId, promoDataEditando.key)}
        />
      )}
    </div>
  );
};

export default Cart;
