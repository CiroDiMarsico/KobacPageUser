const Button = ({
  text = "hola",
  width = "200px",
  height = "50px",
  color = "#1E1E1E",
  textColor = "#C32CFF",
  textSize = "20px",
  click = () => {},
}) => {
  return (
    <button 
      className={`rounded-3xl font-['Prompt'] font-bold text-[${textSize}]`} 
      onClick={click}
      style={{
        backgroundColor: color,
        width: width,
        height: height,
        color: textColor
      }}
    >
      {text}
    </button>
  );
}

export default Button;