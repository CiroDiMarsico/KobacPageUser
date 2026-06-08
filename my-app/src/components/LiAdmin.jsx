const LiAdmin = ({ text, active = false, onClick }) => {
  return (
    <li className="w-full">
      <button
        onClick={onClick}
        className={`font-['koulen'] text-[18px] tracking-wider block py-2.5 transition-colors w-full text-left px-4 rounded-xl
          ${active
            ? "bg-[#0f0f22] text-[#C32CFF]"
            : "text-white/60 hover:bg-white/5 hover:text-white"
          }`}
      >
        {text}
      </button>
    </li>
  )
}

export default LiAdmin
