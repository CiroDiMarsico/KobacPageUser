import botella from '../assets/botella.png'

const Loading = ({
  size = 'large',
}) => {
  const styles = {
    small: "flex justify-center items-center",
    large: "flex justify-center items-center h-screen",
  };

  return (
    <div className={`${styles[size]}`}>
      <div className="animate-spin">
        <img src={botella} alt="cargando" className="h-[50px]"/>
      </div>
    </div>
  );
}

export default Loading;