export function crearSistemaRenderizado(THREE, canvas, configuracion) {
  const { camara, iluminacion, renderizado } = configuracion;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (error) {
    throw new Error("WebGL no está disponible en este navegador.", { cause: error });
  }

  renderer.setPixelRatio(obtenerProporcionPixeles(renderizado));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = renderizado.exposicion;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(renderizado.colorCielo);
  scene.fog = new THREE.Fog(
    renderizado.colorCielo,
    renderizado.nieblaCercana,
    renderizado.nieblaLejana,
  );

  const camera = new THREE.PerspectiveCamera(
    camara.campoVision,
    window.innerWidth / window.innerHeight,
    camara.planoCercano,
    camara.planoLejano,
  );
  camera.rotation.order = "YXZ";

  // La luz ambiental garantiza que ningún bloque vuelva a quedar negro.
  const luzAmbiente = new THREE.AmbientLight(0xffffff, iluminacion.ambiente);
  scene.add(luzAmbiente);

  // El hemisferio conserva un cielo claro y tonos cálidos en las caras laterales.
  const luzHemisferio = new THREE.HemisphereLight(
    0xffffff,
    0x7da36c,
    iluminacion.hemisferio,
  );
  scene.add(luzHemisferio);

  // La luz direccional mantiene el volumen y el relieve de los cubos.
  const luzSolar = new THREE.DirectionalLight(0xffffff, iluminacion.sol);
  luzSolar.position.set(-22, 30, 16);
  scene.add(luzSolar);
  scene.add(luzSolar.target);

  const sol = crearSolPixelado(THREE);
  sol.position.set(-31, 33, -55);
  scene.add(sol);

  return {
    renderer,
    scene,
    camera,
    luces: {
      ambiente: luzAmbiente,
      hemisferio: luzHemisferio,
      solar: luzSolar,
    },
    sol,
  };
}

export function crearSolPixelado(THREE) {
  const posiciones = [];
  for (let y = -4; y <= 4; y += 1) {
    for (let x = -4; x <= 4; x += 1) {
      const distancia = Math.hypot(x, y);
      if (distancia > 4.45) continue;
      posiciones.push({ x, y, distancia });
    }
  }
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    vertexColors: true,
  });
  const geometria = new THREE.BoxGeometry(0.82, 0.82, 0.74);
  const malla = new THREE.InstancedMesh(geometria, material, posiciones.length);
  const matriz = new THREE.Matrix4();
  const color = new THREE.Color();
  posiciones.forEach(({ x, y, distancia }, indice) => {
    const profundidad = distancia > 3.6 ? -0.12 : distancia < 1.7 ? 0.13 : 0;
    matriz.makeTranslation(x * 0.77, y * 0.77, profundidad);
    malla.setMatrixAt(indice, matriz);
    const patron = Math.abs(x * 5 + y * 7) % 6;
    color.setHex(
      distancia > 3.6
        ? 0xffb83f
        : patron === 0
          ? 0xfff0a1
          : patron >= 4
            ? 0xffca49
            : 0xffdd69,
    );
    malla.setColorAt(indice, color);
  });
  malla.instanceMatrix.needsUpdate = true;
  malla.instanceColor.needsUpdate = true;
  malla.name = "Sol voxel pixelado";
  malla.frustumCulled = false;

  const grupo = new THREE.Group();
  grupo.userData.materialSolar = material;
  grupo.userData.estilo = "voxel-pixelado";
  grupo.add(malla);
  return grupo;
}

export function ajustarRenderizado(renderer, camera, configuracion) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(obtenerProporcionPixeles(configuracion.renderizado));
  renderer.setSize(width, height, false);
}

function obtenerProporcionPixeles(renderizado) {
  const esDispositivoTactil = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const limite = esDispositivoTactil
    ? renderizado.proporcionPixelesMovil
    : renderizado.proporcionPixelesMaxima;
  return Math.min(window.devicePixelRatio || 1, limite);
}
