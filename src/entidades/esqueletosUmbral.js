export function crearSistemaEsqueletosUmbral(
  THREE,
  scene,
  camera,
  terreno,
  salud,
  configuracion,
  opcionesMundo = {},
) {
  const ajustes = configuracion.esqueletoUmbral;
  const hostiles =
    opcionesMundo.modo === "supervivencia" &&
    opcionesMundo.dificultad !== "pacifica";
  const esqueletos = [];
  const flechas = [];
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: crearTexturaEsqueleto(THREE, opcionesMundo.estiloVisual),
    emissive: 0x182237,
    emissiveIntensity: 0.34,
    flatShading: true,
  });
  const materialOjos = new THREE.MeshBasicMaterial({ color: 0x8fe8ff });
  const materialArco = new THREE.MeshLambertMaterial({
    color: 0x72503c,
    emissive: 0x241a16,
    emissiveIntensity: 0.25,
  });
  const materialFlecha = new THREE.MeshBasicMaterial({ color: 0xc8e7ed });
  const geometriaFlecha = new THREE.BoxGeometry(0.08, 0.08, 0.62);
  let siguienteGeneracion = 0;

  return {
    actualizar(now, delta) {
      if (
        hostiles &&
        now >= siguienteGeneracion &&
        esqueletos.length < ajustes.maximo &&
        terreno.estaEnCueva(
          camera.position.x,
          camera.position.y - configuracion.jugador.alturaOjos * 0.35,
          camera.position.z,
        )
      ) {
        siguienteGeneracion = now + 18_000;
        const posicion = terreno.buscarPuntoCuevaCercano(
          camera.position.x,
          camera.position.z,
          Math.floor(now / 1_000),
        );
        if (posicion) crearEsqueleto(posicion, false);
      }
      for (const esqueleto of esqueletos) {
        actualizarEsqueleto(esqueleto, now, delta);
      }
      actualizarFlechas(now, delta);
    },

    invocar(posicion) {
      if (!posicion || esqueletos.length >= ajustes.maximo) return false;
      const pies = posicion.y - configuracion.mundo.tamanoBloque / 2;
      if (
        terreno.hayColisionCuerpo(
          posicion.x,
          posicion.z,
          pies + 0.02,
          pies + 3.3,
          0.42,
        )
      ) {
        return false;
      }
      crearEsqueleto({ x: posicion.x, y: pies, z: posicion.z }, true);
      return true;
    },

    atacar(origen, direccion, alcance, dano) {
      let objetivo = null;
      let distanciaObjetivo = Number.POSITIVE_INFINITY;
      for (const esqueleto of esqueletos) {
        const centro = new THREE.Vector3(
          esqueleto.x,
          esqueleto.y + 1.65,
          esqueleto.z,
        );
        const hacia = centro.clone().sub(origen);
        const distancia = hacia.length();
        if (distancia > alcance || distancia >= distanciaObjetivo) continue;
        const proximidad = hacia.normalize().dot(direccion);
        if (proximidad < 0.965) continue;
        objetivo = esqueleto;
        distanciaObjetivo = distancia;
      }
      if (!objetivo) return false;
      objetivo.vida -= Math.max(1, Number(dano) || 1);
      objetivo.flashHasta = performance.now() + 150;
      if (objetivo.vida <= 0) eliminarEsqueleto(objetivo);
      return true;
    },

    obtenerCantidad() {
      return esqueletos.length;
    },

    despejarAlrededor(posicionJugador, radio = 8) {
      for (let indice = esqueletos.length - 1; indice >= 0; indice -= 1) {
        if (
          Math.hypot(
            esqueletos[indice].x - posicionJugador.x,
            esqueletos[indice].z - posicionJugador.z,
          ) < radio
        ) {
          eliminarEsqueleto(esqueletos[indice]);
        }
      }
      for (let indice = flechas.length - 1; indice >= 0; indice -= 1) {
        scene.remove(flechas[indice].malla);
        flechas.splice(indice, 1);
      }
    },
  };

  function crearEsqueleto(posicion, invocado) {
    const grupo = new THREE.Group();
    grupo.name = "war-threshold-skeleton";
    const torso = caja(0.72, 1.05, 0.42, material);
    torso.position.y = 1.58;
    const pelvis = caja(0.58, 0.28, 0.38, material);
    pelvis.position.y = 0.96;
    const cabeza = caja(0.7, 0.7, 0.68, material);
    cabeza.position.set(0, 2.45, 0.04);
    const ojoIzquierdo = caja(0.1, 0.1, 0.06, materialOjos);
    ojoIzquierdo.position.set(-0.15, 2.51, 0.39);
    const ojoDerecho = ojoIzquierdo.clone();
    ojoDerecho.position.x = 0.15;
    const brazoIzquierdo = segmento(0.2, 0.92, material);
    brazoIzquierdo.position.set(-0.55, 1.62, 0);
    const brazoDerecho = segmento(0.2, 0.92, material);
    brazoDerecho.position.set(0.55, 1.62, 0);
    const piernaIzquierda = segmento(0.24, 0.94, material);
    piernaIzquierda.position.set(-0.2, 0.45, 0);
    const piernaDerecha = segmento(0.24, 0.94, material);
    piernaDerecha.position.set(0.2, 0.45, 0);
    const arco = crearArco();
    arco.position.set(-0.72, 1.58, 0.18);
    grupo.add(
      torso,
      pelvis,
      cabeza,
      ojoIzquierdo,
      ojoDerecho,
      brazoIzquierdo,
      brazoDerecho,
      piernaIzquierda,
      piernaDerecha,
      arco,
    );
    grupo.position.set(posicion.x, posicion.y, posicion.z);
    scene.add(grupo);
    esqueletos.push({
      grupo,
      x: posicion.x,
      y: posicion.y,
      z: posicion.z,
      giro: 0,
      fase: Math.random() * Math.PI * 2,
      ultimoAtaque: Number.NEGATIVE_INFINITY,
      inicioAtaque: Number.NEGATIVE_INFINITY,
      vida: 6,
      flashHasta: 0,
      invocado,
      partes: {
        torso,
        brazoIzquierdo,
        brazoDerecho,
        piernaIzquierda,
        piernaDerecha,
        arco,
      },
    });
  }

  function actualizarEsqueleto(esqueleto, now, delta) {
    const dx = camera.position.x - esqueleto.x;
    const dz = camera.position.z - esqueleto.z;
    const distancia = Math.hypot(dx, dz);
    const distanciaActiva =
      configuracion.mundo.distanciaCargaPredeterminada *
      configuracion.mundo.tamanoRegion *
      configuracion.mundo.tamanoBloque *
      1.2;
    esqueleto.grupo.visible = distancia <= distanciaActiva;
    if (!esqueleto.grupo.visible) return;
    const giroObjetivo = Math.atan2(dx, dz);
    esqueleto.giro = acercarAngulo(esqueleto.giro, giroObjetivo, delta * 2.2);
    let direccionMovimiento = 0;
    if (hostiles && !salud.estaMuerto()) {
      if (distancia < ajustes.distanciaMinima) direccionMovimiento = -1;
      else if (distancia > ajustes.distanciaMinima + 3) direccionMovimiento = 1;
    }
    const velocidad = 1.15 * direccionMovimiento;
    if (velocidad !== 0) {
      const siguienteX =
        esqueleto.x + Math.sin(esqueleto.giro) * velocidad * delta;
      const siguienteZ =
        esqueleto.z + Math.cos(esqueleto.giro) * velocidad * delta;
      if (
        !terreno.hayColisionCuerpo(
          siguienteX,
          siguienteZ,
          esqueleto.y + 0.03,
          esqueleto.y + 3.1,
          0.38,
        )
      ) {
        esqueleto.x = siguienteX;
        esqueleto.z = siguienteZ;
        esqueleto.fase += delta * 7;
      }
    }
    if (
      hostiles &&
      distancia <= ajustes.distanciaAtaque &&
      distancia >= 3 &&
      now - esqueleto.ultimoAtaque >= ajustes.intervaloAtaqueMs &&
      hayLineaVision(esqueleto)
    ) {
      esqueleto.ultimoAtaque = now;
      esqueleto.inicioAtaque = now;
      disparar(esqueleto, now);
    }
    const ataque = Math.max(
      0,
      Math.sin(
        Math.min(1, (now - esqueleto.inicioAtaque) / 520) * Math.PI,
      ),
    );
    const paso = Math.sin(esqueleto.fase) * 0.45 * Math.abs(direccionMovimiento);
    esqueleto.partes.piernaIzquierda.rotation.x = paso;
    esqueleto.partes.piernaDerecha.rotation.x = -paso;
    esqueleto.partes.brazoIzquierdo.rotation.x = -paso * 0.7 - ataque * 0.55;
    esqueleto.partes.brazoDerecho.rotation.x = paso * 0.7 - ataque * 0.95;
    esqueleto.partes.arco.rotation.y = ataque * 0.25;
    esqueleto.grupo.position.set(esqueleto.x, esqueleto.y, esqueleto.z);
    esqueleto.grupo.rotation.y = esqueleto.giro;
    esqueleto.partes.torso.material.emissiveIntensity =
      now < esqueleto.flashHasta ? 1.2 : 0.34;
  }

  function disparar(esqueleto, now) {
    const origen = new THREE.Vector3(
      esqueleto.x,
      esqueleto.y + 2.05,
      esqueleto.z,
    );
    const objetivo = camera.position.clone().add(
      new THREE.Vector3(0, -configuracion.jugador.alturaOjos * 0.35, 0),
    );
    const velocidad = objetivo
      .sub(origen)
      .normalize()
      .multiplyScalar(ajustes.velocidadFlecha);
    const malla = new THREE.Mesh(geometriaFlecha, materialFlecha);
    malla.position.copy(origen);
    malla.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      velocidad.clone().normalize(),
    );
    scene.add(malla);
    flechas.push({ malla, velocidad, inicio: now });
  }

  function actualizarFlechas(now, delta) {
    for (let indice = flechas.length - 1; indice >= 0; indice -= 1) {
      const flecha = flechas[indice];
      flecha.malla.position.addScaledVector(flecha.velocidad, delta);
      const impactoBloque = terreno.hayBloqueEnMundo(
        flecha.malla.position.x,
        flecha.malla.position.y,
        flecha.malla.position.z,
      );
      const pies = camera.position.y - configuracion.jugador.alturaOjos;
      const impactoJugador =
        Math.hypot(
          flecha.malla.position.x - camera.position.x,
          flecha.malla.position.z - camera.position.z,
        ) < configuracion.jugador.radio + 0.18 &&
        flecha.malla.position.y > pies &&
        flecha.malla.position.y < pies + configuracion.jugador.altura;
      if (impactoJugador) salud.recibirDano(ajustes.dano, now);
      if (
        impactoBloque ||
        impactoJugador ||
        now - flecha.inicio >= ajustes.vidaFlechaMs
      ) {
        scene.remove(flecha.malla);
        flechas.splice(indice, 1);
      }
    }
  }

  function hayLineaVision(esqueleto) {
    const origen = new THREE.Vector3(esqueleto.x, esqueleto.y + 2.1, esqueleto.z);
    const destino = camera.position.clone();
    const pasos = Math.ceil(origen.distanceTo(destino) / 0.65);
    for (let paso = 1; paso < pasos; paso += 1) {
      const punto = origen.clone().lerp(destino, paso / pasos);
      if (terreno.hayBloqueEnMundo(punto.x, punto.y, punto.z)) return false;
    }
    return true;
  }

  function eliminarEsqueleto(esqueleto) {
    scene.remove(esqueleto.grupo);
    const indice = esqueletos.indexOf(esqueleto);
    if (indice >= 0) esqueletos.splice(indice, 1);
  }

  function caja(ancho, alto, fondo, materialActual) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(ancho, alto, fondo),
      materialActual,
    );
  }

  function segmento(grosor, largo, materialActual) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(grosor, largo, grosor),
      materialActual,
    );
  }

  function crearArco() {
    const grupo = new THREE.Group();
    for (const [y, giro] of [[0.34, -0.45], [0, 0], [-0.34, 0.45]]) {
      const parte = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.42, 0.1),
        materialArco,
      );
      parte.position.y = y;
      parte.rotation.z = giro;
      grupo.add(parte);
    }
    const cuerda = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 1.08, 0.025),
      materialFlecha,
    );
    cuerda.position.x = 0.13;
    grupo.add(cuerda);
    return grupo;
  }
}

function crearTexturaEsqueleto(THREE, estiloVisual) {
  const tamano = estiloVisual === "pixelar" ? 8 : 16;
  const datos = new Uint8Array(tamano * tamano * 4);
  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const ruido = hash(x, y);
      const grieta = (x * 7 + y * 11) % 19 === 0;
      const color = grieta
        ? [42, 54, 72]
        : ruido > 0.66
          ? [184, 203, 211]
          : ruido < 0.2
            ? [91, 111, 126]
            : [137, 158, 169];
      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.needsUpdate = true;
  return textura;
}

function acercarAngulo(actual, objetivo, paso) {
  const diferencia = Math.atan2(
    Math.sin(objetivo - actual),
    Math.cos(objetivo - actual),
  );
  return actual + Math.max(-paso, Math.min(paso, diferencia));
}

function hash(x, y) {
  const valor = Math.sin(x * 127.1 + y * 311.7 + 47.3) * 43758.5453;
  return valor - Math.floor(valor);
}
