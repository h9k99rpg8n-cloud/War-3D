import { obtenerPlantillaMundo } from "../generacion/plantillasMundo.js";

const LIMITE_NOMBRE = 24;

export function esperarSeleccionMundo(interfaz, almacenMundos) {
  const detenerTitulo = animarTitulo(interfaz.tituloAnimado);
  configurarFormulario(interfaz);

  return new Promise((resolve, reject) => {
    interfaz.botonJugar.addEventListener("click", mostrarMundos);
    interfaz.botonVolverPortada.addEventListener("click", () => mostrarVista(interfaz, "portada"));
    interfaz.botonesCrearMundo.forEach((boton) => {
      boton.addEventListener("click", () => mostrarVista(interfaz, "crear"));
    });
    interfaz.botonVolverMundos.addEventListener("click", mostrarMundos);
    interfaz.formularioMundo.addEventListener("submit", crearMundo);

    async function mostrarMundos() {
      try {
        interfaz.estadoLanzador.textContent = "CARGANDO MUNDOS…";
        mostrarVista(interfaz, "mundos");
        const mundos = await almacenMundos.listarMundos();
        pintarMundos(interfaz, mundos, seleccionarMundo);
        interfaz.estadoLanzador.textContent = mundos.length
          ? `${mundos.length} ${mundos.length === 1 ? "MUNDO GUARDADO" : "MUNDOS GUARDADOS"}`
          : "TU PRIMERA AVENTURA ESTÁ POR COMENZAR";
      } catch (error) {
        reject(error);
      }
    }

    async function crearMundo(event) {
      event.preventDefault();
      const boton = interfaz.formularioMundo.querySelector('button[type="submit"]');
      boton.disabled = true;
      boton.querySelector("b").textContent = "CREANDO…";
      try {
        const datos = new FormData(interfaz.formularioMundo);
        const modo = datos.get("gameMode") === "creativo" ? "creativo" : "supervivencia";
        const tipoMundo =
          modo === "creativo" && datos.get("worldType") === "plano"
            ? "plano"
            : "normal";
        const mundo = await almacenMundos.crearMundo({
          nombreMundo: interfaz.nombreMundo.value,
          modo,
          tipoMundo,
          plantillaId:
            modo === "creativo"
              ? tipoMundo === "plano"
                ? "war:flat"
                : String(datos.get("worldTemplate") || "war:pond_grove")
              : null,
          tamanoMundo: Number(datos.get("worldSize")),
          dificultad: String(datos.get("difficulty") || "normal"),
          tiempo: String(datos.get("timeMode") || "normal"),
          estiloVisual:
            datos.get("visualStyle") === "pixelar" ? "pixelar" : "traditional",
          aguaExperimental: datos.get("experimentalWater") === "on",
          perfilRendimiento: String(datos.get("performanceProfile") || "equilibrado"),
          distanciaCarga: Number(datos.get("loadDistance") || 6),
          joystickSkin: ["traditional", "dark", "pixel"].includes(
            datos.get("joystickSkin"),
          )
            ? String(datos.get("joystickSkin"))
            : "traditional",
          colisionJugador: {
            height: Number(datos.get("playerHeight")),
            width: Number(datos.get("playerWidth")),
            eyeHeight: Number(datos.get("playerEyeHeight")),
            stepHeight: Number(datos.get("playerStepHeight")),
          },
        });
        seleccionarMundo(mundo);
      } catch (error) {
        boton.disabled = false;
        boton.querySelector("b").textContent = "CREAR MUNDO";
        reject(error);
      }
    }

    function seleccionarMundo(mundo) {
      detenerTitulo();
      document.title = `War 3D — ${mundo.nombreMundo}`;
      resolve(mundo);
    }
  });
}

function mostrarVista(interfaz, nombre) {
  const vistas = {
    portada: interfaz.vistaPortada,
    mundos: interfaz.vistaMundos,
    crear: interfaz.vistaCrearMundo,
  };
  for (const [clave, vista] of Object.entries(vistas)) {
    vista.hidden = clave !== nombre;
  }
  interfaz.pantallaInicio.dataset.view = nombre;
  if (nombre === "crear") {
    interfaz.nombreMundo.focus({ preventScroll: true });
  }
}

function configurarFormulario(interfaz) {
  const opcionesModo = [
    ...interfaz.formularioMundo.querySelectorAll('input[name="gameMode"]'),
  ];
  const actualizar = () => {
    const creativo = opcionesModo.some(
      (opcion) => opcion.checked && opcion.value === "creativo",
    );
    interfaz.mundoPlano.disabled = !creativo;
    interfaz.opcionMundoPlano.classList.toggle("is-disabled", !creativo);
    interfaz.notaMundoPlano.textContent = creativo
      ? "Terreno uniforme para construir"
      : "Solo disponible en creativo";
    interfaz.selectorPlantilla.disabled = !creativo || interfaz.mundoPlano.checked;
    interfaz.selectorPlantillaCampo.classList.toggle(
      "is-disabled",
      !creativo || interfaz.mundoPlano.checked,
    );
    interfaz.tituloPlantillaNormal.textContent = creativo
      ? "ELEGIR PLANTILLA"
      : "ALEATORIA";
    interfaz.notaPlantillaNormal.textContent = creativo
      ? "Selecciona la generación debajo"
      : "Una de cinco plantillas oficiales";
    interfaz.campoDificultad.classList.toggle("is-disabled", creativo);
    for (const entrada of interfaz.campoDificultad.querySelectorAll("input")) {
      entrada.disabled = creativo;
    }
    if (!creativo && interfaz.mundoPlano.checked) {
      interfaz.formularioMundo.querySelector('input[name="worldType"][value="normal"]').checked = true;
    }
  };

  interfaz.nombreMundo.addEventListener("input", () => {
    interfaz.contadorNombre.textContent = `${interfaz.nombreMundo.value.length} / ${LIMITE_NOMBRE}`;
  });
  for (const opcion of opcionesModo) opcion.addEventListener("change", actualizar);
  for (const opcion of interfaz.formularioMundo.querySelectorAll('input[name="worldType"]')) {
    opcion.addEventListener("change", actualizar);
  }
  interfaz.botonAjustesCreacion.addEventListener("click", () => {
    const abrir = interfaz.ajustesCreacion.hidden;
    interfaz.ajustesCreacion.hidden = !abrir;
    interfaz.botonAjustesCreacion.setAttribute("aria-expanded", String(abrir));
  });
  interfaz.distanciaCargaCreacion.addEventListener("input", actualizarDistancia);
  interfaz.perfilRendimientoCreacion.addEventListener("change", () => {
    const valores = { basico: 6, equilibrado: 8, alto: 12 };
    const valor = valores[interfaz.perfilRendimientoCreacion.value];
    if (valor) interfaz.distanciaCargaCreacion.value = String(valor);
    actualizarDistancia();
  });
  for (const opcion of interfaz.formularioMundo.querySelectorAll('input[name="worldSize"]')) {
    opcion.addEventListener("change", actualizarConsejoTamano);
  }
  interfaz.contadorNombre.textContent = `0 / ${LIMITE_NOMBRE}`;
  actualizar();
  actualizarDistancia();
  actualizarConsejoTamano();

  function actualizarDistancia() {
    const valor = Number(interfaz.distanciaCargaCreacion.value) || 6;
    interfaz.valorDistanciaCarga.textContent = String(valor);
    interfaz.avisoDistanciaCarga.textContent =
      valor <= 6
        ? "6 es la distancia recomendada para teléfonos."
        : valor <= 12
          ? "Carga intermedia: recomendada para gama media o alta."
          : "Advertencia: una distancia elevada utiliza más memoria y GPU.";
    interfaz.avisoDistanciaCarga.classList.toggle("is-warning", valor > 12);
  }

  function actualizarConsejoTamano() {
    const seleccionada = interfaz.formularioMundo.querySelector(
      'input[name="worldSize"]:checked',
    );
    const tamano = Number(seleccionada?.value) || 128;
    const textos = {
      64: "64×64 · ligero para dispositivos antiguos.",
      96: "96×96 · equilibrio para teléfonos de gama baja.",
      128: "128×128 · recomendado para la mayoría de teléfonos.",
      192: "192×192 · usa carga regional; recomendado para gama media.",
      256: "256×256 · máximo de la snapshot; no se carga completo en memoria.",
    };
    interfaz.consejoTamanoMundo.textContent = textos[tamano] ?? textos[128];
  }
}

function pintarMundos(interfaz, mundos, alSeleccionar) {
  interfaz.listaMundos.replaceChildren();
  interfaz.estadoVacio.hidden = mundos.length > 0;
  interfaz.listaMundos.hidden = mundos.length === 0;
  interfaz.botonCrearMundoLista.hidden = mundos.length === 0;

  for (const mundo of mundos) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "world-card";

    const vista = document.createElement("canvas");
    vista.className = "world-card__preview";
    vista.width = 160;
    vista.height = 90;
    vista.setAttribute("aria-hidden", "true");
    pintarVistaPrevia(vista, mundo);

    const informacion = document.createElement("div");
    informacion.className = "world-card__body";
    const encabezado = document.createElement("div");
    encabezado.className = "world-card__heading";
    const titulo = document.createElement("h3");
    titulo.textContent = mundo.nombreMundo;
    const etiqueta = document.createElement("span");
    etiqueta.textContent =
      mundo.modo === "creativo" ? "CREATIVO · ILIMITADO" : "SUPERVIVENCIA";
    encabezado.append(titulo, etiqueta);

    const detalles = document.createElement("p");
    const dificultad = mundo.modo === "creativo"
      ? "Sin criaturas hostiles"
      : nombreDificultad(mundo.dificultad);
    const plantilla = obtenerPlantillaMundo(mundo.plantillaId);
    detalles.textContent =
      `${mundo.tamanoMundo}×${mundo.tamanoMundo} · ${plantilla.nombre} · ${dificultad} · ${nombreTiempo(mundo.tiempo)}`;

    const fechas = document.createElement("dl");
    fechas.className = "world-card__dates";
    agregarFecha(fechas, "CREADO", mundo.creadoEn);
    agregarFecha(fechas, "ÚLTIMA PARTIDA", mundo.modificadoEn);
    informacion.append(encabezado, detalles, fechas);

    const jugar = document.createElement("button");
    jugar.type = "button";
    jugar.className = "world-card__play";
    jugar.setAttribute("aria-label", `Jugar en ${mundo.nombreMundo}`);
    jugar.innerHTML = '<svg class="ui-icon" aria-hidden="true"><use href="#icon-play"></use></svg><b>ENTRAR</b>';
    jugar.addEventListener("click", () => alSeleccionar(mundo));

    tarjeta.append(vista, informacion, jugar);
    interfaz.listaMundos.append(tarjeta);
  }
}

function pintarVistaPrevia(canvas, mundo) {
  const contexto = canvas.getContext("2d");
  if (!contexto) return;
  contexto.imageSmoothingEnabled = false;
  const semilla = Number(mundo.semilla) || 1;
  const noche = mundo.tiempo === "siempre_noche";
  contexto.fillStyle = noche ? "#17223f" : "#82c4e8";
  contexto.fillRect(0, 0, 160, 54);
  contexto.fillStyle = noche ? "#f4f3d8" : "#ffd762";
  contexto.fillRect(126, 12, 12, 12);
  contexto.fillStyle = noche ? "#17391f" : "#69bd49";
  contexto.fillRect(0, 50, 160, 40);
  contexto.fillStyle = noche ? "#102c18" : "#45963b";
  for (let x = 0; x < 160; x += 8) {
    const altura = 3 + Math.floor(ruido(semilla, x) * 8);
    contexto.fillRect(x, 50 - altura, 8, altura + 2);
  }
  contexto.fillStyle = "#77502e";
  for (let indice = 0; indice < 4; indice += 1) {
    const x = 15 + Math.floor(ruido(semilla + indice, 9) * 120);
    contexto.fillRect(x, 34, 6, 23);
    contexto.fillStyle = noche ? "#174628" : "#368c3c";
    contexto.fillRect(x - 9, 24, 24, 18);
    contexto.fillStyle = "#77502e";
  }
  contexto.fillStyle = "rgba(255,255,255,.18)";
  contexto.fillRect(0, 50, 160, 2);
}

function agregarFecha(lista, etiqueta, fecha) {
  const termino = document.createElement("dt");
  termino.textContent = etiqueta;
  const valor = document.createElement("dd");
  valor.textContent = formatearFecha(fecha);
  lista.append(termino, valor);
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));
}

function nombreDificultad(valor) {
  if (valor === "pacifica") return "Pacífica";
  if (valor === "dificil") return "Difícil";
  return "Normal";
}

function nombreTiempo(valor) {
  if (valor === "siempre_dia") return "Siempre de día";
  if (valor === "siempre_noche") return "Siempre de noche";
  return "Ciclo normal";
}

function animarTitulo(elemento) {
  const texto = "WAR 3D";
  let indice = 0;
  let borrando = false;
  let temporizador = 0;
  let detenido = false;

  const paso = () => {
    if (detenido) return;
    elemento.textContent = texto.slice(0, indice);
    if (!borrando && indice < texto.length) {
      indice += 1;
      temporizador = window.setTimeout(paso, 115);
      return;
    }
    if (!borrando) {
      borrando = true;
      temporizador = window.setTimeout(paso, 1_650);
      return;
    }
    if (indice > 0) {
      indice -= 1;
      temporizador = window.setTimeout(paso, 65);
      return;
    }
    borrando = false;
    temporizador = window.setTimeout(paso, 520);
  };
  paso();
  return () => {
    detenido = true;
    window.clearTimeout(temporizador);
  };
}

function ruido(a, b) {
  const valor = Math.sin(a * 0.00013 + b * 17.31) * 43758.5453;
  return valor - Math.floor(valor);
}
