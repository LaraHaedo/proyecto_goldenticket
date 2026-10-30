import Navbar from './Navbar';
import Footer from './Footer';

function StubPage({ titulo, texto }) {
  return <><Navbar /><main className="cuenta-container"><div className="cuenta-card"><h1>{titulo}</h1><p className="cuenta-sub">{texto}</p></div></main><Footer /></>;
}
export default StubPage;
