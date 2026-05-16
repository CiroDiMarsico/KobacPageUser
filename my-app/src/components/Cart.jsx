import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

const Cart = ({ carrito = [], data }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Calcula el total sumando precio * cantidades de cada producto
  const total = carrito.reduce((acc, item) => {
    const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
    return acc + item.precio * cantTotal;
  }, 0);

  const totalVariantes = carrito.reduce((acc, item) => 
  acc + Object.values(item.variants).reduce((a, b) => a + b, 0), 0
);

  return (
    <div>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bg-[#6F3784] rounded-full w-[65px] h-[65px] flex items-center justify-center bottom-10 z-50 shadow-lg transition-all duration-300 ${open ? "right-[70%]" : "right-5"}`}
      >
        {total > 0 && (
          <p className={`font-['koulen'] text-[19px] absolute bottom-[-20px] leading-none text-[#00FF1E] bg-[#6F3784] rounded-3xl p-1.5 ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"} transition-all duration-300`}>${total.toLocaleString("es-AR")}</p>
        )}
        {totalVariantes == 0 && (
          <img
            src="./src/assets/carritoVacio.png"
            alt="carrito"
            className={`w-[40px] absolute transition-all duration-300
        ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
          />
        )}
        {totalVariantes >= 1 && totalVariantes <= 2 && (
          <img
            src="./src/assets/carritoMedio.png"
            alt="carrito"
            className={`w-[40px] absolute transition-all duration-300
        ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
          />
        )}
        {totalVariantes >= 3 && totalVariantes <= 4 && (
          <img
            src="./src/assets/carritoLleno.png"
            alt="carrito"
            className={`w-[40px] absolute transition-all duration-300
        ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
          />
        )}
        {totalVariantes >= 5 && (
          <img
            src="./src/assets/carritoRelleno.png"
            alt="carrito"
            className={`w-[40px] absolute transition-all duration-300
        ${open ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
          />
        )}

        {/* Flecha */}
        <span
          className={`font-['koulen'] text-[28px] leading-none absolute transition-all duration-300
      ${open ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
        >
          &gt;
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel lateral */}
      <aside
        className={`fixed top-0 right-0 h-[100%] w-[75%] bg-[#11111F] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Título */}
        <h1 className="font-['prompt'] text-[42px] text-center pt-6 pb-2 font-semibold">
          CARRITO
        </h1>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5 py-4">

          {carrito
            .filter(item => Object.values(item.variants).some(cant => cant > 0))
            .map(item => {
              const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
              return (
                <div key={item.idProduct}>
                  {/* Nombre y precio total del producto */}
                  <div className="flex justify-between items-center mb-1">
                    <h2 className="font-['koulen'] text-[22px]">{item.nombre}</h2>
                    <span className="font-['koulen'] text-[20px] text-[#00FF1E]">
                      ${(item.precio * cantTotal).toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Variantes */}
                  <div className="flex flex-col gap-1 pl-1">
                    {Object.entries(item.variants)
                      .filter(([_, cant]) => cant > 0)
                      .map(([idVariant, cant]) => (
                        <div key={idVariant} className="flex items-center gap-2">
                          <span className="font-['koulen'] text-[14px] text-white/80 uppercase tracking-wider">
                            {/* Buscás el nombre de la variante si lo tenés, sino mostrás el id */}
                            {data
                              .find(p => p.id === item.idProduct)
                              ?.variants
                              .find(v => String(v.id) === idVariant)
                              ?.name
                            }
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
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 pt-4 border-t border-white/10">
          <div className="border-t border-white/20 mb-4" />
          <div className="flex justify-between items-center">
            <span className="font-['koulen'] text-[26px] tracking-widest">TOTAL:</span>
            <span className="font-['koulen'] text-[26px] text-[#00FF1E]">
              ${total.toLocaleString("es-AR")}
            </span>
          </div>
          <p className="text-white/90 text-[14px] text-right font-['prompt'] mb-4">+ ENVIO</p>
          <Button text="CONFIRMAR" width="100%" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" disabled={carrito.length === 0} click={() => navigate("/location", { state: { carrito, data } })}/>
        </div>
      </aside>
    </div>
  );
};

export default Cart;