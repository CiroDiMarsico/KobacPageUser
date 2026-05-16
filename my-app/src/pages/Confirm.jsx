import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../components/Button";

const Confirm = () => {

  const navigate = useNavigate();

  const { state } = useLocation();
  const carrito = state?.carrito ?? JSON.parse(localStorage.getItem("carrito") ?? "[]");
  const ubicacion = state?.ubicacion ?? JSON.parse(localStorage.getItem("ubicacion") ?? "[]");
  const data = state?.data;
  useEffect(() => {
    if (!state?.carrito && !state?.ubicacion) {
      navigate("/");
    }
  }, []);

  const total = carrito.reduce((acc, item) => {
    const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
    return acc + item.precio * cantTotal;
  }, 0);

  const [show, setShow] = useState("transferencia");

  {/*msg*/ }
  const handleConfirmar = () => {
    const itemsTexto = carrito.map(item => {
      const producto = data.find(p => p.id === item.idProduct);

      const variantes = Object.entries(item.variants)
        .filter(([_, cant]) => cant > 0)
        .map(([idVariant, cant]) => {
          const variante = producto?.variants.find(v => String(v.id) === String(idVariant));
          return `  •(${cant}) ${variante?.name ?? idVariant}`;
        })
        .join('\n');

      const cantTotal = Object.values(item.variants).reduce((a, b) => a + b, 0);
      return `*${item.nombre}* - $${(item.precio * cantTotal).toLocaleString('es-AR')}\n${variantes}`;
    }).join('\n\n');

    const mensaje = `
🛵 *NUEVO PEDIDO*

📍 *Dirección:* ${ubicacion.calle} ${ubicacion.numero}
📍 *Barrio:* ${ubicacion.barrio}
${ubicacion.descripcion ? `📝 *Referencia:* ${ubicacion.descripcion}` : ''}

🛒 *PEDIDO:*

${itemsTexto}

💰 *TOTAL:* $${total.toLocaleString('es-AR')} + envío
💳 *Pago:* ${show.toUpperCase()}
  `.trim();

    const numero = '5493516427916';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    localStorage.removeItem("carrito");
    navigate("/");
  };

  return (
    <main className="bg-[#11111F] min-h-[100dvh] text-white pt-[110px] flex flex-col">
      <div>
        <div className="flex items-center justify-center">
          <Button text="SEGUIR COMPRANDO" width="300px" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" click={() => navigate("/")}
          />
        </div>
        <div className="flex gap-2 items-center px-8 mt-6">
          <img src="./src/assets/ubi.png" alt="" className="h-[35px]" />
          <h1 className="text-2xl font-['koulen']">{ubicacion.calle} {ubicacion.numero} - {ubicacion.barrio}</h1>
        </div>

        <hr className="w-[90%] mx-auto mt-6" />

        <div className="flex flex-col mt-6">
          <div className="flex justify-center items-start gap-4">
            <span className="font-['prompt'] text-3xl font-bold">TOTAL:</span>
            <div className="flex flex-col items-end">
              <span className="font-['prompt'] text-3xl text-[#00FF1E] font-bold">
                ${total.toLocaleString("es-AR")}
              </span>
              <span className="text-2xl text-center font-['koulen'] mb-4">+ ENVIO</span>
            </div>
          </div>
          <span className="text-[18px] text-center font-['koulen'] text-white/80">(PRECIO DE ENVIO A ACORDAR)</span>
        </div>

        <hr className="w-[90%] mx-auto mt-6" />

        <div className="flex flex-col mt-6 px-10">
          <div className="flex justify-center items-center gap-4">
            <span className="font-['prompt'] text-3xl font-bold text-center">COMO ABONAS?</span>
            <div className="flex flex-col items-end gap-2">
              <Button text="TRANSFERENCIA" width="200px" height="50px" click={() => { setShow("transferencia") }} color={show == "transferencia" ? "#C32CFF" : "#1E1E1E"} textColor={show == "transferencia" ? "#ffffff" : "#C32CFF"} />
              <Button text="EFECTIVO" width="200px" height="50px" click={() => { setShow("efectivo") }} color={show == "efectivo" ? "#C32CFF" : "#1E1E1E"} textColor={show == "efectivo" ? "#ffffff" : "#C32CFF"} />
              <Button text="AMBOS" width="200px" height="50px" click={() => { setShow("ambos") }} color={show == "ambos" ? "#C32CFF" : "#1E1E1E"} textColor={show == "ambos" ? "#ffffff" : "#C32CFF"} />
            </div>
          </div>
        </div>

        <hr className="w-[90%] mx-auto mt-6" />
      </div>
      <div className="flex items-center justify-center mt-10">
        <Button
          text="CONFIRMAR"
          width="250px"
          height="44px"
          color="#C32CFF"
          textColor="#FFFFFF"
          textSize="20px"
          click={handleConfirmar}
        />
      </div>
    </main>
  );
}

export default Confirm;