import { useState } from "react";
import Particulas from "../componentes/Particulas";
import Encabezado from "../componentes/Encabezado";
import TarjetaPlan from "../componentes/TarjetaPlan";
import ModalPlan from "../componentes/ModalPlan";
import MensajeCine from "../componentes/MensajeCine";
import { planes } from "../datos/planes";
import "../estilos/planes.css";

function Planes() {
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const seleccionarPlan = (plan) => {
    setPlanSeleccionado(plan);
    setModalAbierto(true);
  };

  const cerrarModal = () => setModalAbierto(false);

  return (
    <div className="pagina-planes">
      <Particulas />

      <ModalPlan
        plan={planSeleccionado}
        abierto={modalAbierto}
        onCerrar={cerrarModal}
      />

      <main className="plans-section">
        <div className="film-strip film-left"></div>
        <div className="film-strip film-right"></div>

        <Encabezado titulo="PLANES PARA ASOCIARTE">
          Elegí tu plan y disfrutá de beneficios exclusivos para vivir cada
          función como una experiencia especial.
        </Encabezado>

        <section className="plans-container">
          {planes.map((plan) => (
            <TarjetaPlan
              key={plan.id}
              plan={plan}
              onSeleccionar={seleccionarPlan}
            />
          ))}
        </section>

        <MensajeCine titulo="COMIENZA ANTES DE QUE SE APAGUEN LAS LUCES" />
      </main>
    </div>
  );
}

export default Planes;
