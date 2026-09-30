// Encabezado que se repite en Planes y Candy (título + línea dorada + texto)
function Encabezado({ titulo, children }) {
  return (
    <section className="plans-heading">
      <p className="small-title">✦ GOLDEN TICKET ✦</p>
      <h1>{titulo}</h1>
      <div className="heading-line"><span>★</span></div>
      <p>{children}</p>
    </section>
  );
}

export default Encabezado;
