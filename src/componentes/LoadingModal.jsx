function LoadingModal({ visible, titulo }) {
  if (!visible) return null;
  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content loading-content">
        <div className="loading-ticket">🎟️</div>
        <h2>{titulo}</h2>
        <p>Estamos preparando todo para vos</p>
        <div className="loading-spinner"></div>
        <div className="loading-text">CARGANDO...</div>
      </div>
    </div>
  );
}
export default LoadingModal;
