import Loading from "../components/Loading";
import Product from "../components/Product";

const Bebidas = ({
  agregarAlCarrito,
  data,
  getStockDisponible,
  carrito,
  loading
}) => {

  return (
    <div className="flex flex-col gap-8 px-4">
      {data.length === 0 && (
        <p className="font-['koulen'] text-[20px] text-white/30 tracking-widest text-center py-10">
          NO HAY BEBIDAS DISPONIBLES
        </p>
      )}
      {[...new Set(data.map(p => p.category))].map(categoria => (
        <div key={categoria}>
          <h2 className="font-['prompt'] text-[25px] font-bold text-[#fff] mb-4 text-center">
            {categoria.toUpperCase()}
            <div className="relative mt-1 overflow-hidden">
              <hr className="border-white/30" />
              <div className="absolute top-0 h-[1px] w-[30%] bg-gradient-to-r from-transparent via-[#C32CFF] to-transparent animate-shimmer" />
            </div>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 justify-items-center">
            {data
              .filter(p => p.category === categoria)
              .map(drink => (
                <Product key={drink.id} product={drink} agregarAlCarrito={agregarAlCarrito} getStockDisponible={getStockDisponible} carrito={carrito} />
              ))}
          </div>
        </div>
      ))}
      {loading && <Loading size="small" />}
    </div>
  );
}

export default Bebidas;