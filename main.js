import { URL_THREE } from "./src/configuracion.js";
import { iniciarJuego } from "./src/juego.js";
import { obtenerInterfaz, mostrarError } from "./src/interfaz/interfaz.js";

const interfaz = obtenerInterfaz();

try {
  interfaz.textoCarga.textContent = "Cargando Three.js…";
  const THREE = await import(URL_THREE);
  iniciarJuego(THREE, interfaz);
} catch (error) {
  console.error(error);
  mostrarError(
    interfaz,
    "No se pudo cargar el motor 3D. Comprueba tu conexión a internet y recarga la página.",
  );
}
