export function crearFisicaAgua(terreno, fisicaArena) {
  const contexto = fisicaArena?.obtenerContextoRapier?.() ?? null;
  const sensores = new Set();
  let consultasDisponibles = Boolean(contexto);

  if (contexto) {
    const { RAPIER, mundoFisico } = contexto;
    for (const volumen of terreno.obtenerVolumenesAgua()) {
      if (volumen.ancho <= 0 || volumen.alto <= 0 || volumen.profundidad <= 0) {
        continue;
      }
      const descriptor = RAPIER.ColliderDesc.cuboid(
        volumen.ancho * 0.499,
        volumen.alto * 0.5,
        volumen.profundidad * 0.499,
      )
        .setTranslation(volumen.x, volumen.y, volumen.z)
        .setSensor(true);
      const collider = mundoFisico.createCollider(descriptor);
      sensores.add(collider.handle);
    }

    // Actualiza el broad-phase antes de la primera consulta del jugador.
    mundoFisico.timestep = 1 / 60;
    mundoFisico.step();
  }

  return {
    usaRapier: Boolean(contexto && sensores.size > 0),

    estaEnAgua(worldX, worldZ, pies, cabeza) {
      const coincideVolumenLogico = terreno.estaEnAgua(
        worldX,
        worldZ,
        pies,
        cabeza,
      );
      if (!coincideVolumenLogico || !contexto || !consultasDisponibles) {
        return coincideVolumenLogico;
      }

      const muestras = [
        pies + 0.08,
        (pies + cabeza) * 0.5,
        cabeza - 0.08,
      ];
      try {
        return muestras.some((y) => intersecaSensor(worldX, y, worldZ));
      } catch (error) {
        consultasDisponibles = false;
        console.warn("La consulta física del agua usará el respaldo lógico.", error);
        return coincideVolumenLogico;
      }
    },

    obtenerCantidadSensores() {
      return sensores.size;
    },
  };

  function intersecaSensor(x, y, z) {
    let encontrado = false;
    contexto.mundoFisico.intersectionsWithPoint(
      { x, y, z },
      (collider) => {
        if (!sensores.has(collider.handle)) return true;
        encontrado = true;
        return false;
      },
    );
    return encontrado;
  }
}
