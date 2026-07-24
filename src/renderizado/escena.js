import { resolverRecursoVisual } from "./registroVisuales.js";

export function crearSistemaRenderizado(
  THREE,
  canvas,
  configuracion,
  opciones = {},
) {
  const { camara, iluminacion, renderizado } = configuracion;
  let renderer;
  const perfilReducido = esPerfilReducido();
  let escalaResolucion = 1;
  let limitePixeles = renderizado.proporcionPixelesMovil;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !perfilReducido,
      alpha: false,
      depth: true,
      stencil: false,
      precision: perfilReducido ? "mediump" : "highp",
      powerPreference: perfilReducido ? "default" : "high-performance",
    });
  } catch (error) {
    if (!perfilReducido) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          depth: true,
          stencil: false,
          precision: "mediump",
          powerPreference: "default",
        });
      } catch (errorRespaldo) {
        throw new Error("WebGL no está disponible en este navegador.", {
          cause: errorRespaldo,
        });
      }
    } else {
      throw new Error("WebGL no está disponible en este navegador.", { cause: error });
    }
  }

  renderer.setPixelRatio(obtenerProporcionPixeles(renderizado, limitePixeles));
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
  // La cámara forma parte del grafo para que el brazo y los objetos en primera
  // persona, que son hijos suyos, también se recorran durante el render.
  scene.add(camera);

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

  const sol = crearSol(THREE, opciones.estiloVisual);
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
    aplicarAjustesRendimiento(ajustes = {}) {
      if (Number.isFinite(Number(ajustes.pixelRatio))) {
        limitePixeles = Math.max(0.65, Math.min(1.8, Number(ajustes.pixelRatio)));
      }
      renderer.shadowMap.enabled = ajustes.sombras === true;
      renderer.setPixelRatio(
        obtenerProporcionPixeles(
          renderizado,
          limitePixeles * escalaResolucion,
        ),
      );
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    },
    establecerEscalaResolucion(valor) {
      escalaResolucion = Math.max(0.65, Math.min(1, Number(valor) || 1));
      renderer.setPixelRatio(
        obtenerProporcionPixeles(
          renderizado,
          limitePixeles * escalaResolucion,
        ),
      );
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      return escalaResolucion;
    },
    obtenerEstadoResolucion() {
      return Object.freeze({
        escala: escalaResolucion,
        pixelRatio: renderer.getPixelRatio(),
        ancho: renderer.domElement.width,
        alto: renderer.domElement.height,
      });
    },
  };
}

export function crearSol(THREE, estiloVisual = "traditional") {
  const pixelar = estiloVisual === "pixelar";
  const textura = crearTexturaSol(THREE, pixelar);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    map: textura,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), material);
  malla.name = pixelar ? "Sol Pixelar" : "Sol tradicional";
  malla.renderOrder = 1;
  const grupo = new THREE.Group();
  grupo.userData.materialSolar = material;
  grupo.userData.texturaSolar = textura;
  grupo.userData.estilo = pixelar ? "pixelar" : "traditional";
  grupo.userData.dispose = () => {
    textura.dispose();
    material.dispose();
    malla.geometry.dispose();
  };
  grupo.add(malla);
  return grupo;
}

// Alias conservado para módulos y pruebas de Snapshot 1.
export function crearSolPixelado(THREE) {
  return crearSol(THREE, "pixelar");
}

export function ajustarRenderizado(renderer, camera, configuracion) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const limiteActual = Math.min(
    renderer.getPixelRatio(),
    configuracion.renderizado.proporcionPixelesMaxima,
  );
  renderer.setPixelRatio(
    obtenerProporcionPixeles(configuracion.renderizado, limiteActual),
  );
  renderer.setSize(width, height, false);
}

function obtenerProporcionPixeles(renderizado, limiteSolicitado = null) {
  const esDispositivoTactil = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const limiteBase = esDispositivoTactil
    ? renderizado.proporcionPixelesMovil
    : renderizado.proporcionPixelesMaxima;
  const limite = Number.isFinite(Number(limiteSolicitado))
    ? Math.min(limiteBase, Number(limiteSolicitado))
    : limiteBase;
  const limiteAjustado = esPerfilReducido() ? Math.min(limite, 1.25) : limite;
  return Math.min(window.devicePixelRatio || 1, limiteAjustado);
}

function crearTexturaSol(THREE, pixelar) {
  const tamano = pixelar ? 16 : 32;
  const datos = new Uint8Array(tamano * tamano * 4);
  const centro = (tamano - 1) / 2;
  const radio = pixelar ? 6.4 : 12.5;
  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const indice = (y * tamano + x) * 4;
      const dx = x - centro;
      const dy = y - centro;
      const distancia = Math.hypot(dx, dy);
      const dentro = pixelar
        ? Math.abs(dx) <= radio && Math.abs(dy) <= radio &&
          !(Math.abs(dx) > radio - 1 && Math.abs(dy) > radio - 1)
        : distancia <= radio;
      if (!dentro) {
        datos[indice + 3] = 0;
        continue;
      }
      const patron = (x * 7 + y * 11) % 13;
      datos[indice] = patron === 0 ? 255 : 255;
      datos[indice + 1] = patron < 3 ? 196 : pixelar ? 218 : 210;
      datos[indice + 2] = patron < 3 ? 54 : pixelar ? 78 : 92;
      datos[indice + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, tamano, tamano, THREE.RGBAFormat);
  textura.name =
    resolverRecursoVisual("war:sun", pixelar ? "pixelar" : "traditional") ??
    (pixelar ? "war:sun_pixelar" : "war:sun_traditional");
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = pixelar ? THREE.NearestFilter : THREE.LinearFilter;
  textura.minFilter = pixelar ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  textura.generateMipmaps = !pixelar;
  textura.needsUpdate = true;
  return textura;
}

function esPerfilReducido() {
  const tactil = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const nucleos = Number(globalThis.navigator?.hardwareConcurrency);
  return tactil && Number.isFinite(nucleos) && nucleos > 0 && nucleos <= 4;
}
