import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../components/Button";

const Location = () => {
  const navigate = useNavigate();

  const { state } = useLocation();
  const carrito = state?.carrito ?? JSON.parse(localStorage.getItem("carrito") ?? "[]");
  const data = state?.data;
  useEffect(() => {
    if (!state?.carrito) {
      navigate("/");
    }
  }, []);

  const savedLocation = JSON.parse(localStorage.getItem("ubicacion") ?? "null");

  const [calle, setCalle] = useState(savedLocation?.calle ?? "");
  const [numero, setNumero] = useState(savedLocation?.numero ?? "");
  const [barrio, setBarrio] = useState(savedLocation?.barrio ?? "");
  const [descripcion, setDescripcion] = useState(savedLocation?.descripcion ?? "");

  const handleContinuar = () => {
    const ubicacion = { calle, numero, barrio, descripcion };
    localStorage.setItem("ubicacion", JSON.stringify(ubicacion));
    navigate("/confirm", { state: { carrito, ubicacion, data } });
  };

  return (
    <main className="bg-[#11111F] min-h-[100dvh] text-white pt-[110px] flex flex-col">
      <div>
        <div className="flex items-center justify-center">
          <Button text="SEGUIR COMPRANDO" width="300px" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" click={() => navigate("/")}
          />
        </div>
        <div className="flex gap-3 items-center justify-center px-5 mt-10">
          <input
            type="text"
            placeholder="CALLE"
            value={calle}
            onChange={e => { setCalle(e.target.value) }}
            className={`bg-[#4E486E] w-[70%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
          <input
            type="number"
            placeholder="NRO"
            value={numero}
            onChange={e => { setNumero(e.target.value) }}
            className={`bg-[#4E486E] w-[30%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
        </div>
        <div className="flex gap-3 items-center justify-center px-5 mt-4">
          <input
            type="text"
            placeholder="BARRIO"
            value={barrio}
            onChange={e => { setBarrio(e.target.value) }}
            className={`bg-[#4E486E] w-[100%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
        </div>
        <div className="flex gap-3 items-center justify-center px-5 mt-4">
          <textarea
              placeholder="DESCRIPCION (opcional)"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className={`bg-[#4E486E] w-[100%] rounded-3xl font-[koulen] text-[20px] px-[20px] py-[10px] outline-none focus:outline-none focus:ring-0 h-[120px] resize-none`}
            />
        </div>
      </div>
      <div className="flex items-center justify-center mt-10">
        <Button
            text="CONTINUAR"
            width="250px"
            height="44px"
            color="#C32CFF"
            textColor="#FFFFFF"
            textSize="20px"
            disabled={!calle || !numero || !barrio}
            click={handleContinuar}
          />
      </div>
    </main >
  );
}

export default Location;