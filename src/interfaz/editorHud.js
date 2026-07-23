const IDS_CONTROLES = Object.freeze([
  "joystick",
  "jump-button",
  "place-block",
  "attack-button",
  "interact-button",
  "inventory-bar",
  "inventory-button",
  "game-menu-button",
  "flight-button",
  "descend-button",
]);

export function crearEditorHud(interfaz, preferencias, guardarPreferencias) {
  const elementos = new Map(
    IDS_CONTROLES.map((id) => [id, document.getElementById(id)]).filter(
      ([, elemento]) => elemento,
    ),
  );
  let editando = false;
  let seleccionado = null;
  let arrastre = null;
  let borrador = clonarLayout(preferencias.hudLayout);
  let instantaneaEstilos = null;

  for (const [id, elemento] of elementos) {
    elemento.classList.add("hud-movable");
    elemento.addEventListener(
      "pointerdown",
      (event) => iniciarArrastre(event, id, elemento),
      { capture: true },
    );
  }
  interfaz.guardarEditorHud.addEventListener("click", guardar);
  interfaz.cancelarEditorHud.addEventListener("click", cancelar);
  interfaz.restaurarEditorHud.addEventListener("click", restaurar);
  interfaz.aumentarEditorHud.addEventListener("click", () => escalar(0.08));
  interfaz.reducirEditorHud.addEventListener("click", () => escalar(-0.08));
  window.addEventListener("pointermove", mover, { capture: true });
  window.addEventListener("pointerup", terminar, { capture: true });
  window.addEventListener("pointercancel", terminar, { capture: true });
  window.addEventListener("resize", () => {
    if (!editando) aplicarLayout(borrador);
  });

  aplicarLayout(borrador);

  return {
    abrir() {
      if (editando) return;
      editando = true;
      instantaneaEstilos = capturarEstilos();
      borrador = obtenerLayoutActual();
      interfaz.editorHud.hidden = false;
      interfaz.juego.classList.add("hud-editing");
      seleccionar(null);
    },

    estaAbierto() {
      return editando;
    },

    cerrar: cancelar,
  };

  function iniciarArrastre(event, id, elemento) {
    if (!editando) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    seleccionar(id);
    const rect = elemento.getBoundingClientRect();
    arrastre = {
      id,
      pointerId: event.pointerId,
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2),
    };
    try {
      elemento.setPointerCapture?.(event.pointerId);
    } catch {
      // Safari puede cancelar la captura durante un cambio de orientación.
    }
  }

  function mover(event) {
    if (!editando || !arrastre || event.pointerId !== arrastre.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const x = limitar(
      (event.clientX - arrastre.offsetX) / window.innerWidth,
      0.06,
      0.94,
    );
    const y = limitar(
      (event.clientY - arrastre.offsetY) / window.innerHeight,
      0.12,
      0.93,
    );
    const actual = borrador[arrastre.id] ?? { scale: 1, hidden: false };
    borrador[arrastre.id] = { ...actual, x, y };
    aplicarControl(arrastre.id, borrador[arrastre.id]);
  }

  function terminar(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    event.preventDefault();
    arrastre = null;
  }

  function seleccionar(id) {
    seleccionado = id;
    for (const [actual, elemento] of elementos) {
      elemento.classList.toggle("is-hud-selected", actual === id);
    }
    interfaz.ayudaEditorHud.textContent = id
      ? "Arrastra el control seleccionado o cambia su tamaño."
      : "Toca un control y arrástralo. Las líneas muestran el área segura.";
  }

  function escalar(delta) {
    if (!editando || !seleccionado) return;
    const actual = borrador[seleccionado] ?? obtenerPosicion(seleccionado);
    actual.scale = limitar((actual.scale ?? 1) + delta, 0.7, 1.35);
    borrador[seleccionado] = actual;
    aplicarControl(seleccionado, actual);
  }

  function guardar() {
    if (!editando) return;
    preferencias.hudLayout = clonarLayout(borrador);
    guardarPreferencias(preferencias);
    salirEditor();
    aplicarLayout(borrador);
  }

  function cancelar() {
    if (!editando) return;
    restaurarEstilos(instantaneaEstilos);
    borrador = clonarLayout(preferencias.hudLayout);
    salirEditor();
  }

  function restaurar() {
    if (!editando) return;
    borrador = {};
    for (const [, elemento] of elementos) limpiarEstiloControl(elemento);
    seleccionar(null);
  }

  function salirEditor() {
    editando = false;
    arrastre = null;
    seleccionado = null;
    interfaz.editorHud.hidden = true;
    interfaz.juego.classList.remove("hud-editing");
    for (const [, elemento] of elementos) {
      elemento.classList.remove("is-hud-selected");
    }
  }

  function obtenerLayoutActual() {
    const layout = {};
    for (const [id] of elementos) layout[id] = obtenerPosicion(id);
    return layout;
  }

  function obtenerPosicion(id) {
    const elemento = elementos.get(id);
    const rect = elemento.getBoundingClientRect();
    return {
      x: limitar((rect.left + rect.width / 2) / window.innerWidth, 0.06, 0.94),
      y: limitar((rect.top + rect.height / 2) / window.innerHeight, 0.12, 0.93),
      scale: borrador[id]?.scale ?? 1,
      hidden: false,
    };
  }

  function aplicarLayout(layout) {
    for (const [id, datos] of Object.entries(layout ?? {})) {
      if (!elementos.has(id)) continue;
      aplicarControl(id, datos);
    }
  }

  function aplicarControl(id, datos) {
    const elemento = elementos.get(id);
    if (!elemento || !datos) return;
    const x = limitar(numero(datos.x, 0.5), 0.04, 0.96);
    const y = limitar(numero(datos.y, 0.5), 0.08, 0.96);
    const escala = limitar(numero(datos.scale, 1), 0.7, 1.35);
    elemento.style.left = `${x * 100}%`;
    elemento.style.top = `${y * 100}%`;
    elemento.style.right = "auto";
    elemento.style.bottom = "auto";
    elemento.style.transform = `translate(-50%, -50%) scale(${escala})`;
    if (datos.hidden === true && !esEsencial(id)) elemento.hidden = true;
  }

  function capturarEstilos() {
    return Object.fromEntries(
      [...elementos].map(([id, elemento]) => [
        id,
        {
          style: elemento.getAttribute("style"),
          hidden: elemento.hidden,
        },
      ]),
    );
  }

  function restaurarEstilos(instantanea) {
    if (!instantanea) return;
    for (const [id, datos] of Object.entries(instantanea)) {
      const elemento = elementos.get(id);
      if (!elemento) continue;
      if (datos.style === null) elemento.removeAttribute("style");
      else elemento.setAttribute("style", datos.style);
      elemento.hidden = datos.hidden;
    }
  }

  function limpiarEstiloControl(elemento) {
    for (const propiedad of ["left", "top", "right", "bottom", "transform"]) {
      elemento.style.removeProperty(propiedad);
    }
  }
}

function clonarLayout(layout) {
  if (!layout || typeof layout !== "object") return {};
  return Object.fromEntries(
    Object.entries(layout)
      .filter(([id, datos]) => IDS_CONTROLES.includes(id) && datos)
      .map(([id, datos]) => [
        id,
        {
          x: numero(datos.x, 0.5),
          y: numero(datos.y, 0.5),
          scale: numero(datos.scale, 1),
          hidden: datos.hidden === true,
        },
      ]),
  );
}

function esEsencial(id) {
  return [
    "joystick",
    "jump-button",
    "game-menu-button",
    "inventory-bar",
  ].includes(id);
}

function numero(valor, respaldo) {
  const actual = Number(valor);
  return Number.isFinite(actual) ? actual : respaldo;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
