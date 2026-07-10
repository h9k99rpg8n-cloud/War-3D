import { NOMBRES_BLOQUE } from "../inventario/inventario.js";

export function crearInteraccionBloques(
  THREE,
  scene,
  camera,
  interfaz,
  terreno,
  inventario,
  configuracion,
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

  let punteroActivo = null;
  let inicioPunteroX = 0;
  let inicioPunteroY = 0;
  let rotura = null;
  let temporizadorMensaje = null;

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

  return {
    actualizar(now) {
      actualizarRotura(now);
      actualizarRecolectables(now);
    },
  };

  function comenzarRotura(clientX, clientY, now) {
    const impacto = buscarImpactoDesdePantalla(clientX, clientY);
    if (!impacto) return;

    rotura = { bloque: impacto.bloque, inicio: now };
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

    const progreso = Math.min(1, (now - rotura.inicio) / interaccion.duracionRotura);
    interfaz.rellenoRotura.style.transform = `scaleX(${progreso})`;
    contorno.material.color.setHSL(0.31 - progreso * 0.18, 0.9, 0.65);
    if (progreso < 1) return;

    const resultado = terreno.romperBloque(rotura.bloque);
    if (!resultado) {
      cancelarRotura();
      return;
    }

    limpiarVisualRotura();
    rotura = null;
    crearRecolectable(resultado.posicion, resultado.bloque.tipo, now);
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

  function crearRecolectable(posicion, tipo, now) {
    const material = terreno.obtenerMaterialRecolectable(tipo);
    if (!material) return;
    const malla = new THREE.Mesh(geometriaRecolectable, material);
    malla.position.copy(posicion);
    const posicionBase = posicion.clone();
    posicionBase.y = terreno.obtenerAltura(posicion.x, posicion.z);
    scene.add(malla);
    recolectables.push({
      malla,
      tipo,
      posicionBase,
      origenCaida: posicion.clone(),
      desfase: hashRecolectable(posicion) * Math.PI * 2,
      inicio: now,
      recogiendo: false,
      inicioVuelo: 0,
      origenVuelo: null,
    });
  }

  function actualizarRecolectables(now) {
    for (let i = recolectables.length - 1; i >= 0; i -= 1) {
      const item = recolectables[i];
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
      scene.remove(item.malla);
      recolectables.splice(i, 1);
      inventario.confirmarRecoleccion(item.tipo);
      mostrarMensaje(`+1 ${NOMBRES_BLOQUE[item.tipo]}`);
    }
  }

  function colocarBloque() {
    const tipo = inventario.tipoSeleccionado();
    if (inventario.cantidad(tipo) <= 0) {
      mostrarMensaje(`No tienes ${NOMBRES_BLOQUE[tipo].toLowerCase()}`);
      return;
    }

    const impacto = buscarImpacto(0, 0);
    if (!impacto) {
      mostrarMensaje("Apunta la mira hacia un bloque cercano");
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
    mostrarMensaje(`${NOMBRES_BLOQUE[tipo]} colocado`);
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
    const impacto = impactos.find((candidato) => candidato.distance <= interaccion.alcance);
    if (!impacto || impacto.instanceId === undefined || !impacto.face) return null;

    const bloque = terreno.obtenerBloquePorInstancia(impacto.object, impacto.instanceId);
    if (!bloque) return null;
    return { bloque, normal: impacto.face.normal.clone(), distancia: impacto.distance };
  }

  function intersectaJugador(posicionBloque) {
    const mitad = mundo.tamanoBloque / 2;
    const piesJugador = camera.position.y - jugador.alturaOjos;
    const coincideHorizontalmente =
      Math.abs(camera.position.x - posicionBloque.x) < mitad * 0.72 &&
      Math.abs(camera.position.z - posicionBloque.z) < mitad * 0.72;
    const coincideVerticalmente =
      piesJugador < posicionBloque.y + mitad &&
      camera.position.y > posicionBloque.y - mitad;
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
