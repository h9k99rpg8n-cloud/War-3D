export function crearSistemaAranas(
  THREE,
  scene,
  camera,
  terreno,
  salud,
  configuracion,
  opcionesMundo = {},
) {
  const ajustes = configuracion.aranas;
  const hostiles =
    opcionesMundo.modo === "supervivencia" &&
    opcionesMundo.dificultad !== "pacifica";
  const partesPorArana = 22;
  const ojosPorArana = 4;
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const texturaCuerpo = crearTexturaArana(THREE);
  const materialCuerpo = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x160b11,
    emissiveIntensity: 0.42,
    flatShading: true,
    map: texturaCuerpo,
    vertexColors: true,
  });
  const materialOjos = new THREE.MeshBasicMaterial({ color: 0xffb43f, fog: false });
  const mallaPartes = new THREE.InstancedMesh(
    geometria,
    materialCuerpo,
    ajustes.maximo * partesPorArana,
  );
  const mallaOjos = new THREE.InstancedMesh(
    geometria,
    materialOjos,
    ajustes.maximo * ojosPorArana,
  );
  const aranas = [];
  const matrizRaiz = new THREE.Matrix4();
  const matrizLocal = new THREE.Matrix4();
  const matrizMundo = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const cuaternion = new THREE.Quaternion();
  const cuaternionRaiz = new THREE.Quaternion();
  const eulerRaiz = new THREE.Euler(0, 0, 0, "YXZ");
  const vectorDireccion = new THREE.Vector3();
  const vectorCentro = new THREE.Vector3();
  const cadera = new THREE.Vector3();
  const rodilla = new THREE.Vector3();
  const pie = new THREE.Vector3();
  const vectorUno = new THREE.Vector3(1, 0, 0);
  const escalaRaiz = new THREE.Vector3(1, 1, 1);
  const color = new THREE.Color();
  const mitadMundo =
    (configuracion.mundo.tamanoCuadricula * configuracion.mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - configuracion.mundo.margenLimite - 1;
  let indiceParte = 0;
  let indiceOjo = 0;
  let nocheActiva = false;
  let ultimaNoche = 0;

  mallaPartes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mallaOjos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mallaPartes.frustumCulled = false;
  mallaOjos.frustumCulled = false;
  mallaPartes.userData.nombreEntidad = "Araña Umbral";
  mallaOjos.userData.nombreEntidad = "Ojos de Araña Umbral";
  mallaPartes.count = 0;
  mallaOjos.count = 0;
  scene.add(mallaPartes);
  scene.add(mallaOjos);

  return {
    actualizar(now, delta, estadoCiclo) {
      if (estadoCiclo.esNoche) {
        if (!nocheActiva || ultimaNoche !== estadoCiclo.numeroNoche) {
          nocheActiva = true;
          ultimaNoche = estadoCiclo.numeroNoche;
          generarNoche(ultimaNoche);
        }
      } else if (nocheActiva) {
        nocheActiva = false;
        for (let indice = aranas.length - 1; indice >= 0; indice -= 1) {
          if (aranas[indice].invocada) continue;
          const permanece = hash(
            aranas[indice].semilla,
            ultimaNoche + 1,
          ) >= 0.5;
          if (!permanece) aranas.splice(indice, 1);
        }
      }

      for (const arana of aranas) actualizarArana(arana, now, delta);
      actualizarMallas(now);
    },

    obtenerCantidad() {
      return aranas.length;
    },

    invocar(posicionInvocacion) {
      if (!posicionInvocacion || aranas.length >= ajustes.maximo) return false;
      const x = limitar(posicionInvocacion.x, -limiteMundo, limiteMundo);
      const z = limitar(posicionInvocacion.z, -limiteMundo, limiteMundo);
      const suelo = Math.max(
        terreno.obtenerAltura(x, z),
        posicionInvocacion.y - configuracion.mundo.tamanoBloque / 2,
      );
      if (
        terreno.obtenerNivelAgua(x, z) !== null ||
        terreno.hayColisionCuerpo(
          x,
          z,
          suelo + 0.02,
          suelo + 0.82,
          ajustes.radioCuerpo,
        )
      ) {
        return false;
      }
      const semilla = Math.floor(
        performance.now() + x * 47 + z * 83 + aranas.length * 113,
      );
      aranas.push(crearDatosArana(x, z, suelo, semilla, true));
      return true;
    },

    atacar(origen, direccionAtaque, alcance, dano) {
      let objetivo = null;
      let distanciaObjetivo = Number.POSITIVE_INFINITY;
      for (const arana of aranas) {
        const haciaEntidad = new THREE.Vector3(
          arana.x,
          arana.y + 0.45,
          arana.z,
        ).sub(origen);
        const distancia = haciaEntidad.length();
        if (distancia > alcance || distancia >= distanciaObjetivo) continue;
        if (haciaEntidad.normalize().dot(direccionAtaque) < 0.955) continue;
        objetivo = arana;
        distanciaObjetivo = distancia;
      }
      if (!objetivo) return false;
      objetivo.vida -= Math.max(1, Number(dano) || 1);
      objetivo.golpeJugadorHasta = performance.now() + 160;
      if (objetivo.vida <= 0) {
        const indice = aranas.indexOf(objetivo);
        if (indice >= 0) aranas.splice(indice, 1);
      }
      return true;
    },

    despejarAlrededor(posicionJugador, radio = 12) {
      for (let i = aranas.length - 1; i >= 0; i -= 1) {
        if (
          Math.hypot(
            aranas[i].x - posicionJugador.x,
            aranas[i].z - posicionJugador.z,
          ) < radio
        ) {
          aranas.splice(i, 1);
        }
      }
    },
  };

  function generarNoche(numeroNoche) {
    const invocadas = aranas.filter((arana) => arana.invocada);
    aranas.length = 0;
    aranas.push(...invocadas);
    const cantidad = Math.min(
      ajustes.cantidadInicial,
      ajustes.maximo - aranas.length,
    );

    for (let indice = 0; indice < cantidad; indice += 1) {
      let encontrada = null;
      for (let intento = 0; intento < 16 && !encontrada; intento += 1) {
        const semilla = numeroNoche * 97 + indice * 23 + intento * 11;
        const angulo = hash(semilla, 1) * Math.PI * 2;
        const distancia = interpolar(
          ajustes.radioSpawnMinimo,
          ajustes.radioSpawnMaximo,
          hash(semilla, 2),
        );
        const x = limitar(camera.position.x + Math.cos(angulo) * distancia, -limiteMundo, limiteMundo);
        const z = limitar(camera.position.z + Math.sin(angulo) * distancia, -limiteMundo, limiteMundo);
        const suelo = terreno.obtenerAltura(x, z);
        if (
          terreno.obtenerNivelAgua(x, z) === null &&
          !terreno.hayColisionCuerpo(
            x,
            z,
            suelo + 0.02,
            suelo + 0.82,
            ajustes.radioCuerpo,
          )
        ) {
          encontrada = { x, z, suelo, semilla };
        }
      }

      if (!encontrada) continue;
      aranas.push(
        crearDatosArana(
          encontrada.x,
          encontrada.z,
          encontrada.suelo,
          encontrada.semilla,
          false,
        ),
      );
    }
  }

  function crearDatosArana(x, z, y, semilla, invocada) {
    return {
      x,
      z,
      y,
      giro: hash(semilla, 4) * Math.PI * 2,
      fasePaso: hash(semilla, 5) * Math.PI * 2,
      semilla,
      invocada,
      vistoHasta: Number.NEGATIVE_INFINITY,
      ultimoAtaque: Number.NEGATIVE_INFINITY,
      inicioAtaque: Number.NEGATIVE_INFINITY,
      danoPendiente: false,
      alerta: 0,
      subiendo: false,
      inclinacion: 0,
      vida: 4,
      golpeJugadorHasta: 0,
      activa: true,
    };
  }

  function actualizarArana(arana, now, delta) {
    const haciaX = camera.position.x - arana.x;
    const haciaZ = camera.position.z - arana.z;
    const distancia = Math.hypot(haciaX, haciaZ);
    const distanciaActiva =
      configuracion.mundo.distanciaCargaPredeterminada *
      configuracion.mundo.tamanoRegion *
      configuracion.mundo.tamanoBloque *
      1.2;
    arana.activa = distancia <= distanciaActiva;
    if (!arana.activa) return;
    const distanciaVertical = Math.abs(
      camera.position.y - configuracion.jugador.alturaOjos - arana.y,
    );
    const frenteX = Math.sin(arana.giro);
    const frenteZ = Math.cos(arana.giro);
    const producto =
      distancia > 0.001 ? (frenteX * haciaX + frenteZ * haciaZ) / distancia : 1;
    const dentroVision =
      hostiles &&
      !salud.estaMuerto() &&
      distancia <= ajustes.rangoVision &&
      producto >= Math.cos(ajustes.semiAnguloVision);

    if (dentroVision) arana.vistoHasta = now + ajustes.memoriaPersecucionMs;
    const persiguiendo = hostiles && !salud.estaMuerto() && now <= arana.vistoHasta;
    let velocidad = ajustes.velocidadPatrulla;

    if (persiguiendo) {
      const giroObjetivo = Math.atan2(haciaX, haciaZ);
      arana.giro = acercarAngulo(arana.giro, giroObjetivo, delta * 3.8);
      velocidad = ajustes.velocidadPersecucion;
      arana.alerta = Math.min(1, arana.alerta + delta * 4.5);
    } else {
      arana.giro += Math.sin(now * 0.0007 + arana.semilla) * delta * 0.42;
      arana.alerta = Math.max(0, arana.alerta - delta * 2.5);
    }

    const siguienteX = limitar(
      arana.x + Math.sin(arana.giro) * velocidad * delta,
      -limiteMundo,
      limiteMundo,
    );
    const siguienteZ = limitar(
      arana.z + Math.cos(arana.giro) * velocidad * delta,
      -limiteMundo,
      limiteMundo,
    );
    const alturaEscalable = terreno.obtenerAlturaEscalable(
      siguienteX,
      siguienteZ,
      arana.y,
      ajustes.radioCuerpo,
      ajustes.alturaEscalable,
    );
    const nivelAguaSiguiente = terreno.obtenerNivelAgua(siguienteX, siguienteZ);
    const bloqueadaPorAgua =
      nivelAguaSiguiente !== null && nivelAguaSiguiente > arana.y - 0.15;
    const bloqueada =
      bloqueadaPorAgua ||
      terreno.hayColisionCuerpo(
        siguienteX,
        siguienteZ,
        arana.y + 0.02,
        arana.y + 0.82,
        ajustes.radioCuerpo,
      );

    if (bloqueada && alturaEscalable > arana.y + 0.001) {
      arana.subiendo = true;
      arana.y = moverHacia(
        arana.y,
        alturaEscalable,
        ajustes.velocidadEscalada * delta,
      );
    } else if (bloqueada) {
      arana.subiendo = false;
      arana.giro += Math.PI * (0.55 + hash(arana.semilla, Math.floor(now / 900)) * 0.35);
    } else {
      arana.x = siguienteX;
      arana.z = siguienteZ;
      const soporte = terreno.obtenerAlturaSoporte(
        siguienteX,
        siguienteZ,
        arana.y + 0.18,
        ajustes.radioCuerpo * 0.92,
      );
      arana.subiendo = soporte > arana.y + 0.035;
      arana.y = moverHacia(
        arana.y,
        soporte,
        ajustes.velocidadEscalada * delta,
      );
    }
    const inclinacionObjetivo = arana.subiendo ? -0.46 : 0;
    const mezclaInclinacion = 1 - Math.exp(-7.5 * delta);
    arana.inclinacion +=
      (inclinacionObjetivo - arana.inclinacion) * mezclaInclinacion;
    arana.fasePaso += delta * velocidad * (arana.subiendo ? 7.4 : 5.2);

    if (
      hostiles &&
      arana.danoPendiente &&
      now - arana.inicioAtaque >= ajustes.retrasoGolpeMs
    ) {
      arana.danoPendiente = false;
      const distanciaGolpe = Math.hypot(
        camera.position.x - arana.x,
        camera.position.z - arana.z,
      );
      if (
        !salud.estaMuerto() &&
        now <= arana.vistoHasta &&
        distanciaGolpe <= ajustes.distanciaAtaque + 0.42 &&
        Math.abs(
          camera.position.y - configuracion.jugador.alturaOjos - arana.y,
        ) <= 1.45
      ) {
        salud.recibirDano(ajustes.dano, now);
      }
    }

    if (
      hostiles &&
      persiguiendo &&
      distancia <= ajustes.distanciaAtaque &&
      distanciaVertical <= 1.45 &&
      now - arana.ultimoAtaque >= ajustes.intervaloAtaqueMs &&
      !arana.danoPendiente
    ) {
      arana.ultimoAtaque = now;
      arana.inicioAtaque = now;
      arana.danoPendiente = true;
    }
  }

  function actualizarMallas(now) {
    indiceParte = 0;
    indiceOjo = 0;

    for (const arana of aranas) {
      if (arana.activa !== false) dibujarArana(arana, now);
    }

    mallaPartes.count = indiceParte;
    mallaOjos.count = indiceOjo;
    mallaPartes.instanceMatrix.needsUpdate = true;
    mallaOjos.instanceMatrix.needsUpdate = true;
    if (mallaPartes.instanceColor) mallaPartes.instanceColor.needsUpdate = true;
  }

  function dibujarArana(arana, now) {
    const progresoAtaque = (now - arana.inicioAtaque) / ajustes.duracionAtaqueMs;
    const ataque =
      progresoAtaque >= 0 && progresoAtaque <= 1
        ? Math.sin(progresoAtaque * Math.PI)
        : 0;
    const escalada = limitar(Math.abs(arana.inclinacion) / 0.46, 0, 1);
    const impulsoAtaque = ataque * 0.36;
    posicion.set(
      arana.x + Math.sin(arana.giro) * impulsoAtaque,
      arana.y + ataque * 0.06,
      arana.z + Math.cos(arana.giro) * impulsoAtaque,
    );
    eulerRaiz.set(arana.inclinacion, arana.giro, 0, "YXZ");
    cuaternionRaiz.setFromEuler(eulerRaiz);
    matrizRaiz.compose(posicion, cuaternionRaiz, escalaRaiz);

    agregarCaja(
      0,
      0.4 + ataque * 0.04,
      -0.28,
      0.92,
      0.48,
      1.08,
      now < arana.golpeJugadorHasta ? 0xb45d68 : 0x55283a,
    );
    agregarCaja(0, 0.4 + ataque * 0.08, 0.56 + ataque * 0.18, 0.72, 0.43, 0.66, 0x24171c);
    agregarCaja(-0.17, 0.35 - ataque * 0.05, 0.96 + ataque * 0.38, 0.12, 0.18, 0.24, 0x8e5034);
    agregarCaja(0.17, 0.35 - ataque * 0.05, 0.96 + ataque * 0.38, 0.12, 0.18, 0.24, 0x8e5034);
    agregarCaja(-0.17, 0.37, -0.88, 0.13, 0.16, 0.25, 0x302026);
    agregarCaja(0.17, 0.37, -0.88, 0.13, 0.16, 0.25, 0x302026);

    const posicionesZ = [0.5, 0.2, -0.18, -0.5];
    const aperturaZ = [0.62, 0.25, -0.25, -0.62];
    for (let fila = 0; fila < 4; fila += 1) {
      for (const lado of [-1, 1]) {
        const paso = Math.sin(
          arana.fasePaso + fila * 1.42 + (lado > 0 ? Math.PI : 0),
        );
        const elevacionPaso = Math.max(0, paso) * (0.12 + escalada * 0.22);
        const defensa = fila === 0 ? arana.alerta : 0;
        const golpe = fila === 0 ? ataque : 0;
        cadera.set(lado * 0.31, 0.41, posicionesZ[fila]);
        rodilla.set(
          lado * 0.88,
          0.27 + elevacionPaso + defensa * 0.36 + golpe * 0.22,
          posicionesZ[fila] +
            aperturaZ[fila] * 0.45 +
            paso * 0.11 +
            escalada * 0.22 +
            golpe * 0.4,
        );
        pie.set(
          lado * 1.38,
          0.08 +
            defensa * 0.34 +
            escalada * (0.2 + Math.max(0, -paso) * 0.34) +
            golpe * 0.12,
          posicionesZ[fila] +
            aperturaZ[fila] +
            paso * 0.06 +
            escalada * 0.42 +
            golpe * 0.7,
        );
        agregarSegmento(cadera, rodilla, 0.13, 0x3b2425);
        agregarSegmento(rodilla, pie, 0.11, 0x2d1c20);
      }
    }

    const pulsoOjos = 0.085 + Math.sin(now * 0.008 + arana.semilla) * 0.008;
    agregarOjo(-0.18, 0.53, 0.89, pulsoOjos);
    agregarOjo(0.18, 0.53, 0.89, pulsoOjos);
    agregarOjo(-0.07, 0.47, 0.91, pulsoOjos * 0.78);
    agregarOjo(0.07, 0.47, 0.91, pulsoOjos * 0.78);
  }

  function agregarCaja(x, y, z, escalaX, escalaY, escalaZ, colorHex) {
    posicion.set(x, y, z);
    escala.set(escalaX, escalaY, escalaZ);
    cuaternion.identity();
    matrizLocal.compose(posicion, cuaternion, escala);
    matrizMundo.multiplyMatrices(matrizRaiz, matrizLocal);
    mallaPartes.setMatrixAt(indiceParte, matrizMundo);
    color.setHex(colorHex);
    mallaPartes.setColorAt(indiceParte, color);
    indiceParte += 1;
  }

  function agregarSegmento(inicio, fin, grosor, colorHex) {
    vectorDireccion.subVectors(fin, inicio);
    const longitud = vectorDireccion.length();
    vectorDireccion.normalize();
    vectorCentro.addVectors(inicio, fin).multiplyScalar(0.5);
    cuaternion.setFromUnitVectors(vectorUno, vectorDireccion);
    escala.set(longitud, grosor, grosor);
    matrizLocal.compose(vectorCentro, cuaternion, escala);
    matrizMundo.multiplyMatrices(matrizRaiz, matrizLocal);
    mallaPartes.setMatrixAt(indiceParte, matrizMundo);
    color.setHex(colorHex);
    mallaPartes.setColorAt(indiceParte, color);
    indiceParte += 1;
  }

  function agregarOjo(x, y, z, tamano) {
    posicion.set(x, y, z);
    escala.set(tamano, tamano, tamano * 0.7);
    cuaternion.identity();
    matrizLocal.compose(posicion, cuaternion, escala);
    matrizMundo.multiplyMatrices(matrizRaiz, matrizLocal);
    mallaOjos.setMatrixAt(indiceOjo, matrizMundo);
    indiceOjo += 1;
  }
}

function acercarAngulo(actual, objetivo, pasoMaximo) {
  const diferencia = Math.atan2(Math.sin(objetivo - actual), Math.cos(objetivo - actual));
  return actual + limitar(diferencia, -pasoMaximo, pasoMaximo);
}

function hash(a, b) {
  const valor = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return valor - Math.floor(valor);
}

function interpolar(inicio, fin, progreso) {
  return inicio + (fin - inicio) * progreso;
}

function moverHacia(actual, objetivo, pasoMaximo) {
  if (Math.abs(objetivo - actual) <= pasoMaximo) return objetivo;
  return actual + Math.sign(objetivo - actual) * pasoMaximo;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function crearTexturaArana(THREE) {
  const tamano = 16;
  const datos = new Uint8Array(tamano * tamano * 4);
  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const ruido = hash(x + 137, y + 211);
      const franja = (x * 3 + y * 5) % 11;
      let color = ruido > 0.52 ? [222, 190, 170] : [181, 145, 135];
      if (franja === 0 || ruido < 0.12) color = [105, 79, 82];
      else if (franja === 6 && ruido > 0.6) color = [244, 214, 179];
      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = 255;
    }
  }

  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = "piel-pixelada-arana-umbral";
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestMipmapNearestFilter;
  textura.generateMipmaps = true;
  textura.needsUpdate = true;
  return textura;
}
