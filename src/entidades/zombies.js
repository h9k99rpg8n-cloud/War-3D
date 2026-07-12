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
  const hostiles = opcionesMundo.modo === "supervivencia";
  const partesPorZombie = 16;
  const ojosPorZombie = 2;
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const materialCuerpo = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x153b20,
    emissiveIntensity: 0.3,
    flatShading: true,
    map: crearTexturaZombie(THREE),
    vertexColors: true,
  });
  const materialOjos = new THREE.MeshBasicMaterial({
    color: 0xfff49a,
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
  const particulas = [];
  const maximoParticulas = ajustes.maximo * 36;
  const posicionesParticulas = new Float32Array(maximoParticulas * 3);
  const coloresParticulas = new Float32Array(maximoParticulas * 3);
  const geometriaParticulas = new THREE.BufferGeometry();
  geometriaParticulas.setAttribute(
    "position",
    new THREE.BufferAttribute(posicionesParticulas, 3),
  );
  geometriaParticulas.setAttribute(
    "color",
    new THREE.BufferAttribute(coloresParticulas, 3),
  );
  geometriaParticulas.setDrawRange(0, 0);
  const mallaParticulas = new THREE.Points(
    geometriaParticulas,
    new THREE.PointsMaterial({
      size: 0.32,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      vertexColors: true,
    }),
  );
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
  const colorFuego = new THREE.Color(0xff6a18);
  const mitadMundo =
    (configuracion.mundo.tamanoCuadricula * configuracion.mundo.tamanoBloque) / 2;
  const limiteMundo = mitadMundo - configuracion.mundo.margenLimite - 1;
  let indiceParte = 0;
  let indiceOjo = 0;
  let nocheActiva = false;
  let ultimaNoche = 0;
  let intensidadFuegoActual = 0;

  mallaPartes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mallaOjos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mallaPartes.frustumCulled = false;
  mallaOjos.frustumCulled = false;
  mallaPartes.userData.nombreEntidad = "Zombi Errante";
  mallaPartes.userData.animaciones = ["caminar", "correr", "atacar", "quemarse"];
  mallaOjos.userData.nombreEntidad = "Mirada del Zombi Errante";
  mallaPartes.count = 0;
  mallaOjos.count = 0;
  scene.add(mallaPartes);
  scene.add(mallaOjos);
  scene.add(mallaParticulas);

  return {
    actualizar(now, delta, estadoCiclo) {
      if (hostiles && estadoCiclo.esNoche) {
        if (!nocheActiva || ultimaNoche !== estadoCiclo.numeroNoche) {
          nocheActiva = true;
          ultimaNoche = estadoCiclo.numeroNoche;
          generarNoche(ultimaNoche);
        }
      } else if (nocheActiva) {
        nocheActiva = false;
      }

      for (let indice = zombies.length - 1; indice >= 0; indice -= 1) {
        if (!actualizarZombie(zombies[indice], now, delta, estadoCiclo)) {
          zombies.splice(indice, 1);
        }
      }
      actualizarParticulas(delta);
      actualizarMallas(now);
    },

    obtenerCantidad() {
      return zombies.length;
    },

    obtenerCantidadQuemando() {
      return zombies.filter((zombie) => zombie.quemando).length;
    },

    invocar(posicionInvocacion) {
      if (!posicionInvocacion || zombies.length >= ajustes.maximo) return false;
      const x = limitar(posicionInvocacion.x, -limiteMundo, limiteMundo);
      const z = limitar(posicionInvocacion.z, -limiteMundo, limiteMundo);
      const y = Math.max(
        terreno.obtenerAltura(x, z),
        posicionInvocacion.y - configuracion.mundo.tamanoBloque / 2,
      );
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
        return false;
      }
      const semilla = Math.floor(
        performance.now() + x * 61 + z * 97 + zombies.length * 127,
      );
      zombies.push(crearDatosZombie(x, y, z, semilla, true));
      return true;
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
    const invocados = zombies.filter((zombie) => zombie.invocado);
    zombies.length = 0;
    zombies.push(...invocados);
    const cantidadGrupos = Math.min(
      ajustes.cantidadGrupos,
      Math.floor((ajustes.maximo - zombies.length) / ajustes.tamanoGrupo),
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
        zombies.push(crearDatosZombie(x, y, z, semilla, false));
      }
    }
  }

  function crearDatosZombie(x, y, z, semilla, invocado) {
    return {
      x,
      y,
      z,
      giro: hash(semilla, 2) * Math.PI * 2,
      fasePaso: hash(semilla, 3) * Math.PI * 2,
      semilla,
      invocado,
      vistoHasta: Number.NEGATIVE_INFINITY,
      ultimoAtaque: Number.NEGATIVE_INFINITY,
      inicioAtaque: Number.NEGATIVE_INFINITY,
      danoPendiente: false,
      corriendo: false,
      quemando: false,
      inicioQuemadura: Number.NEGATIVE_INFINITY,
      ultimaParticula: Number.NEGATIVE_INFINITY,
    };
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

  function actualizarZombie(zombie, now, delta, estadoCiclo) {
    const haySol =
      estadoCiclo.fase === "dia" || estadoCiclo.fase === "amanecer";
    const expuestoAlCielo =
      terreno.estaExpuestoAlCielo?.(zombie.x, zombie.z, zombie.y + 2.9) ?? true;
    if (haySol && expuestoAlCielo) {
      if (!zombie.quemando) {
        zombie.quemando = true;
        zombie.inicioQuemadura = now;
        zombie.ultimaParticula = now - 1_000 / ajustes.particulasPorSegundo;
      }
      emitirParticulaSiCorresponde(zombie, now);
      if (now - zombie.inicioQuemadura >= ajustes.duracionQuemaduraMs) {
        return false;
      }
    } else {
      zombie.quemando = false;
      zombie.inicioQuemadura = Number.NEGATIVE_INFINITY;
    }

    const haciaX = camera.position.x - zombie.x;
    const haciaZ = camera.position.z - zombie.z;
    const distancia = Math.hypot(haciaX, haciaZ);
    const piesJugador = camera.position.y - configuracion.jugador.alturaOjos;
    const distanciaVertical = Math.abs(piesJugador - zombie.y);
    const detectado =
      hostiles &&
      !salud.estaMuerto() &&
      distancia <= ajustes.rangoVision &&
      distanciaVertical <= 3;

    if (detectado) zombie.vistoHasta = now + ajustes.memoriaPersecucionMs;
    const persiguiendo =
      hostiles && !salud.estaMuerto() && now <= zombie.vistoHasta;
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
      hostiles &&
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
      hostiles &&
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
    return true;
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

  function emitirParticulaSiCorresponde(zombie, now) {
    const intervalo = 1_000 / ajustes.particulasPorSegundo;
    if (
      now - zombie.ultimaParticula < intervalo ||
      particulas.length >= maximoParticulas
    ) {
      return;
    }
    zombie.ultimaParticula = now;
    const semilla = zombie.semilla + Math.floor(now / intervalo);
    particulas.push({
      x: zombie.x + (hash(semilla, 31) - 0.5) * 0.72,
      y: zombie.y + 0.45 + hash(semilla, 37) * 1.7,
      z: zombie.z + (hash(semilla, 41) - 0.5) * 0.72,
      vx: (hash(semilla, 43) - 0.5) * 0.28,
      vy: 0.72 + hash(semilla, 47) * 0.55,
      vz: (hash(semilla, 53) - 0.5) * 0.28,
      vida: 1,
      tono: hash(semilla, 59),
    });
  }

  function actualizarParticulas(delta) {
    let cantidad = 0;
    for (let indice = particulas.length - 1; indice >= 0; indice -= 1) {
      const particula = particulas[indice];
      particula.vida -= delta * 1.35;
      if (particula.vida <= 0) {
        particulas.splice(indice, 1);
        continue;
      }
      particula.x += particula.vx * delta;
      particula.y += particula.vy * delta;
      particula.z += particula.vz * delta;
      particula.vy += delta * 0.22;
    }

    for (const particula of particulas) {
      if (cantidad >= maximoParticulas) break;
      const base = cantidad * 3;
      posicionesParticulas[base] = particula.x;
      posicionesParticulas[base + 1] = particula.y;
      posicionesParticulas[base + 2] = particula.z;
      const amarillo = particula.tono > 0.55;
      coloresParticulas[base] = 1;
      coloresParticulas[base + 1] = amarillo ? 0.72 : 0.25;
      coloresParticulas[base + 2] = amarillo ? 0.16 : 0.04;
      cantidad += 1;
    }
    geometriaParticulas.setDrawRange(0, cantidad);
    geometriaParticulas.attributes.position.needsUpdate = true;
    geometriaParticulas.attributes.color.needsUpdate = true;
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
    intensidadFuegoActual = zombie.quemando
      ? 0.34 + Math.sin(now * 0.018 + zombie.semilla) * 0.16
      : 0;
    posicion.set(
      zombie.x + Math.sin(zombie.giro) * ataque * 0.32,
      zombie.y + rebote,
      zombie.z + Math.cos(zombie.giro) * ataque * 0.32,
    );
    eulerRaiz.set(ataque * -0.13, zombie.giro, 0, "YXZ");
    cuaternionRaiz.setFromEuler(eulerRaiz);
    matrizRaiz.compose(posicion, cuaternionRaiz, escalaRaiz);

    agregarCaja(0, 1.36, 0, 0.78, 1.02, 0.46, 0x517d9c);
    agregarCaja(0, 2.23 - ataque * 0.04, 0.05, 0.72, 0.68, 0.68, 0x83ca72);
    agregarCaja(0, 2.02 - ataque * 0.12, 0.43 + ataque * 0.08, 0.48, 0.17, 0.16, 0x4e7f45);
    agregarCaja(0.25, 1.42, -0.25, 0.18, 0.84, 0.13, 0x79513a);

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
      agregarSegmento(hombro, codo, 0.26, 0x75b866);
      agregarSegmento(codo, mano, 0.23, 0x8fd17a);

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
      agregarSegmento(cadera, rodilla, 0.31, lado < 0 ? 0x354c63 : 0x3d5268);
      agregarSegmento(rodilla, pie, 0.29, lado < 0 ? 0x29394a : 0x314459);
      agregarCaja(lado * 0.47, 1.75, 0, 0.23, 0.24, 0.5, lado < 0 ? 0x6c4436 : 0x5f8764);
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
    color.setHex(colorHex).lerp(colorFuego, intensidadFuegoActual);
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
    color.setHex(colorHex).lerp(colorFuego, intensidadFuegoActual);
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
      const podredumbre = hash(Math.floor(x / 3) + 71, Math.floor(y / 3) + 89);
      let pixel = ruido > 0.54 ? [117, 178, 101] : [82, 145, 79];
      if (podredumbre < 0.2) pixel = [47, 94, 57];
      if (grieta === 0 || (grieta === 1 && ruido > 0.68)) pixel = [53, 82, 48];
      if ((x + y * 2) % 19 === 0) pixel = [158, 195, 104];
      const indice = (y * tamano + x) * 4;
      datos[indice] = pixel[0];
      datos[indice + 1] = pixel[1];
      datos[indice + 2] = pixel[2];
      datos[indice + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = "piel-verde-original-zombi-errante";
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
