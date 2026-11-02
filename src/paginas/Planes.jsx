
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

import Particulas from "../componentes/Particulas";
import Encabezado from "../componentes/Encabezado";
import TarjetaPlan from "../componentes/TarjetaPlan";
import ModalPlan from "../componentes/ModalPlan";
import MensajeCine from "../componentes/MensajeCine";
import { planes } from "../datos/planes";
import "../estilos/planes.css";

function Planes() {
  const navigate = useNavigate();

  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Seleccionar un plan
  const seleccionarPlan = (plan) => {
    // Si no inició sesión y selecciona Bronze, ir al registro
    if (plan.id === "bronze" && !auth.currentUser) {
      navigate("/registro");
      return;
    }

    setPlanSeleccionado(plan);
    setModalAbierto(true);
  };

  // Cerrar modal
  const cerrarModal = () => {
    setModalAbierto(false);
    setPlanSeleccionado(null);
  };

  // Activar plan
  const activarPlan = async (planId) => {
    const usuario = auth.currentUser;

    if (!usuario) {
      throw new Error("Usuario no autenticado");
    }

    await updateDoc(doc(db, "usuarios", usuario.uid), {
      plan: planId,
      estadoPlan: "activo",
      metodoPago: "tarjeta_simulada",
      actualizadoEn: serverTimestamp(),
    });
  };

  return (
    <div className="pagina-planes">
      <Particulas />

      <ModalPlan
        plan={planSeleccionado}
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        onActivar={activarPlan}
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
