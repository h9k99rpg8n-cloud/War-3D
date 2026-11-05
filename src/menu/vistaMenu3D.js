/**
 * Vista previa 3D del menú principal (familia `war:gui_menu_scrotch`).
 *
 * Reutiliza los contratos de la Buildy 01: la vista es un Preview 3D con
 * resolución Pixel y cámara propia a 60 fps. Se dibuja con Three.js sobre un
 * canvas pequeño, con cámara orbitando despacio, nubes a la deriva y el
 * paisaje generado por `terrenoMenu.js`.
 *
 * Importante: si WebGL no está disponible, la portada conserva el fondo CSS y
 * no se rompe nada. El menú nunca depende de esta vista para funcionar.
 */
import { URL_THREE } from "../configuracion.js";
import { crearTerrenoMenu, vestirTerreno } from "./terrenoMenu.js";

const COLORES = Object.freeze({
  pasto: 0x5ea34a,
  pastoOscuro: 0x417a37,
  piedra: 0x8d8f94,
  nieve: 0xf2f4f7,
  arena: 0xd8c58a,
  agua: 0x3f9bd6,
  tronco: 0x6b4526,
  hojas: 0x2f7a37,
  nube: 0xffffff,
});

export async function crearVistaMenu3D(canvas, opciones = {}) {
  if (!canvas) return null;
  const {
    semilla = "WAR",
    columnas = 44,
    filas = 44,
    tamanoCelda = 1,
    distancia = 34,
    alturaCamara = 9,
    velocidadGiro = 0.035,
    reducido = false,
  } = opciones;

  let THREE;
  try {
    THREE = await import(URL_THREE);
  } catch (error) {
    console.warn("[Menú] Three.js no cargó; se usa el fondo CSS.", error);
    return null;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !reducido,
      alpha: true,
      powerPreference: "low-power",
      premultipliedAlpha: false,
    });
  } catch (error) {
    console.warn("[Menú] WebGL no disponible; se usa el fondo CSS.", error);
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reducido ? 1 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x86c3e4, 40, 96);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.6, 180);
  const centro = ((columnas - 1) * tamanoCelda) / 2;
  const altura = ((filas - 1) * tamanoCelda) / 2;

  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x4c7a45, 2.1));
  const sol = new THREE.DirectionalLight(0xfff3d0, 1.5);
  sol.position.set(-24, 34, 18);
  scene.add(sol);

  const terreno = crearTerrenoMenu({ semilla, columnas, filas });
  const vestido = vestirTerreno(terreno, { arboles: 8 });
  const grupo = new THREE.Group();
  grupo.position.set(-centro * tamanoCelda, 0, -altura * tamanoCelda);
  scene.add(grupo);

  const geometria = new THREE.BoxGeometry(tamanoCelda, tamanoCelda, tamanoCelda);
  const materiales = new Map();
  const obtenerMaterial = (color) => {
    if (materiales.has(color)) return materiales.get(color);
    const material = new THREE.MeshLambertMaterial({ color });
    materiales.set(color, material);
    return material;
  };

  const porTipo = new Map();
  for (const celda of vestido.celdas) {
    const lista = porTipo.get(celda.tipo) ?? [];
    lista.push(celda);
    porTipo.set(celda.tipo, lista);
  }

  for (const [tipo, celdas] of porTipo) {
    const color = COLORES[tipo] ?? COLORES.pasto;
    const malla = new THREE.InstancedMesh(
      geometria,
      obtenerMaterial(color),
      celdas.length,
    );
    const matriz = new THREE.Matrix4();
    celdas.forEach((celda, indice) => {
      matriz.setPosition(
        celda.x * tamanoCelda,
        celda.y * tamanoCelda,
        celda.z * tamanoCelda,
      );
      malla.setMatrixAt(indice, matriz);
    });
    malla.instanceMatrix.needsUpdate = true;
    grupo.add(malla);
  }

  // Troncos y copas de los árboles, también instanciados.
  const troncos = new THREE.InstancedMesh(
    geometria,
    obtenerMaterial(COLORES.tronco),
    vestido.arboles.length,
  );
  const copa = new THREE.InstancedMesh(
    geometria,
    obtenerMaterial(COLORES.hojas),
    vestido.arboles.length * 2,
  );
  const matriz = new THREE.Matrix4();
  const escala = new THREE.Vector3();
  const cuaternion = new THREE.Quaternion();
  const posicion = new THREE.Vector3();
  vestido.arboles.forEach((arbol, indice) => {
    const x = arbol.x * tamanoCelda;
    const z = arbol.z * tamanoCelda;
    const base = (arbol.y + 1) * tamanoCelda;
    escala.set(tamanoCelda * 0.34, tamanoCelda * 1.7, tamanoCelda * 0.34);
    posicion.set(x, base + tamanoCelda * 0.6, z);
    matriz.compose(posicion, cuaternion, escala);
    troncos.setMatrixAt(indice, matriz);

    escala.set(tamanoCelda * 1.5, tamanoCelda * 1.1, tamanoCelda * 1.5);
    posicion.set(x, base + tamanoCelda * 1.9, z);
    matriz.compose(posicion, cuaternion, escala);
    copa.setMatrixAt(indice * 2, matriz);

    escala.set(tamanoCelda * 1.05, tamanoCelda * 0.9, tamanoCelda * 1.05);
    posicion.set(x, base + tamanoCelda * 2.7, z);
    matriz.compose(posicion, cuaternion, escala);
    copa.setMatrixAt(indice * 2 + 1, matriz);
  });
  grupo.add(troncos, copa);

  // Agua: una sola lámina semitransparente donde el terreno baja.
  if (Number.isFinite(vestido.nivelAgua) && vestido.nivelAgua > -Infinity) {
    const agua = new THREE.Mesh(
      new THREE.PlaneGeometry(columnas * tamanoCelda, filas * tamanoCelda),
      new THREE.MeshLambertMaterial({
        color: COLORES.agua,
        transparent: true,
        opacity: 0.78,
      }),
    );
    agua.rotation.x = -Math.PI / 2;
    agua.position.set(
      (centro + 0.5) * tamanoCelda,
      (vestido.nivelAgua + 0.35) * tamanoCelda,
      (altura + 0.5) * tamanoCelda,
    );
    grupo.add(agua);
  }

  // Nubes bajas para dar profundidad y parallax real.
  const nubes = new THREE.Group();
  const materialNube = new THREE.MeshLambertMaterial({
    color: COLORES.nube,
    transparent: true,
    opacity: 0.82,
  });
  for (let indice = 0; indice < 7; indice += 1) {
    const nube = new THREE.Mesh(
      new THREE.BoxGeometry(6 + indice * 1.2, 1.1, 3.4),
      materialNube,
    );
    nube.position.set(
      -22 + indice * 8.5,
      13 + (indice % 3) * 2.4,
      -14 + (indice % 4) * 7,
    );
    nubes.add(nube);
  }
  scene.add(nubes);

  let angulo = 0.6;
  let visible = true;
  let corriendo = false;
  let frame = 0;
  let ultimo = performance.now();
  let fps = 0;
  let acumulado = 0;
  let cuadros = 0;

  const ajustar = () => {
    const ancho = canvas.clientWidth || canvas.width || 1;
    const alto = canvas.clientHeight || canvas.height || 1;
    renderer.setSize(ancho, alto, false);
    camera.aspect = ancho / Math.max(1, alto);
    camera.updateProjectionMatrix();
  };

  const dibujar = (now) => {
    const delta = Math.min(0.05, (now - ultimo) / 1000);
    ultimo = now;
    angulo += delta * (reducido ? 0 : velocidadGiro * Math.PI);
    const radio = distancia;
    camera.position.set(
      centro * tamanoCelda + Math.cos(angulo) * radio,
      alturaCamara * tamanoCelda + 6,
      altura * tamanoCelda + Math.sin(angulo) * radio,
    );
    camera.lookAt(
      centro * tamanoCelda,
      3 * tamanoCelda,
      altura * tamanoCelda,
    );
    if (!reducido) {
      nubes.children.forEach((nube, indice) => {
        nube.position.x += delta * (0.55 + indice * 0.06);
        if (nube.position.x > 34) nube.position.x = -30;
      });
    }
    renderer.render(scene, camera);
    cuadros += 1;
    acumulado += delta;
    if (acumulado >= 0.5) {
      fps = Math.round(cuadros / acumulado);
      cuadros = 0;
      acumulado = 0;
    }
  };

  const bucle = (now) => {
    if (!corriendo) return;
    dibujar(now);
    frame = requestAnimationFrame(bucle);
  };

  const arrancar = () => {
    if (corriendo || !visible) return;
    corriendo = true;
    ultimo = performance.now();
    frame = requestAnimationFrame(bucle);
  };

  const pausar = () => {
    corriendo = false;
    cancelAnimationFrame(frame);
  };

  const alCambiarVisibilidad = () => {
    const visibleAhora = !document.hidden;
    if (visibleAhora && visible) arrancar();
    else pausar();
  };

  ajustar();
  dibujar(performance.now());
  arrancar();
  window.addEventListener("resize", ajustar);
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  return {
    /** Mostrar u ocultar sin destruir la escena (por ejemplo al entrar al juego). */
    mostrar(valor = true) {
      visible = Boolean(valor);
      if (visible) arrancar();
      else pausar();
    },
    pausar,
    arrancar,
    ajustar,
    redimensionar: ajustar,
    destruir() {
      pausar();
      window.removeEventListener("resize", ajustar);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      geometria.dispose();
      for (const material of materiales.values()) material.dispose();
      materialNube.dispose();
      renderer.dispose();
    },
    metricas() {
      return {
        fps,
        columnas,
        filas,
        semilla: terreno.semilla,
        arboles: vestido.arboles.length,
        celdas: vestido.celdas.length,
        activo: corriendo,
      };
    },
    terreno,
  };
}
