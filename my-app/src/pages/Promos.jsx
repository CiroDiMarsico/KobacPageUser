const Promos = ({
  hidden = false
}) => {
  return (
    <div hidden={hidden} className="flex items-center flex-col h-[40vh] font-['Prompt'] font-semibold">
      <h1 className="text-3xl">PROMOS</h1>
    </div>
  );
}

export default Promos;