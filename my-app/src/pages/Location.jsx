import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../components/Button";

const Location = () => {
  const navigate = useNavigate();

  const { state } = useLocation();
  const carrito = state?.carrito ?? JSON.parse(localStorage.getItem("carrito") ?? "[]");
  const data = state?.data;
  const rubro = state?.rubro ?? "bebidas"
  useEffect(() => {
    if (!state?.carrito) {
      navigate("/");
    }
  }, []);

  const savedLocation = JSON.parse(localStorage.getItem("ubicacion") ?? "null");
  const savedInfo = JSON.parse(localStorage.getItem("informacion") ?? "null");

  const [calle, setCalle] = useState(savedLocation?.calle ?? "");
  const [numero, setNumero] = useState(savedLocation?.numero ?? "");
  const [barrio, setBarrio] = useState(savedLocation?.barrio ?? "");
  const [descripcion, setDescripcion] = useState(savedLocation?.descripcion ?? "");

  const [nombre, setNombre] = useState(savedInfo?.nombre ?? "");
  const [telefono, setTelefono] = useState(savedInfo?.telefono ?? "");

  const handleContinuar = () => {
    const ubicacion = { calle, numero, barrio, descripcion };
    const informacion = { nombre, telefono };
    localStorage.setItem("ubicacion", JSON.stringify(ubicacion));
    localStorage.setItem("informacion", JSON.stringify(informacion));
    navigate("/confirm", { state: { carrito, ubicacion, data, informacion, promos: state?.promos, rubro } });
  };

  return (
    <main className="bg-[#11111F] min-h-[100dvh] text-white pt-[110px] flex flex-col items-center">
      <div className="sm:w-[600px] flex justify-center flex-col items-center">
        <div className="flex items-center justify-center">
          <Button text="SEGUIR COMPRANDO" width="300px" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" click={() => navigate(rubro === 'vapes' ? "/v" : "/")}
          />
        </div>

        <div className="relative flex gap-3 items-center justify-center px-5 mt-10 w-[100%]">
          <input
            type="text"
            placeholder="NOMBRE COMPLETO"
            value={nombre}
            onChange={e => { setNombre(e.target.value) }}
            className={`bg-[#4E486E] w-[100%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
        </div>
        <div className="flex gap-3 items-center justify-center px-5 mt-4 w-[100%]">
          <input
            type="text"
            placeholder="TELEFONO"
            value={telefono}
            onChange={e => { setTelefono(e.target.value) }}
            className={`bg-[#4E486E] w-[100%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
        </div>

        <hr className="w-[90%] mx-auto mt-6" />

        <div className="flex gap-3 items-center justify-center px-5 mt-4 w-[100%]">
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
        <div className="flex gap-3 items-center justify-center px-5 mt-4 w-[100%]">
          <input
            type="text"
            placeholder="BARRIO"
            value={barrio}
            onChange={e => { setBarrio(e.target.value) }}
            className={`bg-[#4E486E] w-[100%] h-[50px] rounded-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0`}
          />
        </div>
        <div className="flex gap-3 items-center justify-center px-5 mt-4 w-[100%]">
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
          disabled={!calle || !numero || !barrio || !telefono || !nombre}
          click={handleContinuar}
        />
      </div>
    </main >
  );
}

export default Location;