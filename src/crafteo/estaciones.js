import {
  DEFINICIONES_INVENTARIO,
  NOMBRES_BLOQUE,
} from "../inventario/inventario.js";
import { SURVIVAL_MAX_STACK } from "../inventario/constantes.js";
import {
  colocarIngrediente,
  consumirRecetaCuadricula,
  crearCuadriculaCrafteo,
  validarRecetaCuadricula,
} from "./crafteoManual.js";
import { recetasParaEstacion } from "./recetas.js";
import { crearSistemaCrafteo } from "./sistemaCrafteo.js";

export function crearSistemaEstaciones(
  interfaz,
  inventario,
  configuracion,
  opcionesMundo = {},
) {
  const crafteo = crearSistemaCrafteo(inventario);
  const estadosHorno = restaurarHornos(opcionesMundo.progreso?.estaciones?.hornos);
  let estacionAbierta = null;
  let hornoActualId = null;
  let ultimoTiempo = null;
  const cuadricula = crearCuadriculaCrafteo();
  let ingredienteSeleccionado = null;

  interfaz.panelEstacion.hidden = true;
  interfaz.interfazHorno.hidden = true;
  interfaz.cerrarEstacion.addEventListener("click", cerrar);
  interfaz.panelEstacion.addEventListener("pointerdown", (event) => {
    if (event.target === interfaz.panelEstacion) cerrar();
  });
  interfaz.botonCrafteoInventario.addEventListener("click", () => {
    inventario.cerrar();
    abrirCrafteo("inventory");
  });
  interfaz.botonArenaHorno.addEventListener("click", () =>
    transferirAlHorno("arena"),
  );
  interfaz.botonCarbonHorno.addEventListener("click", () =>
    transferirAlHorno("carbon"),
  );
  interfaz.botonRecogerHorno.addEventListener("click", recogerCristal);
  prepararMesaManual();

  return {
    abrirCrafteo,

    interactuar(bloque) {
      if (bloque?.tipo === "mesa_crafteo") {
        abrirCrafteo("crafting_table");
        return true;
      }
      if (bloque?.tipo === "horno") {
        abrirHorno(bloque);
        return true;
      }
      return false;
    },

    esInteractuable(tipo) {
      return tipo === "mesa_crafteo" || tipo === "horno";
    },

    estaAbierto() {
      return estacionAbierta !== null;
    },

    cerrar,

    actualizar(now, simular = true) {
      if (ultimoTiempo === null) ultimoTiempo = now;
      const delta = simular ? Math.min(250, Math.max(0, now - ultimoTiempo)) : 0;
      ultimoTiempo = now;
      for (const estado of estadosHorno.values()) {
        avanzarEstadoHorno(estado, delta, configuracion.horno);
      }
      if (estacionAbierta === "furnace") pintarHorno();
    },

    exportarEstado() {
      return {
        version: 1,
        hornos: [...estadosHorno.values()].map((estado) => ({
          id: estado.id,
          inputItemId: estado.inputItemId,
          inputAmount: estado.inputAmount,
          fuelItemId: estado.fuelItemId,
          fuelAmount: estado.fuelAmount,
          outputItemId: estado.outputItemId,
          outputAmount: estado.outputAmount,
          progress: redondear(estado.progress),
          remainingFuelTime: redondear(estado.remainingFuelTime),
        })),
      };
    },
  };

  function abrirCrafteo(estacion) {
    estacionAbierta = estacion;
    hornoActualId = null;
    interfaz.interfazHorno.hidden = true;
    interfaz.interfazMesaCrafteo.hidden = estacion !== "crafting_table";
    interfaz.libroRecetas.hidden = true;
    interfaz.listaRecetas.hidden = estacion === "crafting_table";
    interfaz.subtituloEstacion.textContent =
      estacion === "inventory" ? "FABRICACIÓN PERSONAL" : "ESTACIÓN DE TRABAJO";
    interfaz.tituloEstacion.textContent =
      estacion === "inventory" ? "CRAFTEO BÁSICO" : "MESA DE CRAFTEO";
    interfaz.mensajeEstacion.textContent = "";
    if (estacion === "crafting_table") {
      pintarMesaManual();
      pintarLibroRecetas();
    } else {
      pintarRecetas(estacion);
    }
    abrirPanel();
  }

  function abrirHorno(bloque) {
    estacionAbierta = "furnace";
    hornoActualId = `${bloque.x}:${bloque.y}:${bloque.z}`;
    if (!estadosHorno.has(hornoActualId)) {
      estadosHorno.set(hornoActualId, crearEstadoHorno(hornoActualId));
    }
    interfaz.listaRecetas.hidden = true;
    interfaz.interfazMesaCrafteo.hidden = true;
    interfaz.libroRecetas.hidden = true;
    interfaz.interfazHorno.hidden = false;
    interfaz.subtituloEstacion.textContent = "ESTACIÓN TÉRMICA";
    interfaz.tituloEstacion.textContent = "HORNO";
    interfaz.mensajeEstacion.textContent =
      "El carbón alimenta el horno; la arena se transforma en cristal.";
    pintarHorno();
    abrirPanel();
  }

  function abrirPanel() {
    interfaz.panelEstacion.hidden = false;
    interfaz.juego.classList.add("station-open");
    requestAnimationFrame(() => interfaz.cerrarEstacion.focus({ preventScroll: true }));
  }

  function cerrar() {
    if (estacionAbierta === "crafting_table" && !devolverCuadricula()) {
      interfaz.mensajeEstacion.textContent =
        "Libera espacio para recuperar los ingredientes de la cuadrícula.";
      return;
    }
    estacionAbierta = null;
    hornoActualId = null;
    interfaz.panelEstacion.hidden = true;
    interfaz.juego.classList.remove("station-open");
  }

  function prepararMesaManual() {
    interfaz.rejillaCrafteo.replaceChildren();
    for (let indice = 0; indice < cuadricula.length; indice += 1) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "crafting-grid__cell";
      boton.dataset.craftingIndex = String(indice);
      boton.setAttribute("role", "gridcell");
      boton.addEventListener("click", () => interactuarCelda(indice));
      interfaz.rejillaCrafteo.append(boton);
    }
    interfaz.resultadoCrafteo.addEventListener("click", fabricarDesdeCuadricula);
    interfaz.botonLibroRecetas.addEventListener("click", () => {
      interfaz.libroRecetas.hidden = false;
      interfaz.interfazMesaCrafteo.hidden = true;
      pintarLibroRecetas();
    });
    interfaz.cerrarLibroRecetas.addEventListener("click", () => {
      interfaz.libroRecetas.hidden = true;
      interfaz.interfazMesaCrafteo.hidden = false;
      pintarMesaManual();
    });
  }

  function interactuarCelda(indice) {
    const celda = cuadricula[indice];
    if (ingredienteSeleccionado) {
      if (celda && celda.itemId !== ingredienteSeleccionado) {
        interfaz.mensajeEstacion.textContent =
          "Esa celda contiene otro ingrediente.";
        return;
      }
      if (inventario.retirar(ingredienteSeleccionado, 1) !== 1) {
        ingredienteSeleccionado = null;
        interfaz.mensajeEstacion.textContent = "Ya no tienes ese ingrediente.";
        pintarMesaManual();
        return;
      }
      colocarIngrediente(cuadricula, indice, ingredienteSeleccionado, 1);
      interfaz.mensajeEstacion.textContent =
        `${NOMBRES_BLOQUE[ingredienteSeleccionado]} colocado.`;
    } else if (celda) {
      if (inventario.agregarParcial(celda.itemId, 1) !== 1) {
        interfaz.mensajeEstacion.textContent = "No hay espacio para retirarlo.";
        return;
      }
      celda.amount -= 1;
      if (celda.amount <= 0) cuadricula[indice] = null;
    }
    pintarMesaManual();
  }

  function pintarMesaManual() {
    for (const boton of interfaz.rejillaCrafteo.children) {
      const indice = Number(boton.dataset.craftingIndex);
      const celda = cuadricula[indice];
      boton.replaceChildren();
      boton.classList.toggle("is-filled", Boolean(celda));
      if (celda) {
        const definicion = DEFINICIONES_INVENTARIO[celda.itemId];
        boton.append(
          crearIconoContenido(definicion),
          crearTexto("b", String(celda.amount), "crafting-grid__amount"),
        );
        boton.setAttribute(
          "aria-label",
          `${definicion?.nombre ?? celda.itemId}, ${celda.amount}`,
        );
      } else {
        boton.setAttribute("aria-label", `Celda ${indice + 1} vacía`);
      }
    }
    pintarInventarioMesa();
    const receta = validarRecetaCuadricula(
      cuadricula,
      recetasParaEstacion("crafting_table"),
    );
    const definicion = DEFINICIONES_INVENTARIO[receta?.result.itemId];
    interfaz.resultadoCrafteo.disabled =
      !receta ||
      !inventario.puedeAgregar(receta.result.itemId, receta.result.amount);
    interfaz.iconoResultadoCrafteo.className =
      `inventory-tile ${definicion?.clase ?? ""}`;
    interfaz.etiquetaResultadoCrafteo.textContent = receta
      ? `${receta.result.amount} × ${definicion?.nombre ?? receta.result.itemId}`
      : "SIN RECETA";
  }

  function pintarInventarioMesa() {
    interfaz.inventarioMesaCrafteo.replaceChildren();
    const porTipo = new Map();
    for (const ranura of inventario.obtenerRanuras()) {
      if (!ranura) continue;
      porTipo.set(
        ranura.tipo,
        (porTipo.get(ranura.tipo) ?? 0) +
          (ranura.infinite ? 1 : ranura.cantidad),
      );
    }
    for (const [tipo, cantidad] of porTipo) {
      const definicion = DEFINICIONES_INVENTARIO[tipo];
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "crafting-inventory-item";
      boton.classList.toggle("is-selected", ingredienteSeleccionado === tipo);
      boton.append(
        crearIconoContenido(definicion),
        crearTexto("span", definicion?.nombre ?? tipo),
        crearTexto("b", inventario.esCreativo() ? "∞" : String(cantidad)),
      );
      boton.addEventListener("click", () => {
        ingredienteSeleccionado =
          ingredienteSeleccionado === tipo ? null : tipo;
        pintarMesaManual();
      });
      interfaz.inventarioMesaCrafteo.append(boton);
    }
  }

  function fabricarDesdeCuadricula() {
    const receta = validarRecetaCuadricula(
      cuadricula,
      recetasParaEstacion("crafting_table"),
    );
    if (!receta) return;
    if (!inventario.puedeAgregar(receta.result.itemId, receta.result.amount)) {
      interfaz.mensajeEstacion.textContent =
        "No hay espacio para guardar el resultado.";
      return;
    }
    if (!consumirRecetaCuadricula(cuadricula, receta)) return;
    if (!inventario.agregar(receta.result.itemId, receta.result.amount)) {
      interfaz.mensajeEstacion.textContent =
        "La fabricación se canceló sin consumir objetos.";
      return;
    }
    interfaz.mensajeEstacion.textContent =
      `Fabricaste ${receta.result.amount} ${NOMBRES_BLOQUE[receta.result.itemId]}.`;
    pintarMesaManual();
    pintarLibroRecetas();
  }

  function pintarLibroRecetas() {
    interfaz.listaLibroRecetas.replaceChildren();
    for (const receta of recetasParaEstacion("crafting_table")) {
      const faltantes = receta.ingredients.filter(
        (ingrediente) =>
          inventario.cantidadTotal(ingrediente.itemId) < ingrediente.amount,
      );
      const tarjeta = document.createElement("article");
      tarjeta.className = "recipe-book-card";
      const definicion = DEFINICIONES_INVENTARIO[receta.result.itemId];
      tarjeta.append(
        crearIconoContenido(definicion),
        crearTexto(
          "strong",
          `${receta.result.amount} × ${definicion?.nombre ?? receta.result.itemId}`,
        ),
        crearTexto(
          "small",
          faltantes.length
            ? `FALTAN: ${faltantes.map((item) => NOMBRES_BLOQUE[item.itemId]).join(", ")}`
            : "MATERIALES DISPONIBLES",
        ),
      );
      const boton = crearTexto("button", "COLOCAR EN CUADRÍCULA");
      boton.type = "button";
      boton.disabled = faltantes.length > 0;
      boton.addEventListener("click", () => colocarRecetaDesdeLibro(receta));
      tarjeta.append(boton);
      interfaz.listaLibroRecetas.append(tarjeta);
    }
  }

  function colocarRecetaDesdeLibro(receta) {
    if (!devolverCuadricula()) return;
    const retirados = [];
    for (const ingrediente of receta.ingredients) {
      const cantidad = inventario.retirar(ingrediente.itemId, ingrediente.amount);
      if (cantidad !== ingrediente.amount) {
        for (const retirado of retirados) {
          inventario.agregar(retirado.itemId, retirado.amount);
        }
        interfaz.mensajeEstacion.textContent = "Faltan materiales.";
        return;
      }
      retirados.push(ingrediente);
    }
    if (receta.pattern) {
      for (let y = 0; y < receta.pattern.length; y += 1) {
        for (let x = 0; x < receta.pattern[y].length; x += 1) {
          const simbolo = receta.pattern[y][x];
          const tipo = receta.key?.[simbolo];
          if (tipo) colocarIngrediente(cuadricula, y * 6 + x, tipo, 1);
        }
      }
    } else {
      let indice = 0;
      for (const ingrediente of receta.ingredients) {
        colocarIngrediente(
          cuadricula,
          indice,
          ingrediente.itemId,
          ingrediente.amount,
        );
        indice += 1;
      }
    }
    ingredienteSeleccionado = null;
    interfaz.libroRecetas.hidden = true;
    interfaz.interfazMesaCrafteo.hidden = false;
    interfaz.mensajeEstacion.textContent =
      "Ingredientes colocados; toca el resultado para fabricar.";
    pintarMesaManual();
  }

  function devolverCuadricula() {
    for (let indice = 0; indice < cuadricula.length; indice += 1) {
      const celda = cuadricula[indice];
      if (!celda) continue;
      const devueltos = inventario.agregarParcial(celda.itemId, celda.amount);
      celda.amount -= devueltos;
      if (celda.amount <= 0) cuadricula[indice] = null;
    }
    return cuadricula.every((celda) => celda === null);
  }

  function pintarRecetas(estacion) {
    interfaz.listaRecetas.replaceChildren();
    for (const receta of crafteo.listar(estacion)) {
      const tarjeta = document.createElement("article");
      tarjeta.className = "recipe-card";
      const definicion = DEFINICIONES_INVENTARIO[receta.result.itemId];
      const icono = document.createElement("span");
      icono.className = `inventory-tile ${definicion?.clase ?? ""}`;
      icono.setAttribute("aria-hidden", "true");
      const texto = document.createElement("div");
      const titulo = document.createElement("h3");
      titulo.textContent = `${receta.result.amount} × ${definicion?.nombre ?? receta.result.itemId}`;
      const ingredientes = document.createElement("p");
      ingredientes.textContent = receta.ingredients
        .map(
          (ingrediente) =>
            `${ingrediente.amount} ${NOMBRES_BLOQUE[ingrediente.itemId] ?? ingrediente.itemId}`,
        )
        .join(" + ");
      texto.append(titulo, ingredientes);
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = receta.disponible ? "FABRICAR" : "FALTAN MATERIALES";
      boton.disabled = !receta.disponible;
      boton.addEventListener("click", () => {
        const resultado = crafteo.fabricar(receta.id, estacion);
        interfaz.mensajeEstacion.textContent = resultado.ok
          ? `Fabricaste ${resultado.resultado.amount} ${NOMBRES_BLOQUE[resultado.resultado.itemId]}.`
          : mensajeErrorCrafteo(resultado.motivo);
        pintarRecetas(estacion);
      });
      tarjeta.append(icono, texto, boton);
      interfaz.listaRecetas.append(tarjeta);
    }
  }

  function transferirAlHorno(tipo) {
    const estado = obtenerHornoActual();
    if (!estado) return;
    if (inventario.retirar(tipo, 1) !== 1) {
      interfaz.mensajeEstacion.textContent =
        tipo === "arena" ? "No tienes arena." : "No tienes carbón.";
      return;
    }
    if (tipo === "arena") {
      estado.inputItemId = "arena";
      estado.inputAmount += 1;
    } else {
      estado.fuelItemId = "carbon";
      estado.fuelAmount += 1;
    }
    interfaz.mensajeEstacion.textContent =
      tipo === "arena" ? "Arena añadida." : "Carbón añadido como combustible.";
    pintarHorno();
  }

  function recogerCristal() {
    const estado = obtenerHornoActual();
    if (!estado || estado.outputAmount <= 0) return;
    if (!inventario.puedeAgregar("cristal", estado.outputAmount)) {
      interfaz.mensajeEstacion.textContent = "No hay espacio en el inventario.";
      return;
    }
    const cantidad = estado.outputAmount;
    inventario.agregar("cristal", cantidad);
    estado.outputAmount = 0;
    estado.outputItemId = null;
    interfaz.mensajeEstacion.textContent = `Recogiste ${cantidad} cristal.`;
    pintarHorno();
  }

  function pintarHorno() {
    const estado = obtenerHornoActual();
    if (!estado) return;
    interfaz.entradaHorno.textContent = estado.inputAmount
      ? `ARENA × ${estado.inputAmount}`
      : "VACÍO";
    interfaz.combustibleHorno.textContent = estado.fuelAmount
      ? `CARBÓN × ${estado.fuelAmount}`
      : estado.remainingFuelTime > 0
        ? "CARBÓN ENCENDIDO"
        : "VACÍO";
    interfaz.salidaHorno.textContent = estado.outputAmount
      ? `CRISTAL × ${estado.outputAmount}`
      : "VACÍO";
    interfaz.progresoHorno.style.transform =
      `scaleX(${Math.max(0, Math.min(1, estado.progress))})`;
    const ardiendo = estado.remainingFuelTime > 0 && estado.inputAmount > 0;
    interfaz.progresoHorno.closest(".furnace-process")?.classList.toggle(
      "is-burning",
      ardiendo,
    );
    interfaz.estadoHorno.textContent = ardiendo
      ? "FUNDIENDO ARENA"
      : estado.inputAmount > 0
        ? "NECESITA CARBÓN"
        : "HORNO APAGADO";
    interfaz.botonArenaHorno.disabled = inventario.cantidadTotal("arena") <= 0;
    interfaz.botonCarbonHorno.disabled = inventario.cantidadTotal("carbon") <= 0;
    interfaz.botonRecogerHorno.disabled = estado.outputAmount <= 0;
  }

  function obtenerHornoActual() {
    return hornoActualId ? estadosHorno.get(hornoActualId) ?? null : null;
  }
}

export function crearEstadoHorno(id) {
  return {
    id,
    inputItemId: null,
    inputAmount: 0,
    fuelItemId: null,
    fuelAmount: 0,
    outputItemId: null,
    outputAmount: 0,
    progress: 0,
    remainingFuelTime: 0,
  };
}

export function avanzarEstadoHorno(estado, delta, configuracionHorno) {
  const puedeCocer =
    estado.inputItemId === "arena" &&
    estado.inputAmount > 0 &&
    estado.outputAmount < SURVIVAL_MAX_STACK;
  if (!puedeCocer) {
    estado.progress = 0;
    return estado;
  }
  if (estado.remainingFuelTime <= 0) {
    if (estado.fuelItemId !== "carbon" || estado.fuelAmount <= 0) return estado;
    estado.fuelAmount -= 1;
    estado.remainingFuelTime = configuracionHorno.duracionCombustibleMs;
    if (estado.fuelAmount <= 0) estado.fuelItemId = null;
  }
  const tiempo = Math.max(0, Number(delta) || 0);
  estado.remainingFuelTime = Math.max(0, estado.remainingFuelTime - tiempo);
  estado.progress += tiempo / configuracionHorno.duracionCoccionMs;
  while (
    estado.progress >= 1 &&
    estado.inputAmount > 0 &&
    estado.outputAmount < SURVIVAL_MAX_STACK
  ) {
    estado.progress -= 1;
    estado.inputAmount -= 1;
    estado.outputItemId = "cristal";
    estado.outputAmount += 1;
  }
  if (estado.inputAmount <= 0) {
    estado.inputItemId = null;
    estado.progress = 0;
  }
  return estado;
}

function restaurarHornos(datos) {
  const estados = new Map();
  if (!Array.isArray(datos)) return estados;
  for (const guardado of datos.slice(0, 512)) {
    const id = String(guardado?.id || "");
    if (!/^-?\d+:-?\d+:-?\d+$/.test(id)) continue;
    estados.set(id, {
      id,
      inputItemId: guardado.inputItemId === "arena" ? "arena" : null,
      inputAmount: cantidadSegura(guardado.inputAmount, 64),
      fuelItemId: guardado.fuelItemId === "carbon" ? "carbon" : null,
      fuelAmount: cantidadSegura(guardado.fuelAmount, 64),
      outputItemId: guardado.outputItemId === "cristal" ? "cristal" : null,
      outputAmount: cantidadSegura(
        guardado.outputAmount,
        SURVIVAL_MAX_STACK,
      ),
      progress: limitarNumero(guardado.progress, 0, 0.999, 0),
      remainingFuelTime: limitarNumero(
        guardado.remainingFuelTime,
        0,
        120_000,
        0,
      ),
    });
  }
  return estados;
}

function cantidadSegura(valor, maximo) {
  return Math.max(0, Math.min(maximo, Math.floor(Number(valor) || 0)));
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? Math.max(minimo, Math.min(maximo, numero))
    : respaldo;
}

function mensajeErrorCrafteo(motivo) {
  if (motivo === "sin_espacio") return "No hay espacio en el inventario.";
  if (motivo === "materiales") return "Faltan materiales.";
  if (motivo === "estacion_incorrecta") return "Necesitas otra estación.";
  return "No se pudo completar la fabricación.";
}

function redondear(valor) {
  return Math.round(Number(valor) * 10_000) / 10_000;
}

function crearIconoContenido(definicion) {
  const icono = document.createElement("span");
  icono.className = `inventory-tile ${definicion?.clase ?? ""}`;
  icono.setAttribute("aria-hidden", "true");
  return icono;
}

function crearTexto(etiqueta, texto, clase = "") {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}
