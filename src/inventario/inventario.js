export const NOMBRES_BLOQUE = Object.freeze({
  pasto: "Bloque de pasto",
  hojas: "Bloque de hojas",
  madera: "Bloque de madera",
  arena: "Bloque de arena",
});

const CLASES_ICONO = Object.freeze({
  pasto: "inventory-tile--grass",
  hojas: "inventory-tile--leaves",
  madera: "inventory-tile--wood",
  arena: "inventory-tile--sand",
});

export function crearInventario(interfaz, configuracion, opcionesMundo = {}) {
  const limites = configuracion.inventario.limites;
  const creativo = opcionesMundo.modo === "creativo";
  const espacios = interfaz.espaciosInventario;
  const tiposPorEspacio = ["pasto", "hojas", "madera", "arena", null, null];
  const estados = Object.fromEntries(
    Object.keys(NOMBRES_BLOQUE).map((tipo) => [
      tipo,
      { cantidad: 0, reservas: 0 },
    ]),
  );
  let seleccionado = "pasto";
  let arrastre = null;
  let ignorarClickHasta = 0;

  espacios.forEach((espacio, indice) => {
    espacio.dataset.slotIndex = String(indice);
    espacio.addEventListener("click", () => {
      if (performance.now() < ignorarClickHasta) return;
      seleccionarEspacio(indice);
    });
    espacio.addEventListener("pointerdown", (event) => iniciarArrastre(event, indice));
    espacio.addEventListener("pointermove", moverArrastre);
    espacio.addEventListener("pointerup", terminarArrastre);
    espacio.addEventListener("pointercancel", cancelarArrastre);
  });
  actualizarInterfaz();

  return {
    tipoSeleccionado() {
      return seleccionado;
    },

    esCreativo() {
      return creativo;
    },

    nombre(tipo) {
      return NOMBRES_BLOQUE[tipo] ?? "Bloque";
    },

    cantidad(tipo = seleccionado) {
      return creativo && estados[tipo]
        ? Number.POSITIVE_INFINITY
        : (estados[tipo]?.cantidad ?? 0);
    },

    estaLleno(tipo) {
      if (creativo) return false;
      const estado = estados[tipo];
      return !estado || estado.cantidad + estado.reservas >= limites[tipo];
    },

    reservarEspacio(tipo) {
      if (creativo) return true;
      const estado = estados[tipo];
      if (!estado || estado.cantidad + estado.reservas >= limites[tipo]) return false;
      estado.reservas += 1;
      return true;
    },

    liberarReserva(tipo) {
      if (creativo) return;
      const estado = estados[tipo];
      if (estado) estado.reservas = Math.max(0, estado.reservas - 1);
    },

    confirmarRecoleccion(tipo) {
      if (creativo) return true;
      const estado = estados[tipo];
      if (!estado) return false;
      if (estado.reservas > 0) estado.reservas -= 1;
      if (estado.cantidad >= limites[tipo]) return false;
      estado.cantidad += 1;
      actualizarInterfaz();
      return true;
    },

    usarBloque(tipo = seleccionado) {
      if (creativo) return true;
      const estado = estados[tipo];
      if (!estado || estado.cantidad <= 0) return false;
      estado.cantidad -= 1;
      actualizarInterfaz();
      return true;
    },

    ordenEspacios() {
      return [...tiposPorEspacio];
    },
  };

  function seleccionarEspacio(indice) {
    const tipo = tiposPorEspacio[indice];
    if (!tipo || (!creativo && estados[tipo].cantidad <= 0)) return;
    seleccionado = tipo;
    actualizarInterfaz();
  }

  function iniciarArrastre(event, indice) {
    if (event.button !== undefined && event.button !== 0) return;
    const tipo = tiposPorEspacio[indice];
    if (!tipo || (!creativo && estados[tipo].cantidad <= 0)) return;
    event.preventDefault();
    event.stopPropagation();
    arrastre = {
      indice,
      pointerId: event.pointerId,
      inicioX: event.clientX,
      inicioY: event.clientY,
      activo: false,
      fantasma: null,
      destino: null,
    };
    espacios[indice].setPointerCapture?.(event.pointerId);
  }

  function moverArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    event.preventDefault();
    const distancia = Math.hypot(
      event.clientX - arrastre.inicioX,
      event.clientY - arrastre.inicioY,
    );
    if (!arrastre.activo && distancia >= 7) activarArrastre(event);
    if (!arrastre.activo) return;
    posicionarFantasma(event.clientX, event.clientY);
    marcarDestino(event.clientX, event.clientY);
  }

  function activarArrastre(event) {
    arrastre.activo = true;
    const elemento = espacios[arrastre.indice].querySelector(".inventory-item");
    if (!elemento) return;
    arrastre.fantasma = elemento.cloneNode(true);
    arrastre.fantasma.classList.add("inventory-drag-ghost");
    document.body.append(arrastre.fantasma);
    espacios[arrastre.indice].classList.add("is-dragging");
    posicionarFantasma(event.clientX, event.clientY);
  }

  function posicionarFantasma(x, y) {
    if (!arrastre?.fantasma) return;
    arrastre.fantasma.style.left = `${x}px`;
    arrastre.fantasma.style.top = `${y}px`;
  }

  function marcarDestino(x, y) {
    espacios.forEach((espacio) => espacio.classList.remove("is-drop-target"));
    const elemento = document.elementFromPoint?.(x, y);
    const espacio = elemento?.closest?.(".inventory-slot");
    const indice = Number(espacio?.dataset?.slotIndex);
    if (!Number.isInteger(indice) || indice < 0 || indice >= espacios.length) {
      arrastre.destino = null;
      return;
    }
    arrastre.destino = indice;
    espacios[indice].classList.add("is-drop-target");
  }

  function terminarArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    event.preventDefault();
    if (arrastre.activo) {
      marcarDestino(event.clientX, event.clientY);
      const destino = arrastre.destino;
      if (destino !== null && destino !== arrastre.indice) {
        const temporal = tiposPorEspacio[destino];
        tiposPorEspacio[destino] = tiposPorEspacio[arrastre.indice];
        tiposPorEspacio[arrastre.indice] = temporal;
      }
      ignorarClickHasta = performance.now() + 280;
    } else {
      seleccionarEspacio(arrastre.indice);
      ignorarClickHasta = performance.now() + 80;
    }
    limpiarArrastre();
    actualizarInterfaz();
  }

  function cancelarArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    limpiarArrastre();
    actualizarInterfaz();
  }

  function limpiarArrastre() {
    if (!arrastre) return;
    const origen = espacios[arrastre.indice];
    if (origen.hasPointerCapture?.(arrastre.pointerId)) {
      origen.releasePointerCapture(arrastre.pointerId);
    }
    arrastre.fantasma?.remove();
    espacios.forEach((espacio) => {
      espacio.classList.remove("is-dragging", "is-drop-target");
    });
    arrastre = null;
  }

  function actualizarInterfaz() {
    espacios.forEach((espacio, indice) => {
      const tipo = tiposPorEspacio[indice];
      const cantidad = tipo ? estados[tipo].cantidad : 0;
      const visible = Boolean(tipo && (creativo || cantidad > 0));
      espacio.replaceChildren();
      espacio.classList.toggle("is-unlimited", creativo && visible);
      espacio.classList.toggle("is-selected", tipo === seleccionado);
      espacio.setAttribute("aria-pressed", String(tipo === seleccionado));

      if (visible) {
        const item = document.createElement("span");
        item.className = "inventory-item";
        item.dataset.blockType = tipo;
        const icono = document.createElement("span");
        icono.className = `inventory-tile ${CLASES_ICONO[tipo]}`;
        icono.setAttribute("aria-hidden", "true");
        const contador = document.createElement("b");
        contador.className = "inventory-slot__count";
        contador.textContent = creativo ? "∞" : String(cantidad);
        item.append(icono, contador);
        espacio.append(item);
      }

      espacio.setAttribute(
        "aria-label",
        visible
          ? creativo
            ? `${NOMBRES_BLOQUE[tipo]}: ilimitado. Arrastrable.`
            : `${NOMBRES_BLOQUE[tipo]}: ${cantidad} de ${limites[tipo]}. Arrastrable.`
          : `Casilla ${indice + 1} vacía`,
      );
    });

    const cantidadSeleccionada = estados[seleccionado]?.cantidad ?? 0;
    interfaz.botonColocar.disabled = !creativo && cantidadSeleccionada === 0;
    interfaz.botonColocar.setAttribute(
      "aria-label",
      `Colocar ${NOMBRES_BLOQUE[seleccionado].toLowerCase()}`,
    );
  }
}
