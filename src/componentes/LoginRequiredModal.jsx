import { useNavigate } from "react-router-dom";

function LoginRequiredModal({ visible, onClose }) {
  const navigate = useNavigate();
  if (!visible) return null;
  return (
    <div
      className="modal"
      style={{ display: "flex" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <button className="close-modal" onClick={onClose} aria-label="Cerrar">
          &times;
        </button>
        <h2>🎟️ Golden Ticket</h2>
        <p className="mensaje-login">
          ¡Es necesario que tengas una cuenta en GoldenTicket para realizar la
          compra!
        </p>
        <div className="login-buttons">
          <button onClick={() => navigate("/login")}>Iniciar sesión</button>
          <button onClick={() => navigate("/registro")}>Registrarse</button>
        </div>
      </div>
    </div>
  );
}
export default LoginRequiredModal;
