export function crearSistemaZombies(
  THREE,
  scene,
  camera,
  terreno,
  salud,
  configuracion,
  opcionesMundo = {},
) {
  const ajustes = configuracion.zombies;
  const activo = opcionesMundo.modo === "supervivencia";
  const partesPorZombie = 16;
  const ojosPorZombie = 2;
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const materialCuerpo = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x13251f,
    emissiveIntensity: 0.34,
    flatShading: true,
    map: crearTexturaZombie(THREE),
    vertexColors: true,
  });
  const materialOjos = new THREE.MeshBasicMaterial({
    color: 0xbfffd2,
    fog: false,
  });
  const mallaPartes = new THREE.InstancedMesh(
    geometria,
    materialCuerpo,
    ajustes.maximo * partesPorZombie,
  );
  const mallaOjos = new THREE.InstancedMesh(
    geometria,
    materialOjos,
    ajustes.maximo * ojosPorZombie,
  );
  const zombies = [];
  const matrizRaiz = new THREE.Matrix4();
  const matrizLocal = new THREE.Matrix4();
  const matrizMundo = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const cuaternion = new THREE.Quaternion();
  const cuaternionRaiz = new THREE.Quaternion();
  const eulerRaiz = new THREE.Euler(0, 0, 0, "YXZ");
  const direccion = new THREE.Vector3();
  const centro = new THREE.Vector3();
  const inicioSegmento = new THREE.Vector3();
  const finSegmento = new THREE.Vector3();
  const ejeY = new THREE.Vector3(0, 1, 0);
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
  mallaPartes.userData.nombreEntidad = "Zombi Resquebrajado";
  mallaPartes.userData.animaciones = ["caminar", "correr", "atacar"];
  mallaOjos.userData.nombreEntidad = "Mirada del Zombi Resquebrajado";
  mallaPartes.count = 0;
  mallaOjos.count = 0;
  scene.add(mallaPartes);
  scene.add(mallaOjos);

  return {
    actualizar(now, delta, estadoCiclo) {
      if (!activo) {
        if (zombies.length > 0) zombies.length = 0;
        actualizarMallas(now);
        return;
      }

      if (estadoCiclo.esNoche) {
        if (!nocheActiva || ultimaNoche !== estadoCiclo.numeroNoche) {
          nocheActiva = true;
          ultimaNoche = estadoCiclo.numeroNoche;
          generarNoche(ultimaNoche);
        }
      } else if (nocheActiva || zombies.length > 0) {
        nocheActiva = false;
        zombies.length = 0;
      }

      for (const zombie of zombies) actualizarZombie(zombie, now, delta);
      actualizarMallas(now);
    },

    obtenerCantidad() {
      return zombies.length;
    },

    despejarAlrededor(posicionJugador, radio = 14) {
      for (let indice = zombies.length - 1; indice >= 0; indice -= 1) {
        if (
          Math.hypot(
            zombies[indice].x - posicionJugador.x,
            zombies[indice].z - posicionJugador.z,
          ) < radio
        ) {
          zombies.splice(indice, 1);
        }
      }
    },
  };

  function generarNoche(numeroNoche) {
    zombies.length = 0;
    const cantidadGrupos = Math.min(
      ajustes.cantidadGrupos,
      Math.floor(ajustes.maximo / ajustes.tamanoGrupo),
    );

    for (let grupo = 0; grupo < cantidadGrupos; grupo += 1) {
      const centroGrupo = buscarCentroGrupo(numeroNoche, grupo);
      if (!centroGrupo) continue;
      for (let miembro = 0; miembro < ajustes.tamanoGrupo; miembro += 1) {
        const angulo = (miembro / ajustes.tamanoGrupo) * Math.PI * 2 + 0.42;
        const radio = miembro === 0 ? 0 : 1.7 + miembro * 0.25;
        const x = limitar(
          centroGrupo.x + Math.cos(angulo) * radio,
          -limiteMundo,
          limiteMundo,
        );
        const z = limitar(
          centroGrupo.z + Math.sin(angulo) * radio,
          -limiteMundo,
          limiteMundo,
        );
        const y = terreno.obtenerAltura(x, z);
        if (
          terreno.obtenerNivelAgua(x, z) !== null ||
          terreno.hayColisionCuerpo(
            x,
            z,
            y + 0.04,
            y + 2.8,
            ajustes.radioCuerpo,
          )
        ) {
          continue;
        }
        const semilla = numeroNoche * 193 + grupo * 47 + miembro * 17;
        zombies.push({
          x,
          y,
          z,
          giro: hash(semilla, 2) * Math.PI * 2,
          fasePaso: hash(semilla, 3) * Math.PI * 2,
          semilla,
          vistoHasta: Number.NEGATIVE_INFINITY,
          ultimoAtaque: Number.NEGATIVE_INFINITY,
          inicioAtaque: Number.NEGATIVE_INFINITY,
          danoPendiente: false,
          corriendo: false,
        });
      }
    }
  }

  function buscarCentroGrupo(numeroNoche, grupo) {
    for (let intento = 0; intento < 22; intento += 1) {
      const semilla = numeroNoche * 131 + grupo * 59 + intento * 13;
      const angulo = hash(semilla, 4) * Math.PI * 2;
      const distancia = interpolar(
        ajustes.radioSpawnMinimo,
        ajustes.radioSpawnMaximo,
        hash(semilla, 5),
      );
      const x = limitar(
        camera.position.x + Math.cos(angulo) * distancia,
        -limiteMundo,
        limiteMundo,
      );
      const z = limitar(
        camera.position.z + Math.sin(angulo) * distancia,
        -limiteMundo,
        limiteMundo,
      );
      const y = terreno.obtenerAltura(x, z);
      if (
        terreno.obtenerNivelAgua(x, z) === null &&
        !terreno.hayColisionCuerpo(
          x,
          z,
          y + 0.04,
          y + 2.8,
          ajustes.radioCuerpo,
        )
      ) {
        return { x, y, z };
      }
    }
    return null;
  }

  function actualizarZombie(zombie, now, delta) {
    const haciaX = camera.position.x - zombie.x;
    const haciaZ = camera.position.z - zombie.z;
    const distancia = Math.hypot(haciaX, haciaZ);
    const piesJugador = camera.position.y - configuracion.jugador.alturaOjos;
    const distanciaVertical = Math.abs(piesJugador - zombie.y);
    const detectado =
      !salud.estaMuerto() &&
      distancia <= ajustes.rangoVision &&
      distanciaVertical <= 3;

    if (detectado) zombie.vistoHasta = now + ajustes.memoriaPersecucionMs;
    const persiguiendo = !salud.estaMuerto() && now <= zombie.vistoHasta;
    zombie.corriendo = persiguiendo && distancia > ajustes.distanciaAtaque * 0.85;
    const velocidad = zombie.corriendo
      ? ajustes.velocidadCorrer
      : ajustes.velocidadCaminar;

    if (persiguiendo) {
      const giroObjetivo = Math.atan2(haciaX, haciaZ);
      zombie.giro = acercarAngulo(zombie.giro, giroObjetivo, delta * 4.2);
    } else {
      zombie.giro += Math.sin(now * 0.00043 + zombie.semilla) * delta * 0.52;
    }

    if (!estaAtacando(zombie, now)) {
      moverZombie(zombie, velocidad, delta, now);
    }
    zombie.fasePaso += delta * velocidad * (zombie.corriendo ? 7.6 : 4.1);

    if (
      zombie.danoPendiente &&
      now - zombie.inicioAtaque >= ajustes.retrasoGolpeMs
    ) {
      zombie.danoPendiente = false;
      const distanciaGolpe = Math.hypot(
        camera.position.x - zombie.x,
        camera.position.z - zombie.z,
      );
      if (
        !salud.estaMuerto() &&
        now <= zombie.vistoHasta &&
        distanciaGolpe <= ajustes.distanciaAtaque + 0.48 &&
        Math.abs(piesJugador - zombie.y) <= 2.2
      ) {
        salud.recibirDano(ajustes.dano, now);
      }
    }

    if (
      persiguiendo &&
      distancia <= ajustes.distanciaAtaque &&
      distanciaVertical <= 2.2 &&
      now - zombie.ultimoAtaque >= ajustes.intervaloAtaqueMs &&
      !zombie.danoPendiente
    ) {
      zombie.ultimoAtaque = now;
      zombie.inicioAtaque = now;
      zombie.danoPendiente = true;
    }
  }

  function moverZombie(zombie, velocidad, delta, now) {
    const siguienteX = limitar(
      zombie.x + Math.sin(zombie.giro) * velocidad * delta,
      -limiteMundo,
      limiteMundo,
    );
    const siguienteZ = limitar(
      zombie.z + Math.cos(zombie.giro) * velocidad * delta,
      -limiteMundo,
      limiteMundo,
    );
    const soporte = terreno.obtenerAlturaEscalable(
      siguienteX,
      siguienteZ,
      zombie.y,
      ajustes.radioCuerpo,
      configuracion.mundo.tamanoBloque + 0.12,
    );
    const agua = terreno.obtenerNivelAgua(siguienteX, siguienteZ);
    const bloqueado =
      (agua !== null && agua > zombie.y - 0.12) ||
      soporte > zombie.y + configuracion.mundo.tamanoBloque + 0.13 ||
      terreno.hayColisionCuerpo(
        siguienteX,
        siguienteZ,
        zombie.y + 0.05,
        zombie.y + 2.75,
        ajustes.radioCuerpo,
      );

    if (bloqueado) {
      zombie.giro += Math.PI * (0.48 + hash(zombie.semilla, Math.floor(now / 800)) * 0.5);
      return;
    }
    zombie.x = siguienteX;
    zombie.z = siguienteZ;
    zombie.y = moverHacia(zombie.y, soporte, delta * 3.8);
  }

  function actualizarMallas(now) {
    indiceParte = 0;
    indiceOjo = 0;
    for (const zombie of zombies) dibujarZombie(zombie, now);
    mallaPartes.count = indiceParte;
    mallaOjos.count = indiceOjo;
    mallaPartes.instanceMatrix.needsUpdate = true;
    mallaOjos.instanceMatrix.needsUpdate = true;
    if (mallaPartes.instanceColor) mallaPartes.instanceColor.needsUpdate = true;
  }

  function dibujarZombie(zombie, now) {
    const progresoAtaque = (now - zombie.inicioAtaque) / ajustes.duracionAtaqueMs;
    const ataque =
      progresoAtaque >= 0 && progresoAtaque <= 1
        ? Math.sin(progresoAtaque * Math.PI)
        : 0;
    const amplitud = zombie.corriendo ? 0.46 : 0.28;
    const paso = Math.sin(zombie.fasePaso) * amplitud;
    const rebote = Math.abs(Math.sin(zombie.fasePaso * 2)) *
      (zombie.corriendo ? 0.08 : 0.035);
    posicion.set(
      zombie.x + Math.sin(zombie.giro) * ataque * 0.32,
      zombie.y + rebote,
      zombie.z + Math.cos(zombie.giro) * ataque * 0.32,
    );
    eulerRaiz.set(ataque * -0.13, zombie.giro, 0, "YXZ");
    cuaternionRaiz.setFromEuler(eulerRaiz);
    matrizRaiz.compose(posicion, cuaternionRaiz, escalaRaiz);

    agregarCaja(0, 1.36, 0, 0.78, 1.02, 0.46, 0x6f7f77);
    agregarCaja(0, 2.23 - ataque * 0.04, 0.05, 0.72, 0.68, 0.68, 0xa8b8a4);
    agregarCaja(0, 2.02 - ataque * 0.12, 0.43 + ataque * 0.08, 0.48, 0.17, 0.16, 0x725d4a);
    agregarCaja(0.25, 1.42, -0.25, 0.18, 0.84, 0.13, 0xc66e3d);

    for (const lado of [-1, 1]) {
      const pasoLado = paso * (lado < 0 ? 1 : -1);
      const hombro = inicioSegmento.set(lado * 0.52, 1.74, 0.02).clone();
      const codo = centro.set(
        lado * (0.58 - ataque * 0.12),
        1.32 + ataque * 0.28,
        pasoLado * -0.72 + ataque * 0.75,
      ).clone();
      const mano = finSegmento.set(
        lado * (0.52 - ataque * 0.18),
        0.98 + ataque * 0.3,
        pasoLado * -1.05 + ataque * 1.23,
      ).clone();
      agregarSegmento(hombro, codo, 0.26, 0x839787);
      agregarSegmento(codo, mano, 0.23, 0xaab9a3);

      const cadera = inicioSegmento.set(lado * 0.23, 0.91, 0).clone();
      const rodilla = centro.set(
        lado * 0.24,
        0.48 + Math.max(0, pasoLado) * 0.12,
        pasoLado * 0.66,
      ).clone();
      const pie = finSegmento.set(
        lado * 0.24,
        0.13 + Math.max(0, pasoLado) * 0.08,
        pasoLado * -0.72 + 0.08,
      ).clone();
      agregarSegmento(cadera, rodilla, 0.31, lado < 0 ? 0x465962 : 0x4c504e);
      agregarSegmento(rodilla, pie, 0.29, lado < 0 ? 0x39464c : 0x47413f);
      agregarCaja(lado * 0.47, 1.75, 0, 0.23, 0.24, 0.5, lado < 0 ? 0x9f5338 : 0x697870);
    }

    agregarCaja(-0.14, 2.29, 0.39, 0.1, 0.1, 0.08, 0xd9ffd9, true);
    agregarCaja(0.14, 2.29, 0.39, 0.1, 0.1, 0.08, 0xd9ffd9, true);
  }

  function agregarCaja(x, y, z, sx, sy, sz, colorHex, ojo = false) {
    posicion.set(x, y, z);
    escala.set(sx, sy, sz);
    cuaternion.identity();
    matrizLocal.compose(posicion, cuaternion, escala);
    matrizMundo.multiplyMatrices(matrizRaiz, matrizLocal);
    if (ojo) {
      mallaOjos.setMatrixAt(indiceOjo, matrizMundo);
      indiceOjo += 1;
      return;
    }
    mallaPartes.setMatrixAt(indiceParte, matrizMundo);
    color.setHex(colorHex);
    mallaPartes.setColorAt(indiceParte, color);
    indiceParte += 1;
  }

  function agregarSegmento(inicio, fin, grosor, colorHex) {
    direccion.subVectors(fin, inicio);
    const longitud = direccion.length();
    direccion.normalize();
    centro.addVectors(inicio, fin).multiplyScalar(0.5);
    cuaternion.setFromUnitVectors(ejeY, direccion);
    escala.set(grosor, longitud, grosor);
    matrizLocal.compose(centro, cuaternion, escala);
    matrizMundo.multiplyMatrices(matrizRaiz, matrizLocal);
    mallaPartes.setMatrixAt(indiceParte, matrizMundo);
    color.setHex(colorHex);
    mallaPartes.setColorAt(indiceParte, color);
    indiceParte += 1;
  }

  function estaAtacando(zombie, now) {
    const progreso = (now - zombie.inicioAtaque) / ajustes.duracionAtaqueMs;
    return progreso >= 0 && progreso <= 1;
  }
}

function crearTexturaZombie(THREE) {
  const tamano = 16;
  const datos = new Uint8Array(tamano * tamano * 4);
  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const ruido = hash(x + 313, y + 617);
      const grieta = (x * 5 + y * 7 + Math.floor(ruido * 4)) % 17;
      const costra = hash(Math.floor(x / 3) + 71, Math.floor(y / 3) + 89);
      let pixel = ruido > 0.54 ? [132, 151, 133] : [96, 121, 108];
      if (costra < 0.22) pixel = [57, 78, 72];
      if (grieta === 0 || (grieta === 1 && ruido > 0.68)) pixel = [196, 94, 49];
      if ((x + y * 2) % 19 === 0) pixel = [184, 173, 113];
      const indice = (y * tamano + x) * 4;
      datos[indice] = pixel[0];
      datos[indice + 1] = pixel[1];
      datos[indice + 2] = pixel[2];
      datos[indice + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = "piel-original-zombi-resquebrajado";
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestMipmapNearestFilter;
  textura.generateMipmaps = true;
  textura.needsUpdate = true;
  return textura;
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
