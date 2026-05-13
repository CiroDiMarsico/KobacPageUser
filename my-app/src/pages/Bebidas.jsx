import Product from "../components/Product";

const Bebidas = ({
  hidden = false,
  agregarAlCarrito,
  data
}) => {

  return (
    <div hidden={hidden} className="flex justify-center">
      <div className="grid grid-cols-2 gap-6">
        {data.map(drink => <Product product={drink} agregarAlCarrito={agregarAlCarrito} />)}
      </div>
    </div>
  );
}

export default Bebidas;