export const SURVIVAL_MAX_STACK = 92;

export function limitarCantidadStack(valor, maximo = SURVIVAL_MAX_STACK) {
  const limite = Math.max(
    1,
    Math.min(SURVIVAL_MAX_STACK, Math.floor(Number(maximo) || SURVIVAL_MAX_STACK)),
  );
  const cantidad = Math.floor(Number(valor) || 0);
  return Math.max(0, Math.min(limite, cantidad));
}

export function crearStackInventario(
  itemId,
  cantidad = 1,
  { creativo = false, maximo = SURVIVAL_MAX_STACK, metadatos = {} } = {},
) {
  const id = String(itemId || "");
  if (!id) throw new TypeError("Un stack necesita itemId.");
  return {
    itemId: id,
    amount: creativo ? 1 : limitarCantidadStack(cantidad, maximo),
    infinite: creativo,
    ...metadatos,
  };
}

export function dividirCantidadesStack(cantidadOriginal, cantidadSeparada) {
  const original = limitarCantidadStack(cantidadOriginal);
  const separada = Math.floor(Number(cantidadSeparada));
  if (!Number.isInteger(separada) || separada < 1 || separada >= original) {
    return null;
  }
  return Object.freeze({
    separada,
    restante: original - separada,
  });
}
