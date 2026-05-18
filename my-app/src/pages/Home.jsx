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
      salePrice: 11000,
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
      name: "COCA COLA 2.25L",
      salePrice: 5000,
      category: "Gaseosas",
      variants: [
        { id: 4, name: "coca cola 2.25L", isActive: true, stock: 5 }
      ]
    },
    {
      id: 3,
      img: "./src/assets/botella.png",
      name: "SMIRNOFF",
      salePrice: 9800,
      category: "Bebidas blancas",
      variants: [
        { id: 5, name: "frutos rojos", isActive: true, stock: 2 },
        { id: 6, name: "tropical fruits", isActive: true, stock: 3 },
      ]
    }
  ]
  const promos = [
    {
      id: 1,
      name: "COMBO DEL FINDE",
      img: "./src/assets/comboDelFinde.jpeg",
      price: 25000,
      items: [
        { idProduct: 1, quantity: 1 },
        { idProduct: 3, quantity: 2 },
      ]
    },
    {
      id: 2,
      name: "COMBO DEL FINDE 2",
      img: "./src/assets/comboDelFinde.jpeg",
      price: 30000,
      items: [
        { idProduct: 3, quantity: 1 },
        { idProduct: 2, quantity: 2 },
      ]
    }
  ]

  const [search, setSearch] = useState("");

  const dataFiltrada = data.filter(p =>
    p.name.toLowerCase().includes(search)
  );

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

  const agregarPromoAlCarrito = (promo, { cantidad, selecciones }, keyExistente = null) => {
    setCarrito(prev => {
      const key = keyExistente ?? `promo_${promo.id}`;  // 👈 key fija por promo

      if (cantidad === 0) {
        return prev.filter(item => item.key !== key);
      }

      const existe = prev.find(item => item.key === key);
      if (existe) {
        return prev.map(item =>
          item.key === key ? { ...item, cantidad, selecciones } : item
        );
      }

      return [...prev, {
        key, isPromo: true, idPromo: promo.id,
        nombre: promo.name, precio: promo.price,
        cantidad, selecciones
      }];
    });
  };

  const getStockDisponible = (variantId, excludeKey = null, excludeProductId = null) => {
    const variantIdStr = String(variantId);

    let stockOriginal = 0;
    for (const producto of data) {
      const variant = producto.variants.find(v => String(v.id) === variantIdStr);
      if (variant) { stockOriginal = variant.stock; break; }
    }

    const enProductos = carrito
      .filter(item => !item.isPromo && item.variants && item.idProduct !== excludeProductId) // 👈
      .reduce((acc, item) => acc + (Number(item.variants[variantIdStr]) || 0), 0);

    const enPromos = carrito
      .filter(item => item.isPromo && item.key !== excludeKey)
      .reduce((acc, item) => {
        const totalEnEstaPromo = Object.values(item.selecciones).reduce((a, variantMap) => {
          return a + (Number(variantMap[variantIdStr]) || 0);
        }, 0);
        return acc + totalEnEstaPromo; // 👈 sin * item.cantidad
      }, 0);

    return Math.max(0, stockOriginal - enProductos - enPromos);
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
          <input type="text" className="bg-[#4E486E] w-[330px] h-[50px] rounded-l-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0" onChange={e => setSearch(e.target.value.toLowerCase())} />
          <button className="bg-[#4E486E] h-[50px] w-[50px] rounded-r-full flex items-center p-1">
            <img src="./src/assets/lupa.png" alt="lupa" className="h-[40px]" />
          </button>
        </div>
      </div>

      {/*categories sections*/}
      <div className="mt-[40px] min-h-[60vh]">
        <div key={show} className="animate-slide">
          {show === "promos" && <Promos data={data} promos={promos} agregarPromoAlCarrito={agregarPromoAlCarrito} getStockDisponible={getStockDisponible} carrito={carrito} />}
          {show === "bebidas" && <Bebidas agregarAlCarrito={agregarAlCarrito} data={dataFiltrada} getStockDisponible={getStockDisponible} carrito={carrito} />}
          {show === "vapes" && <Vapes />}
        </div>
      </div>

      <Cart carrito={carrito} data={data} promos={promos} agregarAlCarrito={agregarAlCarrito} agregarPromoAlCarrito={agregarPromoAlCarrito} getStockDisponible={getStockDisponible} />

    </main>
  );
}

export default Home;