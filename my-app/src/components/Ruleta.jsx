import { useState, useEffect } from "react";
import api from "../api/axios";

// El orden tiene que coincidir con SEGMENTOS en api/src/controllers/discountController.js:
// el servidor elige el premio y devuelve el indice del segmento donde frenar.
const SEGMENTOS = [
  { texto: "5%", color: "#C32CFF" },
  { texto: "PERDISTE", color: "#1E1E1E" },
  { texto: "10%", color: "#C32CFF" },
  { texto: "PERDISTE", color: "#1E1E1E" },
  { texto: "15%", color: "#C32CFF" },
  { texto: "PERDISTE", color: "#1E1E1E" },
  { texto: "100%", color: "#E5B80B" },
  { texto: "PERDISTE", color: "#1E1E1E" },
  { texto: "ENVIO GRATIS", color: "#128505" },
  { texto: "PERDISTE", color: "#1E1E1E" },
];

const ANGULO = 360 / SEGMENTOS.length;
const DURACION_GIRO = 5000;
const ESPERA_MS = 12 * 60 * 60 * 1000;
const DEMORA_APARICION = 1200;

const KEY_DEVICE = "ruletaDeviceId";
const KEY_ULTIMO_GIRO = "ruletaUltimoGiro";
const KEY_CUPON = "ruletaCupon";

// localStorage puede tirar en navegacion privada: si falla, la ruleta igual anda.
const leer = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const guardar = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* sin storage */ }
};
const borrar = (key) => {
  try { localStorage.removeItem(key); } catch { /* sin storage */ }
};

// Ultimo cupon ganado en este dispositivo ({ segmento, premio, code }).
const leerCupon = () => {
  try { return JSON.parse(leer(KEY_CUPON)) || null; } catch { return null; }
};

const getDeviceId = () => {
  let id = leer(KEY_DEVICE);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    guardar(KEY_DEVICE, id);
  }
  return id;
};

const puedeGirar = () => {
  const ultimo = Number(leer(KEY_ULTIMO_GIRO));
  return !ultimo || Date.now() - ultimo >= ESPERA_MS;
};

// Punto en el borde del circulo; 0 grados = arriba, sentido horario.
const punto = (grados, radio) => {
  const rad = (grados - 90) * Math.PI / 180;
  return [100 + radio * Math.cos(rad), 100 + radio * Math.sin(rad)];
};

const COLORES_LUCES = ["#FF6600", "#C32CFF", "#FFFFFF"];

// Fila de lamparitas que titilan alternadas, arriba o abajo del cartel.
const Luces = ({ lado }) => (
  <div className={`absolute left-4 right-4 flex justify-between ${lado === "top" ? "-top-[7px]" : "-bottom-[7px]"}`}>
    {Array.from({ length: 11 }, (_, i) => {
      const color = COLORES_LUCES[i % COLORES_LUCES.length];
      return (
        <span
          key={i}
          className="w-[12px] h-[12px] rounded-full animate-luz"
          style={{ backgroundColor: color, color, animationDelay: `${(i % 2) * 0.35}s` }}
        />
      );
    })}
  </div>
);

const Ruleta = () => {
  const [montado, setMontado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [rotacion, setRotacion] = useState(0);
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Aparece un rato despues de que cargo la pagina. Si hay un cupon ganado
  // que todavia no se uso, se vuelve a mostrar el cartel con el codigo en vez
  // de la ruleta: mientras ese cupon este activo no se puede volver a girar.
  useEffect(() => {
    let cancelado = false;
    let t;
    const mostrar = () => {
      t = setTimeout(() => {
        if (cancelado) return;
        setMontado(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      }, DEMORA_APARICION);
    };

    const cupon = leerCupon();
    if (cupon?.code) {
      api.get(`/discounts/validate/${encodeURIComponent(cupon.code)}`)
        .then(() => {
          if (cancelado) return;
          setResultado(cupon);
          mostrar();
        })
        .catch(err => {
          // Solo un 404 significa "ya se uso o vencio". Si fallo la red no
          // mostramos nada, para no dejarlo girar con un cupon que quizas sigue activo.
          if (cancelado || err.response?.status !== 404) return;
          borrar(KEY_CUPON);
          if (puedeGirar()) mostrar();
        });
    } else if (puedeGirar()) {
      mostrar();
    }

    return () => { cancelado = true; clearTimeout(t); };
  }, []);

  const cerrar = () => {
    setVisible(false);
    setTimeout(() => setMontado(false), 300);
  };

  const girar = async () => {
    if (girando || resultado) return;
    setGirando(true);
    setError("");

    try {
      const { data } = await api.post("/discounts/spin", { deviceId: getDeviceId() });
      guardar(KEY_ULTIMO_GIRO, String(Date.now()));
      if (data.code) guardar(KEY_CUPON, JSON.stringify(data));

      // Llevar el centro del segmento ganador debajo de la flecha, con varias
      // vueltas y un poco de ruido para que no frene siempre en el medio.
      const centro = data.segmento * ANGULO + ANGULO / 2;
      const ruido = (Math.random() - 0.5) * ANGULO * 0.6;
      const actual = rotacion % 360;
      const destino = rotacion + 360 * 6 + (360 - centro - actual) + ruido;
      setRotacion(destino);

      setTimeout(() => {
        setGirando(false);
        setResultado(data);
      }, DURACION_GIRO);
    } catch (err) {
      setGirando(false);
      const cupon = err.response?.data?.cupon;
      if (cupon) {
        // El servidor sabe que este dispositivo tiene un cupon sin usar.
        guardar(KEY_CUPON, JSON.stringify(cupon));
        setResultado(cupon);
      } else if (err.response?.status === 429) {
        guardar(KEY_ULTIMO_GIRO, String(Date.now()));
        setError("Ya giraste la ruleta. Volvé en 12hs 👻");
      } else {
        setError("No pudimos girar la ruleta, probá de nuevo.");
      }
    }
  };

  const copiar = async () => {
    const code = resultado.code;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const input = document.createElement("input");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (!montado) return null;

  const gano = resultado && resultado.code;
  const textoPremio = resultado
    ? resultado.premio === "envio"
      ? "¡GANASTE ENVIO GRATIS!"
      : `¡GANASTE ${SEGMENTOS[resultado.segmento].texto} DE DESCUENTO!`
    : "";

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${visible ? "bg-black/70 backdrop-blur-[2px]" : "bg-black/0"}`}
      onClick={() => !girando && cerrar()}
    >
      <button
        onClick={cerrar}
        disabled={girando}
        aria-label="Cerrar"
        className={`fixed top-5 right-5 w-[44px] h-[44px] rounded-full bg-black/50 text-white/80 hover:text-white text-[30px] leading-none flex items-center justify-center transition-opacity duration-300 disabled:opacity-30 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        ×
      </button>

      <div
        className={`w-[90vw] max-w-[420px] flex flex-col items-center gap-5 font-['prompt'] text-white transition-all duration-500 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-['prompt'] font-semibold text-[42px] leading-[0.95] text-center text-[#FF6600] drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
          TRUCO<br /><span className="text-white">O</span><br />TRAGO
        </h2>

        {!resultado && (
          <>
            <div className="relative w-[320px] h-[320px] max-[380px]:w-[270px] max-[380px]:h-[270px]">
              {/* Flecha */}
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[26px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]" />

              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{
                  transform: `rotate(${rotacion}deg)`,
                  transition: girando ? `transform ${DURACION_GIRO}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
                }}
              >
                {SEGMENTOS.map((s, i) => {
                  const desde = i * ANGULO;
                  const hasta = desde + ANGULO;
                  const [x1, y1] = punto(desde, 98);
                  const [x2, y2] = punto(hasta, 98);
                  const [tx, ty] = punto(desde + ANGULO / 2, 62);
                  return (
                    <g key={i}>
                      <path
                        d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                        fill={s.color}
                        stroke="#0A0A0A"
                        strokeWidth="1"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="white"
                        fontFamily="koulen"
                        fontSize={s.texto.length > 5 ? 12 : 20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${desde + ANGULO / 2 - 90}, ${tx}, ${ty})`}
                      >
                        {/* Los textos con espacio van en dos renglones para que entren en la porcion */}
                        {s.texto.includes(" ")
                          ? s.texto.split(" ").map((linea, j) => (
                            <tspan key={j} x={tx} dy={j === 0 ? "-0.5em" : "1em"}>{linea}</tspan>
                          ))
                          : s.texto}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="14" fill="#0A0A0A" stroke="#FF6600" strokeWidth="3" />
                <text x="100" y="101" textAnchor="middle" dominantBaseline="middle" fontSize="12">🎃</text>
              </svg>
            </div>

            <button
              onClick={girar}
              disabled={girando}
              className="rounded-3xl font-['Prompt'] font-bold text-[22px] w-[200px] h-[54px] bg-[#C32CFF] text-white shadow-[0_0_25px_rgba(195,44,255,0.5)] transition-transform active:scale-95 disabled:opacity-60"
            >
              {girando ? "GIRANDO..." : "GIRAR"}
            </button>

            {error && <p className="text-[14px] text-center text-white/80">{error}</p>}
          </>
        )}

        {resultado && !gano && (
          <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
            <span className="text-[60px]">👻</span>
            <p className="font-['koulen'] text-[34px] leading-none">¡PERDISTE!</p>
            <button onClick={cerrar} className="rounded-3xl font-bold text-[18px] w-[180px] h-[48px] bg-[#1E1E1E] text-[#C32CFF]">
              CERRAR
            </button>
          </div>
        )}

        {gano && (
          <div className="flex flex-col items-center gap-4 py-2 animate-fade-in w-full">
            {/* Cartel de premio con luces de marquesina alrededor */}
            <div className="relative w-full px-5 py-6 rounded-3xl border-2 border-[#FF6600]/60 bg-black/40 animate-premio-pop">
              <Luces lado="top" />
              <Luces lado="bottom" />
              <p className="font-['koulen'] text-[40px] max-[380px]:text-[34px] leading-[1.05] text-center text-white animate-neon">
                {textoPremio}
              </p>
            </div>
            <p className="text-white/70 text-center text-[14px]">Usá este código al finalizar tu compra:</p>
            <div className="w-full bg-black/60 border-2 border-dashed border-[#FF6600] rounded-2xl py-4 px-2">
              <p className="font-['koulen'] text-[38px] max-[360px]:text-[30px] tracking-widest text-center leading-none select-all break-all">
                {resultado.code}
              </p>
            </div>
            <button
              onClick={copiar}
              className="rounded-3xl font-bold text-[20px] w-[220px] h-[52px] bg-[#C32CFF] text-white transition-transform active:scale-95"
            >
              {copiado ? "¡COPIADO! ✅" : "COPIAR CÓDIGO"}
            </button>
            <p className="text-white/50 text-center text-[12px]">Un solo uso · No aplica a promos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ruleta;
