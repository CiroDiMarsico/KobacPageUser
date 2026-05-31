const Loading = ({
  size = 'large',
}) => {
  const styles = {
    small: "flex justify-center items-center",
    large: "flex justify-center items-center h-screen",
  };

  return (
    <div className={`${styles[size]}`}>
      <div className="animate-spin ">
        <img src="./src/assets/botella.png" alt="cargando" className="h-[50px]"/>
      </div>
    </div>
  );
}

export default Loading;