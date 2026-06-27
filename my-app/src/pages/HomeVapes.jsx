import { useState, useEffect } from "react";
import Button from "../components/Button";
import Bebidas from "./Bebidas";
import Carousel from "../components/Carousel";
import Loading from "../components/Loading";
import Cart from "../components/Cart";
import { useNavigate } from "react-router-dom";
import grafittiKobac from "/assets/grafittiKobac.png";
import lupaIcon from "/assets/lupa.png";
import api from '../api/axios'

const HomeVapes = () => {
  const navigate = useNavigate()

  // ─── Datos ────────────────────────────────────────────────────────────────
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/products?rubro=vapes')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const [carousel, setCarousel] = useState([])
  const [marquee, setMarquee] = useState([])

  useEffect(() => {
    api.get('/config')
      .then(res => {
        setCarousel(res.data.carousel)
        setMarquee(res.data.marquee)
      })
      .catch(err => console.error(err))
  }, [])

  // ─── Búsqueda ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const dataFiltrada = data.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Carrito ──────────────────────────────────────────────────────────────
  // Carrito separado del de bebidas (clave distinta en localStorage)
  const [carrito, setCarrito] = useState(() => {
    const saved = localStorage.getItem("carrito_vapes");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("carrito_vapes", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (product, quantities) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.idProduct === product.id);

      if (existe) {
        const variantsMergeadas = { ...existe.variants, ...quantities };
        const variantsFinal = Object.fromEntries(
          Object.entries(variantsMergeadas).filter(([_, cant]) => cant > 0)
        );
        if (Object.keys(variantsFinal).length === 0) {
          return prev.filter(item => item.idProduct !== product.id);
        }
        return prev.map(item =>
          item.idProduct === product.id
            ? { ...item, variants: variantsFinal }
            : item
        );
      }

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

  const getStockDisponible = (variantId, excludeKey = null, excludeProductId = null) => {
    const variantIdStr = String(variantId);
    let stockOriginal = 0;
    for (const producto of data) {
      const variant = producto.variants.find(v => String(v.id) === variantIdStr);
      if (variant) { stockOriginal = variant.stock; break; }
    }
    const enProductos = carrito
      .filter(item => !item.isPromo && item.variants && item.idProduct !== excludeProductId)
      .reduce((acc, item) => acc + (Number(item.variants[variantIdStr]) || 0), 0);
    return Math.max(0, stockOriginal - enProductos);
  };

  return (
    <main
      className="bg-top bg-repeat min-h-screen text-white pt-[80px]"
      style={{ backgroundImage: `url(${grafittiKobac})` }}
    >
      {/* Carousel */}
      <div>
        <Carousel carousel={carousel} />
      </div>

      {/* Marquee */}
      <div className="bg-[#4E486E] h-[50px] overflow-hidden flex items-center justify-center font-[koulen] text-[20px]">
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex gap-[80px] px-[80px] md:gap-[300px] md:px-[300px]">
            {marquee.map(item => (
              <span key={item.text}>{item.text}</span>
            ))}
          </div>
          <div className="flex gap-[80px] md:gap-[300px]">
            {marquee.map(item => (
              <span key={item.text}>{item.text}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Header con botón ir a bebidas */}
      <div className="flex justify-center items-center gap-4 h-[100px]">
        <Button text="VAPES" width="150px" color={"#C32CFF"} textColor={"#ffffff"} />
        <Button text="→ BEBIDAS" width="150px" click={() => navigate("/")} color={"#1E1E1E"} textColor={"#C32CFF"} />
      </div>

      {/* Búsqueda */}
      <div className="flex justify-center items-center">
        <div className="flex justify-center items-center backdrop-blur-md shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-full">
          <input
            type="text"
            className="bg-[#4E486E] w-[330px] sm:w-[500px] h-[50px] rounded-l-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0"
            onChange={e => setSearch(e.target.value.toLowerCase())}
          />
          <button className="bg-[#4E486E] h-[50px] w-[50px] rounded-r-full flex items-center p-1">
            <img src={lupaIcon} alt="lupa" className="h-[40px]" />
          </button>
        </div>
      </div>

      {/* Productos */}
      <div className="mt-[40px] min-h-[60vh]">
        <div className="animate-slide">
          <Bebidas
            agregarAlCarrito={agregarAlCarrito}
            data={dataFiltrada}
            getStockDisponible={getStockDisponible}
            carrito={carrito}
            loading={loading}
          />
        </div>
      </div>

      {/* Carrito — sin promos, rubro vapes */}
      <Cart
        carrito={carrito}
        data={data}
        promos={[]}
        agregarAlCarrito={agregarAlCarrito}
        agregarPromoAlCarrito={() => {}}
        getStockDisponible={getStockDisponible}
        rubro="vapes"
      />
    </main>
  );
}

export default HomeVapes;
