import { useState, useEffect } from "react";
import Button from "../components/Button";
import Promos from "./Promos";
import Bebidas from "./Bebidas";
import Vapes from "./Vapes";
import Carousel from "../components/Carousel";
import Loading from "../components/Loading";
import Cart from "../components/Cart";
import grafittiKobac from "/assets/grafittiKobac.png";
import lupaIcon from "/assets/lupa.png";
import api from '../api/axios'
const Home = () => {
  // ------------------------------
  //-------------DATOS-------------
  // ------------------------------
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    setLoading(true)
    api.get('/products?rubro=bebidas')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const [promos, setPromos] = useState([])

  useEffect(() => {
    api.get('/promos?rubro=bebidas')
      .then(res => setPromos(res.data))
      .catch(err => console.error(err))
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
  // ------------------------------

  const [search, setSearch] = useState("");

  const dataFiltrada = data.filter(p =>
    p.name.toLowerCase().includes(search)
  );

  const promosFiltradas = promos.filter(promo =>
    promo.name.toLowerCase().includes(search) ||
    promo.items.some(item => {
      const producto = data.find(p => p.id === item.idProduct);
      return producto?.name.toLowerCase().includes(search);
    })
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
      const key = keyExistente ?? `promo_${promo.id}`;

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
      .filter(item => !item.isPromo && item.variants && item.idProduct !== excludeProductId)
      .reduce((acc, item) => acc + (Number(item.variants[variantIdStr]) || 0), 0);

    const enPromos = carrito
      .filter(item => item.isPromo && item.key !== excludeKey)
      .reduce((acc, item) => {
        const totalEnEstaPromo = Object.values(item.selecciones).reduce((a, variantMap) => {
          return a + (Number(variantMap[variantIdStr]) || 0);
        }, 0);
        return acc + totalEnEstaPromo;
      }, 0);

    return Math.max(0, stockOriginal - enProductos - enPromos);
  };

  return (
    <main
      className="bg-top bg-repeat text-white pt-[80px] pb-[100px]"
      style={{
        backgroundImage: `url(${grafittiKobac})`
      }}
    >

      {/*carousel*/}
      <div>
        <Carousel carousel={carousel} />
      </div>

      {/*marquee*/}
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

      {/*categories buttons*/}
      <div className="flex justify-center items-center h-[120px] gap-[3vw]">

        <button
          className={`rounded-3xl font-['Prompt'] font-bold text-[20px] w-[125px] h-[50px] max-[400px]:w-[110px] max-[400px]:text-[18px]`}
          onClick={() => { setShow("promos") }}
          style={{
            backgroundColor: show == "promos" ? "#C32CFF" : "#1E1E1E",
            color: show == "promos" ? "#ffffff" : "#C32CFF",
          }}
        >
          PROMOS
        </button>
        <button
          className={`rounded-3xl font-['Prompt'] font-bold text-[20px] w-[125px] h-[50px] max-[400px]:w-[110px] max-[400px]:text-[18px]`}
          onClick={() => { setShow("bebidas") }}
          style={{
            backgroundColor: show == "bebidas" ? "#C32CFF" : "#1E1E1E",
            color: show == "bebidas" ? "#ffffff" : "#C32CFF",
          }}
        >
          BEBIDAS
        </button>
        <button
          className={`rounded-3xl font-['Prompt'] font-bold text-[20px] w-[125px] h-[50px] max-[400px]:w-[110px] max-[400px]:text-[18px]`}
          onClick={() => { setShow("vapes") }}
          style={{
            backgroundColor: show == "vapes" ? "#C32CFF" : "#1E1E1E",
            color: show == "vapes" ? "#ffffff" : "#C32CFF",
          }}
        >
          💨V-SHOP
        </button>
      </div>

      {/*search*/}
      <div className="flex justify-center items-center">
        <div className=" flex justify-center items-centerbackdrop-blur-md shadow-[0_0_40px_rgba(168,85,247,0.35)] rounded-full">
          <input type="text" className="bg-[#4E486E] w-[330px] sm:w-[500px] max-[400px]:w-[300px] max-[350px]:w-[250px] h-[50px] rounded-l-full font-[koulen] text-[20px] px-[20px] outline-none focus:outline-none focus:ring-0" onChange={e => setSearch(e.target.value.toLowerCase())} />
          <button className="bg-[#4E486E] h-[50px] w-[50px] rounded-r-full flex items-center p-1">
            <img src={lupaIcon} alt="lupa" className="h-[40px]" />
          </button>
        </div>
      </div>

      {/*categories sections*/}
      <div className="mt-[40px] min-h-[50vh]">
        <div key={show} className="animate-slide">
          {show === "promos" && <Promos data={data} promos={promosFiltradas} agregarPromoAlCarrito={agregarPromoAlCarrito} getStockDisponible={getStockDisponible} carrito={carrito} />}
          {show === "bebidas" && <Bebidas agregarAlCarrito={agregarAlCarrito} data={dataFiltrada} getStockDisponible={getStockDisponible} carrito={carrito} loading={loading} />}
          {show === "vapes" && <Vapes />}
        </div>
      </div>

      <Cart carrito={carrito} data={data} promos={promos} agregarAlCarrito={agregarAlCarrito} agregarPromoAlCarrito={agregarPromoAlCarrito} getStockDisponible={getStockDisponible} />

    </main>
  );
}

export default Home;