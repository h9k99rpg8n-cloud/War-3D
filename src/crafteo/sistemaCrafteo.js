import { obtenerReceta, recetasParaEstacion } from "./recetas.js";

export function crearSistemaCrafteo(inventario) {
  if (
    !inventario ||
    typeof inventario.cantidadTotal !== "function" ||
    typeof inventario.retirar !== "function" ||
    typeof inventario.agregar !== "function"
  ) {
    throw new TypeError("El sistema de crafteo necesita un inventario transaccional.");
  }

  return {
    listar(estacion) {
      return recetasParaEstacion(estacion).map((receta) => ({
        ...receta,
        disponible: materialesFaltantes(receta).length === 0 &&
          inventario.puedeAgregar(receta.result.itemId, receta.result.amount),
        faltantes: materialesFaltantes(receta),
      }));
    },

    fabricar(id, estacion) {
      const receta = obtenerReceta(id);
      if (!receta || receta.station !== estacion) {
        return { ok: false, motivo: "estacion_incorrecta" };
      }
      const faltantes = materialesFaltantes(receta);
      if (faltantes.length) return { ok: false, motivo: "materiales", faltantes };
      if (!inventario.puedeAgregar(receta.result.itemId, receta.result.amount)) {
        return { ok: false, motivo: "sin_espacio" };
      }

      const retirados = [];
      for (const ingrediente of receta.ingredients) {
        const cantidad = inventario.retirar(ingrediente.itemId, ingrediente.amount);
        if (cantidad !== ingrediente.amount) {
          for (const retirado of retirados) {
            inventario.agregar(retirado.itemId, retirado.amount);
          }
          return { ok: false, motivo: "transaccion_cancelada" };
        }
        retirados.push(ingrediente);
      }
      if (!inventario.agregar(receta.result.itemId, receta.result.amount)) {
        for (const retirado of retirados) {
          inventario.agregar(retirado.itemId, retirado.amount);
        }
        return { ok: false, motivo: "sin_espacio" };
      }
      return { ok: true, resultado: { ...receta.result } };
    },
  };

  function materialesFaltantes(receta) {
    return receta.ingredients
      .map((ingrediente) => ({
        itemId: ingrediente.itemId,
        requerido: ingrediente.amount,
        disponible: inventario.cantidadTotal(ingrediente.itemId),
      }))
      .filter((material) => material.disponible < material.requerido);
  }
}
