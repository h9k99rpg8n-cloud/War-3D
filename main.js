import { URL_THREE } from "./src/configuracion.js";
import { iniciarJuego } from "./src/juego.js";
import {
  esperarCreacionMundo,
  mostrarCargaMundo,
  mostrarError,
  obtenerInterfaz,
} from "./src/interfaz/interfaz.js";

const interfaz = obtenerInterfaz();
let errorMostrado = false;

window.addEventListener("error", (event) => {
  if (event.error) manejarError(event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  manejarError(event.reason);
});

try {
  const opcionesMundo = await esperarCreacionMundo(interfaz);
  await mostrarCargaMundo(interfaz, opcionesMundo);
  const THREE = await import(URL_THREE);
  iniciarJuego(THREE, interfaz, opcionesMundo);
} catch (error) {
  manejarError(error);
}

function manejarError(error) {
  console.error(error);
  if (errorMostrado) return;
  errorMostrado = true;
  mostrarError(
    interfaz,
    "War 3D no pudo continuar. Comprueba la conexión, cierra otras pestañas y recarga la página.",
  );
}
