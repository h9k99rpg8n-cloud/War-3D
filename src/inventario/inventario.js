export const NOMBRES_BLOQUE = Object.freeze({
  pasto: "Bloque de pasto",
  hojas: "Bloque de hojas",
  madera: "Bloque de madera",
});

export function crearInventario(interfaz, configuracion) {
  const limites = configuracion.inventario.limites;
  const estados = {
    pasto: crearEstado(interfaz.espacioPasto, interfaz.contadorPasto),
    hojas: crearEstado(interfaz.espacioHojas, interfaz.contadorHojas),
    madera: crearEstado(interfaz.espacioMadera, interfaz.contadorMadera),
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

    nombre(tipo) {
      return NOMBRES_BLOQUE[tipo] ?? "Bloque";
    },

    cantidad(tipo = seleccionado) {
      return estados[tipo]?.cantidad ?? 0;
    },

    estaLleno(tipo) {
      const estado = estados[tipo];
      return !estado || estado.cantidad + estado.reservas >= limites[tipo];
    },

    reservarEspacio(tipo) {
      const estado = estados[tipo];
      if (!estado || estado.cantidad + estado.reservas >= limites[tipo]) return false;
      estado.reservas += 1;
      return true;
    },

    liberarReserva(tipo) {
      const estado = estados[tipo];
      if (estado) estado.reservas = Math.max(0, estado.reservas - 1);
    },

    confirmarRecoleccion(tipo) {
      const estado = estados[tipo];
      if (!estado) return false;
      if (estado.reservas > 0) estado.reservas -= 1;
      if (estado.cantidad >= limites[tipo]) return false;
      estado.cantidad += 1;
      actualizarInterfaz();
      return true;
    },

    usarBloque(tipo = seleccionado) {
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
      estado.contador.textContent = `${estado.cantidad} / ${limites[tipo]}`;
      estado.espacio.classList.toggle("is-empty", estado.cantidad === 0);
      estado.espacio.classList.toggle("is-selected", tipo === seleccionado);
      estado.espacio.setAttribute("aria-pressed", String(tipo === seleccionado));
    }
    interfaz.botonColocar.disabled = estados[seleccionado].cantidad === 0;
    interfaz.botonColocar.setAttribute(
      "aria-label",
      `Colocar ${NOMBRES_BLOQUE[seleccionado].toLowerCase()}`,
    );
  }
}

function crearEstado(espacio, contador) {
  return { cantidad: 0, reservas: 0, espacio, contador };
}
