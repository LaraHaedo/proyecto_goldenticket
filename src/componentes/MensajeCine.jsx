// Frase cinematográfica del final de las páginas
function MensajeCine({ titulo }) {
  return (
    <section className="cinema-message">
      <div className="cinema-line"></div>
      <p>TU EXPERIENCIA</p>
      <h3>{titulo}</h3>
      <div className="cinema-line"></div>
    </section>
  );
}

export default MensajeCine;
