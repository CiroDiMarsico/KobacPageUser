const Navbar = () => {
  return (
    <nav className="bg-gradient-to-b from-[#0A0A0A] from-40% to-transparent w-full h-[70px] flex fixed justify-around items-center px-[50px] z-50">
      <a href="https://wa.me/5493516427916" target="_blank" rel="noopener noreferrer">
        <img src="/assets/whatsapp.png" alt="ig" className="h-[45px] animate-fade-in" />
      </a>
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <img src="/assets/logokobac.png" alt="logo" className="h-[110px] rounded-full animate-fade-in" />
      </button>
      <a href="https://www.instagram.com/kobac.delivery?igsh=MTByZmozOXo1MXllcA%3D%3D&utm_source=qr"><img src="/assets/instagram.png" alt="ig" className="h-[45px] animate-fade-in" /></a>
    </nav>
  );
}

export default Navbar;