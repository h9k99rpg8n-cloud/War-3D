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
  const configuracion = crearConfiguracionJuego(opciones);
  const creativo = opciones.modo === "creativo";
  prepararInterfaz(interfaz);
  interfaz.juego.classList.toggle("mode-creative", creativo);

  const sistemaRenderizado = crearSistemaRenderizado(
    THREE,
    interfaz.canvas,
    configuracion,
  );
  const { renderer, scene, camera } = sistemaRenderizado;
  const terreno = crearTerreno(THREE, scene, configuracion, opciones);
  const controles = crearControles(interfaz, configuracion);
  const inventario = crearInventario(interfaz, configuracion, opciones);
  const salud = crearSistemaSalud(interfaz, configuracion, opciones);
  const { agua, camara, jugador, mundo } = configuracion;
  const mitadMundo = (mundo.tamanoCuadricula * mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - mundo.margenLimite;
  const puntoInicio = { x: 0, z: 10 };
  let velocidadVertical = 0;
  let volando = false;

  interfaz.botonVuelo.hidden = !creativo;
  actualizarInterfazVuelo();

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
    configuracion,
  );
  const aranas = crearSistemaAranas(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    configuracion,
  );

  const interaccionBloques = crearInteraccionBloques(
    THREE,
    scene,
    camera,
    interfaz,
    terreno,
    inventario,
    configuracion,
    opciones,
  );

  salud.establecerAlReaparecer(() => {
    establecerVuelo(false);
    velocidadVertical = 0;
    camera.position.set(
      puntoInicio.x,
      terreno.obtenerAltura(puntoInicio.x, puntoInicio.z) + jugador.alturaOjos,
      puntoInicio.z,
    );
    aranas.despejarAlrededor(camera.position, configuracion.aranas.radioSpawnMinimo);
  });

  let ultimoFrame = performance.now();

  const redimensionar = () => ajustarRenderizado(renderer, camera, configuracion);
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

    const muerto = salud.estaMuerto();
    const saltoSolicitado = controles.consumirSalto();
    const cambioVueloSolicitado = controles.consumirCambioVuelo();
    if (!muerto && creativo && cambioVueloSolicitado) {
      establecerVuelo(!volando);
    }

    const { lateral, adelante } = controles.obtenerMovimiento();
    const { giro, inclinacion } = controles.obtenerVista();
    const forwardX = -Math.sin(giro);
    const forwardZ = -Math.cos(giro);
    const rightX = Math.cos(giro);
    const rightZ = -Math.sin(giro);

    const posicionAnteriorX = camera.position.x;
    const posicionAnteriorZ = camera.position.z;
    const piesAntesMovimiento = camera.position.y - jugador.alturaOjos;
    const cabezaAntesMovimiento = camera.position.y + 0.18;
    const enAguaAntesMovimiento =
      !volando &&
      terreno.estaEnAgua(
        posicionAnteriorX,
        posicionAnteriorZ,
        piesAntesMovimiento,
        cabezaAntesMovimiento,
      );
    const multiplicadorMovimiento = enAguaAntesMovimiento
      ? agua.multiplicadorMovimiento
      : 1;
    const desplazamientoX =
      (rightX * lateral + forwardX * adelante) *
      jugador.velocidad *
      multiplicadorMovimiento *
      delta;
    const desplazamientoZ =
      (rightZ * lateral + forwardZ * adelante) *
      jugador.velocidad *
      multiplicadorMovimiento *
      delta;
    const piesJugador = camera.position.y - jugador.alturaOjos;
    const cabezaJugador = camera.position.y + 0.18;
    let penetracionActual = terreno.obtenerPenetracionJugador(
      posicionAnteriorX,
      posicionAnteriorZ,
      piesJugador,
      cabezaJugador,
    );

    if (!muerto) {
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

    if (!muerto) actualizarMovimientoVertical(delta, saltoSolicitado);
    camera.rotation.set(inclinacion, giro, 0);
    const estadoCiclo = cicloDiaNoche.actualizar(deltaReal);
    salud.actualizar(now);
    aranas.actualizar(now, delta, estadoCiclo);
    interaccionBloques.actualizar(now, !salud.estaMuerto());

    renderer.render(scene, camera);
  }

  function actualizarMovimientoVertical(delta, saltoSolicitado) {
    if (volando) {
      const movimientoVertical = THREE.MathUtils.clamp(
        controles.obtenerMovimientoVertical() + Number(saltoSolicitado),
        -1,
        1,
      );
      if (movimientoVertical === 0) return;

      const piesActuales = camera.position.y - jugador.alturaOjos;
      const alturaMaxima =
        mundo.nivelMaximoColocacion * mundo.tamanoBloque +
        jugador.alturaOjos +
        mundo.tamanoBloque * 4;
      const siguienteY = THREE.MathUtils.clamp(
        camera.position.y +
          movimientoVertical * jugador.velocidadVuelo * delta,
        terreno.obtenerAltura(camera.position.x, camera.position.z) +
          jugador.alturaOjos,
        alturaMaxima,
      );
      const siguientesPies = siguienteY - jugador.alturaOjos;
      const siguienteCabeza = siguienteY + 0.18;

      if (movimientoVertical < 0) {
        const soporte = terreno.obtenerAlturaSoporte(
          camera.position.x,
          camera.position.z,
          piesActuales + 0.08,
          jugador.radio * 0.92,
        );
        if (siguientesPies <= soporte) {
          camera.position.y = soporte + jugador.alturaOjos;
          return;
        }
      }

      if (
        !terreno.hayColisionJugador(
          camera.position.x,
          camera.position.z,
          siguientesPies,
          siguienteCabeza,
        )
      ) {
        camera.position.y = siguienteY;
      }
      return;
    }

    const piesActuales = camera.position.y - jugador.alturaOjos;
    const cabezaActual = camera.position.y + 0.18;
    if (
      terreno.estaEnAgua(
        camera.position.x,
        camera.position.z,
        piesActuales,
        cabezaActual,
      )
    ) {
      const ascendiendo =
        controles.obtenerMovimientoVertical() > 0 || saltoSolicitado;
      const velocidadObjetivo = ascendiendo
        ? agua.velocidadAscenso
        : -agua.velocidadHundimiento;
      const mezclaAgua = 1 - Math.exp(-agua.gravedad * delta);
      velocidadVertical = THREE.MathUtils.lerp(
        velocidadVertical,
        velocidadObjetivo,
        mezclaAgua,
      );
      const siguienteY = camera.position.y + velocidadVertical * delta;
      const siguientesPies = siguienteY - jugador.alturaOjos;
      const siguienteCabeza = siguienteY + 0.18;
      const soporte = terreno.obtenerAlturaSoporte(
        camera.position.x,
        camera.position.z,
        piesActuales + 0.08,
        jugador.radio * 0.92,
      );
      if (velocidadVertical < 0 && siguientesPies <= soporte) {
        camera.position.y = soporte + jugador.alturaOjos;
        velocidadVertical = 0;
      } else if (
        !terreno.hayColisionJugador(
          camera.position.x,
          camera.position.z,
          siguientesPies,
          siguienteCabeza,
        )
      ) {
        camera.position.y = siguienteY;
      } else {
        velocidadVertical = 0;
      }
      return;
    }

    const soporteCercano = terreno.obtenerAlturaSoporte(
      camera.position.x,
      camera.position.z,
      piesActuales + 0.42,
      jugador.radio * 0.92,
    );
    const tocandoSuelo =
      velocidadVertical <= 0 && Math.abs(piesActuales - soporteCercano) <= 0.44;

    if (saltoSolicitado && tocandoSuelo) {
      camera.position.y = soporteCercano + jugador.alturaOjos;
      velocidadVertical = jugador.velocidadSalto;
    } else if (tocandoSuelo) {
      camera.position.y = soporteCercano + jugador.alturaOjos;
      velocidadVertical = 0;
      return;
    }

    velocidadVertical -= jugador.gravedad * delta;
    const siguienteY = camera.position.y + velocidadVertical * delta;
    const siguientesPies = siguienteY - jugador.alturaOjos;
    const siguienteCabeza = siguienteY + 0.18;

    if (velocidadVertical <= 0) {
      const soporteCaida = terreno.obtenerAlturaSoporte(
        camera.position.x,
        camera.position.z,
        piesActuales + 0.08,
        jugador.radio * 0.92,
      );
      if (siguientesPies <= soporteCaida) {
        camera.position.y = soporteCaida + jugador.alturaOjos;
        velocidadVertical = 0;
        return;
      }
    }

    if (
      terreno.hayColisionJugador(
        camera.position.x,
        camera.position.z,
        siguientesPies,
        siguienteCabeza,
      )
    ) {
      velocidadVertical = 0;
      return;
    }
    camera.position.y = siguienteY;
  }

  function establecerVuelo(activo) {
    volando = creativo && activo;
    velocidadVertical = 0;
    actualizarInterfazVuelo();
  }

  function actualizarInterfazVuelo() {
    interfaz.botonVuelo.hidden = !creativo;
    interfaz.botonVuelo.classList.toggle("is-active", volando);
    interfaz.botonVuelo.setAttribute("aria-pressed", String(volando));
    interfaz.botonVuelo.setAttribute(
      "aria-label",
      volando ? "Desactivar vuelo" : "Activar vuelo",
    );
    interfaz.botonVuelo.querySelector("small").textContent = volando
      ? "VUELO"
      : "VOLAR";
    interfaz.botonDescender.hidden = !volando;
    interfaz.etiquetaSalto.textContent = volando ? "SUBIR" : "SALTAR";
    interfaz.botonSaltar.setAttribute(
      "aria-label",
      volando ? "Ascender mientras vuelas" : "Saltar",
    );
  }
}

function normalizarOpcionesMundo(opciones) {
  const modo = opciones.modo === "creativo" ? "creativo" : "supervivencia";
  const tipoMundo =
    modo === "creativo" && opciones.tipoMundo === "plano" ? "plano" : "normal";
  const tamanoSolicitado = Number(opciones.tamanoMundo);
  const tamanoMundo = CONFIGURACION.mundo.tamanosDisponibles.includes(
    tamanoSolicitado,
  )
    ? tamanoSolicitado
    : CONFIGURACION.mundo.tamanoCuadricula;
  return {
    nombreMundo: opciones.nombreMundo || "Mi mundo",
    modo,
    tipoMundo,
    tamanoMundo,
  };
}

function crearConfiguracionJuego(opciones) {
  return Object.freeze({
    ...CONFIGURACION,
    mundo: Object.freeze({
      ...CONFIGURACION.mundo,
      tamanoCuadricula: opciones.tamanoMundo,
    }),
  });
}
