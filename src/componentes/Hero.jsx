import { useState } from "react";
import { destacados } from "../datos/peliculas";

// Marquesina principal con puntitos para cambiar de destacado
function Hero() {
  const [indice, setIndice] = useState(0);
  const item = destacados[indice];

  return (
    <section className="hero">
      <div className="marquee-box">
        <div className="marquee-sub">{item.sub}</div>
        <div className="marquee-title">{item.title}</div>
        <div className="marquee-info">{item.info}</div>

        <div className="marquee-controls">
          {destacados.map((d, i) => (
            <button
              key={i}
              className={indice === i ? "dot-btn active" : "dot-btn"}
              onClick={() => setIndice(i)}
              aria-label={`Ver destacado ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
