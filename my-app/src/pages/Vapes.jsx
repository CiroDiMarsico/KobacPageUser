import { useRef, useEffect, useState } from "react";

const Vapes = ({ hidden = false }) => {
  const divRef = useRef(null);
  const [pathData, setPathData] = useState({ d: "", perimeter: 0 });

  useEffect(() => {
    if (divRef.current) {
      const w = divRef.current.offsetWidth;
      const h = divRef.current.offsetHeight;
      const r = 16;
      const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      // perímetro aproximado: 2*(w+h) - esquinas
      const perimeter = 2 * (w + h) - (8 - 2 * Math.PI) * r;
      setPathData({ d, perimeter: Math.round(perimeter) });
    }
  }, []);

  return (
    <a
      ref={divRef}
      hidden={hidden}
      className="relative flex items-center flex-col justify-center font-['Prompt'] font-semibold mx-6 my-4 rounded-2xl p-8"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #11111F 50%, #1a0a2e 100%)' }}
      href="https://wa.me/5493516427916?text=Hola!%20me%20pasas%20el%20catalogo%20de%20vapes%20💜"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="absolute inset-0 rounded-2xl border border-[#C32CFF]/20" />

      {pathData.d && (
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <defs>
            <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#C32CFF" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          <path d={pathData.d} fill="none" stroke="#C32CFF" strokeWidth="1" opacity="0.2" />

          <path
            d={pathData.d}
            fill="none"
            stroke="#C32CFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`60 ${pathData.perimeter}`}
            style={{ filter: 'drop-shadow(0 0 4px #C32CFF) drop-shadow(0 0 8px #C32CFF)' }}
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to={`-${pathData.perimeter + 60}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      )}

      <h1 className="text-2xl text-white/70 tracking-widest mb-3 z-10">PARA MÁS INFO</h1>
      <h1

        className="text-5xl text-[#C32CFF] font-bold tracking-wider z-10"
        style={{ textShadow: '0 0 20px #C32CFF, 0 0 40px #C32CFF88', animation: 'pulse 2s ease-in-out infinite' }}
      >
        CLICK AQUÍ
      </h1>
    </a>
  );
}

export default Vapes;