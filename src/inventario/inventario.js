export const NOMBRES_BLOQUE = Object.freeze({
  pasto: "Bloque de pasto",
  hojas: "Bloque de hojas",
  madera: "Bloque de madera",
  arena: "Bloque de arena",
});

export function crearInventario(interfaz, configuracion, opcionesMundo = {}) {
  const limites = configuracion.inventario.limites;
  const creativo = opcionesMundo.modo === "creativo";
  const estados = {
    pasto: crearEstado(interfaz.espacioPasto, interfaz.contadorPasto),
    hojas: crearEstado(interfaz.espacioHojas, interfaz.contadorHojas),
    madera: crearEstado(interfaz.espacioMadera, interfaz.contadorMadera),
    arena: crearEstado(interfaz.espacioArena, interfaz.contadorArena),
  };
  let seleccionado = "pasto";

  for (const [tipo, estado] of Object.entries(estados)) {
    estado.espacio.addEventListener("click", () => seleccionar(tipo));
  }
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
      return creativo && estados[tipo] ? Number.POSITIVE_INFINITY : (estados[tipo]?.cantidad ?? 0);
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
  };

  function seleccionar(tipo) {
    if (!estados[tipo]) return;
    seleccionado = tipo;
    actualizarInterfaz();
  }

  function actualizarInterfaz() {
    for (const [tipo, estado] of Object.entries(estados)) {
      estado.contador.textContent = creativo ? "∞" : String(estado.cantidad);
      estado.espacio.classList.toggle("is-empty", !creativo && estado.cantidad === 0);
      estado.espacio.classList.toggle("is-unlimited", creativo);
      estado.espacio.classList.toggle("is-selected", tipo === seleccionado);
      estado.espacio.setAttribute("aria-pressed", String(tipo === seleccionado));
      estado.espacio.setAttribute(
        "aria-label",
        creativo
          ? `${NOMBRES_BLOQUE[tipo]}: ilimitado`
          : `${NOMBRES_BLOQUE[tipo]}: ${estado.cantidad} de ${limites[tipo]}`,
      );
    }
    interfaz.botonColocar.disabled = !creativo && estados[seleccionado].cantidad === 0;
    interfaz.botonColocar.setAttribute(
      "aria-label",
      `Colocar ${NOMBRES_BLOQUE[seleccionado].toLowerCase()}`,
    );
  }
}

function crearEstado(espacio, contador) {
  return { cantidad: 0, reservas: 0, espacio, contador };
}
