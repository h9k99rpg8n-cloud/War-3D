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
  const tamano = 16;
  const datos = new Uint8Array(tamano * tamano * 4);
  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const borde = x < 2 || x > 13 || y < 2 || y > 13;
      const brillo = (x * 7 + y * 11 + Math.floor(x / 4) * 3) % 13;
      const color = borde
        ? [255, 187, 62]
        : brillo < 3
          ? [255, 239, 152]
          : brillo > 10
            ? [255, 203, 73]
            : [255, 222, 105];
      const indice = (y * tamano + x) * 4;
      datos[indice] = color[0];
      datos[indice + 1] = color[1];
      datos[indice + 2] = color[2];
      datos[indice + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name = "sol-cuadrado-pixelado";
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.generateMipmaps = false;
  textura.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    map: textura,
  });
  const malla = new THREE.Mesh(new THREE.BoxGeometry(6.6, 6.6, 0.42), material);
  malla.name = "Sol cuadrado pixelado";
  malla.frustumCulled = false;

  const grupo = new THREE.Group();
  grupo.userData.materialSolar = material;
  grupo.userData.estilo = "pixel-cuadrado";
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
