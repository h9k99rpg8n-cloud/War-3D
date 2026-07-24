import { URL_IDB, URL_RAPIER, URL_THREE } from "./src/configuracion.js";
import { crearAlmacenMundos } from "./src/guardado/almacenMundos.js";
import { iniciarJuego } from "./src/juego.js";
import {
  mostrarCargaMundo,
  mostrarError,
  obtenerInterfaz,
} from "./src/interfaz/interfaz.js";
import { crearAjustesGlobales } from "./src/interfaz/ajustesGlobales.js";
import { esperarSeleccionMundo } from "./src/interfaz/lanzador.js";

const interfaz = obtenerInterfaz();
const ajustesGlobales = crearAjustesGlobales(interfaz);
let errorMostrado = false;

window.addEventListener("error", (event) => {
  if (event.error) manejarError(event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  manejarError(event.reason);
});

try {
  let openDB = null;
  try {
    ({ openDB } = await import(URL_IDB));
  } catch (errorIdb) {
    console.warn("La librería idb no cargó; se usará IndexedDB nativo.", errorIdb);
  }
  const almacenMundos = await crearAlmacenMundos(openDB);
  const mundoSeleccionado = await esperarSeleccionMundo(interfaz, almacenMundos);
  const opcionesMundo = {
    ...mundoSeleccionado,
    preferenciasGlobales: ajustesGlobales.obtenerPreferencias(),
  };
  await mostrarCargaMundo(interfaz, opcionesMundo);
  const THREE = await import(URL_THREE);
  let RAPIER = null;
  try {
    const moduloRapier = await import(URL_RAPIER);
    RAPIER = moduloRapier.default ?? moduloRapier;
    await moduloRapier.init();
  } catch (errorRapier) {
    console.warn("Rapier no cargó; se usará la gravedad de respaldo.", errorRapier);
  }
  iniciarJuego(THREE, interfaz, opcionesMundo, RAPIER, {
    guardarProgreso: (progreso) =>
      almacenMundos.guardarProgreso(opcionesMundo.id, progreso),
    salirAlMenu: () => window.location.reload(),
  });
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
