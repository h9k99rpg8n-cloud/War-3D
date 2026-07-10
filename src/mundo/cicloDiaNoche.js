const ORDEN_FASES = Object.freeze(["dia", "atardecer", "noche", "amanecer"]);

export function crearCicloDiaNoche(
  THREE,
  scene,
  camera,
  sistemaRenderizado,
  configuracion,
) {
  const duraciones = configuracion.cicloDiaNoche.duraciones;
  const duracionTotal = ORDEN_FASES.reduce((total, fase) => total + duraciones[fase], 0);
  const luna = crearLunaVoxel(THREE);
  const luzLunar = new THREE.DirectionalLight(0x9ebcff, 0);
  const colorCielo = new THREE.Color();
  const colorSolarDia = new THREE.Color(0xffe6a2);
  const colorSolarOcaso = new THREE.Color(0xffa14f);
  const estado = {
    fase: "dia",
    progresoFase: 0,
    esNoche: false,
    numeroNoche: 0,
  };
  let tiempoCiclo = 0;
  let faseAnterior = "dia";

  scene.add(luna);
  scene.add(luzLunar);
  scene.add(luzLunar.target);
  aplicarEstadoVisual("dia", 0);

  return {
    actualizar(deltaSegundos) {
      tiempoCiclo = (tiempoCiclo + Math.max(0, deltaSegundos) * 1000) % duracionTotal;
      const fase = obtenerFase(tiempoCiclo, duraciones);
      estado.fase = fase.nombre;
      estado.progresoFase = fase.progreso;
      estado.esNoche = fase.nombre === "noche";
      if (fase.nombre === "noche" && faseAnterior !== "noche") estado.numeroNoche += 1;
      faseAnterior = fase.nombre;
      aplicarEstadoVisual(fase.nombre, fase.progreso);
      return estado;
    },

    obtenerEstado() {
      return estado;
    },
  };

  function aplicarEstadoVisual(fase, progreso) {
    const { luces, sol } = sistemaRenderizado;
    let ambiente;
    let hemisferio;
    let intensidadSol;
    let intensidadLuna;

    if (fase === "dia") {
      mezclarColor(0x87b9d9, 0x76afd4, progreso, colorCielo);
      ambiente = interpolar(1.72, 1.82, progreso);
      hemisferio = interpolar(1.42, 1.55, progreso);
      intensidadSol = interpolar(1.55, 1.85, Math.sin(progreso * Math.PI));
      intensidadLuna = 0;
      sol.material.color.copy(colorSolarDia);
    } else if (fase === "atardecer") {
      if (progreso < 0.55) {
        mezclarColor(0x76afd4, 0xe18a58, progreso / 0.55, colorCielo);
      } else {
        mezclarColor(0xe18a58, 0x101a35, (progreso - 0.55) / 0.45, colorCielo);
      }
      ambiente = interpolar(1.72, 0.46, progreso);
      hemisferio = interpolar(1.45, 0.3, progreso);
      intensidadSol = interpolar(1.55, 0, progreso);
      intensidadLuna = interpolar(0, 0.48, progreso);
      sol.material.color.copy(colorSolarDia).lerp(colorSolarOcaso, progreso);
    } else if (fase === "noche") {
      mezclarColor(0x101a35, 0x071426, Math.sin(progreso * Math.PI), colorCielo);
      ambiente = 0.46;
      hemisferio = 0.3;
      intensidadSol = 0;
      intensidadLuna = 0.56;
      sol.material.color.copy(colorSolarOcaso);
    } else {
      if (progreso < 0.48) {
        mezclarColor(0x071426, 0xd79472, progreso / 0.48, colorCielo);
      } else {
        mezclarColor(0xd79472, 0x87b9d9, (progreso - 0.48) / 0.52, colorCielo);
      }
      ambiente = interpolar(0.46, 1.72, progreso);
      hemisferio = interpolar(0.3, 1.42, progreso);
      intensidadSol = interpolar(0, 1.55, progreso);
      intensidadLuna = interpolar(0.5, 0, progreso);
      sol.material.color.copy(colorSolarOcaso).lerp(colorSolarDia, progreso);
    }

    scene.background.copy(colorCielo);
    scene.fog.color.copy(colorCielo);
    luces.ambiente.intensity = ambiente;
    luces.hemisferio.intensity = hemisferio;
    luces.solar.intensity = intensidadSol;
    luzLunar.intensity = intensidadLuna;
    posicionarAstros(fase, progreso, sol);
  }

  function posicionarAstros(fase, progreso, sol) {
    const angulo = anguloSolar(fase, progreso);
    const anguloLuna = angulo + Math.PI;
    const distanciaX = 54;
    const distanciaY = 42;
    const distanciaZ = 63;

    sol.position.set(
      camera.position.x + Math.cos(angulo) * distanciaX,
      camera.position.y + Math.sin(angulo) * distanciaY,
      camera.position.z - distanciaZ,
    );
    luna.position.set(
      camera.position.x + Math.cos(anguloLuna) * distanciaX,
      camera.position.y + Math.sin(anguloLuna) * distanciaY,
      camera.position.z - distanciaZ,
    );
    sol.visible = Math.sin(angulo) > -0.13;
    luna.visible = Math.sin(anguloLuna) > -0.13;
    luna.lookAt(camera.position);

    sistemaRenderizado.luces.solar.position.copy(sol.position);
    sistemaRenderizado.luces.solar.target.position.copy(camera.position);
    luzLunar.position.copy(luna.position);
    luzLunar.target.position.copy(camera.position);
    sistemaRenderizado.luces.solar.target.updateMatrixWorld();
    luzLunar.target.updateMatrixWorld();
  }
}

function obtenerFase(tiempo, duraciones) {
  let acumulado = 0;
  for (const nombre of ORDEN_FASES) {
    const fin = acumulado + duraciones[nombre];
    if (tiempo < fin) {
      return { nombre, progreso: (tiempo - acumulado) / duraciones[nombre] };
    }
    acumulado = fin;
  }
  return { nombre: "dia", progreso: 0 };
}

function anguloSolar(fase, progreso) {
  const rangos = {
    dia: [0.2, 0.8],
    atardecer: [0.8, 1],
    noche: [1, 1.8],
    amanecer: [1.8, 2.2],
  };
  const [inicio, fin] = rangos[fase];
  return interpolar(inicio, fin, progreso) * Math.PI;
}

function crearLunaVoxel(THREE) {
  const posiciones = [];
  for (let y = -3; y <= 3; y += 1) {
    for (let x = -3; x <= 3; x += 1) {
      const exterior = Math.hypot(x, y) <= 3.45;
      const hueco = Math.hypot(x - 1.45, y + 0.15) < 2.6;
      if (exterior && !hueco) posiciones.push([x * 0.92, y * 0.92, 0]);
    }
  }

  const geometria = new THREE.BoxGeometry(0.96, 0.96, 0.72);
  const material = new THREE.MeshBasicMaterial({ color: 0xdce8ff, fog: false });
  const malla = new THREE.InstancedMesh(geometria, material, posiciones.length);
  const matriz = new THREE.Matrix4();
  posiciones.forEach(([x, y, z], indice) => {
    matriz.makeTranslation(x, y, z);
    malla.setMatrixAt(indice, matriz);
  });
  malla.instanceMatrix.needsUpdate = true;
  malla.frustumCulled = false;

  const grupo = new THREE.Group();
  grupo.add(malla);
  return grupo;
}

function mezclarColor(hexA, hexB, progreso, resultado) {
  colorTemporal(resultado, hexA, hexB, progreso);
}

function colorTemporal(resultado, hexA, hexB, progreso) {
  // setHex y lerp evitan crear colores nuevos en cada cuadro.
  const rA = (hexA >> 16) & 255;
  const gA = (hexA >> 8) & 255;
  const bA = hexA & 255;
  const rB = (hexB >> 16) & 255;
  const gB = (hexB >> 8) & 255;
  const bB = hexB & 255;
  resultado.setRGB(
    interpolar(rA, rB, progreso) / 255,
    interpolar(gA, gB, progreso) / 255,
    interpolar(bA, bB, progreso) / 255,
    THREE_COLOR_SPACE_SRGB,
  );
}

// Three.js acepta el espacio de color como cadena; evita importar constantes fuera del módulo.
const THREE_COLOR_SPACE_SRGB = "srgb";

function interpolar(inicio, fin, progreso) {
  return inicio + (fin - inicio) * Math.max(0, Math.min(1, progreso));
}
