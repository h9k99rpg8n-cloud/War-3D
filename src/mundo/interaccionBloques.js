import { NOMBRES_BLOQUE } from "../inventario/inventario.js";
import {
  calcularRotura,
  obtenerDefinicionContenido,
} from "../contenido/registroContenido.js";

export function crearInteraccionBloques(
  THREE,
  scene,
  camera,
  interfaz,
  terreno,
  inventario,
  configuracion,
  opcionesMundo = {},
  fisicaArena = null,
  accionesEntidades = {},
) {
  const { interaccion, jugador, mundo } = configuracion;
  const raycaster = new THREE.Raycaster();
  const punteroNormalizado = new THREE.Vector2();
  const contorno = crearContornoBloque(THREE, mundo.tamanoBloque);
  const geometriaRecolectable = new THREE.BoxGeometry(
    mundo.tamanoBloque * 0.34,
    mundo.tamanoBloque * 0.34,
    mundo.tamanoBloque * 0.34,
  );
  const recolectables = [];
  const naturalesRecogidos = new Set(
    Array.isArray(opcionesMundo.progreso?.recolectables?.naturalesRecogidos)
      ? opcionesMundo.progreso.recolectables.naturalesRecogidos
          .slice(0, 4_000)
          .map(String)
      : [],
  );
  const naturalesGenerados = new Set();

  let punteroActivo = null;
  let inicioPunteroX = 0;
  let inicioPunteroY = 0;
  let rotura = null;
  let temporizadorMensaje = null;
  let ultimaRevisionInteraccion = 0;
  let ultimaRevisionNaturales = 0;

  scene.add(contorno);

  interfaz.zonaMirada.addEventListener("pointerdown", (event) => {
    if (
      punteroActivo !== null ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    punteroActivo = event.pointerId;
    inicioPunteroX = event.clientX;
    inicioPunteroY = event.clientY;
    comenzarRotura(event.clientX, event.clientY, performance.now());
  });

  interfaz.zonaMirada.addEventListener("pointermove", (event) => {
    if (event.pointerId !== punteroActivo || !rotura) return;
    const distanciaArrastre = Math.hypot(
      event.clientX - inicioPunteroX,
      event.clientY - inicioPunteroY,
    );
    if (distanciaArrastre > interaccion.toleranciaArrastre) cancelarRotura();
  });

  const terminarPuntero = (event) => {
    if (event.pointerId !== punteroActivo) return;
    punteroActivo = null;
    cancelarRotura();
  };

  interfaz.zonaMirada.addEventListener("pointerup", terminarPuntero);
  interfaz.zonaMirada.addEventListener("pointercancel", terminarPuntero);
  interfaz.zonaMirada.addEventListener("lostpointercapture", () => {
    punteroActivo = null;
    cancelarRotura();
  });

  interfaz.botonColocar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    colocarBloque();
  });
  interfaz.botonInteractuar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const impacto = buscarImpacto(0, 0);
    if (!impacto || !accionesEntidades.interactuar?.(impacto.bloque)) {
      mostrarMensaje("No hay nada con qué interactuar");
      return;
    }
    accionesEntidades.alAccion?.("interactuar", impacto.bloque.tipo);
  });
  interfaz.botonAtacar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const direccion = new THREE.Vector3();
    camera.getWorldDirection(direccion);
    const herramienta = inventario.definicionSeleccionada();
    const dano = herramienta?.herramienta?.dano ?? 1;
    const golpe = accionesEntidades.atacar?.(
      camera.position.clone(),
      direccion,
      interaccion.alcance,
      dano,
    );
    accionesEntidades.alAccion?.("atacar", inventario.tipoSeleccionado());
    if (golpe) mostrarMensaje(`Golpe: ${dano} de daño`);
  });

  restaurarRecolectables();
  cargarPalosNaturales(performance.now());

  return {
    actualizar(now, jugadorActivo = true, simular = true) {
      if (!simular) {
        punteroActivo = null;
        if (rotura) cancelarRotura();
        return;
      }
      if (jugadorActivo) actualizarRotura(now);
      else if (rotura) cancelarRotura();
      actualizarRecolectables(now);
      if (now - ultimaRevisionInteraccion >= 120) {
        ultimaRevisionInteraccion = now;
        const objetivo = buscarImpacto(0, 0);
        interfaz.botonInteractuar.disabled = !(
          objetivo && accionesEntidades.esInteractuable?.(objetivo.bloque.tipo)
        );
      }
      if (now - ultimaRevisionNaturales >= 1_500) {
        ultimaRevisionNaturales = now;
        cargarPalosNaturales(now);
      }
    },

    exportarEstado() {
      return {
        version: 1,
        naturalesRecogidos: [...naturalesRecogidos],
        objetos: recolectables.map((item) => ({
          tipo: item.tipo,
          x: redondear(item.malla.position.x),
          y: redondear(item.malla.position.y),
          z: redondear(item.malla.position.z),
          naturalId: item.naturalId,
          edadMs: Math.max(0, performance.now() - item.inicio),
        })),
      };
    },
  };

  function comenzarRotura(clientX, clientY, now) {
    const impacto = buscarImpactoDesdePantalla(clientX, clientY);
    if (!impacto) return;

    const definicionHerramienta = inventario.definicionSeleccionada();
    const regla = calcularRotura(
      impacto.bloque.tipo,
      definicionHerramienta,
      opcionesMundo.modo === "creativo",
    );
    rotura = { bloque: impacto.bloque, inicio: now, regla };
    interfaz.etiquetaRotura.textContent =
      `ROMPIENDO ${NOMBRES_BLOQUE[impacto.bloque.tipo].toUpperCase()}`;
    contorno.position.copy(terreno.obtenerCentroBloque(impacto.bloque));
    contorno.visible = true;
    interfaz.rellenoRotura.style.transform = "scaleX(0)";
    interfaz.progresoRotura.hidden = false;
  }

  function actualizarRotura(now) {
    if (!rotura) return;
    if (!terreno.contieneBloque(rotura.bloque)) {
      cancelarRotura();
      return;
    }

    const progreso = Math.min(1, (now - rotura.inicio) / rotura.regla.duracionMs);
    interfaz.rellenoRotura.style.transform = `scaleX(${progreso})`;
    contorno.material.color.setHSL(0.31 - progreso * 0.18, 0.9, 0.65);
    if (progreso < 1) return;

    const resultado = terreno.romperBloque(rotura.bloque);
    if (!resultado) {
      cancelarRotura();
      return;
    }

    const regla = rotura.regla;
    limpiarVisualRotura();
    rotura = null;
    accionesEntidades.alAccion?.("romper", resultado.bloque.tipo);
    if (opcionesMundo.modo === "creativo") {
      mostrarMensaje(`${NOMBRES_BLOQUE[resultado.bloque.tipo]} eliminado`);
    } else if (!regla.obtieneRecurso) {
      inventario.desgastarHerramienta(regla.desgaste);
      mostrarMensaje("El bloque se rompió, pero la herramienta no pudo extraerlo");
    } else {
      inventario.desgastarHerramienta(regla.desgaste);
      crearRecolectable(
        resultado.posicion,
        regla.suelta ?? resultado.bloque.tipo,
        now,
      );
    }
  }

  function cancelarRotura() {
    rotura = null;
    limpiarVisualRotura();
  }

  function limpiarVisualRotura() {
    contorno.visible = false;
    interfaz.progresoRotura.hidden = true;
    interfaz.rellenoRotura.style.transform = "scaleX(0)";
  }

  function crearRecolectable(posicion, tipo, now, opciones = {}) {
    const material = terreno.obtenerMaterialRecolectable(tipo);
    if (!material) return;
    const malla = new THREE.Mesh(geometriaRecolectable, material);
    malla.position.copy(posicion);
    const posicionBase = posicion.clone();
    posicionBase.y = terreno.obtenerAlturaSoporte(
      posicion.x,
      posicion.z,
      posicion.y + mundo.tamanoBloque * 0.2,
      mundo.tamanoBloque * 0.12,
    );
    scene.add(malla);
    recolectables.push({
      malla,
      tipo,
      posicionBase,
      origenCaida: posicion.clone(),
      desfase: hashRecolectable(posicion) * Math.PI * 2,
      inicio: now,
      naturalId: opciones.naturalId ?? null,
      recogiendo: false,
      inicioVuelo: 0,
      origenVuelo: null,
    });
  }

  function actualizarRecolectables(now) {
    for (let i = recolectables.length - 1; i >= 0; i -= 1) {
      const item = recolectables[i];
      if (
        !item.recogiendo &&
        now - item.inicio >= interaccion.duracionRecolectableMs
      ) {
        scene.remove(item.malla);
        recolectables.splice(i, 1);
        continue;
      }
      item.malla.rotation.x += 0.018;
      item.malla.rotation.y += 0.035;

      if (!item.recogiendo) {
        const progresoCaida = Math.min(1, (now - item.inicio) / 420);
        item.malla.position.lerpVectors(
          item.origenCaida,
          item.posicionBase,
          progresoCaida * progresoCaida,
        );
        item.malla.position.y +=
          mundo.tamanoBloque * 0.35 +
          Math.sin(now * 0.004 + item.desfase) * mundo.tamanoBloque * 0.11;

        if (
          progresoCaida >= 1 &&
          item.malla.position.distanceTo(camera.position) <= interaccion.radioRecoleccion &&
          inventario.reservarEspacio(item.tipo)
        ) {
          item.recogiendo = true;
          item.inicioVuelo = now;
          item.origenVuelo = item.malla.position.clone();
        }
        continue;
      }

      const progreso = Math.min(
        1,
        (now - item.inicioVuelo) / interaccion.duracionVueloRecoleccion,
      );
      const progresoSuave = 1 - (1 - progreso) ** 3;
      item.malla.position.lerpVectors(item.origenVuelo, camera.position, progresoSuave);
      const escala = Math.max(0.12, 1 - progresoSuave * 0.88);
      item.malla.scale.setScalar(escala);

      if (progreso < 1) continue;
      if (!inventario.confirmarRecoleccion(item.tipo)) {
        // Si el jugador reorganizó el inventario durante el vuelo, el objeto
        // vuelve al mundo en vez de perderse.
        item.recogiendo = false;
        item.inicio = now;
        item.origenCaida = item.malla.position.clone();
        item.malla.scale.setScalar(1);
        continue;
      }
      scene.remove(item.malla);
      recolectables.splice(i, 1);
      if (item.naturalId) naturalesRecogidos.add(item.naturalId);
      mostrarMensaje(`+1 ${NOMBRES_BLOQUE[item.tipo]}`);
    }
  }

  function colocarBloque() {
    const tipo = inventario.tipoSeleccionado();
    if (!tipo) {
      mostrarMensaje("Selecciona un objeto del inventario");
      return;
    }
    if (inventario.cantidad(tipo) <= 0) {
      mostrarMensaje(`No tienes ${NOMBRES_BLOQUE[tipo].toLowerCase()}`);
      return;
    }

    const impacto = buscarImpacto(0, 0);
    if (!impacto) {
      mostrarMensaje("Apunta la mira hacia un bloque cercano");
      return;
    }

    if (inventario.esHuevo(tipo)) {
      const posicion = terreno.obtenerPosicionAdyacente(
        impacto.bloque,
        impacto.normal,
      );
      const generado = accionesEntidades[tipo]?.(posicion) ?? false;
      if (!generado) {
        mostrarMensaje("No hay espacio suficiente para generar la criatura");
        return;
      }
      inventario.usarBloque(tipo);
      accionesEntidades.alAccion?.("generar", tipo);
      mostrarMensaje(`${NOMBRES_BLOQUE[tipo]} utilizado`);
      return;
    }

    if (!inventario.esBloque(tipo)) {
      mostrarMensaje(`${NOMBRES_BLOQUE[tipo]} no se puede colocar`);
      return;
    }

    const resultado = terreno.colocarAdyacente(
      impacto.bloque,
      impacto.normal,
      tipo,
      (posicion) => !intersectaJugador(posicion),
    );
    if (!resultado.ok) {
      const mensajes = {
        jugador: "No puedes colocar el bloque dentro del jugador",
        ocupado: "Ese espacio ya está ocupado",
        fuera_mundo: "No puedes construir fuera del mapa",
        altura_invalida: "Límite de construcción alcanzado",
      };
      mostrarMensaje(mensajes[resultado.motivo] ?? "No se puede colocar ahí");
      return;
    }

    inventario.usarBloque(tipo);
    accionesEntidades.alAccion?.("colocar", tipo);
    const cayendo = fisicaArena?.procesarBloqueColocado(
      resultado.bloque,
      resultado.posicion,
    );
    mostrarMensaje(
      cayendo
        ? `${NOMBRES_BLOQUE[tipo]} cayendo`
        : `${NOMBRES_BLOQUE[tipo]} colocado`,
    );
  }

  function buscarImpactoDesdePantalla(clientX, clientY) {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    return buscarImpacto(ndcX, ndcY);
  }

  function buscarImpacto(ndcX, ndcY) {
    punteroNormalizado.set(ndcX, ndcY);
    raycaster.setFromCamera(punteroNormalizado, camera);
    const impactos = raycaster.intersectObjects(terreno.mallas, false);
    for (const impacto of impactos) {
      if (impacto.distance > interaccion.alcance) break;
      if (impacto.instanceId === undefined || !impacto.face) continue;
      const bloque = terreno.obtenerBloquePorInstancia(
        impacto.object,
        impacto.instanceId,
      );
      if (!bloque || bloque.tipo === "agua") continue;
      return {
        bloque,
        normal: impacto.face.normal.clone(),
        distancia: impacto.distance,
      };
    }
    return null;
  }

  function intersectaJugador(posicionBloque) {
    const mitad = mundo.tamanoBloque / 2;
    const piesJugador = camera.position.y - jugador.alturaOjos;
    const cabezaJugador =
      camera.position.y + (jugador.altura - jugador.alturaOjos);
    const coincideHorizontalmente =
      Math.abs(camera.position.x - posicionBloque.x) < mitad + jugador.radio &&
      Math.abs(camera.position.z - posicionBloque.z) < mitad + jugador.radio;
    const coincideVerticalmente =
      piesJugador < posicionBloque.y + mitad &&
      cabezaJugador > posicionBloque.y - mitad;
    return coincideHorizontalmente && coincideVerticalmente;
  }

  function mostrarMensaje(texto) {
    if (temporizadorMensaje) window.clearTimeout(temporizadorMensaje);
    interfaz.mensajeAccion.textContent = texto;
    interfaz.mensajeAccion.hidden = false;
    temporizadorMensaje = window.setTimeout(() => {
      interfaz.mensajeAccion.hidden = true;
    }, 1350);
  }

  function cargarPalosNaturales(now) {
    const disponibles = terreno.obtenerPalosNaturalesCercanos?.(
      camera.position.x,
      camera.position.z,
      configuracion.mundo.tamanoBloque *
        configuracion.mundo.tamanoRegion *
        configuracion.mundo.distanciaCargaPredeterminada,
    ) ?? [];
    for (const palo of disponibles) {
      if (
        naturalesRecogidos.has(palo.id) ||
        naturalesGenerados.has(palo.id)
      ) {
        continue;
      }
      naturalesGenerados.add(palo.id);
      crearRecolectable(
        new THREE.Vector3(palo.x, palo.y, palo.z),
        "palo",
        now,
        { naturalId: palo.id },
      );
    }
  }

  function restaurarRecolectables() {
    const guardados = opcionesMundo.progreso?.recolectables?.objetos;
    if (!Array.isArray(guardados)) return;
    const now = performance.now();
    for (const guardado of guardados.slice(0, 512)) {
      const tipo = String(guardado?.tipo || "");
      if (!obtenerDefinicionContenido(tipo)) continue;
      const x = Number(guardado.x);
      const y = Number(guardado.y);
      const z = Number(guardado.z);
      if (![x, y, z].every(Number.isFinite)) continue;
      const edad = Math.max(0, Number(guardado.edadMs) || 0);
      if (edad >= interaccion.duracionRecolectableMs) continue;
      const naturalId = guardado.naturalId ? String(guardado.naturalId) : null;
      if (naturalId) naturalesGenerados.add(naturalId);
      crearRecolectable(new THREE.Vector3(x, y, z), tipo, now - edad, {
        naturalId,
      });
    }
  }
}

function crearContornoBloque(THREE, tamanoBloque) {
  const geometriaCaja = new THREE.BoxGeometry(
    tamanoBloque * 1.015,
    tamanoBloque * 1.015,
    tamanoBloque * 1.015,
  );
  const geometriaBordes = new THREE.EdgesGeometry(geometriaCaja);
  geometriaCaja.dispose();
  const material = new THREE.LineBasicMaterial({
    color: 0x9cff85,
    depthTest: false,
    depthWrite: false,
    opacity: 0.96,
    transparent: true,
  });
  const contorno = new THREE.LineSegments(geometriaBordes, material);
  contorno.renderOrder = 20;
  contorno.visible = false;
  return contorno;
}

function hashRecolectable(posicion) {
  const valor = Math.sin(posicion.x * 12.7 + posicion.y * 31.1 + posicion.z * 7.3) * 43758.5;
  return valor - Math.floor(valor);
}

function redondear(valor) {
  return Math.round(Number(valor) * 10_000) / 10_000;
}
