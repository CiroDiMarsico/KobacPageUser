import { useState, useEffect } from "react";
import Button from "../components/Button";
import Promos from "./Promos";
import Bebidas from "./Bebidas";
import Vapes from "./Vapes";
import Carousel from "../components/Carousel";
import Loading from "../components/Loading";
import Cart from "../components/Cart";

const Home = () => {

  const data = [
    {
      id: 1,
      img: "./src/assets/skyy.png",
      name: "SKYY",
      salePrice: 10500,
      category: "Bebidas blancas",
      variants: [
        { id: 1, name: "frutos rojos", isActive: true, stock: 4 },
        { id: 2, name: "cosmic", isActive: true, stock: 0 },
        { id: 3, name: "apricot", isActive: true, stock: 5 }
      ]
    },
    {
      id: 2,
      img: "./src/assets/botella.png",
      name: "COCA COLA",
      salePrice: 5000,
      category: "Gaseosas",
      variants: [
        { id: 4, name: "coca cola 2.25L", isActive: true, stock: 5 }
      ]
    }
  ]

  const [show, setShow] = useState("promos");

  const [carrito, setCarrito] = useState(() => {
    const saved = localStorage.getItem("carrito");
    return saved ? JSON.parse(saved) : [];
  });

  // Cada vez que cambia el carrito, lo guarda
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (product, quantities) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.idProduct === product.id);

      if (existe) {
        // Primero mergeás con todos los valores (incluyendo 0)
        const variantsMergeadas = { ...existe.variants, ...quantities };

        // Después filtrás los 0
        const variantsFinal = Object.fromEntries(
          Object.entries(variantsMergeadas).filter(([_, cant]) => cant > 0)
        );

        // Si no quedó ninguna variante, eliminá el producto
        if (Object.keys(variantsFinal).length === 0) {
          return prev.filter(item => item.idProduct !== product.id);
        }

        return prev.map(item =>
          item.idProduct === product.id
            ? { ...item, variants: variantsFinal }
            : item
        );
      }

      // Producto nuevo — filtrás los 0 antes de agregar
      const quantitiesFiltradas = Object.fromEntries(
        Object.entries(quantities).filter(([_, cant]) => cant > 0)
      );

      if (Object.keys(quantitiesFiltradas).length === 0) return prev;

      return [...prev, {
        idProduct: product.id,
        nombre: product.name,
        precio: product.salePrice,
        variants: quantitiesFiltradas
      }];
    });
  };

  return (
    <main className="bg-[#11111F] min-h-screen text-white pt-[80px]">

      {/*carousel*/}
      <div>
        <Carousel />
      </div>

      {/*marquee*/}
      <div className="bg-[#4E486E] h-[50px] overflow-hidden flex items-center justify-center font-[koulen] text-[20px]">
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex gap-[80px] px-[80px] md:gap-[300px] md:px-[300px]">
            <span>ENVIOS A TODA ALTA GRACIA</span>
            <span>PROMOS TODAS LAS SEMANAS</span>
            <span>VIERNES Y SABADOS</span>
          </div>

          <div className="flex gap-[80px] md:gap-[300px]">
            <span>ENVIOS A TODA ALTA GRACIA</span>
            <span>PROMOS TODAS LAS SEMANAS</span>
            <span>VIERNES Y SABADOS</span>
          </div>
        </div>
      </div>

      {/*categories buttons*/}
      <div className="flex justify-center items-center h-[120px] gap-[3vw]">
        <Button text="PROMOS" width="125px" click={() => { setShow("promos") }} color={show == "promos" ? "#C32CFF" : "#1E1E1E"} textColor={show == "promos" ? "#ffffff" : "#C32CFF"} />
        <Button text="BEBIDAS" width="125px" click={() => { setShow("bebidas") }} color={show == "bebidas" ? "#C32CFF" : "#1E1E1E"} textColor={show == "bebidas" ? "#ffffff" : "#C32CFF"} />
        <Button text="VAPES" width="125px" click={() => { setShow("vapes") }} color={show == "vapes" ? "#C32CFF" : "#1E1E1E"} textColor={show == "vapes" ? "#ffffff" : "#C32CFF"} />
      </div>

      {/*search*/}
      <div className="flex justify-center items-center">
        <div className=" flex justify-center items-centerbackdrop-blur-md shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-full">
          <input type="text" className="bg-[#4E486E] w-[330px] h-[50px] rounded-l-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0" />
          <button className="bg-[#4E486E] h-[50px] w-[50px] rounded-r-full flex items-center p-1">
            <img src="./src/assets/lupa.png" alt="lupa" className="h-[40px]" />
          </button>
        </div>
      </div>

      {/*categories sections*/}
      <div className="my-[40px] min-h-[60vh]">
        <div key={show} className="animate-slide">
          {show === "promos" && <Promos />}
          {show === "bebidas" && <Bebidas agregarAlCarrito={agregarAlCarrito} data={data} />}
          {show === "vapes" && <Vapes />}
        </div>
      </div>

      <Cart carrito={carrito} data={data} />
    </main>
  );
}

export default Home;