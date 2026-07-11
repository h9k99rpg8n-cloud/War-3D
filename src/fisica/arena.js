export function crearFisicaArena(
  THREE,
  RAPIER,
  scene,
  terreno,
  configuracion,
  opcionesMundo = {},
) {
  const activo = opcionesMundo.modo === "supervivencia";
  const tamanoBloque = configuracion.mundo.tamanoBloque;
  const geometria = new THREE.BoxGeometry(tamanoBloque, tamanoBloque, tamanoBloque);
  const material = terreno.obtenerMaterialRecolectable("arena");
  const cuerpos = [];
  const mundoFisico =
    activo && RAPIER
      ? new RAPIER.World({ x: 0, y: configuracion.fisica.gravedad, z: 0 })
      : null;

  return {
    usaRapier: Boolean(mundoFisico),

    procesarBloqueColocado(bloque, posicion) {
      if (!activo || bloque?.tipo !== "arena") return false;
      const nivelDestino = terreno.obtenerNivelSoporteBloque(
        bloque.x,
        bloque.z,
        bloque.y,
      );
      if (nivelDestino >= bloque.y) return false;
      if (!terreno.extraerBloqueParaFisica(bloque)) return false;

      const malla = new THREE.Mesh(geometria, material);
      malla.position.copy(posicion);
      malla.userData.tipoFisica = "arena";
      scene.add(malla);

      let cuerpo = null;
      if (mundoFisico) {
        const descripcion = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(posicion.x, posicion.y, posicion.z)
          .setLinearDamping(0.04)
          .setCanSleep(false);
        cuerpo = mundoFisico.createRigidBody(descripcion);
        const collider = RAPIER.ColliderDesc.cuboid(
          tamanoBloque * 0.48,
          tamanoBloque * 0.48,
          tamanoBloque * 0.48,
        );
        mundoFisico.createCollider(collider, cuerpo);
      }

      cuerpos.push({
        bloque,
        cuerpo,
        malla,
        velocidad: 0,
      });
      return true;
    },

    actualizar(delta) {
      if (!activo || cuerpos.length === 0) return;
      const paso = Math.min(Math.max(delta, 0), 0.05);
      if (mundoFisico) {
        mundoFisico.timestep = paso;
        mundoFisico.step();
      }

      for (let indice = cuerpos.length - 1; indice >= 0; indice -= 1) {
        const item = cuerpos[indice];
        if (item.cuerpo) {
          const velocidad = item.cuerpo.linvel();
          if (velocidad.y < -configuracion.fisica.velocidadMaximaArena) {
            item.cuerpo.setLinvel(
              {
                x: velocidad.x,
                y: -configuracion.fisica.velocidadMaximaArena,
                z: velocidad.z,
              },
              true,
            );
          }
          const traslacion = item.cuerpo.translation();
          item.malla.position.set(traslacion.x, traslacion.y, traslacion.z);
        } else {
          item.velocidad = Math.max(
            -configuracion.fisica.velocidadMaximaArena,
            item.velocidad + configuracion.fisica.gravedad * paso,
          );
          item.malla.position.y += item.velocidad * paso;
        }

        const nivelDestino = terreno.obtenerNivelSoporteBloque(
          item.bloque.x,
          item.bloque.z,
          item.bloque.y,
        );
        const alturaDestino = nivelDestino * tamanoBloque;
        if (item.malla.position.y > alturaDestino) continue;

        const colocado = terreno.colocarBloqueEnCoordenadas(
          item.bloque.x,
          nivelDestino,
          item.bloque.z,
          "arena",
        );
        if (!colocado) continue;
        scene.remove(item.malla);
        if (item.cuerpo) mundoFisico.removeRigidBody(item.cuerpo);
        cuerpos.splice(indice, 1);
      }
    },

    obtenerCantidad() {
      return cuerpos.length;
    },
  };
}
