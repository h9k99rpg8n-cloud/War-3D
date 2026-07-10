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

  const sol = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe6a2, fog: false }),
  );
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
