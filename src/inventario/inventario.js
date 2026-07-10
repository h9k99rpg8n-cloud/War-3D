export function crearInventario(interfaz, configuracion) {
  const limite = configuracion.inventario.limiteBloquesPasto;
  let cantidadPasto = 0;
  let reservas = 0;

  actualizarInterfaz();

  return {
    cantidad() {
      return cantidadPasto;
    },

    estaLleno() {
      return cantidadPasto + reservas >= limite;
    },

    reservarEspacio() {
      if (cantidadPasto + reservas >= limite) return false;
      reservas += 1;
      return true;
    },

    liberarReserva() {
      reservas = Math.max(0, reservas - 1);
    },

    confirmarRecoleccion() {
      if (reservas > 0) reservas -= 1;
      if (cantidadPasto >= limite) return false;
      cantidadPasto += 1;
      actualizarInterfaz();
      return true;
    },

    usarBloque() {
      if (cantidadPasto <= 0) return false;
      cantidadPasto -= 1;
      actualizarInterfaz();
      return true;
    },
  };

  function actualizarInterfaz() {
    interfaz.contadorPasto.textContent = `${cantidadPasto} / ${limite}`;
    interfaz.espacioPasto.classList.toggle("is-empty", cantidadPasto === 0);
    interfaz.botonColocar.disabled = cantidadPasto === 0;
  }
}
