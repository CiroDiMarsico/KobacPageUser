import Button from "./Button";

// Pantalla para cuando la API no responde. Antes un fallo dejaba la pagina
// renderizada vacia, como si no hubiera productos, y el cliente no tenia forma
// de saber que era un error ni que alcanzaba con reintentar.
const ErrorCarga = ({
  reintentar = () => {},
  size = "large",
}) => {
  const styles = {
    small: "flex flex-col justify-center items-center gap-5 py-20",
    large: "flex flex-col justify-center items-center gap-5 h-screen",
  };

  return (
    <div className={styles[size]}>
      <p className="font-[koulen] text-[26px] text-white tracking-widest text-center px-6">
        NO PUDIMOS CARGAR LA CARTA
      </p>
      <p className="font-['Prompt'] text-[15px] text-white/40 text-center px-8 max-w-[320px]">
        Puede ser tu conexión. Probá de nuevo.
      </p>
      <Button
        text="REINTENTAR"
        width="190px"
        color="#C32CFF"
        textColor="#ffffff"
        click={reintentar}
      />
    </div>
  );
};

export default ErrorCarga;
