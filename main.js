import { URL_THREE } from "./src/configuracion.js";
import { iniciarJuego } from "./src/juego.js";
import {
  esperarCreacionMundo,
  mostrarCargaMundo,
  mostrarError,
  obtenerInterfaz,
} from "./src/interfaz/interfaz.js";

const interfaz = obtenerInterfaz();

try {
  const opcionesMundo = await esperarCreacionMundo(interfaz);
  await mostrarCargaMundo(interfaz, opcionesMundo);
  const THREE = await import(URL_THREE);
  iniciarJuego(THREE, interfaz, opcionesMundo);
} catch (error) {
  console.error(error);
  mostrarError(
    interfaz,
    "No se pudo cargar el motor 3D. Comprueba tu conexión a internet y recarga la página.",
  );
}
