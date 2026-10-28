import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Popover from "./Popover";
import PopoverPromo from "./PopoverPromo";
import Button from "./Button";
import carritoVacio from "/assets/carritoVacio.webp";
import carritoMedio from "/assets/carritoMedio.webp";
import carritoLleno from "/assets/carritoLleno.webp";
import carritoRelleno from "/assets/carritoRelleno.webp";
import { calcDescuentoVapes, PORCENTAJE_DESCUENTO_VAPES } from "../utils/descuentoVapes";
import { tarjetasOtros, totalExtras, DESCUENTO_EXTRAS_PROMO } from "../utils/otros";

const Cart = ({ carrito = [], data, promos = [], agregarAlCarrito, agregarPromoAlCarrito, getStockDisponible, rubro = "bebidas" }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 25% off en las unidades pares, solo en vapes
  const descuentoVapes = rubro === "vapes" ? calcDescuentoVapes(carrito) : { total: 0, porProducto: {} };

  const total = carrito.reduce((acc, item) => {
    if (item.isPromo) return acc + item.precio * item.cantidad + totalExtras(item);
    if (!item.variants) return acc;
    const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
    return acc + item.precio * cantTotal;
  }, 0) - descuentoVapes.total;

  // Sugerencias para sumar al final del carrito
  const otros = tarjetasOtros(data);

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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const [promoDataEditando, setPromoDataEditando] = useState(null);

  const [amigos, setAmigos] = useState(null);
  const [amigosEditando, setAmigosEditando] = useState(true);

  const abrirEditarPromo = (item) => {
    const promo = promos.find(p => p.id === item.idPromo);
    setPromoDataEditando({ promo, initialQuantities: { cantidad: item.cantidad, selecciones: item.selecciones, extras: item.extras ?? [] }, key: item.key });
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
          <img src={carritoVacio} alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 1 && totalVariantes <= 2 && (
          <img src={carritoMedio} alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 3 && totalVariantes <= 4 && (
          <img src={carritoLleno} alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        {totalVariantes >= 5 && (
          <img src={carritoRelleno} alt="carrito"
            className={`w-[40px] absolute transition-all duration-300 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`} />
        )}
        <span className={`font-['koulen'] text-[28px] leading-none absolute transition-all duration-300 ${open ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          &gt;
        </span>
      </button>

      {/* Overlay */}
      <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)} />

      {/* Panel lateral */}
      <aside className={`fixed top-0 right-0 h-[100%] w-[310px] md:w-[400px] bg-[#11111F] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}>

        <h1 className="font-['prompt'] text-[42px] text-center pt-6 pb-2 font-semibold">CARRITO</h1>

        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 py-4">
          {carrito
            .filter(item => !item.isPromo && item.variants && Object.values(item.variants).some(cant => cant > 0))
            .map(item => {
              const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
              const productoData = data.find(p => p.id === item.idProduct);
              const descuentoItem = descuentoVapes.porProducto[item.idProduct];
              const variantes = Object.entries(item.variants).filter(([_, cant]) => cant > 0);
              // Si el producto tiene una sola variante no hace falta listar el sabor
              const mostrarVariantes = (productoData?.variants.length ?? 0) > 1;
              return (
                <div
                  key={item.idProduct}
                  onClick={() => abrirEditarProducto(productoData)}
                  className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 cursor-pointer active:opacity-70 transition-opacity"
                >
                  <div className="w-[48px] h-[48px] rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                    {productoData?.img && <img src={productoData.img} alt="" className="h-full object-contain" />}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 font-['prompt']">
                    <h2 className="font-bold text-[14px] leading-tight uppercase">{item.nombre}</h2>
                    {mostrarVariantes ? (
                      variantes.map(([idVariant, cant]) => (
                        <span key={idVariant} className="text-[12px] text-white/60 leading-tight">
                          {productoData?.variants.find(v => String(v.id) === idVariant)?.name} x{cant}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-white/60">x{cantTotal}</span>
                    )}
                    {descuentoItem && (
                      <span className="text-[12px] text-[#C32CFF] leading-tight">
                        {descuentoItem.unidades} u. con {PORCENTAJE_DESCUENTO_VAPES}% off
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end leading-none shrink-0 font-['prompt']">
                    {descuentoItem && (
                      <span className="text-[12px] text-white/40 line-through">
                        ${(item.precio * cantTotal).toLocaleString("es-AR")}
                      </span>
                    )}
                    <span className="font-bold text-[16px] text-[#00FF1E]">
                      ${(item.precio * cantTotal - (descuentoItem?.monto ?? 0)).toLocaleString("es-AR")}
                    </span>
                  </div>
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
                className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="w-[48px] h-[48px] rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {promo?.img && <img src={promo.img} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0 font-['prompt']">
                  <h2 className="font-bold text-[14px] leading-tight uppercase">{item.nombre}</h2>
                  <span className="text-[12px] text-white/60">x{item.cantidad}</span>
                  {promo?.items.map(promoItem => {
                    const producto = data.find(p => p.id === promoItem.idProduct);
                    const elegidas = Object.entries(item.selecciones[promoItem.idProduct] ?? {}).filter(([_, cant]) => cant > 0);
                    const unica = (producto?.variants.length ?? 0) <= 1;
                    return elegidas.map(([variantId, cant]) => {
                      const variante = producto?.variants.find(v => String(v.id) === variantId);
                      return (
                        <span key={variantId} className="text-[12px] text-white/60 leading-tight">
                          {unica ? producto?.name : `${producto?.name} · ${variante?.name}`} x{cant}
                        </span>
                      );
                    });
                  })}
                  {(item.extras ?? []).map(extra => (
                    <span key={extra.variantId} className="text-[12px] text-[#C32CFF] leading-tight">
                      + {extra.nombre} x{extra.cantidad} ({DESCUENTO_EXTRAS_PROMO}% off)
                    </span>
                  ))}
                </div>
                <span className="font-['prompt'] font-bold text-[16px] text-[#00FF1E] shrink-0">
                  ${(item.precio * item.cantidad + totalExtras(item)).toLocaleString("es-AR")}
                </span>
              </div>
            );
          })}

          {/* Te olvidaste de algo: productos de "otros" */}
          {carrito.length > 0 && otros.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <h2 className="font-['prompt'] font-bold text-[16px]">¿TE OLVIDASTE DE ALGO?</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {otros.map(tarjeta => {
                  const enCarrito = Number(carrito.find(i => !i.isPromo && i.idProduct === tarjeta.producto.id)?.variants?.[tarjeta.variantId]) || 0;
                  const sinStock = getStockDisponible(tarjeta.variantId) <= 0;
                  return (
                    <div key={tarjeta.variantId} className="w-[105px] shrink-0 flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-2 font-['prompt']">
                      <div className="w-[44px] h-[44px] rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                        {tarjeta.producto.img && <img src={tarjeta.producto.img} alt="" className="h-full object-contain" />}
                      </div>
                      <span className="font-bold text-[12px] text-center leading-tight line-clamp-2 min-h-[30px]">{tarjeta.nombre}</span>
                      <span className="font-bold text-[13px] text-[#00FF1E]">${tarjeta.producto.salePrice.toLocaleString("es-AR")}</span>
                      <button
                        onClick={() => agregarAlCarrito(tarjeta.producto, { [tarjeta.variantId]: enCarrito + 1 })}
                        disabled={sinStock}
                        className="w-full h-[30px] rounded-full bg-[#C32CFF] font-bold text-[16px] leading-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                      >{enCarrito > 0 ? `+ (${enCarrito})` : "+"}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-3 pt-4 border-t border-white/10">
          <button className="w-full" onClick={() => { setAmigosEditando(false) }}>
            <h2 className="font-[prompt] text-[16px] text-center text-white/90 font-bold">¿ESTAS CON AMIGOS?</h2>
            <h4 className="font-[prompt] text-[10px] text-center text-white/80 pb-3">DIVIDI EL TOTAL</h4>
          </button>
          <div className="border-t border-white/20 mb-3" />
          {descuentoVapes.total > 0 && (
            <div className="flex justify-between items-center">
              <span className="font-['koulen'] text-[16px] tracking-wider text-[#C32CFF]">2DA UNIDAD {PORCENTAJE_DESCUENTO_VAPES}% OFF:</span>
              <span className="font-['koulen'] text-[16px] text-[#C32CFF]">-${descuentoVapes.total.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-['koulen'] text-[26px] tracking-widest">TOTAL:</span>
            <span className="font-['koulen'] text-[26px] text-[#00FF1E]">${total.toLocaleString("es-AR")}</span>
          </div>
          {amigos &&
            <div className="flex justify-between items-center">
              <span className="font-['koulen'] text-[18px] tracking-widest">TOTAL ENTRE {amigos}:</span>
              <span className="font-['koulen'] text-[18px] text-[#00FF1E]">${(total / amigos).toLocaleString("es-AR")} c/u</span>
            </div>
          }
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
      {/* Popover amigos */}

      <div hidden={amigosEditando} className="fixed inset-0 z-60 flex items-center justify-center bg-black/70" onClick={() => { setAmigosEditando(true) }}>
        <div className="relative bg-[#11111F] rounded-3xl p-6 w-[85vw] h-[35vh] flex flex-col items-center justify-center gap-4 font-['prompt']" onClick={e => e.stopPropagation()}>
          <h1 className="font-['prompt'] text-[42px] text-center pt-0 pb-0 font-semibold">DIVIDIR TOTAL</h1>
          <input
            type="number"
            placeholder="CANTIDAD DE PERSONAS"
            className={`bg-[#4E486E] w-[100%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
            onChange={(e) => {
              const valor = e.target.value;

              if (valor === "") {
                setAmigos("");
                return;
              }
              if (parseInt(valor) < 1) {
                setAmigos(1);
              } else {
                setAmigos(valor);
              }
            }}
            value={amigos}
            min={1}
          />
          <Button text="CONFIRMAR" width="100%" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" click={() => { setAmigosEditando(true) }} />
        </div>
      </div>
    </div>
  );
};

export default Cart;
