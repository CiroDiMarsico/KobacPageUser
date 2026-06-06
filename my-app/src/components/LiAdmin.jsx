import { useNavigate } from "react-router-dom"

const LiAdmin = ({ route, text }) => {
  const navigate = useNavigate()
  return (
    <li className="w-full">
      <button
        onClick={() => navigate('/admin/' + route)}
        className="font-['koulen'] text-[18px] text-white/80 tracking-wider block py-2 hover:bg-[#0f0f22] transition-colors w-full text-left px-4"
      >
        {text}
      </button>
    </li>
  );
}

export default LiAdmin;