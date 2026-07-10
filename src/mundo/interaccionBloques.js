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
  const materialRecolectable = new THREE.MeshLambertMaterial({
    color: 0x79dc63,
    emissive: 0x1e5a25,
    emissiveIntensity: 0.55,
  });
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

    if (!inventario.reservarEspacio()) {
      mostrarMensaje("Inventario lleno: 32 / 32");
      return;
    }

    rotura = {
      bloque: impacto.bloque,
      inicio: now,
      reservaActiva: true,
    };
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

    rotura.reservaActiva = false;
    limpiarVisualRotura();
    rotura = null;
    crearRecolectable(resultado.posicion, now);
  }

  function cancelarRotura() {
    if (rotura?.reservaActiva) inventario.liberarReserva();
    rotura = null;
    limpiarVisualRotura();
  }

  function limpiarVisualRotura() {
    contorno.visible = false;
    interfaz.progresoRotura.hidden = true;
    interfaz.rellenoRotura.style.transform = "scaleX(0)";
  }

  function crearRecolectable(posicion, now) {
    const malla = new THREE.Mesh(geometriaRecolectable, materialRecolectable);
    const origenVuelo = posicion.clone();
    origenVuelo.y += mundo.tamanoBloque * 0.65;
    malla.position.copy(posicion);
    scene.add(malla);
    recolectables.push({ malla, posicionBase: posicion.clone(), origenVuelo, inicio: now });
  }

  function actualizarRecolectables(now) {
    for (let i = recolectables.length - 1; i >= 0; i -= 1) {
      const item = recolectables[i];
      const progreso = Math.min(
        1,
        (now - item.inicio) / interaccion.duracionRecoleccion,
      );
      item.malla.rotation.x += 0.055;
      item.malla.rotation.y += 0.09;

      if (progreso < 0.55) {
        const subida = progreso / 0.55;
        item.malla.position.copy(item.posicionBase);
        item.malla.position.y +=
          Math.sin(subida * Math.PI) * mundo.tamanoBloque * 0.32 +
          subida * mundo.tamanoBloque * 0.65;
      } else {
        const vuelo = (progreso - 0.55) / 0.45;
        const vueloSuave = vuelo * vuelo;
        item.malla.position.lerpVectors(item.origenVuelo, camera.position, vueloSuave);
        const escala = Math.max(0.18, 1 - vueloSuave * 0.82);
        item.malla.scale.setScalar(escala);
      }

      if (progreso < 1) continue;

      scene.remove(item.malla);
      recolectables.splice(i, 1);
      inventario.confirmarRecoleccion();
      mostrarMensaje("+1 Bloque de pasto");
    }
  }

  function colocarBloque() {
    if (inventario.cantidad() <= 0) {
      mostrarMensaje("Rompe un bloque de pasto primero");
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

    inventario.usarBloque();
    mostrarMensaje("Bloque de pasto colocado");
  }

  function buscarImpactoDesdePantalla(clientX, clientY) {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    return buscarImpacto(ndcX, ndcY);
  }

  function buscarImpacto(ndcX, ndcY) {
    punteroNormalizado.set(ndcX, ndcY);
    raycaster.setFromCamera(punteroNormalizado, camera);
    const impactos = raycaster.intersectObject(terreno.malla, false);
    const impacto = impactos.find((candidato) => candidato.distance <= interaccion.alcance);
    if (!impacto || impacto.instanceId === undefined || !impacto.face) return null;

    const bloque = terreno.obtenerBloquePorInstancia(impacto.instanceId);
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
    opacity: 0.96,
    transparent: true,
  });
  const contorno = new THREE.LineSegments(geometriaBordes, material);
  contorno.renderOrder = 20;
  contorno.visible = false;
  return contorno;
}
