export function crearControles(interfaz, configuracion, estadoInicial = {}) {
  const { camara } = configuracion;
  const entradaJoystick = { x: 0, adelante: 0 };
  const teclas = new Set();
  let punteroJoystick = null;
  let punteroMirada = null;
  let punteroSalto = null;
  let punteroDescenso = null;
  let saltoSolicitado = false;
  let cambioVueloSolicitado = false;
  let ultimaMiradaX = 0;
  let ultimaMiradaY = 0;
  let giro = numeroFinito(estadoInicial.giro, camara.giroInicial);
  let inclinacion = limitar(
    numeroFinito(estadoInicial.inclinacion, camara.inclinacionInicial),
    camara.inclinacionMinima,
    camara.inclinacionMaxima,
  );

  interfaz.joystick.addEventListener("pointerdown", (event) => {
    if (punteroJoystick !== null) return;
    punteroJoystick = event.pointerId;
    capturarPunteroSeguro(interfaz.joystick, event.pointerId);
    actualizarJoystick(event);
    marcarControlesUsados();
  });

  interfaz.joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== punteroJoystick) return;
    actualizarJoystick(event);
  });

  const soltarJoystick = (event) => {
    if (event.pointerId !== punteroJoystick) return;
    reiniciarJoystick();
  };

  interfaz.joystick.addEventListener("pointerup", soltarJoystick);
  interfaz.joystick.addEventListener("pointercancel", soltarJoystick);
  interfaz.joystick.addEventListener("lostpointercapture", reiniciarJoystick);

  interfaz.zonaMirada.addEventListener("pointerdown", (event) => {
    if (
      punteroMirada !== null ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    punteroMirada = event.pointerId;
    ultimaMiradaX = event.clientX;
    ultimaMiradaY = event.clientY;
    capturarPunteroSeguro(interfaz.zonaMirada, event.pointerId);
    marcarControlesUsados();
  });

  interfaz.zonaMirada.addEventListener("pointermove", (event) => {
    if (event.pointerId !== punteroMirada) return;
    const deltaX = event.clientX - ultimaMiradaX;
    const deltaY = event.clientY - ultimaMiradaY;
    ultimaMiradaX = event.clientX;
    ultimaMiradaY = event.clientY;
    giro -= deltaX * camara.velocidadMirada;
    inclinacion = limitar(
      inclinacion - deltaY * camara.velocidadMirada,
      camara.inclinacionMinima,
      camara.inclinacionMaxima,
    );
  });

  const soltarMirada = (event) => {
    if (event.pointerId === punteroMirada) punteroMirada = null;
  };
  interfaz.zonaMirada.addEventListener("pointerup", soltarMirada);
  interfaz.zonaMirada.addEventListener("pointercancel", soltarMirada);
  interfaz.zonaMirada.addEventListener("lostpointercapture", () => {
    punteroMirada = null;
  });

  interfaz.botonSaltar.addEventListener("pointerdown", (event) => {
    if (punteroSalto !== null) return;
    event.preventDefault();
    event.stopPropagation();
    punteroSalto = event.pointerId;
    saltoSolicitado = true;
    teclas.add("ascender");
    capturarPunteroSeguro(interfaz.botonSaltar, event.pointerId);
    marcarControlesUsados();
  });

  const soltarSalto = (event) => {
    if (event.pointerId !== punteroSalto) return;
    punteroSalto = null;
    teclas.delete("ascender");
  };
  interfaz.botonSaltar.addEventListener("pointerup", soltarSalto);
  interfaz.botonSaltar.addEventListener("pointercancel", soltarSalto);
  interfaz.botonSaltar.addEventListener("lostpointercapture", () => {
    punteroSalto = null;
    teclas.delete("ascender");
  });

  interfaz.botonDescender.addEventListener("pointerdown", (event) => {
    if (punteroDescenso !== null) return;
    event.preventDefault();
    event.stopPropagation();
    punteroDescenso = event.pointerId;
    teclas.add("descender");
    capturarPunteroSeguro(interfaz.botonDescender, event.pointerId);
    marcarControlesUsados();
  });

  const soltarDescenso = (event) => {
    if (event.pointerId !== punteroDescenso) return;
    punteroDescenso = null;
    teclas.delete("descender");
  };
  interfaz.botonDescender.addEventListener("pointerup", soltarDescenso);
  interfaz.botonDescender.addEventListener("pointercancel", soltarDescenso);
  interfaz.botonDescender.addEventListener("lostpointercapture", () => {
    punteroDescenso = null;
    teclas.delete("descender");
  });

  interfaz.botonVuelo.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    cambioVueloSolicitado = true;
    marcarControlesUsados();
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (esCampoEditable(event.target)) return;
    if (
      ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
        key,
      )
    ) {
      event.preventDefault();
      teclas.add(key);
      marcarControlesUsados();
    }
    if (key === " " || key === "spacebar") {
      event.preventDefault();
      teclas.add("ascender");
      if (!event.repeat) saltoSolicitado = true;
      marcarControlesUsados();
    }
    if (key === "shift") {
      event.preventDefault();
      teclas.add("descender");
      marcarControlesUsados();
    }
    if (key === "f" && !event.repeat) {
      event.preventDefault();
      cambioVueloSolicitado = true;
      marcarControlesUsados();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    teclas.delete(key);
    if (key === " " || key === "spacebar") teclas.delete("ascender");
    if (key === "shift") teclas.delete("descender");
  });
  window.addEventListener("blur", reiniciarControles);

  function actualizarJoystick(event) {
    const bounds = interfaz.joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxDistance = bounds.width * 0.32;
    let deltaX = event.clientX - centerX;
    let deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > maxDistance) {
      const escala = maxDistance / distance;
      deltaX *= escala;
      deltaY *= escala;
    }

    const normalizedX = deltaX / maxDistance;
    const normalizedY = -deltaY / maxDistance;
    const deadZone = 0.08;
    entradaJoystick.x = Math.abs(normalizedX) > deadZone ? normalizedX : 0;
    entradaJoystick.adelante = Math.abs(normalizedY) > deadZone ? normalizedY : 0;
    interfaz.perillaJoystick.style.transform =
      `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
  }

  function reiniciarJoystick() {
    punteroJoystick = null;
    entradaJoystick.x = 0;
    entradaJoystick.adelante = 0;
    interfaz.perillaJoystick.style.transform = "translate(-50%, -50%)";
  }

  function reiniciarControles() {
    liberarPunteroSeguro(interfaz.joystick, punteroJoystick);
    liberarPunteroSeguro(interfaz.zonaMirada, punteroMirada);
    liberarPunteroSeguro(interfaz.botonSaltar, punteroSalto);
    liberarPunteroSeguro(interfaz.botonDescender, punteroDescenso);
    reiniciarJoystick();
    punteroMirada = null;
    punteroSalto = null;
    punteroDescenso = null;
    saltoSolicitado = false;
    cambioVueloSolicitado = false;
    teclas.clear();
  }

  function marcarControlesUsados() {
    interfaz.juego.classList.add("controls-used");
  }

  return {
    obtenerMovimiento() {
      let lateral = entradaJoystick.x;
      let adelante = entradaJoystick.adelante;
      if (teclas.has("a") || teclas.has("arrowleft")) lateral -= 1;
      if (teclas.has("d") || teclas.has("arrowright")) lateral += 1;
      if (teclas.has("w") || teclas.has("arrowup")) adelante += 1;
      if (teclas.has("s") || teclas.has("arrowdown")) adelante -= 1;

      const longitud = Math.hypot(lateral, adelante);
      if (longitud > 1) {
        lateral /= longitud;
        adelante /= longitud;
      }
      return { lateral, adelante };
    },
    obtenerVista() {
      return { giro, inclinacion };
    },
    obtenerMovimientoVertical() {
      return Number(teclas.has("ascender")) - Number(teclas.has("descender"));
    },
    consumirSalto() {
      const solicitado = saltoSolicitado;
      saltoSolicitado = false;
      return solicitado;
    },
    consumirCambioVuelo() {
      const solicitado = cambioVueloSolicitado;
      cambioVueloSolicitado = false;
      return solicitado;
    },
    reiniciar: reiniciarControles,
  };
}

function capturarPunteroSeguro(elemento, pointerId) {
  try {
    elemento.setPointerCapture?.(pointerId);
  } catch {
    // Safari puede cancelar la captura si aparece una interfaz superpuesta.
  }
}

function liberarPunteroSeguro(elemento, pointerId) {
  if (pointerId === null) return;
  try {
    if (elemento.hasPointerCapture?.(pointerId)) {
      elemento.releasePointerCapture(pointerId);
    }
  } catch {
    // El navegador ya liberó ese puntero; el estado local se limpia igual.
  }
}

function esCampoEditable(elemento) {
  return Boolean(
    elemento &&
      (elemento.tagName === "INPUT" ||
        elemento.tagName === "TEXTAREA" ||
        elemento.isContentEditable),
  );
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function numeroFinito(valor, respaldo) {
  return Number.isFinite(Number(valor)) ? Number(valor) : respaldo;
}
