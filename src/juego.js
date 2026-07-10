import { CONFIGURACION } from "./configuracion.js";
import { crearControles } from "./controles/entrada.js";
import { crearSistemaAranas } from "./entidades/aranas.js";
import { ocultarCarga, prepararInterfaz } from "./interfaz/interfaz.js";
import { crearInventario } from "./inventario/inventario.js";
import { crearSistemaSalud } from "./jugador/salud.js";
import { crearCicloDiaNoche } from "./mundo/cicloDiaNoche.js";
import { crearInteraccionBloques } from "./mundo/interaccionBloques.js";
import { crearTerreno } from "./mundo/terreno.js";
import { ajustarRenderizado, crearSistemaRenderizado } from "./renderizado/escena.js";

export function iniciarJuego(THREE, interfaz, opcionesMundo = {}) {
  const opciones = normalizarOpcionesMundo(opcionesMundo);
  prepararInterfaz(interfaz);
  interfaz.juego.classList.toggle("mode-creative", opciones.modo === "creativo");

  const sistemaRenderizado = crearSistemaRenderizado(
    THREE,
    interfaz.canvas,
    CONFIGURACION,
  );
  const { renderer, scene, camera } = sistemaRenderizado;
  const terreno = crearTerreno(THREE, scene, CONFIGURACION, opciones);
  const controles = crearControles(interfaz, CONFIGURACION);
  const inventario = crearInventario(interfaz, CONFIGURACION, opciones);
  const salud = crearSistemaSalud(interfaz, CONFIGURACION, opciones);
  const { camara, jugador, mundo } = CONFIGURACION;
  const mitadMundo = (mundo.tamanoCuadricula * mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - mundo.margenLimite;
  const puntoInicio = { x: 0, z: 10 };

  camera.position.set(
    puntoInicio.x,
    terreno.obtenerAltura(puntoInicio.x, puntoInicio.z) + jugador.alturaOjos,
    puntoInicio.z,
  );
  camera.rotation.set(camara.inclinacionInicial, camara.giroInicial, 0);

  const cicloDiaNoche = crearCicloDiaNoche(
    THREE,
    scene,
    camera,
    sistemaRenderizado,
    CONFIGURACION,
  );
  const aranas = crearSistemaAranas(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    CONFIGURACION,
  );

  const interaccionBloques = crearInteraccionBloques(
    THREE,
    scene,
    camera,
    interfaz,
    terreno,
    inventario,
    CONFIGURACION,
    opciones,
  );

  salud.establecerAlReaparecer(() => {
    camera.position.set(
      puntoInicio.x,
      terreno.obtenerAltura(puntoInicio.x, puntoInicio.z) + jugador.alturaOjos,
      puntoInicio.z,
    );
    aranas.despejarAlrededor(camera.position, CONFIGURACION.aranas.radioSpawnMinimo);
  });

  let ultimoFrame = performance.now();

  const redimensionar = () => ajustarRenderizado(renderer, camera, CONFIGURACION);
  window.addEventListener("resize", redimensionar);
  window.addEventListener("orientationchange", redimensionar);
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  renderer.setAnimationLoop(renderFrame);
  renderer.render(scene, camera);
  ocultarCarga(interfaz);

  function renderFrame(now) {
    const deltaReal = Math.min((now - ultimoFrame) / 1000, 0.25);
    const delta = Math.min(deltaReal, 0.05);
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
    let penetracionActual = terreno.obtenerPenetracionJugador(
      posicionAnteriorX,
      posicionAnteriorZ,
      piesJugador,
      cabezaJugador,
    );

    if (!salud.estaMuerto()) {
      camera.position.x = THREE.MathUtils.clamp(
        posicionAnteriorX + desplazamientoX,
        -limiteMundo,
        limiteMundo,
      );
      const penetracionX = terreno.obtenerPenetracionJugador(
        camera.position.x,
        posicionAnteriorZ,
        piesJugador,
        cabezaJugador,
      );
      if (
        penetracionX > 0 &&
        (penetracionActual <= 0 || penetracionX >= penetracionActual - 0.0001)
      ) {
        camera.position.x = posicionAnteriorX;
      } else {
        penetracionActual = penetracionX;
      }

      camera.position.z = THREE.MathUtils.clamp(
        posicionAnteriorZ + desplazamientoZ,
        -limiteMundo,
        limiteMundo,
      );
      const penetracionZ = terreno.obtenerPenetracionJugador(
        camera.position.x,
        camera.position.z,
        piesJugador,
        cabezaJugador,
      );
      if (
        penetracionZ > 0 &&
        (penetracionActual <= 0 || penetracionZ >= penetracionActual - 0.0001)
      ) {
        camera.position.z = posicionAnteriorZ;
      }
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
    const estadoCiclo = cicloDiaNoche.actualizar(deltaReal);
    salud.actualizar(now);
    aranas.actualizar(now, delta, estadoCiclo);
    interaccionBloques.actualizar(now, !salud.estaMuerto());

    renderer.render(scene, camera);
  }
}

function normalizarOpcionesMundo(opciones) {
  const modo = opciones.modo === "creativo" ? "creativo" : "supervivencia";
  const tipoMundo =
    modo === "creativo" && opciones.tipoMundo === "plano" ? "plano" : "normal";
  return {
    nombreMundo: opciones.nombreMundo || "Mi mundo",
    modo,
    tipoMundo,
  };
}
