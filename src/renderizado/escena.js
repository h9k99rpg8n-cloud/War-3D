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

  const sol = crearSolVoxel(THREE);
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

function crearSolVoxel(THREE) {
  const posiciones = [];
  for (let y = -3; y <= 3; y += 1) {
    for (let x = -3; x <= 3; x += 1) {
      if (Math.hypot(x, y) <= 3.45) posiciones.push([x * 0.92, y * 0.92, 0]);
    }
  }

  const geometria = new THREE.BoxGeometry(0.98, 0.98, 0.76);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffe6a2,
    fog: false,
    vertexColors: true,
  });
  const malla = new THREE.InstancedMesh(geometria, material, posiciones.length);
  const matriz = new THREE.Matrix4();
  const color = new THREE.Color();
  posiciones.forEach(([x, y, z], indice) => {
    matriz.makeTranslation(x, y, z);
    malla.setMatrixAt(indice, matriz);
    color.setHex((indice + Math.round(x + y)) % 4 === 0 ? 0xffd66f : 0xffffff);
    malla.setColorAt(indice, color);
  });
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  malla.frustumCulled = false;

  const grupo = new THREE.Group();
  grupo.userData.materialSolar = material;
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
