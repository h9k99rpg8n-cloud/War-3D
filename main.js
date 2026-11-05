import { URL_IDB, URL_RAPIER, URL_THREE } from "./src/configuracion.js";
import { crearAlmacenMundos } from "./src/guardado/almacenMundos.js";
import { iniciarJuego } from "./src/juego.js";
import {
  mostrarCargaMundo,
  mostrarError,
  obtenerInterfaz,
} from "./src/interfaz/interfaz.js";
import { crearAjustesGlobales } from "./src/interfaz/ajustesGlobales.js";
import { prepararComponentesMenu } from "./src/interfaz/componentesMenu.js";
import { esperarSeleccionMundo } from "./src/interfaz/lanzador.js";
import { crearVistaMenu3D } from "./src/menu/vistaMenu3D.js";

const interfaz = obtenerInterfaz();
prepararComponentesMenu(interfaz);
const ajustesGlobales = crearAjustesGlobales(interfaz);
let errorMostrado = false;

// Vista previa 3D de la portada: se pinta cuanto antes, sin bloquear el resto
// del arranque. Si WebGL falta, la portada mantiene su fondo CSS.
const vistaMenu = await crearVistaMenu3D(interfaz.previewMenu, {
  semilla: "WAR",
  reducido: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
}).catch(() => null);

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
  interfaz.pantallaInicio.dataset.vista3d = vistaMenu ? "activa" : "ausente";
  const mundoSeleccionado = await esperarSeleccionMundo(interfaz, almacenMundos, {
    vistaMenu,
    audio: ajustesGlobales,
  });
  vistaMenu?.destruir?.();
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
