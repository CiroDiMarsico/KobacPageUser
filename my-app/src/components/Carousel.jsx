import { useState, useEffect, useCallback, useRef } from "react";

const slides = [
  { img: "./src/assets/comboDelFinde.jpeg" },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  //solo
  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 5000);
  }, []);

  //flechas
  const next = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length);
    resetTimer();
  }, [resetTimer]);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + slides.length) % slides.length);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  //mover con el dedo
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;

    if (diff > 50) next();       // swipe izquierda → siguiente
    if (diff < -50) prev();      // swipe derecha → anterior

    touchStartX.current = null;
  };
  return (
    <div className="relative w-full h-[450px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0
      transition-all duration-500 ease-in-out
      ${i === current ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10 pointer-events-none"}`}
        >
          <img
            src={s.img}
            alt="img"
            className="w-full h-full object-contain"
          />
        </div>
      ))}
      {/* Flecha izquierda */}
      <button
        onClick={prev}
        className="absolute left-0 top-0 h-full px-3 bg-transparent text-white/70 text-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
      >
        <span style={{ display: "inline-block", transform: "scaleY(3)" }}>
          &lt;
        </span>
      </button>

      {/* Flecha derecha */}
      <button
        onClick={next}
        className="absolute right-0 top-0 h-full px-3 bg-transparent text-white/70 text-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
      >
        <span style={{ display: "inline-block", transform: "scaleY(3)" }}>
          &gt;
        </span>
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-1 transition-all duration-300 ${i === current ? "bg-white scale-110" : "bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}