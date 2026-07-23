import { obtenerDefinicionContenido } from "../contenido/registroContenido.js";

export function crearBrazoPrimeraPersona(
  THREE,
  camera,
  terreno,
  inventario,
  opcionesMundo = {},
) {
  const grupo = new THREE.Group();
  grupo.name = "war-player-first-person-arm";
  grupo.position.set(0.72, -0.72, -1.22);
  grupo.rotation.set(-0.16, -0.16, -0.06);
  camera.add(grupo);

  const pixelar = opcionesMundo.estiloVisual === "pixelar";
  const materialBrazo = new THREE.MeshBasicMaterial({
    color: pixelar ? 0xc47a50 : 0xd6956e,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const materialManga = new THREE.MeshBasicMaterial({
    color: pixelar ? 0x2d6d83 : 0x337e96,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const manga = crearParte(0, 0.06, 0, 0.28, 0.48, 0.3, materialManga);
  const mano = crearParte(0, -0.29, -0.02, 0.25, 0.32, 0.27, materialBrazo);
  grupo.add(manga, mano);

  let objetoSostenido = null;
  let inicioAccion = Number.NEGATIVE_INFINITY;
  let intensidadAccion = 0;
  let visible = true;
  let tipoActual = null;

  inventario.suscribir((tipo) => actualizarObjeto(tipo));

  return {
    accion(tipoAccion) {
      inicioAccion = performance.now();
      intensidadAccion =
        tipoAccion === "romper" || tipoAccion === "atacar" ? 1 : 0.72;
    },

    actualizar(now, delta, movimiento, bloqueado = false) {
      visible = !bloqueado;
      grupo.visible = visible;
      if (!visible) return;
      const velocidad = Math.min(
        1,
        Math.hypot(movimiento?.lateral ?? 0, movimiento?.adelante ?? 0),
      );
      const bob = Math.sin(now * 0.009) * 0.025 * velocidad;
      const paso = Math.cos(now * 0.009) * 0.035 * velocidad;
      const progreso = Math.min(1, Math.max(0, (now - inicioAccion) / 360));
      const golpe =
        progreso < 1 ? Math.sin(progreso * Math.PI) * intensidadAccion : 0;
      grupo.position.x = 0.72 + paso - golpe * 0.28;
      grupo.position.y = -0.72 + Math.abs(bob) - golpe * 0.22;
      grupo.position.z = -1.22 + golpe * 0.16;
      grupo.rotation.x = -0.16 - golpe * 0.82;
      grupo.rotation.y = -0.16 + golpe * 0.22;
      grupo.rotation.z = -0.06 - paso * 0.6 + golpe * 0.18;
      objetoSostenido?.rotation.set(
        -0.12 + golpe * 0.35,
        now * 0.00025,
        -0.18,
      );
      void delta;
    },

    obtenerTipoVisible() {
      return tipoActual;
    },
  };

  function actualizarObjeto(tipo) {
    tipoActual = tipo;
    if (objetoSostenido) {
      grupo.remove(objetoSostenido);
      objetoSostenido.geometry?.dispose?.();
      const materialesAnteriores = Array.isArray(objetoSostenido.material)
        ? objetoSostenido.material
        : [objetoSostenido.material];
      for (const materialAnterior of materialesAnteriores) {
        materialAnterior?.dispose?.();
      }
      objetoSostenido = null;
    }
    const definicion = obtenerDefinicionContenido(tipo);
    const sostenido = definicion?.sostenido;
    if (!definicion || sostenido?.visible === false) return;
    const materialBase = terreno.obtenerMaterialRecolectable(tipo);
    if (!materialBase) return;
    const material = Array.isArray(materialBase)
      ? materialBase.map((actual) => actual.clone())
      : materialBase.clone();
    const escala = sostenido?.escala ?? 0.8;
    const geometria =
      definicion.categoria === "bloque"
        ? new THREE.BoxGeometry(0.34 * escala, 0.34 * escala, 0.34 * escala)
        : new THREE.BoxGeometry(0.42 * escala, 0.08 * escala, 0.54 * escala);
    objetoSostenido = new THREE.Mesh(geometria, material);
    objetoSostenido.position.set(-0.05, -0.48, -0.24);
    objetoSostenido.renderOrder = 101;
    objetoSostenido.frustumCulled = false;
    const materiales = Array.isArray(material) ? material : [material];
    for (const materialActual of materiales) {
      materialActual.depthTest = false;
      materialActual.depthWrite = false;
    }
    grupo.add(objetoSostenido);
  }

  function crearParte(x, y, z, ancho, alto, fondo, material) {
    const malla = new THREE.Mesh(
      new THREE.BoxGeometry(ancho, alto, fondo),
      material,
    );
    malla.position.set(x, y, z);
    malla.renderOrder = 100;
    malla.frustumCulled = false;
    return malla;
  }
}
