// Componente reutilizable: recibe un plan por Props (Clase 7)
function TarjetaPlan({ plan, onSeleccionar }) {
  return (
    <article className={`plan-card ${plan.id}`}>
      <div className="ticket-holes left"></div>
      <div className="ticket-holes right"></div>

      <div className="plan-content">
        <div className="plan-title">
          <span className="plan-number">{plan.numero}</span>
          <h2>{plan.nombre}</h2>
        </div>

        <div className="plan-divider"></div>

        <div className="benefit-lines">
          {plan.requisito && <div className="req-tag">{plan.requisito}</div>}
          {plan.precio && <div className="price-tag">{plan.precio}</div>}
          {plan.desbloqueo && <div className="unlock-tag">{plan.desbloqueo}</div>}

          {plan.beneficios.map((b, i) => (
            <div key={i}>
              {b.icono} {b.antes}
              {b.destacado && <strong>{b.destacado}</strong>}
              {b.despues}
            </div>
          ))}
        </div>

        <button className="plan-button" onClick={() => onSeleccionar(plan)}>
          Obtener beneficio
        </button>
      </div>
    </article>
  );
}

export default TarjetaPlan;
