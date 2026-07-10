export function crearControles(interfaz, configuracion) {
  const { camara } = configuracion;
  const entradaJoystick = { x: 0, adelante: 0 };
  const teclas = new Set();
  let punteroJoystick = null;
  let punteroMirada = null;
  let ultimaMiradaX = 0;
  let ultimaMiradaY = 0;
  let giro = camara.giroInicial;
  let inclinacion = camara.inclinacionInicial;

  interfaz.joystick.addEventListener("pointerdown", (event) => {
    if (punteroJoystick !== null) return;
    punteroJoystick = event.pointerId;
    interfaz.joystick.setPointerCapture(event.pointerId);
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
    interfaz.zonaMirada.setPointerCapture(event.pointerId);
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

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (
      ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
        key,
      )
    ) {
      event.preventDefault();
      teclas.add(key);
      marcarControlesUsados();
    }
  });

  window.addEventListener("keyup", (event) => {
    teclas.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", () => teclas.clear());

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
  };
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
