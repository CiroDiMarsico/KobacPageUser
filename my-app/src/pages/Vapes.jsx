const Vapes = ({
  hidden = false
}) => {
  return (
    <div hidden={hidden} className="flex items-center flex-col h-[40vh] font-['Prompt'] font-semibold">
      <h1 className="text-3xl">PARA MAS INFO</h1>
      <a href="https://wa.me/5493516427916?text=Hola!%20me%20pasas%20el%20catalogo%20de%20vapes%20💜"
        target="_blank"
        rel="noopener noreferrer" 
        className="text-5xl animate-pulse text-[#C32CFF]">CLICK AQUI</a>
    </div>
  );
}
export default Vapes;