export const TAMANO_CUADRICULA_CRAFTEO = 6;
export const TOTAL_CELDAS_CRAFTEO =
  TAMANO_CUADRICULA_CRAFTEO * TAMANO_CUADRICULA_CRAFTEO;

export function crearCuadriculaCrafteo() {
  return Array(TOTAL_CELDAS_CRAFTEO).fill(null);
}

export function validarRecetaCuadricula(cuadricula, recetas) {
  const normalizada = normalizarCuadricula(cuadricula);
  for (const receta of recetas) {
    if (receta.shapeless) {
      if (coincideSinForma(normalizada, receta.ingredients)) return receta;
      continue;
    }
    if (Array.isArray(receta.pattern) && coincidePatron(normalizada, receta)) {
      return receta;
    }
  }
  return null;
}

export function consumirRecetaCuadricula(cuadricula, receta) {
  if (!receta || !validarRecetaCuadricula(cuadricula, [receta])) return false;
  if (receta.shapeless) {
    const pendientes = new Map(
      receta.ingredients.map((ingrediente) => [
        ingrediente.itemId,
        ingrediente.amount,
      ]),
    );
    for (let indice = 0; indice < cuadricula.length; indice += 1) {
      const celda = cuadricula[indice];
      const pendiente = pendientes.get(celda?.itemId) ?? 0;
      if (!celda || pendiente <= 0) continue;
      const usados = Math.min(pendiente, celda.amount);
      reducirCelda(cuadricula, indice, usados);
      pendientes.set(celda.itemId, pendiente - usados);
    }
    return true;
  }

  const limites = limitesOcupados(cuadricula);
  const alto = receta.pattern.length;
  const ancho = Math.max(...receta.pattern.map((fila) => fila.length));
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const simbolo = receta.pattern[y]?.[x] ?? " ";
      if (simbolo === " ") continue;
      reducirCelda(
        cuadricula,
        (limites.minY + y) * TAMANO_CUADRICULA_CRAFTEO + limites.minX + x,
        1,
      );
    }
  }
  return true;
}

export function colocarIngrediente(cuadricula, indice, itemId, cantidad = 1) {
  if (!Array.isArray(cuadricula) || cuadricula.length !== TOTAL_CELDAS_CRAFTEO) {
    return false;
  }
  if (!Number.isInteger(indice) || indice < 0 || indice >= cuadricula.length) {
    return false;
  }
  const id = String(itemId || "");
  if (!id) return false;
  const actual = cuadricula[indice];
  if (actual && actual.itemId !== id) return false;
  if (actual) actual.amount += Math.max(1, Math.floor(Number(cantidad) || 1));
  else {
    cuadricula[indice] = {
      itemId: id,
      amount: Math.max(1, Math.floor(Number(cantidad) || 1)),
    };
  }
  return true;
}

function coincidePatron(cuadricula, receta) {
  const limites = limitesOcupados(cuadricula);
  if (!limites) return false;
  const alto = receta.pattern.length;
  const ancho = Math.max(...receta.pattern.map((fila) => fila.length));
  if (limites.ancho !== ancho || limites.alto !== alto) return false;
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const simbolo = receta.pattern[y]?.[x] ?? " ";
      const esperado = simbolo === " " ? null : receta.key?.[simbolo] ?? null;
      const celda =
        cuadricula[
          (limites.minY + y) * TAMANO_CUADRICULA_CRAFTEO + limites.minX + x
        ];
      if ((celda?.itemId ?? null) !== esperado) return false;
      if (esperado && celda.amount < 1) return false;
    }
  }
  return true;
}

function coincideSinForma(cuadricula, ingredientes) {
  const cantidades = new Map();
  for (const celda of cuadricula) {
    if (!celda) continue;
    cantidades.set(
      celda.itemId,
      (cantidades.get(celda.itemId) ?? 0) + celda.amount,
    );
  }
  if (cantidades.size !== ingredientes.length) return false;
  return ingredientes.every(
    (ingrediente) =>
      cantidades.get(ingrediente.itemId) === ingrediente.amount,
  );
}

function limitesOcupados(cuadricula) {
  let minX = TAMANO_CUADRICULA_CRAFTEO;
  let minY = TAMANO_CUADRICULA_CRAFTEO;
  let maxX = -1;
  let maxY = -1;
  for (let indice = 0; indice < cuadricula.length; indice += 1) {
    if (!cuadricula[indice]) continue;
    const x = indice % TAMANO_CUADRICULA_CRAFTEO;
    const y = Math.floor(indice / TAMANO_CUADRICULA_CRAFTEO);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    ancho: maxX - minX + 1,
    alto: maxY - minY + 1,
  };
}

function normalizarCuadricula(cuadricula) {
  if (!Array.isArray(cuadricula) || cuadricula.length !== TOTAL_CELDAS_CRAFTEO) {
    return crearCuadriculaCrafteo();
  }
  return cuadricula.map((celda) =>
    celda?.itemId && Number(celda.amount) > 0
      ? { itemId: String(celda.itemId), amount: Math.floor(celda.amount) }
      : null,
  );
}

function reducirCelda(cuadricula, indice, cantidad) {
  const celda = cuadricula[indice];
  if (!celda) return;
  celda.amount -= cantidad;
  if (celda.amount <= 0) cuadricula[indice] = null;
}
