import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Button from "./Button";

const Location = () => {
  const navigate = useNavigate();

  const { state } = useLocation();
  const carrito = state?.carrito ?? JSON.parse(localStorage.getItem("carrito") ?? "[]");
  useEffect(() => {
    if (!state?.carrito) {
      navigate("/");
    }
  }, []);
  console.log(carrito);

  return (
    <main className="bg-[#11111F] min-h-screen text-white pt-[110px]">
      <div className="flex items-center justify-center">
        <Button text="SEGUIR COMPRANDO" width="300px" height="44px" color="#C32CFF" textColor="#FFFFFF" textSize="20px" click={() => navigate("/")}
        />
      </div>
    </main>
  );
}

export default Location;