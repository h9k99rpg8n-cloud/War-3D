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

const TIPOS_INICIALES = Object.freeze([
  "pasto",
  "hojas",
  "madera",
  "arena",
  "tierra",
]);
const LIMITE_RESPALDO = 32;

export function crearInventario(interfaz, configuracion, opcionesMundo = {}) {
  const limites = configuracion.inventario.limites;
  const creativo = opcionesMundo.modo === "creativo";
  const cantidadRapida = interfaz.espaciosInventario.length;
  const cantidadMochila = Math.max(
    1,
    Math.floor(configuracion.inventario.espaciosMochila || 18),
  );
  const cantidadTotal = cantidadRapida + cantidadMochila;
  const progresoGuardado = opcionesMundo.progreso?.inventario;
  const ranuras = restaurarRanuras(
    progresoGuardado,
    cantidadRapida,
    cantidadTotal,
    limites,
    creativo,
  );
  // Las reservas se conservan en orden para simular el inventario completo.
  // Contarlas solo por tipo permitía que dos objetos distintos reclamaran la
  // misma última casilla vacía y uno de ellos desapareciera al recogerlo.
  const reservasPendientes = [];
  const espaciosPanelRapido = crearEspaciosPanel(
    interfaz.rejillaAccesoRapido,
    0,
    cantidadRapida,
    "Acceso rápido",
  );
  const espaciosMochila = crearEspaciosPanel(
    interfaz.rejillaMochila,
    cantidadRapida,
    cantidadMochila,
    "Mochila",
  );
  const vistasEspacios = [
    ...interfaz.espaciosInventario.map((elemento, indice) => ({
      elemento,
      indice,
      panel: false,
    })),
    ...espaciosPanelRapido.map((elemento, indice) => ({
      elemento,
      indice,
      panel: true,
    })),
    ...espaciosMochila.map((elemento, indice) => ({
      elemento,
      indice: cantidadRapida + indice,
      panel: true,
    })),
  ];

  let indiceSeleccionado = limitarIndice(
    progresoGuardado?.indiceSeleccionado,
    cantidadRapida,
  );
  let indiceEnFoco = indiceSeleccionado;
  let inventarioAbierto = false;
  let arrastre = null;
  let ignorarClickHasta = 0;

  for (const vista of vistasEspacios) registrarEspacio(vista);
  configurarPanel();
  prepararCatalogoCreativo();
  actualizarInterfaz();

  return {
    tipoSeleccionado() {
      return ranuras[indiceSeleccionado]?.tipo ?? null;
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

    cantidad(tipo = ranuras[indiceSeleccionado]?.tipo) {
      if (!DEFINICIONES_INVENTARIO[tipo]) return 0;
      if (creativo) return Number.POSITIVE_INFINITY;
      const seleccionada = ranuras[indiceSeleccionado];
      if (seleccionada?.tipo === tipo) return seleccionada.cantidad;
      return cantidadTotalTipo(ranuras, tipo);
    },

    estaLleno(tipo) {
      if (creativo) return false;
      return !puedeReservar(tipo);
    },

    reservarEspacio(tipo) {
      if (creativo) return true;
      if (!DEFINICIONES_INVENTARIO[tipo]) return false;
      if (!puedeReservar(tipo)) return false;
      reservasPendientes.push(tipo);
      return true;
    },

    liberarReserva(tipo) {
      if (creativo || !DEFINICIONES_INVENTARIO[tipo]) return;
      retirarReserva(tipo);
    },

    confirmarRecoleccion(tipo) {
      if (creativo) return true;
      if (!DEFINICIONES_INVENTARIO[tipo]) return false;
      retirarReserva(tipo);
      const agregado = agregarUnidad(tipo);
      if (agregado) actualizarInterfaz();
      return agregado;
    },

    usarBloque(tipo = ranuras[indiceSeleccionado]?.tipo) {
      const ranura = ranuras[indiceSeleccionado];
      if (!ranura || ranura.tipo !== tipo) return false;
      if (creativo) return true;
      if (ranura.cantidad <= 0) return false;
      ranura.cantidad -= 1;
      if (ranura.cantidad === 0) ranuras[indiceSeleccionado] = null;
      actualizarInterfaz();
      return true;
    },

    estaAbierto() {
      return inventarioAbierto;
    },

    abrir() {
      establecerPanelAbierto(true);
    },

    cerrar() {
      establecerPanelAbierto(false);
    },

    ordenEspacios() {
      return ranuras.slice(0, cantidadRapida).map((ranura) => ranura?.tipo ?? null);
    },

    exportarEstado() {
      return {
        version: 2,
        espacios: ranuras.map((ranura) =>
          ranura ? { tipo: ranura.tipo, cantidad: ranura.cantidad } : null,
        ),
        // Se conservan estas dos propiedades para que una versión anterior
        // todavía pueda leer la barra rápida y los totales básicos.
        orden: ranuras
          .slice(0, cantidadRapida)
          .map((ranura) => ranura?.tipo ?? null),
        cantidades: Object.fromEntries(
          Object.keys(DEFINICIONES_INVENTARIO).map((tipo) => [
            tipo,
            cantidadTotalTipo(ranuras, tipo),
          ]),
        ),
        indiceSeleccionado,
      };
    },
  };

  function configurarPanel() {
    interfaz.panelInventario.hidden = true;
    interfaz.botonInventario.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      establecerPanelAbierto(!inventarioAbierto);
    });
    interfaz.cerrarInventario.addEventListener("click", () => {
      establecerPanelAbierto(false);
    });
    interfaz.ordenarInventario.addEventListener("click", ordenarMochila);
    interfaz.panelInventario.addEventListener("pointerdown", (event) => {
      if (event.target === interfaz.panelInventario) establecerPanelAbierto(false);
    });
    window.addEventListener("keydown", (event) => {
      if (esCampoEditable(event.target)) return;
      const tecla = event.key.toLowerCase();
      if ((tecla === "e" || tecla === "i") && !event.repeat) {
        event.preventDefault();
        establecerPanelAbierto(!inventarioAbierto);
      } else if (tecla === "escape" && inventarioAbierto) {
        event.preventDefault();
        establecerPanelAbierto(false);
      }
    });
  }

  function establecerPanelAbierto(abierto) {
    const siguiente = Boolean(abierto);
    if (inventarioAbierto === siguiente) return;
    inventarioAbierto = siguiente;
    interfaz.panelInventario.hidden = !siguiente;
    interfaz.botonInventario.setAttribute("aria-expanded", String(siguiente));
    interfaz.botonInventario.classList.toggle("is-active", siguiente);
    interfaz.juego.classList.toggle("inventory-open", siguiente);
    if (siguiente) {
      interfaz.menuJuego.hidden = true;
      interfaz.botonMenuJuego.setAttribute("aria-expanded", "false");
      actualizarInterfaz();
      requestAnimationFrame(() => {
        interfaz.cerrarInventario.focus({ preventScroll: true });
      });
    } else {
      limpiarArrastre();
      interfaz.botonInventario.focus({ preventScroll: true });
    }
  }

  function prepararCatalogoCreativo() {
    interfaz.seccionCatalogoInventario.hidden = !creativo;
    interfaz.listaCatalogoInventario.replaceChildren();
    if (!creativo) return;

    for (const [tipo, definicion] of Object.entries(DEFINICIONES_INVENTARIO)) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "inventory-catalog-item";
      boton.dataset.itemType = tipo;
      boton.setAttribute("aria-label", `Añadir ${definicion.nombre} a la casilla marcada`);
      boton.append(
        crearIcono(definicion),
        crearTexto("b", definicion.nombre),
        crearTexto("span", "∞"),
      );
      boton.addEventListener("click", () => {
        ranuras[indiceEnFoco] = { tipo, cantidad: 1 };
        if (indiceEnFoco < cantidadRapida) indiceSeleccionado = indiceEnFoco;
        actualizarInterfaz();
      });
      interfaz.listaCatalogoInventario.append(boton);
    }
  }

  function registrarEspacio(vista) {
    const { elemento, indice, panel } = vista;
    elemento.dataset.slotIndex = String(indice);
    elemento.dataset.slotArea = indice < cantidadRapida ? "rapido" : "mochila";
    elemento.classList.toggle("inventory-slot--panel", panel);
    elemento.addEventListener("click", () => {
      if (ahora() < ignorarClickHasta) return;
      seleccionarEspacio(indice);
    });
    elemento.addEventListener("pointerdown", (event) =>
      iniciarArrastre(event, vista),
    );
    elemento.addEventListener("pointermove", moverArrastre);
    elemento.addEventListener("pointerup", terminarArrastre);
    elemento.addEventListener("pointercancel", cancelarArrastre);
  }

  function seleccionarEspacio(indice) {
    indiceEnFoco = indice;
    if (indice < cantidadRapida) indiceSeleccionado = indice;
    actualizarInterfaz();
  }

  function iniciarArrastre(event, vista) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!ranuras[vista.indice]) {
      seleccionarEspacio(vista.indice);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    arrastre = {
      indice: vista.indice,
      elementoOrigen: vista.elemento,
      pointerId: event.pointerId,
      inicioX: event.clientX,
      inicioY: event.clientY,
      activo: false,
      fantasma: null,
      destino: null,
    };
    capturarPunteroSeguro(vista.elemento, event.pointerId);
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
    const elemento = arrastre.elementoOrigen.querySelector(".inventory-item");
    if (!elemento) return;
    arrastre.activo = true;
    arrastre.fantasma = elemento.cloneNode(true);
    arrastre.fantasma.classList.add("inventory-drag-ghost");
    document.body.append(arrastre.fantasma);
    arrastre.elementoOrigen.classList.add("is-dragging");
    posicionarFantasma(event.clientX, event.clientY);
  }

  function posicionarFantasma(x, y) {
    if (!arrastre?.fantasma) return;
    arrastre.fantasma.style.left = `${x}px`;
    arrastre.fantasma.style.top = `${y}px`;
  }

  function marcarDestino(x, y) {
    for (const vista of vistasEspacios) {
      vista.elemento.classList.remove("is-drop-target");
    }
    const elemento = document.elementFromPoint?.(x, y);
    const espacio = elemento?.closest?.(".inventory-slot[data-slot-index]");
    const indice = Number(espacio?.dataset?.slotIndex);
    if (!Number.isInteger(indice) || indice < 0 || indice >= cantidadTotal) {
      arrastre.destino = null;
      return;
    }
    arrastre.destino = indice;
    espacio.classList.add("is-drop-target");
  }

  function terminarArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    event.preventDefault();
    if (arrastre.activo) {
      marcarDestino(event.clientX, event.clientY);
      const destino = arrastre.destino;
      if (destino !== null && destino !== arrastre.indice) {
        moverOCombinar(arrastre.indice, destino);
        indiceEnFoco = destino;
        if (destino < cantidadRapida) indiceSeleccionado = destino;
      }
      ignorarClickHasta = ahora() + 280;
    } else {
      seleccionarEspacio(arrastre.indice);
      ignorarClickHasta = ahora() + 80;
    }
    limpiarArrastre();
    actualizarInterfaz();
  }

  function cancelarArrastre(event) {
    if (!arrastre || event.pointerId !== arrastre.pointerId) return;
    limpiarArrastre();
    actualizarInterfaz();
  }

  function moverOCombinar(origen, destino) {
    const fuente = ranuras[origen];
    const objetivo = ranuras[destino];
    if (!fuente) return;
    if (!creativo && objetivo?.tipo === fuente.tipo) {
      const libre = limitePila(limites, fuente.tipo) - objetivo.cantidad;
      const movidos = Math.min(libre, fuente.cantidad);
      objetivo.cantidad += movidos;
      fuente.cantidad -= movidos;
      if (fuente.cantidad === 0) ranuras[origen] = null;
      return;
    }
    ranuras[destino] = fuente;
    ranuras[origen] = objetivo;
  }

  function limpiarArrastre() {
    if (!arrastre) return;
    liberarPunteroSeguro(arrastre.elementoOrigen, arrastre.pointerId);
    arrastre.fantasma?.remove();
    for (const vista of vistasEspacios) {
      vista.elemento.classList.remove("is-dragging", "is-drop-target");
    }
    arrastre = null;
  }

  function ordenarMochila() {
    const inicio = cantidadRapida;
    const contenido = ranuras.slice(inicio).filter(Boolean);
    const orden = new Map(
      Object.keys(DEFINICIONES_INVENTARIO).map((tipo, indice) => [tipo, indice]),
    );
    let organizadas = [];

    if (creativo) {
      organizadas = contenido.sort(
        (a, b) => (orden.get(a.tipo) ?? 99) - (orden.get(b.tipo) ?? 99),
      );
    } else {
      const totales = new Map();
      for (const ranura of contenido) {
        totales.set(ranura.tipo, (totales.get(ranura.tipo) ?? 0) + ranura.cantidad);
      }
      for (const tipo of Object.keys(DEFINICIONES_INVENTARIO)) {
        let restante = totales.get(tipo) ?? 0;
        const limite = limitePila(limites, tipo);
        while (restante > 0) {
          const cantidad = Math.min(limite, restante);
          organizadas.push({ tipo, cantidad });
          restante -= cantidad;
        }
      }
    }

    for (let indice = inicio; indice < cantidadTotal; indice += 1) {
      ranuras[indice] = organizadas[indice - inicio] ?? null;
    }
    indiceEnFoco = organizadas.length ? inicio : indiceSeleccionado;
    actualizarInterfaz();
  }

  function puedeReservar(tipo) {
    if (!DEFINICIONES_INVENTARIO[tipo]) return false;
    const simuladas = ranuras.map((ranura) =>
      ranura ? { tipo: ranura.tipo, cantidad: ranura.cantidad } : null,
    );
    for (const tipoReservado of reservasPendientes) {
      if (agregarUnidadEn(simuladas, tipoReservado, limites) === false) {
        return false;
      }
    }
    return agregarUnidadEn(simuladas, tipo, limites) !== false;
  }

  function retirarReserva(tipo) {
    const indice = reservasPendientes.indexOf(tipo);
    if (indice >= 0) reservasPendientes.splice(indice, 1);
  }

  function agregarUnidad(tipo) {
    const destino = agregarUnidadEn(ranuras, tipo, limites);
    if (destino === false) return false;
    if (!ranuras[indiceSeleccionado]) indiceSeleccionado = Math.min(destino, cantidadRapida - 1);
    return true;
  }

  function actualizarInterfaz() {
    for (const vista of vistasEspacios) pintarEspacio(vista);

    const seleccionada = ranuras[indiceSeleccionado];
    const definicion = DEFINICIONES_INVENTARIO[seleccionada?.tipo];
    interfaz.botonColocar.disabled =
      !seleccionada || (!creativo && seleccionada.cantidad <= 0);
    interfaz.etiquetaColocar.textContent =
      definicion?.categoria === "entidad" ? "GENERAR" : "COLOCAR";
    interfaz.botonColocar.setAttribute(
      "aria-label",
      definicion
        ? `${definicion.categoria === "entidad" ? "Generar" : "Colocar"} ${definicion.nombre.toLowerCase()}`
        : "Selecciona un objeto",
    );
    actualizarDetalle();
  }

  function pintarEspacio({ elemento, indice, panel }) {
    const ranura = ranuras[indice];
    const definicion = DEFINICIONES_INVENTARIO[ranura?.tipo];
    const visible = Boolean(definicion && (creativo || ranura.cantidad > 0));
    elemento.replaceChildren();
    elemento.classList.toggle("is-unlimited", creativo && visible);
    elemento.classList.toggle(
      "is-selected",
      indice < cantidadRapida && indice === indiceSeleccionado,
    );
    elemento.classList.toggle("is-focused", panel && indice === indiceEnFoco);
    elemento.setAttribute(
      "aria-pressed",
      String(indice < cantidadRapida && indice === indiceSeleccionado),
    );

    if (visible) elemento.append(crearItem(ranura, definicion, creativo));
    const zona = indice < cantidadRapida ? "acceso rápido" : "mochila";
    elemento.setAttribute(
      "aria-label",
      visible
        ? creativo
          ? `${definicion.nombre}: ilimitado, en ${zona}`
          : `${definicion.nombre}: ${ranura.cantidad} de ${limitePila(limites, ranura.tipo)}, en ${zona}`
        : `Casilla ${indice + 1} vacía de ${zona}`,
    );
  }

  function actualizarDetalle() {
    const ranura = ranuras[indiceEnFoco];
    const definicion = DEFINICIONES_INVENTARIO[ranura?.tipo];
    const icono = interfaz.iconoInventarioSeleccionado;
    icono.className = "inventory-tile inventory-detail__icon";

    if (ranura && definicion) {
      icono.hidden = false;
      icono.classList.add(definicion.clase);
      interfaz.nombreInventarioSeleccionado.textContent = definicion.nombre;
      interfaz.metaInventarioSeleccionado.textContent = creativo
        ? `ILIMITADO · ${definicion.categoria.toUpperCase()}`
        : `${ranura.cantidad} / ${limitePila(limites, ranura.tipo)} · ${definicion.categoria.toUpperCase()}`;
    } else {
      icono.hidden = true;
      interfaz.nombreInventarioSeleccionado.textContent = "Espacio vacío";
      interfaz.metaInventarioSeleccionado.textContent =
        indiceEnFoco < cantidadRapida
          ? "Listo para recibir un objeto de uso rápido."
          : "Arrastra aquí un objeto para guardarlo.";
    }

    const ocupados = ranuras.filter(Boolean).length;
    const objetos = creativo
      ? "OBJETOS ILIMITADOS"
      : `${ranuras.reduce((total, actual) => total + (actual?.cantidad ?? 0), 0)} OBJETOS`;
    interfaz.resumenInventario.textContent =
      `${ocupados} / ${cantidadTotal} ESPACIOS · ${objetos}`;
    interfaz.insigniaInventario.textContent = String(ocupados);
    interfaz.ordenarInventario.disabled = !ranuras.slice(cantidadRapida).some(Boolean);
  }
}

function crearEspaciosPanel(contenedor, inicio, cantidad, etiqueta) {
  const espacios = [];
  contenedor.replaceChildren();
  for (let desplazamiento = 0; desplazamiento < cantidad; desplazamiento += 1) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "inventory-slot inventory-slot--panel";
    boton.dataset.slotIndex = String(inicio + desplazamiento);
    boton.setAttribute("role", "gridcell");
    boton.setAttribute("aria-label", `${etiqueta}, casilla ${desplazamiento + 1}`);
    contenedor.append(boton);
    espacios.push(boton);
  }
  return espacios;
}

function crearItem(ranura, definicion, ilimitado) {
  const item = document.createElement("span");
  item.className = "inventory-item";
  item.dataset.itemType = ranura.tipo;
  const contador = crearTexto(
    "b",
    ilimitado ? "∞" : String(ranura.cantidad),
    "inventory-slot__count",
  );
  item.append(crearIcono(definicion), contador);
  return item;
}

function crearIcono(definicion) {
  const icono = document.createElement("span");
  icono.className = `inventory-tile ${definicion.clase}`;
  icono.setAttribute("aria-hidden", "true");
  return icono;
}

function crearTexto(etiqueta, texto, clase = "") {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}

function restaurarRanuras(
  progreso,
  cantidadRapida,
  cantidadTotal,
  limites,
  creativo,
) {
  const resultado = Array(cantidadTotal).fill(null);
  if (Array.isArray(progreso?.espacios)) {
    for (let indice = 0; indice < cantidadTotal; indice += 1) {
      resultado[indice] = normalizarRanura(
        progreso.espacios[indice],
        limites,
        creativo,
      );
    }
    return resultado;
  }

  const orden = Array.isArray(progreso?.orden)
    ? progreso.orden
    : [...TIPOS_INICIALES, null];
  if (creativo) {
    for (let indice = 0; indice < cantidadRapida; indice += 1) {
      const tipo = orden[indice];
      if (DEFINICIONES_INVENTARIO[tipo]) resultado[indice] = { tipo, cantidad: 1 };
    }
    return resultado;
  }

  const restantes = Object.fromEntries(
    Object.keys(DEFINICIONES_INVENTARIO).map((tipo) => [
      tipo,
      cantidadSegura(progreso?.cantidades?.[tipo]),
    ]),
  );
  for (let indice = 0; indice < cantidadRapida; indice += 1) {
    const tipo = orden[indice];
    if (!DEFINICIONES_INVENTARIO[tipo] || restantes[tipo] <= 0) continue;
    const cantidad = Math.min(limitePila(limites, tipo), restantes[tipo]);
    resultado[indice] = { tipo, cantidad };
    restantes[tipo] -= cantidad;
  }

  let destino = cantidadRapida;
  for (const tipo of Object.keys(DEFINICIONES_INVENTARIO)) {
    while (restantes[tipo] > 0 && destino < cantidadTotal) {
      while (resultado[destino] && destino < cantidadTotal) destino += 1;
      if (destino >= cantidadTotal) break;
      const cantidad = Math.min(limitePila(limites, tipo), restantes[tipo]);
      resultado[destino] = { tipo, cantidad };
      restantes[tipo] -= cantidad;
      destino += 1;
    }
  }
  return resultado;
}

function normalizarRanura(ranura, limites, creativo) {
  if (!ranura || !DEFINICIONES_INVENTARIO[ranura.tipo]) return null;
  if (creativo) return { tipo: ranura.tipo, cantidad: 1 };
  const cantidad = Math.min(
    limitePila(limites, ranura.tipo),
    cantidadSegura(ranura.cantidad),
  );
  return cantidad > 0 ? { tipo: ranura.tipo, cantidad } : null;
}

function limitePila(limites, tipo) {
  const limite = Math.floor(Number(limites[tipo]));
  return Number.isFinite(limite) && limite > 0 ? limite : LIMITE_RESPALDO;
}

function cantidadSegura(valor) {
  return Math.max(0, Math.floor(Number(valor) || 0));
}

function cantidadTotalTipo(ranuras, tipo) {
  return ranuras.reduce(
    (total, ranura) => total + (ranura?.tipo === tipo ? ranura.cantidad : 0),
    0,
  );
}

function agregarUnidadEn(ranuras, tipo, limites) {
  const limite = limitePila(limites, tipo);
  let destino = ranuras.findIndex(
    (ranura) => ranura?.tipo === tipo && ranura.cantidad < limite,
  );
  if (destino < 0) destino = ranuras.findIndex((ranura) => ranura === null);
  if (destino < 0) return false;
  if (!ranuras[destino]) ranuras[destino] = { tipo, cantidad: 0 };
  ranuras[destino].cantidad += 1;
  return destino;
}

function capturarPunteroSeguro(elemento, pointerId) {
  try {
    elemento.setPointerCapture?.(pointerId);
  } catch {
    // Algunos Safari antiguos pierden la captura al abrir una capa completa.
  }
}

function liberarPunteroSeguro(elemento, pointerId) {
  try {
    if (elemento.hasPointerCapture?.(pointerId)) {
      elemento.releasePointerCapture(pointerId);
    }
  } catch {
    // La captura ya pudo ser liberada por el navegador.
  }
}

function limitarIndice(valor, cantidad) {
  const indice = Math.floor(Number(valor));
  return Number.isInteger(indice) && indice >= 0 && indice < cantidad ? indice : 0;
}

function esCampoEditable(elemento) {
  return Boolean(
    elemento &&
      (elemento.tagName === "INPUT" ||
        elemento.tagName === "TEXTAREA" ||
        elemento.isContentEditable),
  );
}

function ahora() {
  return globalThis.performance?.now?.() ?? Date.now();
}
