const Button = ({
  text = "hola",
  width = "200px",
  height = "50px",
  color = "#1E1E1E",
  textColor = "#C32CFF",
  textSize = "20px",
  click = () => {},
  disabled = false
}) => {
  return (
    <button 
      className={`rounded-3xl font-['Prompt'] font-bold text-[${textSize}] ${disabled ? "opacity-50 cursor-not-allowed" : ""} relative overflow-hidden`} 
      onClick={click}
      disabled={disabled}
      style={{
        backgroundColor: color,
        width: width,
        height: height,
        color: textColor
      }}
    >
      {/* Salpicadura de sangre esparcida */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80 text-[#800000] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
        viewBox="0 0 120 40" 
        fill="currentColor"
        preserveAspectRatio="none"
      >
        {/* Mancha principal esparcida en la esquina */}
        <path d="M100,2 C105,8 112,3 118,10 C114,15 119,22 110,25 C102,20 98,28 92,20 C88,14 93,8 98,10 Z" />
        {/* Gotitas y salpicaduras independientes */}
        <circle cx="85" cy="8" r="1.5" />
        <circle cx="90" cy="26" r="1" />
        <circle cx="108" cy="30" r="1.2" />
        <circle cx="78" cy="18" r="0.8" />
        <circle cx="115" cy="2" r="1" />
        <circle cx="5" cy="32" r="1.2" />
        <circle cx="12" cy="28" r="0.8" />
      </svg>

      <span className="relative z-10">{text}</span>
    </button>
  );
}

export default Button;
/*
<button
      className={`rounded-3xl font-['Prompt'] font-bold text-[${textSize}] ${disabled ? "opacity-50 cursor-not-allowed" : ""} `}
      onClick={click}
      disabled={disabled}
      style={{
        backgroundColor: color,
        width: width,
        height: height,
        color: textColor
      }}
    >
      {text}
    </button>*/