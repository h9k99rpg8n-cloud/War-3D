export const DEFINICIONES_INVENTARIO = Object.freeze({
  pasto: Object.freeze({
    nombre: "Bloque de pasto",
    clase: "inventory-tile--grass",
    categoria: "bloque",
  }),
  hojas: Object.freeze({
    nombre: "Bloque de hojas",
    clase: "inventory-tile--leaves",
    categoria: "bloque",
  }),
  madera: Object.freeze({
    nombre: "Bloque de madera",
    clase: "inventory-tile--wood",
    categoria: "bloque",
  }),
  arena: Object.freeze({
    nombre: "Bloque de arena",
    clase: "inventory-tile--sand",
    categoria: "bloque",
  }),
  tierra: Object.freeze({
    nombre: "Bloque de tierra",
    clase: "inventory-tile--dirt",
    categoria: "bloque",
  }),
  huevo_arana: Object.freeze({
    nombre: "Huevo de Araña Umbral",
    clase: "inventory-tile--spider-egg",
    categoria: "entidad",
  }),
  huevo_zombie: Object.freeze({
    nombre: "Huevo de Zombi",
    clase: "inventory-tile--zombie-egg",
    categoria: "entidad",
  }),
});

export const NOMBRES_BLOQUE = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINICIONES_INVENTARIO).map(([tipo, definicion]) => [
      tipo,
      definicion.nombre,
    ]),
  ),
);

export function crearInventario(interfaz, configuracion, opcionesMundo = {}) {
  const limites = configuracion.inventario.limites;
  const creativo = opcionesMundo.modo === "creativo";
  const espacios = interfaz.espaciosInventario;
  const progresoGuardado = opcionesMundo.progreso?.inventario;
  const tiposPorEspacio = restaurarOrden(
    progresoGuardado?.orden,
    espacios.length,
  );
  const estados = Object.fromEntries(
    Object.keys(DEFINICIONES_INVENTARIO).map((tipo) => [
      tipo,
      {
        cantidad: restaurarCantidad(
          progresoGuardado?.cantidades?.[tipo],
          limites[tipo],
        ),
        reservas: 0,
      },
    ]),
  );
  let indiceSeleccionado = limitarIndice(
    progresoGuardado?.indiceSeleccionado,
    espacios.length,
  );
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

  prepararCatalogo();
  actualizarInterfaz();

  return {
    tipoSeleccionado() {
      return tiposPorEspacio[indiceSeleccionado] ?? null;
    },

    esCreativo() {
      return creativo;
    },

    esBloque(tipo) {
      return DEFINICIONES_INVENTARIO[tipo]?.categoria === "bloque";
    },

    esHuevo(tipo) {
      return DEFINICIONES_INVENTARIO[tipo]?.categoria === "entidad";
    },

    nombre(tipo) {
      return NOMBRES_BLOQUE[tipo] ?? "Objeto";
    },

    cantidad(tipo = tiposPorEspacio[indiceSeleccionado]) {
      return creativo && estados[tipo]
        ? Number.POSITIVE_INFINITY
        : (estados[tipo]?.cantidad ?? 0);
    },

    estaLleno(tipo) {
      if (creativo) return false;
      const estado = estados[tipo];
      const limite = limites[tipo];
      return !estado || !Number.isFinite(limite) ||
        estado.cantidad + estado.reservas >= limite;
    },

    reservarEspacio(tipo) {
      if (creativo) return true;
      const estado = estados[tipo];
      const limite = limites[tipo];
      if (
        !estado ||
        !Number.isFinite(limite) ||
        estado.cantidad + estado.reservas >= limite
      ) {
        return false;
      }
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
      const limite = limites[tipo];
      if (!estado || !Number.isFinite(limite)) return false;
      if (estado.reservas > 0) estado.reservas -= 1;
      if (estado.cantidad >= limite) return false;
      estado.cantidad += 1;
      actualizarInterfaz();
      return true;
    },

    usarBloque(tipo = tiposPorEspacio[indiceSeleccionado]) {
      if (creativo) return Boolean(estados[tipo]);
      const estado = estados[tipo];
      if (!estado || estado.cantidad <= 0) return false;
      estado.cantidad -= 1;
      actualizarInterfaz();
      return true;
    },

    ordenEspacios() {
      return [...tiposPorEspacio];
    },

    exportarEstado() {
      return {
        orden: [...tiposPorEspacio],
        cantidades: Object.fromEntries(
          Object.entries(estados).map(([tipo, estado]) => [tipo, estado.cantidad]),
        ),
        indiceSeleccionado,
      };
    },
  };

  function prepararCatalogo() {
    interfaz.botonCatalogo.hidden = !creativo;
    interfaz.catalogoCreativo.hidden = true;
    if (!creativo) return;

    interfaz.listaCatalogo.replaceChildren();
    for (const [tipo, definicion] of Object.entries(DEFINICIONES_INVENTARIO)) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "catalog-item";
      boton.dataset.itemType = tipo;
      boton.setAttribute("aria-label", `Añadir ${definicion.nombre} a la barra`);
      const icono = document.createElement("span");
      icono.className = `inventory-tile ${definicion.clase}`;
      icono.setAttribute("aria-hidden", "true");
      const nombre = document.createElement("b");
      nombre.textContent = definicion.nombre;
      boton.append(icono, nombre);
      boton.addEventListener("click", () => seleccionarDesdeCatalogo(tipo));
      interfaz.listaCatalogo.append(boton);
    }

    interfaz.botonCatalogo.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const abrir = interfaz.catalogoCreativo.hidden;
      interfaz.catalogoCreativo.hidden = !abrir;
      interfaz.botonCatalogo.classList.toggle("is-active", abrir);
      interfaz.botonCatalogo.setAttribute("aria-expanded", String(abrir));
    });
    interfaz.cerrarCatalogo.addEventListener("click", cerrarCatalogo);
  }

  function seleccionarDesdeCatalogo(tipo) {
    const existente = tiposPorEspacio.indexOf(tipo);
    if (existente >= 0) {
      indiceSeleccionado = existente;
    } else {
      tiposPorEspacio[indiceSeleccionado] = tipo;
    }
    cerrarCatalogo();
    actualizarInterfaz();
  }

  function cerrarCatalogo() {
    interfaz.catalogoCreativo.hidden = true;
    interfaz.botonCatalogo.classList.remove("is-active");
    interfaz.botonCatalogo.setAttribute("aria-expanded", "false");
  }

  function seleccionarEspacio(indice) {
    const tipo = tiposPorEspacio[indice];
    if (!tipo || (!creativo && estados[tipo].cantidad <= 0)) return;
    indiceSeleccionado = indice;
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
        if (indiceSeleccionado === arrastre.indice) indiceSeleccionado = destino;
        else if (indiceSeleccionado === destino) indiceSeleccionado = arrastre.indice;
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
      const estado = estados[tipo];
      const cantidad = estado?.cantidad ?? 0;
      const visible = Boolean(tipo && (creativo || cantidad > 0));
      const definicion = DEFINICIONES_INVENTARIO[tipo];
      espacio.replaceChildren();
      espacio.classList.toggle("is-unlimited", creativo && visible);
      espacio.classList.toggle("is-selected", indice === indiceSeleccionado);
      espacio.setAttribute("aria-pressed", String(indice === indiceSeleccionado));

      if (visible && definicion) {
        const item = document.createElement("span");
        item.className = "inventory-item";
        item.dataset.itemType = tipo;
        const icono = document.createElement("span");
        icono.className = `inventory-tile ${definicion.clase}`;
        icono.setAttribute("aria-hidden", "true");
        const contador = document.createElement("b");
        contador.className = "inventory-slot__count";
        contador.textContent = creativo ? "∞" : String(cantidad);
        item.append(icono, contador);
        espacio.append(item);
      }

      espacio.setAttribute(
        "aria-label",
        visible && definicion
          ? creativo
            ? `${definicion.nombre}: ilimitado. Arrastrable.`
            : `${definicion.nombre}: ${cantidad} de ${limites[tipo]}. Arrastrable.`
          : `Casilla ${indice + 1} vacía`,
      );
    });

    const seleccionado = tiposPorEspacio[indiceSeleccionado];
    const definicion = DEFINICIONES_INVENTARIO[seleccionado];
    const cantidadSeleccionada = estados[seleccionado]?.cantidad ?? 0;
    interfaz.botonColocar.disabled =
      !seleccionado || (!creativo && cantidadSeleccionada === 0);
    interfaz.etiquetaColocar.textContent =
      definicion?.categoria === "entidad" ? "GENERAR" : "COLOCAR";
    interfaz.botonColocar.setAttribute(
      "aria-label",
      definicion
        ? `${definicion.categoria === "entidad" ? "Generar" : "Colocar"} ${definicion.nombre.toLowerCase()}`
        : "Selecciona un objeto",
    );
  }
}

function restaurarOrden(orden, cantidadEspacios) {
  const predeterminado = ["pasto", "hojas", "madera", "arena", "tierra", null];
  if (!Array.isArray(orden)) return predeterminado.slice(0, cantidadEspacios);
  const resultado = [];
  const usados = new Set();
  for (let indice = 0; indice < cantidadEspacios; indice += 1) {
    const tipo = orden[indice];
    if (tipo === null || tipo === undefined) {
      resultado.push(null);
    } else if (DEFINICIONES_INVENTARIO[tipo] && !usados.has(tipo)) {
      usados.add(tipo);
      resultado.push(tipo);
    } else {
      resultado.push(null);
    }
  }
  return resultado;
}

function restaurarCantidad(valor, limite) {
  if (!Number.isFinite(limite)) return 0;
  return Math.max(0, Math.min(limite, Math.floor(Number(valor) || 0)));
}

function limitarIndice(valor, cantidad) {
  const indice = Math.floor(Number(valor));
  return Number.isInteger(indice) && indice >= 0 && indice < cantidad ? indice : 0;
}
