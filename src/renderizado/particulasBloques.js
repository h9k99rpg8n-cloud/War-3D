/**
 * Partículas de bloques para War 3D.
 *
 * Al romper un bloque salen esquirlas del mismo material: no son cubos de
 * color plano, usan la textura real del bloque (pasto, piedra, cristal…) para
 * que el fragmento se reconozca a simple vista.
 *
 * Todo vive en un único `InstancedMesh` por color de material, así que cientos
 * de esquirlas cuestan un draw call cada lote y no crean basura durante la
 * partida.
 */

const MAXIMAS_POR_LOTE = 240;

export function crearEmisorParticulas(THREE, scene, terreno) {
  const lotes = new Map();
  const geometria = new THREE.BoxGeometry(1, 1, 1);
  const materialPorTipo = new Map();
  let totalVivas = 0;
  let maximoHistorico = 0;

  scene.add(crearGrupo(THREE));

  return {
    estallar,
    actualizar,
    metricas: () => ({
      vivas: totalVivas,
      maximoHistorico,
      lotes: lotes.size,
    }),
    dispose,
  };

  /* ---------------------------------------------------------------- */

  function crearGrupo() {
    const grupo = new THREE.Group();
    grupo.name = "particulas-bloques";
    return grupo;
  }

  function obtenerMaterial(tipo) {
    if (materialPorTipo.has(tipo)) return materialPorTipo.get(tipo);
    const biblioteca = terreno?.bibliotecaTexturas;
    const textura =
      biblioteca?.texturas?.[nombreTextura(tipo)] ??
      biblioteca?.texturas?.piedra ??
      null;
    const material = new THREE.MeshLambertMaterial({
      map: textura,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
    });
    materialPorTipo.set(tipo, material);
    return material;
  }

  function nombreTextura(tipo) {
    const mapa = {
      pasto: "pastoSuperior",
      hojas: "hojas",
      madera: "corteMadera",
      tablones: "tablones",
      arena: "arena",
      tierra: "tierraBloque",
      piedra: "piedra",
      piedra_lisa: "piedraLisa",
      carbon_mineral: "carbonMineral",
      hierro_mineral: "hierroMineral",
      cristal: "cristal",
      mesa_crafteo: "mesaCrafteoSuperior",
      horno: "horno",
    };
    return mapa[tipo] ?? "piedra";
  }

  function obtenerLote(tipo) {
    if (lotes.has(tipo)) return lotes.get(tipo);
    const malla = new THREE.InstancedMesh(
      geometria,
      obtenerMaterial(tipo),
      MAXIMAS_POR_LOTE,
    );
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.frustumCulled = false;
    malla.count = 0;
    // Las esquirlas son pequeñas; sin sombras ni orden de transparencia.
    malla.renderOrder = 2;
    const grupo = scene.getObjectByName("particulas-bloques");
    (grupo ?? scene).add(malla);
    const lote = { malla, particulas: [] };
    lotes.set(tipo, lote);
    return lote;
  }

  /**
   * @param {THREE.Vector3} posicion centro del bloque roto
   * @param {string} tipo bloque
   * @param {number} tamanoBloque lado del bloque en unidades del mundo
   */
  function estallar(posicion, tipo, tamanoBloque = 2) {
    if (!posicion) return;
    const lote = obtenerLote(tipo);
    const semillas = 9 + Math.floor(Math.random() * 5);
    const lado = tamanoBloque * (0.12 + Math.random() * 0.1);

    for (let indice = 0; indice < semillas; indice += 1) {
      if (lote.particulas.length >= MAXIMAS_POR_LOTE) lote.particulas.shift();
      lote.particulas.push({
        x: posicion.x + (Math.random() - 0.5) * tamanoBloque * 0.62,
        y: posicion.y + (Math.random() - 0.5) * tamanoBloque * 0.62,
        z: posicion.z + (Math.random() - 0.5) * tamanoBloque * 0.62,
        vx: (Math.random() - 0.5) * 5.2,
        vy: 1.6 + Math.random() * 4.4,
        vz: (Math.random() - 0.5) * 5.2,
        giroX: Math.random() * Math.PI,
        giroY: Math.random() * Math.PI,
        velGiroX: (Math.random() - 0.5) * 9,
        velGiroY: (Math.random() - 0.5) * 9,
        escala: lado * (0.7 + Math.random() * 0.8),
        nacida: performance.now(),
        vidaMs: 620 + Math.random() * 420,
        // Rotación y traslación de la matriz, reutilizada por partícula.
        matriz: new THREE.Matrix4(),
        cuaternion: new THREE.Quaternion(),
        euler: new THREE.Euler(),
        vector: new THREE.Vector3(),
        escalaVector: new THREE.Vector3(),
      });
    }
    totalVivas += semillas;
    maximoHistorico = Math.max(maximoHistorico, contarVivas());
  }

  function actualizar(now) {
    for (const lote of lotes.values()) {
      const vivas = [];
      for (const particula of lote.particulas) {
        const edad = now - particula.nacida;
        if (edad >= particula.vidaMs) continue;
        const delta = 1 / 60;
        particula.vy -= 17 * delta;
        particula.x += particula.vx * delta;
        particula.y += particula.vy * delta;
        particula.z += particula.vz * delta;

        // Rebote simple contra el terreno: la esquirla no atraviesa el suelo.
        const suelo = terreno?.obtenerAlturaSoporte?.(particula.x, particula.z) ?? -Infinity;
        if (particula.y < suelo + particula.escala * 0.5) {
          particula.y = suelo + particula.escala * 0.5;
          particula.vy = Math.abs(particula.vy) * 0.28;
          particula.vx *= 0.62;
          particula.vz *= 0.62;
        }

        particula.giroX += particula.velGiroX * delta;
        particula.giroY += particula.velGiroY * delta;
        const restante = 1 - edad / particula.vidaMs;
        const escala = particula.escala * (0.45 + restante * 0.55);

        particula.euler.set(particula.giroX, particula.giroY, 0);
        particula.cuaternion.setFromEuler(particula.euler);
        particula.vector.set(particula.x, particula.y, particula.z);
        particula.escalaVector.setScalar(escala);
        particula.matriz.compose(
          particula.vector,
          particula.cuaternion,
          particula.escalaVector,
        );
        vivas.push(particula);
      }

      lote.particulas = vivas;
      lote.malla.count = vivas.length;
      for (let indice = 0; indice < vivas.length; indice += 1) {
        lote.malla.setMatrixAt(indice, vivas[indice].matriz);
      }
      if (vivas.length > 0) lote.malla.instanceMatrix.needsUpdate = true;
    }
    totalVivas = contarVivas();
  }

  function contarVivas() {
    let total = 0;
    for (const lote of lotes.values()) total += lote.particulas.length;
    return total;
  }

  function dispose() {
    for (const lote of lotes.values()) {
      lote.malla.removeFromParent();
      lote.malla.dispose();
    }
    for (const material of materialPorTipo.values()) material.dispose();
    geometria.dispose();
    lotes.clear();
    materialPorTipo.clear();
  }
}

/**
 * Variante sin renderizado (para pruebas en Node): calcula la trayectoria de
 * las esquirlas sin Three.js. Sirve para comprobar la física del estallido.
 */
export function simularEstallido({
  cantidad = 12,
  gravedad = 17,
  delta = 1 / 60,
  pasos = 90,
  aleatorio = Math.random,
} = {}) {
  const particulas = [];
  for (let indice = 0; indice < cantidad; indice += 1) {
    particulas.push({
      x: (aleatorio() - 0.5) * 1.24,
      y: (aleatorio() - 0.5) * 1.24,
      z: (aleatorio() - 0.5) * 1.24,
      vx: (aleatorio() - 0.5) * 5.2,
      vy: 1.6 + aleatorio() * 4.4,
      vz: (aleatorio() - 0.5) * 5.2,
    });
  }
  for (let paso = 0; paso < pasos; paso += 1) {
    for (const particula of particulas) {
      particula.vy -= gravedad * delta;
      particula.x += particula.vx * delta;
      particula.y += particula.vy * delta;
      particula.z += particula.vz * delta;
    }
  }
  return particulas;
}
