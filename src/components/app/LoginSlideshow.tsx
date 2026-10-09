import { useEffect, useMemo, useState } from "react";
import { LOGIN_SLIDES } from "@/lib/login-slides";

const INTERVAL_MS = 6000;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Full-bleed crossfading slideshow with a slow Ken Burns zoom. Renders only the current + previous slide. */
export function LoginSlideshow() {
  const [slides, setSlides] = useState<string[]>(LOGIN_SLIDES);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  // Shuffle on the client only (avoids SSR hydration mismatch)
  useEffect(() => { setSlides(shuffled(LOGIN_SLIDES)); }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      setIndex(i => { setPrev(i); return (i + 1) % slides.length; });
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  // Preload the next slide
  useEffect(() => {
    if (slides.length < 2) return;
    const img = new Image();
    img.src = slides[(index + 1) % slides.length];
  }, [index, slides]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <style>{`
        @keyframes lsKenBurns { from { transform: scale(1.02); } to { transform: scale(1.14); } }
        @keyframes lsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lsFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {prev !== null && prev !== index && (
        <img
          key={`prev-${prev}`}
          src={slides[prev]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ animation: "lsFadeOut 1.4s ease-in-out forwards, lsKenBurns 7.4s linear forwards" }}
        />
      )}
      <img
        key={`cur-${index}`}
        src={slides[index]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "lsFadeIn 1.4s ease-in-out forwards, lsKenBurns 7.4s linear forwards" }}
      />

      {/* Readability overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />

      {/* Progress dots */}
      <div className="absolute bottom-6 right-8 flex items-center gap-1.5">
        {slides.slice(0, Math.min(slides.length, 8)).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index % 8 ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
