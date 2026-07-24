import { CONFIGURACION } from "./configuracion.js";
import { crearControles } from "./controles/entrada.js";
import { crearSistemaAranas } from "./entidades/aranas.js";
import { crearSistemaEsqueletosUmbral } from "./entidades/esqueletosUmbral.js";
import { crearSistemaZombies } from "./entidades/zombies.js";
import { crearSistemaEstaciones } from "./crafteo/estaciones.js";
import { crearFisicaArena } from "./fisica/arena.js";
import { crearFisicaAgua } from "./fisica/agua.js";
import { crearSistemaAjustes } from "./interfaz/ajustes.js";
import { ocultarCarga, prepararInterfaz } from "./interfaz/interfaz.js";
import { crearInventario } from "./inventario/inventario.js";
import { crearBrazoPrimeraPersona } from "./jugador/brazoPrimeraPersona.js";
import { crearSistemaSalud } from "./jugador/salud.js";
import { crearCicloDiaNoche } from "./mundo/cicloDiaNoche.js";
import { crearInteraccionBloques } from "./mundo/interaccionBloques.js";
import { crearTerrenoContainer } from "./mundo/terrenoContainer.js";
import { ajustarRenderizado, crearSistemaRenderizado } from "./renderizado/escena.js";
import { aplicarRecursosVisualesInterfaz } from "./renderizado/registroVisuales.js";
import {
  intervaloRenderMs,
  resolverPerfilRendimiento,
} from "./rendimiento/perfiles.js";
import {
  crearMonitorRendimiento,
  estimarMemoriaRender,
} from "./rendimiento/monitorRendimiento.js";

export function iniciarJuego(
  THREE,
  interfaz,
  opcionesMundo = {},
  RAPIER = null,
  servicios = {},
) {
  const opciones = normalizarOpcionesMundo(opcionesMundo);
  const configuracion = crearConfiguracionJuego(opciones);
  const creativo = opciones.modo === "creativo";
  prepararInterfaz(interfaz);
  interfaz.juego.classList.toggle("mode-creative", creativo);
  interfaz.juego.dataset.visualStyle = opciones.estiloVisual;
  aplicarRecursosVisualesInterfaz(document, opciones.estiloVisual);
  interfaz.juego.dataset.joystickSkin = opciones.joystickSkin;
  interfaz.nombreMundoActual.textContent = opciones.nombreMundo;

  const sistemaRenderizado = crearSistemaRenderizado(
    THREE,
    interfaz.canvas,
    configuracion,
    { estiloVisual: opciones.estiloVisual },
  );
  const { renderer, scene, camera } = sistemaRenderizado;
  const direccionCamaraTemporal = new THREE.Vector3();
  const perfilInicial = resolverPerfilRendimiento(
    opciones.preferenciasGlobales.perfilRendimiento ||
      opciones.perfilRendimiento,
    opciones.preferenciasGlobales,
  );
  let ajustesRendimiento = {
    perfil: perfilInicial.id,
    limiteFps:
      opciones.preferenciasGlobales.limiteFps ?? perfilInicial.fps,
    pixelRatio:
      opciones.preferenciasGlobales.escalaResolucion ?? perfilInicial.pixelRatio,
    resolucionDinamica:
      opciones.preferenciasGlobales.resolucionDinamica ??
      perfilInicial.resolucionDinamica,
    distanciaCarga: opciones.distanciaCarga,
  };
  sistemaRenderizado.aplicarAjustesRendimiento({
    pixelRatio: ajustesRendimiento.pixelRatio,
    sombras: perfilInicial.sombras,
  });
  const monitor = crearMonitorRendimiento();
  const terreno = crearTerrenoContainer(
    THREE,
    scene,
    configuracion,
    opciones,
  );
  const fisicaArena = crearFisicaArena(
    THREE,
    RAPIER,
    scene,
    terreno,
    configuracion,
    opciones,
  );
  const fisicaAgua = crearFisicaAgua(terreno, {
    experimental: opciones.aguaExperimental,
  });
  const estadoJugador = opciones.progreso?.jugador ?? {};
  const controles = crearControles(interfaz, configuracion, estadoJugador);
  const inventario = crearInventario(interfaz, configuracion, opciones);
  const salud = crearSistemaSalud(interfaz, configuracion, opciones);
  const estaciones = crearSistemaEstaciones(
    interfaz,
    inventario,
    configuracion,
    opciones,
  );
  const ajustes = crearSistemaAjustes(
    interfaz,
    opciones,
    inventario,
    controles,
    {
      alCambiarRendimiento(nuevos) {
        ajustesRendimiento = { ...ajustesRendimiento, ...nuevos };
        const perfil = resolverPerfilRendimiento(
          ajustesRendimiento.perfil,
          {
            distanciaCarga: ajustesRendimiento.distanciaCarga,
            pixelRatio: ajustesRendimiento.pixelRatio,
            fps: ajustesRendimiento.limiteFps,
            resolucionDinamica: ajustesRendimiento.resolucionDinamica,
          },
        );
        sistemaRenderizado.aplicarAjustesRendimiento({
          pixelRatio: ajustesRendimiento.pixelRatio,
          sombras: perfil.sombras,
        });
        sistemaRenderizado.establecerEscalaResolucion(1);
        terreno.establecerDistanciaCarga(ajustesRendimiento.distanciaCarga);
      },
    },
  );
  const brazo = crearBrazoPrimeraPersona(
    THREE,
    camera,
    terreno,
    inventario,
    opciones,
  );
  const { agua, camara, jugador, mundo } = configuracion;
  const mitadMundo = (mundo.tamanoCuadricula * mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - mundo.margenLimite;
  const puntoInicio = { x: 0, z: 10 };
  let velocidadVertical = 0;
  let volando = creativo && Boolean(estadoJugador.volando);

  interfaz.botonVuelo.hidden = !creativo;
  actualizarInterfazVuelo();

  restaurarPosicionJugador();
  const vistaInicial = controles.obtenerVista();
  camera.rotation.set(vistaInicial.inclinacion, vistaInicial.giro, 0);

  const cicloDiaNoche = crearCicloDiaNoche(
    THREE,
    scene,
    camera,
    sistemaRenderizado,
    configuracion,
    opciones,
  );
  const aranas = crearSistemaAranas(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    configuracion,
    opciones,
  );
  const zombies = crearSistemaZombies(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    configuracion,
    opciones,
  );
  const esqueletos = crearSistemaEsqueletosUmbral(
    THREE,
    scene,
    camera,
    terreno,
    salud,
    configuracion,
    opciones,
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
    fisicaArena,
    {
      huevo_arana: (posicion) => aranas.invocar(posicion),
      huevo_zombie: (posicion) => zombies.invocar(posicion),
      huevo_esqueleto_umbral: (posicion) => esqueletos.invocar(posicion),
      interactuar: (bloque) => estaciones.interactuar(bloque),
      esInteractuable: (tipo) => estaciones.esInteractuable(tipo),
      alAccion: (accion) => brazo.accion(accion),
      atacar(origen, direccion, alcance, dano) {
        return (
          aranas.atacar(origen, direccion, alcance, dano) ||
          zombies.atacar(origen, direccion, alcance, dano) ||
          esqueletos.atacar(origen, direccion, alcance, dano)
        );
      },
    },
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
    zombies.despejarAlrededor(
      camera.position,
      configuracion.zombies.radioSpawnMinimo,
    );
    esqueletos.despejarAlrededor(
      camera.position,
      configuracion.esqueletoUmbral.distanciaMinima,
    );
  });

  let ultimoFrame = performance.now();
  let tiempoSimulado = ultimoFrame;
  let ultimoRenderInterfaz = 0;
  let promesaGuardado = null;
  let guardadoSolicitado = false;
  let interfazBloqueadaAnterior = false;
  let aplicacionVisible = document.visibilityState !== "hidden";
  let ultimoRenderEfectivo = 0;
  let ultimaAdaptacionResolucion = 0;

  const redimensionar = () => ajustarRenderizado(renderer, camera, configuracion);
  window.addEventListener("resize", redimensionar);
  window.addEventListener("orientationchange", redimensionar);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  configurarMenuJuego();
  interfaz.panelDesarrollador.hidden =
    !opciones.preferenciasGlobales.modoDesarrollador;
  interfaz.cerrarPanelDesarrollador?.addEventListener("click", () => {
    interfaz.panelDesarrollador.hidden = true;
  });

  const intervaloGuardado = window.setInterval(
    () => void guardarAhora(),
    configuracion.guardado.intervaloMs,
  );
  document.addEventListener("visibilitychange", manejarVisibilidad);
  window.addEventListener("pagehide", () => void guardarAhora());

  renderer.setAnimationLoop(renderFrame);
  renderer.render(scene, camera);
  exponerDiagnosticoLocal();
  ocultarCarga(interfaz);

  function renderFrame(now) {
    if (!aplicacionVisible) return;
    const intervaloObjetivo = intervaloRenderMs(ajustesRendimiento.limiteFps);
    if (
      intervaloObjetivo > 0 &&
      ultimoRenderEfectivo > 0 &&
      now - ultimoRenderEfectivo < intervaloObjetivo - 0.7
    ) {
      return;
    }
    ultimoRenderEfectivo = now;
    const deltaReal = Math.min((now - ultimoFrame) / 1000, 0.25);
    const delta = Math.min(deltaReal, 0.05);
    ultimoFrame = now;
    monitor.registrarFrame(deltaReal * 1000);

    const muerto = salud.estaMuerto();
    const interfazBloqueada =
      inventario.estaAbierto() ||
      estaciones.estaAbierto() ||
      ajustes.estaAbierto() ||
      !interfaz.menuJuego.hidden;
    if (interfazBloqueada && !interfazBloqueadaAnterior) {
      controles.reiniciar();
    }
    interfazBloqueadaAnterior = interfazBloqueada;
    if (!interfazBloqueada) tiempoSimulado += deltaReal * 1000;
    const nowJuego = tiempoSimulado;
    const deltaJuego = interfazBloqueada ? 0 : delta;
    const saltoPendiente = controles.consumirSalto();
    const saltoSolicitado = !interfazBloqueada && saltoPendiente;
    const cambioVueloSolicitado = controles.consumirCambioVuelo();
    if (!muerto && !interfazBloqueada && creativo && cambioVueloSolicitado) {
      establecerVuelo(!volando);
    }

    const { lateral, adelante } = interfazBloqueada
      ? { lateral: 0, adelante: 0 }
      : controles.obtenerMovimiento();
    const { giro, inclinacion } = controles.obtenerVista();
    const forwardX = -Math.sin(giro);
    const forwardZ = -Math.cos(giro);
    const rightX = Math.cos(giro);
    const rightZ = -Math.sin(giro);

    const posicionAnteriorX = camera.position.x;
    const posicionAnteriorZ = camera.position.z;
    const piesAntesMovimiento = camera.position.y - jugador.alturaOjos;
    const cabezaAntesMovimiento =
      camera.position.y + (jugador.altura - jugador.alturaOjos);
    const enAguaAntesMovimiento =
      !volando &&
      fisicaAgua.estaEnAgua(
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
      deltaJuego;
    const desplazamientoZ =
      (rightZ * lateral + forwardZ * adelante) *
      jugador.velocidad *
      multiplicadorMovimiento *
      deltaJuego;
    const piesJugador = camera.position.y - jugador.alturaOjos;
    const cabezaJugador =
      camera.position.y + (jugador.altura - jugador.alturaOjos);
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

    if (!muerto && !interfazBloqueada) {
      actualizarMovimientoVertical(deltaJuego, saltoSolicitado);
    }
    const sacudida = salud.obtenerSacudida(nowJuego);
    const arcoDano = Math.sin((1 - sacudida) * Math.PI) * sacudida;
    const ladoDano = salud.obtenerLadoSacudida();
    camera.rotation.set(
      inclinacion + Math.sin(nowJuego * 0.071) * 0.035 * sacudida - arcoDano * 0.045,
      giro + ladoDano * arcoDano * 0.13 + Math.cos(nowJuego * 0.057) * 0.024 * sacudida,
      ladoDano * arcoDano * 0.1 + Math.sin(nowJuego * 0.089) * 0.035 * sacudida,
    );
    const estadoCiclo = cicloDiaNoche.actualizar(
      interfazBloqueada ? 0 : deltaReal,
    );
    if (!interfazBloqueada) {
      salud.actualizar(nowJuego);
      aranas.actualizar(nowJuego, deltaJuego, estadoCiclo);
      zombies.actualizar(nowJuego, deltaJuego, estadoCiclo);
      esqueletos.actualizar(nowJuego, deltaJuego, estadoCiclo);
      fisicaArena.actualizar(deltaJuego);
      const direccionCamara = camera.getWorldDirection(direccionCamaraTemporal);
      terreno.actualizar(nowJuego, camera.position, direccionCamara);
    }
    estaciones.actualizar(now, !salud.estaMuerto());
    interaccionBloques.actualizar(
      nowJuego,
      !salud.estaMuerto() && !interfazBloqueada,
      !interfazBloqueada,
    );
    brazo.actualizar(
      nowJuego,
      deltaJuego,
      { lateral, adelante },
      interfazBloqueada || salud.estaMuerto(),
    );

    // Con un menú de pantalla completa el mundo está pausado y solo necesita
    // refrescarse a 15 FPS. La interfaz DOM conserva respuesta inmediata.
    if (!interfazBloqueada || now - ultimoRenderInterfaz >= 66) {
      renderer.render(scene, camera);
      ultimoRenderInterfaz = now;
    }
    actualizarRendimientoDinamico(now);
    actualizarPanelDesarrollador(now);
  }

  function manejarVisibilidad() {
    aplicacionVisible = document.visibilityState !== "hidden";
    if (!aplicacionVisible) {
      controles.reiniciar();
      interaccionBloques.cancelarEntrada?.("pestaña_oculta");
      renderer.setAnimationLoop(null);
      void guardarAhora();
      return;
    }
    ultimoFrame = performance.now();
    ultimoRenderEfectivo = 0;
    renderer.setAnimationLoop(renderFrame);
  }

  function actualizarRendimientoDinamico(now) {
    if (
      !ajustesRendimiento.resolucionDinamica ||
      now - ultimaAdaptacionResolucion < 5_000
    ) {
      return;
    }
    const resumen = monitor.obtenerResumen();
    const estado = sistemaRenderizado.obtenerEstadoResolucion();
    const objetivo =
      ajustesRendimiento.limiteFps > 0
        ? 1_000 / ajustesRendimiento.limiteFps
        : 16.67;
    if (monitor.hayCargaSostenida() && estado.escala > 0.7) {
      sistemaRenderizado.establecerEscalaResolucion(estado.escala - 0.08);
      ultimaAdaptacionResolucion = now;
    } else if (
      resumen.framePromedioMs > 0 &&
      resumen.framePromedioMs < objetivo * 0.72 &&
      estado.escala < 1
    ) {
      sistemaRenderizado.establecerEscalaResolucion(estado.escala + 0.04);
      ultimaAdaptacionResolucion = now;
    }
  }

  function actualizarPanelDesarrollador(now) {
    if (
      !interfaz.metricasDesarrollador ||
      interfaz.panelDesarrollador.hidden ||
      !monitor.debeActualizarPanel(now)
    ) {
      return;
    }
    const terrenoMetricas = terreno.obtenerMetricas?.() ?? {};
    const interaccionMetricas = interaccionBloques.obtenerMetricas?.() ?? {};
    const memoria = estimarMemoriaRender(renderer);
    const resumen = monitor.obtenerResumen({
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      regiones: terreno.obtenerEstadoCarga().activas,
      aguaPendiente: terrenoMetricas.agua?.pendientes ?? 0,
      meshBuilds: terrenoMetricas.reconstruccionesMalla ?? 0,
      intentosMineria: interaccionMetricas.intentos ?? 0,
    });
    interfaz.metricasDesarrollador.textContent = [
      `FPS PROM.      ${resumen.fpsPromedio.toFixed(1)}`,
      `FRAME P95      ${resumen.frameP95Ms.toFixed(2)} ms`,
      `DRAW CALLS     ${resumen.drawCalls}`,
      `TRIÁNGULOS     ${resumen.triangles}`,
      `REGIONES       ${resumen.regiones}`,
      `GEOMETRÍAS     ${memoria.geometries}`,
      `TEXTURAS       ${memoria.textures}`,
      `AGUA PEND.     ${resumen.aguaPendiente}`,
      `MALLAS         ${resumen.meshBuilds}`,
      `MINERÍA        ${resumen.intentosMineria}`,
      `RESOLUCIÓN     ${sistemaRenderizado.obtenerEstadoResolucion().pixelRatio.toFixed(2)}×`,
      `PERFIL         ${String(ajustesRendimiento.perfil).toUpperCase()}`,
    ].join("\n");
  }

  function restaurarPosicionJugador() {
    const x = THREE.MathUtils.clamp(
      numeroFinito(estadoJugador.x, puntoInicio.x),
      -limiteMundo,
      limiteMundo,
    );
    const z = THREE.MathUtils.clamp(
      numeroFinito(estadoJugador.z, puntoInicio.z),
      -limiteMundo,
      limiteMundo,
    );
    const suelo = terreno.obtenerAltura(x, z) + jugador.alturaOjos;
    const alturaMaxima =
      mundo.nivelMaximoColocacion * mundo.tamanoBloque +
      jugador.alturaOjos +
      mundo.tamanoBloque * 4;
    let y = THREE.MathUtils.clamp(
      numeroFinito(estadoJugador.y, suelo),
      suelo,
      alturaMaxima,
    );
    if (
      terreno.hayColisionJugador(
        x,
        z,
        y - jugador.alturaOjos,
        y + (jugador.altura - jugador.alturaOjos),
      )
    ) {
      y = suelo;
    }
    camera.position.set(x, y, z);
  }

  function configurarMenuJuego() {
    interfaz.menuJuego.hidden = true;
    interfaz.botonMenuJuego.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const abrir = interfaz.menuJuego.hidden;
      if (abrir) {
        inventario.cerrar();
        controles.reiniciar();
      }
      interfaz.menuJuego.hidden = !abrir;
      interfaz.botonMenuJuego.setAttribute("aria-expanded", String(abrir));
    });
    document.addEventListener("pointerdown", (event) => {
      if (interfaz.menuJuego.hidden || event.target.closest?.(".game-menu")) return;
      interfaz.menuJuego.hidden = true;
      interfaz.botonMenuJuego.setAttribute("aria-expanded", "false");
    });
    interfaz.botonSalirMundo.addEventListener("click", async () => {
      interfaz.botonSalirMundo.disabled = true;
      const guardado = await guardarAhora();
      if (!guardado) {
        interfaz.botonSalirMundo.disabled = false;
        return;
      }
      window.clearInterval(intervaloGuardado);
      servicios.salirAlMenu?.();
    });
  }

  function guardarAhora() {
    if (typeof servicios.guardarProgreso !== "function") return Promise.resolve(true);
    guardadoSolicitado = true;
    if (promesaGuardado) return promesaGuardado;
    promesaGuardado = procesarColaGuardado().finally(() => {
      promesaGuardado = null;
      // Una solicitud que llegó justo al finalizar no debe quedarse sin guardar.
      if (guardadoSolicitado) return guardarAhora();
      return undefined;
    });
    return promesaGuardado;
  }

  async function procesarColaGuardado() {
    while (guardadoSolicitado) {
      guardadoSolicitado = false;
      actualizarEstadoGuardado("GUARDANDO MUNDO…", "is-saving");
      try {
        // La instantánea se crea al iniciar cada escritura, no al entrar a la
        // cola, para conservar los cambios hechos durante un guardado anterior.
        await servicios.guardarProgreso(crearProgreso());
        actualizarEstadoGuardado("MUNDO GUARDADO", "");
      } catch (error) {
        guardadoSolicitado = false;
        console.error("No se pudo guardar el mundo.", error);
        actualizarEstadoGuardado("NO SE PUDO GUARDAR · REINTENTA", "is-error");
        return false;
      }
    }
    return true;
  }

  function crearProgreso() {
    const { giro, inclinacion } = controles.obtenerVista();
    return {
      version: configuracion.guardado.versionProgreso,
      jugador: {
        x: redondear(camera.position.x),
        y: redondear(camera.position.y),
        z: redondear(camera.position.z),
        giro: redondear(giro),
        inclinacion: redondear(inclinacion),
        volando,
      },
      inventario: inventario.exportarEstado(),
      salud: salud.exportarEstado(),
      terreno: terreno.exportarCambios(),
      ciclo: cicloDiaNoche.exportarEstado(),
      recolectables: interaccionBloques.exportarEstado(),
      estaciones: estaciones.exportarEstado(),
    };
  }

  function actualizarEstadoGuardado(texto, clase) {
    interfaz.estadoGuardado.textContent = texto;
    const indicador = document.createElement("i");
    interfaz.estadoGuardado.prepend(indicador);
    interfaz.estadoGuardado.classList.remove("is-saving", "is-error");
    if (clase) interfaz.estadoGuardado.classList.add(clase);
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
      const siguienteCabeza =
        siguienteY + (jugador.altura - jugador.alturaOjos);

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
    const cabezaActual =
      camera.position.y + (jugador.altura - jugador.alturaOjos);
    if (
      fisicaAgua.estaEnAgua(
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
      const siguienteCabeza =
        siguienteY + (jugador.altura - jugador.alturaOjos);
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
      piesActuales + jugador.toleranciaSuelo + 0.04,
      jugador.radio * 0.92,
    );
    const tocandoSuelo =
      velocidadVertical <= 0 &&
      Math.abs(piesActuales - soporteCercano) <= jugador.toleranciaSuelo;

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
    const siguienteCabeza =
      siguienteY + (jugador.altura - jugador.alturaOjos);

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

  function exponerDiagnosticoLocal() {
    if (!["localhost", "127.0.0.1"].includes(globalThis.location?.hostname)) {
      return;
    }
    Object.defineProperty(globalThis, "__WAR3D_DEBUG__", {
      configurable: true,
      value: Object.freeze({
        leerPixeles() {
          renderer.render(scene, camera);
          const contexto = renderer.getContext();
          const ancho = contexto.drawingBufferWidth;
          const alto = contexto.drawingBufferHeight;
          const muestras = [];
          for (const ny of [0.16, 0.28, 0.4, 0.52, 0.64]) {
            for (const nx of [0.14, 0.32, 0.5, 0.68, 0.86]) {
              const pixel = new Uint8Array(4);
              contexto.readPixels(
                Math.floor(ancho * nx),
                Math.floor(alto * ny),
                1,
                1,
                contexto.RGBA,
                contexto.UNSIGNED_BYTE,
                pixel,
              );
              muestras.push(Array.from(pixel));
            }
          }
          return { ancho, alto, muestras };
        },
        interactionTarget(clientX, clientY) {
          return interaccionBloques.diagnosticarObjetivoPantalla(
            Number(clientX),
            Number(clientY),
          );
        },
        snapshot() {
          return {
            version: CONFIGURACION.guardado.versionMundo,
            camera: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
              pitch: camera.rotation.x,
              yaw: camera.rotation.y,
            },
            fog: {
              near: scene.fog?.near ?? null,
              far: scene.fog?.far ?? null,
            },
            sun: {
              style: sistemaRenderizado.sol.userData.estilo,
              texture:
                sistemaRenderizado.sol.userData.texturaSolar?.name ?? null,
              unlit:
                sistemaRenderizado.sol.userData.materialSolar?.isMeshBasicMaterial ===
                true,
            },
            load: terreno.obtenerEstadoCarga(),
            visible: Object.fromEntries(
              ["pasto", "tierra", "piedra", "agua"].map((tipo) => [
                tipo,
                terreno.obtenerCantidadVisible(tipo),
              ]),
            ),
            render: {
              calls: renderer.info.render.calls,
              triangles: renderer.info.render.triangles,
              ...estimARenderDebug(),
            },
            performance: monitor.obtenerResumen({
              terrain: terreno.obtenerMetricas(),
              interaction: interaccionBloques.obtenerMetricas(),
            }),
          };
        },
      }),
    });
  }

  function estimARenderDebug() {
    const memoria = estimarMemoriaRender(renderer);
    return {
      geometries: memoria.geometries,
      textures: memoria.textures,
      pixelRatio: sistemaRenderizado.obtenerEstadoResolucion().pixelRatio,
      profile: ajustesRendimiento.perfil,
      fpsLimit: ajustesRendimiento.limiteFps,
    };
  }
}

function normalizarOpcionesMundo(opciones) {
  const preferenciasGlobales =
    opciones.preferenciasGlobales &&
    typeof opciones.preferenciasGlobales === "object"
      ? opciones.preferenciasGlobales
      : {};
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
    id: String(opciones.id || "mundo"),
    nombreMundo: String(opciones.nombreMundo || "Mi mundo").slice(0, 24),
    modo,
    tipoMundo,
    plantillaId: String(
      opciones.plantillaId ||
        (tipoMundo === "plano" ? "war:flat" : "war:legacy_1_7"),
    ),
    tamanoMundo,
    dificultad: ["pacifica", "normal", "dificil"].includes(opciones.dificultad)
      ? opciones.dificultad
      : "normal",
    tiempo: ["normal", "siempre_dia", "siempre_noche"].includes(opciones.tiempo)
      ? opciones.tiempo
      : "normal",
    semilla: Number.isFinite(Number(opciones.semilla)) ? Number(opciones.semilla) : 0,
    estiloVisual:
      opciones.estiloVisual === "pixelar" ? "pixelar" : "traditional",
    aguaExperimental: opciones.aguaExperimental === true,
    perfilRendimiento: ["basico", "equilibrado", "alto", "personalizado"].includes(
      preferenciasGlobales.perfilRendimiento || opciones.perfilRendimiento,
    )
      ? preferenciasGlobales.perfilRendimiento || opciones.perfilRendimiento
      : "equilibrado",
    distanciaCarga: Math.max(
      2,
      Math.min(32, Math.floor(Number(opciones.distanciaCarga) || 6)),
    ),
    joystickSkin: ["traditional", "dark", "pixel"].includes(
      preferenciasGlobales.joystickSkin || opciones.joystickSkin,
    )
      ? preferenciasGlobales.joystickSkin || opciones.joystickSkin
      : "traditional",
    preferenciasGlobales: {
      perfilRendimiento: ["basico", "equilibrado", "alto", "personalizado"].includes(
        preferenciasGlobales.perfilRendimiento,
      )
        ? preferenciasGlobales.perfilRendimiento
        : "equilibrado",
      escalaResolucion: limitar(
        numeroFinito(preferenciasGlobales.escalaResolucion, 1.25),
        0.65,
        1.8,
      ),
      resolucionDinamica: preferenciasGlobales.resolucionDinamica !== false,
      limiteFps: [0, 30, 45, 60].includes(
        Number(preferenciasGlobales.limiteFps),
      )
        ? Number(preferenciasGlobales.limiteFps)
        : 45,
      modoDesarrollador: preferenciasGlobales.modoDesarrollador === true,
    },
    colisionJugador:
      opciones.colisionJugador && typeof opciones.colisionJugador === "object"
        ? opciones.colisionJugador
        : null,
    progreso:
      opciones.progreso && typeof opciones.progreso === "object"
        ? opciones.progreso
        : null,
  };
}

export function crearConfiguracionJuego(opciones) {
  const hostiles = opciones.modo === "supervivencia" && opciones.dificultad !== "pacifica";
  const dificil = hostiles && opciones.dificultad === "dificil";
  const perfil =
    CONFIGURACION.rendimiento.perfiles[opciones.perfilRendimiento] ??
    CONFIGURACION.rendimiento.perfiles.equilibrado;
  const colision = opciones.colisionJugador ?? {};
  const altura = limitar(
    numeroFinito(colision.height, CONFIGURACION.jugador.altura),
    3.2,
    3.92,
  );
  const alturaOjos = limitar(
    numeroFinito(colision.eyeHeight, CONFIGURACION.jugador.alturaOjos),
    2.8,
    Math.min(3.65, altura - 0.18),
  );
  const radio = limitar(
    numeroFinito(colision.width, CONFIGURACION.jugador.radio * 2) / 2,
    0.39,
    0.75,
  );
  const nieblaLejana = Math.max(
    28,
    Math.min(
      CONFIGURACION.renderizado.nieblaLejana,
      opciones.distanciaCarga *
        CONFIGURACION.mundo.tamanoRegion *
        CONFIGURACION.mundo.tamanoBloque *
        1.8,
    ),
  );
  const nieblaCercana = Math.min(
    CONFIGURACION.renderizado.nieblaCercana,
    Math.max(10, nieblaLejana * 0.55),
    nieblaLejana - 8,
  );
  return Object.freeze({
    ...CONFIGURACION,
    mundo: Object.freeze({
      ...CONFIGURACION.mundo,
      tamanoCuadricula: opciones.tamanoMundo,
      distanciaCargaPredeterminada: opciones.distanciaCarga,
    }),
    jugador: Object.freeze({
      ...CONFIGURACION.jugador,
      altura,
      alturaOjos,
      radio,
      alturaPaso: limitar(
        numeroFinito(colision.stepHeight, CONFIGURACION.jugador.alturaPaso),
        0.2,
        0.9,
      ),
    }),
    renderizado: Object.freeze({
      ...CONFIGURACION.renderizado,
      proporcionPixelesMaxima: perfil.pixelRatio,
      proporcionPixelesMovil: Math.min(
        perfil.pixelRatio,
        CONFIGURACION.renderizado.proporcionPixelesMovil,
      ),
      nieblaCercana,
      nieblaLejana,
    }),
    aranas: Object.freeze({
      ...CONFIGURACION.aranas,
      cantidadInicial: hostiles ? (dificil ? 6 : 3) : 0,
      maximo: Math.min(
        perfil.entidadesActivas,
        dificil ? 18 : CONFIGURACION.aranas.maximo,
      ),
      rangoVision: dificil ? 12 : CONFIGURACION.aranas.rangoVision,
      velocidadPersecucion: dificil ? 2.65 : CONFIGURACION.aranas.velocidadPersecucion,
    }),
    zombies: Object.freeze({
      ...CONFIGURACION.zombies,
      tamanoGrupo: hostiles ? (dificil ? 5 : 4) : 0,
      cantidadGrupos: hostiles ? (dificil ? 2 : 1) : 0,
      maximo: Math.min(
        perfil.entidadesActivas,
        dificil ? 20 : CONFIGURACION.zombies.maximo,
      ),
      rangoVision: dificil ? 17 : CONFIGURACION.zombies.rangoVision,
      velocidadCorrer: dificil ? 2.45 : CONFIGURACION.zombies.velocidadCorrer,
      dano: dificil ? 2 : CONFIGURACION.zombies.dano,
    }),
    esqueletoUmbral: Object.freeze({
      ...CONFIGURACION.esqueletoUmbral,
      maximo: Math.min(
        CONFIGURACION.esqueletoUmbral.maximo,
        Math.max(1, Math.floor(perfil.entidadesActivas / 3)),
      ),
      dano: dificil ? 3 : CONFIGURACION.esqueletoUmbral.dano,
    }),
  });
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function numeroFinito(valor, respaldo) {
  return Number.isFinite(Number(valor)) ? Number(valor) : respaldo;
}

function redondear(valor) {
  return Math.round(Number(valor) * 10_000) / 10_000;
}
