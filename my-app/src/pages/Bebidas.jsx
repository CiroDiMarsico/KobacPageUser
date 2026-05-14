import Product from "../components/Product";

const Bebidas = ({
  hidden = false,
  agregarAlCarrito,
  data
}) => {

  return (
    <div hidden={hidden} className="flex flex-col gap-8 px-4">
      {[...new Set(data.map(p => p.category))].map(categoria => (
        <div key={categoria}>
          <h2 className="font-['prompt'] text-[25px] font-bold text-[#fff] mb-4 text-center">
            {categoria.toUpperCase()}
            <hr />
          </h2>
          <div className="grid grid-cols-2 gap-6 justify-items-center">
            {data
              .filter(p => p.category === categoria)
              .map(drink => (
                <Product key={drink.id} product={drink} agregarAlCarrito={agregarAlCarrito} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Bebidas;