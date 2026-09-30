import { useEffect, useRef } from "react";

// Canvas con partículas doradas flotando en el fondo.
// Se dibuja con JavaScript, por eso usamos useRef (para acceder al <canvas>)
// y useEffect (para iniciar la animación y limpiarla al salir de la página).
function Particulas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particulas = [];
    let animacionId;

    function crearParticula() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedY: Math.random() * -0.6 - 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
      };
    }

    function iniciarParticulas() {
      const cantidad = Math.floor((canvas.width * canvas.height) / 12000);
      particulas = Array.from({ length: cantidad }, crearParticula);
    }

    function ajustarCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      iniciarParticulas();
    }

    function animar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particulas.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animacionId = requestAnimationFrame(animar);
    }

    ajustarCanvas();
    animar();
    window.addEventListener("resize", ajustarCanvas);

    // Limpieza: se ejecuta cuando el componente deja de mostrarse
    return () => {
      cancelAnimationFrame(animacionId);
      window.removeEventListener("resize", ajustarCanvas);
    };
  }, []);

  return <canvas id="particles-canvas" ref={canvasRef}></canvas>;
}

export default Particulas;
