import { obtenerPlantillaMundo } from "../generacion/plantillasMundo.js";
import { crearMotorAudio } from "../audio/motorAudio.js";
import { pintarMiniaturaMundo } from "../menu/menuMundos.js";
import { prepararBotonMenu, prepararPreviewMundo } from "./componentesMenu.js";

const LIMITE_NOMBRE = 24;

export function esperarSeleccionMundo(interfaz, almacenMundos, opcionesMenu = {}) {
  const detenerTitulo = animarTitulo(interfaz.tituloAnimado);
  configurarFormulario(interfaz);

  // Sonidos de interfaz del lanzador (clic y abrir panel). El navegador los
  // habilita en el primer gesto del usuario.
  const { vistaMenu = null, audio: ajustesGlobales = null } = opcionesMenu;
  const preferencias = ajustesGlobales?.obtenerPreferencias?.() ?? {};
  const audioMenu = crearMotorAudio({
    volumen: preferencias.volumen,
    silenciado: preferencias.silenciado === true,
  });
  const sonar = (id, volumen = 1) => {
    audioMenu.activar();
    audioMenu.reproducir(id, { volumen, minimoEntreMs: 40 });
  };
  interfaz.pantallaInicio.addEventListener("pointerdown", () => audioMenu.activar(), {
    once: true,
  });
  for (const boton of interfaz.pantallaInicio.querySelectorAll(
    "button, [data-joystick-preview], [data-performance-profile], [data-visual-preview]",
  )) {
    boton.addEventListener("pointerdown", () => sonar("war:ui_clic", 0.6));
  }
  for (const pestana of interfaz.pestanasAjustesGlobales ?? []) {
    pestana.addEventListener("pointerdown", () => sonar("war:ui_abrir", 0.7));
  }

  return new Promise((resolve, reject) => {
    interfaz.botonJugar.addEventListener("click", mostrarMundos);
    interfaz.estadoLanzador.addEventListener("pointerdown", () => sonar("war:ui_clic", 0.6));
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
        // Mientras el jugador explora los mundos, los sonidos se terminan de
        // sintetizar en segundo plano.
        audioMenu.activar();
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
      vistaMenu?.mostrar?.(false);
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
    const valores = { basico: 5, equilibrado: 6, alto: 10 };
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
    prepararPreviewMundo(vista);
    pintarMiniaturaMundo(vista, mundo);

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
    prepararBotonMenu(jugar, "play-world");
    jugar.addEventListener("click", () => alSeleccionar(mundo));

    tarjeta.append(vista, informacion, jugar);
    interfaz.listaMundos.append(tarjeta);
  }
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
