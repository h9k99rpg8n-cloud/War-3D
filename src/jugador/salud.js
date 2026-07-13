export function crearSistemaSalud(interfaz, configuracion, opcionesMundo = {}) {
  const activo = opcionesMundo.modo === "supervivencia";
  const maximo = configuracion.jugador.corazones;
  const corazonesGuardados = Number(opcionesMundo.progreso?.salud?.corazones);
  let corazones = activo && Number.isFinite(corazonesGuardados)
    ? Math.max(1, Math.min(maximo, Math.floor(corazonesGuardados)))
    : maximo;
  let invulnerableHasta = 0;
  let destelloHasta = 0;
  let sacudidaHasta = 0;
  let ladoSacudida = 1;
  let muerto = false;
  let alReaparecer = () => {};

  interfaz.salud.hidden = !activo;
  interfaz.panelMuerte.hidden = true;
  actualizarInterfaz();

  interfaz.botonReaparecer.addEventListener("click", () => {
    if (!muerto) return;
    corazones = maximo;
    muerto = false;
    invulnerableHasta = performance.now() + configuracion.jugador.invulnerabilidadMs;
    interfaz.panelMuerte.hidden = true;
    interfaz.juego.classList.remove("player-dead");
    actualizarInterfaz();
    alReaparecer();
  });

  return {
    activo,

    actualizar(now) {
      if (now >= destelloHasta) interfaz.destelloDano.classList.remove("is-active");
    },

    recibirDano(cantidad = 1, now = performance.now()) {
      if (!activo || muerto || now < invulnerableHasta) return false;
      corazones = Math.max(0, corazones - cantidad);
      invulnerableHasta = now + configuracion.jugador.invulnerabilidadMs;
      destelloHasta = now + 280;
      sacudidaHasta = now + 340;
      ladoSacudida *= -1;
      interfaz.destelloDano.classList.remove("is-active");
      // Reinicia el destello aunque dos ataques ocurran tras la misma animación CSS.
      void interfaz.destelloDano.offsetWidth;
      interfaz.destelloDano.classList.add("is-active");
      actualizarInterfaz();

      if (corazones === 0) {
        muerto = true;
        interfaz.panelMuerte.hidden = false;
        interfaz.juego.classList.add("player-dead");
      }
      return true;
    },

    estaMuerto() {
      return muerto;
    },

    obtenerCorazones() {
      return corazones;
    },

    exportarEstado() {
      return { corazones };
    },

    obtenerSacudida(now = performance.now()) {
      if (!activo || now >= sacudidaHasta) return 0;
      return Math.max(0, Math.min(1, (sacudidaHasta - now) / 340));
    },

    obtenerLadoSacudida() {
      return ladoSacudida;
    },

    establecerAlReaparecer(callback) {
      alReaparecer = typeof callback === "function" ? callback : () => {};
    },
  };

  function actualizarInterfaz() {
    interfaz.corazones.forEach((corazon, indice) => {
      corazon.classList.toggle("is-empty", indice >= corazones);
    });
    interfaz.etiquetaSalud.textContent = `${corazones} / ${maximo}`;
    interfaz.salud.setAttribute(
      "aria-label",
      `Salud del jugador: ${corazones} de ${maximo} corazones`,
    );
  }
}
