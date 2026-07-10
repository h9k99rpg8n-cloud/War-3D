import { CONFIGURACION } from "./configuracion.js";
import { crearControles } from "./controles/entrada.js";
import { ocultarCarga, prepararInterfaz } from "./interfaz/interfaz.js";
import { crearInventario } from "./inventario/inventario.js";
import { crearInteraccionBloques } from "./mundo/interaccionBloques.js";
import { crearTerreno } from "./mundo/terreno.js";
import { ajustarRenderizado, crearSistemaRenderizado } from "./renderizado/escena.js";

export function iniciarJuego(THREE, interfaz) {
  prepararInterfaz(interfaz);

  const { renderer, scene, camera } = crearSistemaRenderizado(
    THREE,
    interfaz.canvas,
    CONFIGURACION,
  );
  const terreno = crearTerreno(THREE, scene, CONFIGURACION);
  const controles = crearControles(interfaz, CONFIGURACION);
  const inventario = crearInventario(interfaz, CONFIGURACION);
  const { camara, jugador, mundo } = CONFIGURACION;
  const mitadMundo = (mundo.tamanoCuadricula * mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - mundo.margenLimite;

  camera.position.set(0, terreno.obtenerAltura(0, 10) + jugador.alturaOjos, 10);
  camera.rotation.set(camara.inclinacionInicial, camara.giroInicial, 0);

  const interaccionBloques = crearInteraccionBloques(
    THREE,
    scene,
    camera,
    interfaz,
    terreno,
    inventario,
    CONFIGURACION,
  );

  let ultimoFrame = performance.now();

  const redimensionar = () => ajustarRenderizado(renderer, camera, CONFIGURACION);
  window.addEventListener("resize", redimensionar);
  window.addEventListener("orientationchange", redimensionar);
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  renderer.setAnimationLoop(renderFrame);
  renderer.render(scene, camera);
  ocultarCarga(interfaz);

  function renderFrame(now) {
    const delta = Math.min((now - ultimoFrame) / 1000, 0.05);
    ultimoFrame = now;

    const { lateral, adelante } = controles.obtenerMovimiento();
    const { giro, inclinacion } = controles.obtenerVista();
    const forwardX = -Math.sin(giro);
    const forwardZ = -Math.cos(giro);
    const rightX = Math.cos(giro);
    const rightZ = -Math.sin(giro);

    const posicionAnteriorX = camera.position.x;
    const posicionAnteriorZ = camera.position.z;
    const desplazamientoX =
      (rightX * lateral + forwardX * adelante) * jugador.velocidad * delta;
    const desplazamientoZ =
      (rightZ * lateral + forwardZ * adelante) * jugador.velocidad * delta;
    const piesJugador = camera.position.y - jugador.alturaOjos;
    const cabezaJugador = camera.position.y + 0.18;

    camera.position.x = THREE.MathUtils.clamp(
      posicionAnteriorX + desplazamientoX,
      -limiteMundo,
      limiteMundo,
    );
    if (
      terreno.hayColisionJugador(
        camera.position.x,
        posicionAnteriorZ,
        piesJugador,
        cabezaJugador,
      )
    ) {
      camera.position.x = posicionAnteriorX;
    }

    camera.position.z = THREE.MathUtils.clamp(
      posicionAnteriorZ + desplazamientoZ,
      -limiteMundo,
      limiteMundo,
    );
    if (
      terreno.hayColisionJugador(
        camera.position.x,
        camera.position.z,
        piesJugador,
        cabezaJugador,
      )
    ) {
      camera.position.z = posicionAnteriorZ;
    }

    const alturaObjetivo =
      terreno.obtenerAltura(camera.position.x, camera.position.z) + jugador.alturaOjos;
    const mezclaAltura = 1 - Math.exp(-10 * delta);
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      alturaObjetivo,
      mezclaAltura,
    );
    camera.rotation.set(inclinacion, giro, 0);
    interaccionBloques.actualizar(now);

    renderer.render(scene, camera);
  }
}
