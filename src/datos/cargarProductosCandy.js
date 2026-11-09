import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";
import { productos } from "./productos";

// Carga los productos que todavía no existen, sin pisar cambios del administrador.
export async function cargarProductosCandy() {
  const existentes = await getDocs(collection(db, "candy"));
  const codigosExistentes = new Set(existentes.docs.flatMap((item) => {
    const data = item.data();
    return [String(data.id ?? ""), String(data.codigo ?? "")];
  }));
  const batch = writeBatch(db);
  let pendientes = 0;

  for (const producto of productos) {
    // También reconoce documentos de la carga anterior, que usaba IDs automáticos.
    if (codigosExistentes.has(String(producto.id)) || codigosExistentes.has(String(producto.codigo))) continue;
    const referencia = doc(db, "candy", String(producto.id));
    const existente = await getDoc(referencia);

    if (!existente.exists()) {
      batch.set(referencia, {
        ...producto,
        stock: 20,
        activo: true,
        creadoEn: new Date(),
      });
      pendientes += 1;
    }
  }

  if (pendientes > 0) await batch.commit();
  return pendientes;
}
