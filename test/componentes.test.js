import test from "node:test";
import assert from "node:assert/strict";
import {
  RegistroComponentes,
  componentesWar,
} from "../src/componentes/registroComponentes.js";
import {
  marcarComponenteGUI,
  obtenerComponentesGUI,
  prepararBotonMenu,
  prepararPreviewMundo,
  prepararPreviewMenu,
} from "../src/interfaz/componentesMenu.js";

test("configuración rechaza recursos mutables, funciones y getters sin ejecutarlos", () => {
  let lecturas = 0;
  const accessor = { get valor() { lecturas++; return 1; } };
  for (const valor of [new Date(), new Map(), new Set(), new Uint8Array(2), () => 1, Infinity, accessor]) {
    assert.equal(componentesWar.validar("war:gui_menu", { valor }), false);
    assert.throws(() => componentesWar.adjuntar("war:gui_menu", {}, { valor }), TypeError);
  }
  assert.equal(lecturas, 0);
});

test("los ciclos de datos son inmutables y se pueden readjuntar sin recursión infinita", () => {
  const configuracion = { role: "cycle" };
  configuracion.self = configuracion;
  const host = {};
  const primero = marcarComponenteGUI(host, "war:gui_menu", configuracion);
  assert.equal(primero.configuracion.self, primero.configuracion);
  assert.equal(marcarComponenteGUI(host, "war:gui_menu", configuracion), primero);
  configuracion.role = "changed";
  assert.equal(primero.configuracion.role, "cycle");
  assert.throws(() => marcarComponenteGUI(host, "war:gui_menu", configuracion), /otra configuración/);
});

test("copiar configuración no altera __proto__ ni pierde longitud de arrays vacíos", () => {
  const original = JSON.parse('{"__proto__":{"seguro":true},"items":[]}');
  original.items.length = 3;
  const copia = componentesWar.adjuntar("war:gui_menu", {}, original).configuracion;
  assert.equal(Object.getPrototypeOf(copia), Object.prototype);
  assert.equal(Object.hasOwn(copia, "__proto__"), true);
  assert.equal(copia.items.length, 3);
});

test("previews con resolución o cámara en conflicto no dejan adjuntos parciales", () => {
  for (const [id, config] of [
    ["war:gui_menu_scrotch_creation_preview_pixel", { width: 64, height: 64, imageSmoothing: false }],
    ["war:gui_menu_scrotch_creation_preview_camera", { distance: 24, movement: "orbit" }],
  ]) {
    const host = { dataset: {} };
    marcarComponenteGUI(host, id, config);
    const antes = host.dataset.warComponents;
    assert.throws(() => prepararPreviewMenu(host), /otra configuración/);
    assert.deepEqual([...obtenerComponentesGUI(host).keys()], [id]);
    assert.equal(host.dataset.warComponents, antes);
  }
});

test("el registro deduplica también sin el adaptador GUI y ejecuta onAttach una vez", () => {
  let veces = 0;
  const registro = new RegistroComponentes();
  registro.registrar({ id: "war:test", version: 1, validate: () => true, onAttach: () => veces++ });
  const host = {};
  const primero = registro.adjuntar("war:test", host, { valor: 1 });
  assert.equal(registro.adjuntar("war:test", host, { valor: 1 }), primero);
  assert.equal(veces, 1);
  assert.throws(() => registro.adjuntar("war:test", host, { valor: 2 }));
  assert.equal(veces, 1);
});

test("registro fallido revierte hijos registrados desde onRegister", () => {
  const registro = new RegistroComponentes();
  const base = { version: 1, family: "test", validate: () => true };
  registro.registrar({ ...base, id: "war:estable" });
  assert.throws(() => registro.registrar({
    ...base, id: "war:padre", onRegister() {
      registro.registrar({ ...base, id: "war:hijo", type: "subcomponent", parent: "war:padre" });
      throw new Error("fallo");
    },
  }));
  assert.deepEqual(registro.listar().map(({ id }) => id), ["war:estable"]);
});

test("ids y versiones no aceptan coerciones silenciosas", () => {
  for (const version of [1.5, true, "1", 0, NaN]) {
    assert.throws(() => new RegistroComponentes().registrar({ id: "war:test", version, validate: () => true }));
  }
  assert.throws(() => new RegistroComponentes().registrar({ id: { toString: () => "war:test" }, version: 1, validate: () => true }));
});

test("el preview valida también adjuntos creados directamente en el core", () => {
  const host = {};
  componentesWar.adjuntar("war:gui_menu_scrotch_creation_preview_pixel", host, { width: 64, height: 64 });
  assert.throws(() => prepararPreviewMenu(host));
  assert.equal(componentesWar.obtenerAdjunto("war:gui_menu_scrotch_creation_preview", host), null);
  assert.equal(obtenerComponentesGUI(host).size, 0);
});

test("onAttach conserva adjuntos anidados y rechaza recursión del mismo componente", () => {
  const registro = new RegistroComponentes();
  const host = {};
  let hijos = 0;
  registro.registrar({ id: "war:hijo", version: 1, validate: () => true, onAttach: () => hijos++ });
  registro.registrar({ id: "war:padre", version: 1, validate: () => true, onAttach: () => registro.adjuntar("war:hijo", host) });
  registro.adjuntar("war:padre", host);
  registro.adjuntar("war:hijo", host);
  assert.equal(hijos, 1);
  registro.registrar({ id: "war:recursivo", version: 1, validate: () => true, onAttach: () => registro.adjuntar("war:recursivo", host) });
  assert.throws(() => registro.adjuntar("war:recursivo", host), /Adjunto recursivo/);
  assert.equal(registro.obtenerAdjunto("war:recursivo", host), null);
});

test("pixel y cámara rechazan coerciones a números", () => {
  for (const width of [true, "160", 0, -1, 2049, NaN, Infinity]) {
    assert.equal(componentesWar.validar("war:gui_menu_scrotch_creation_preview_pixel", { width, height: 90 }), false);
  }
  for (const distance of [true, "12", 0, -1, 257, NaN]) {
    assert.equal(componentesWar.validar("war:gui_menu_scrotch_creation_preview_camera", { distance }), false);
  }
});

test("Component Core registra la familia GUI inicial", () => {
  const ids = new Set(componentesWar.listar({ familia: "gui" }).map(({ id }) => id));
  for (const id of [
    "war:gui_menu",
    "war:gui_menu_scrotch",
    "war:gui_menu_label",
    "war:gui_menu_icon",
    "war:gui_menu_button",
    "war:gui_menu_scrotch_creation_preview",
    "war:gui_menu_scrotch_creation_preview_2d",
    "war:gui_menu_scrotch_creation_preview_3d",
    "war:gui_menu_scrotch_creation_preview_pixel",
    "war:gui_menu_scrotch_creation_preview_camera",
  ]) {
    assert.ok(ids.has(id), `falta ${id}`);
  }
});

test("los subcomponentes conservan una jerarquia consultable", () => {
  assert.equal(
    componentesWar.esDescendiente(
      "war:gui_menu_scrotch_creation_preview_3d",
      "war:gui_menu_scrotch_creation_preview",
    ),
    true,
  );
  const descendientes = componentesWar.listarDescendientes("war:gui_menu_label");
  assert.ok(descendientes.some(({ id }) => id === "war:gui_menu_label_bold_material"));
  assert.deepEqual(
    componentesWar
      .listarDescendientes("war:gui_menu_label", { directos: true })
      .map(({ id }) => id)
      .sort(),
    [
      "war:gui_menu_label_animation",
      "war:gui_menu_label_bold",
      "war:gui_menu_label_color",
      "war:gui_menu_label_material",
      "war:gui_menu_label_texture",
    ],
  );
  assert.equal(
    componentesWar.esDescendiente(
      "war:gui_menu_label_bold_material",
      "war:gui_menu_label",
    ),
    true,
  );
});

test("los validadores rechazan configuraciones GUI imposibles", () => {
  assert.equal(
    componentesWar.validar("war:gui_menu_button_opacity", { value: 0.5 }),
    true,
  );
  assert.equal(
    componentesWar.validar("war:gui_menu_button_opacity", { value: 2 }),
    false,
  );
  assert.equal(
    componentesWar.validar("war:gui_menu_scrotch_creation_preview_pixel", {
      width: 64.5,
      height: 64,
    }),
    false,
  );
  assert.equal(
    componentesWar.validar("war:gui_menu_scrotch_creation_preview_pixel", {
      width: 160,
      height: 90,
    }),
    true,
  );
  assert.equal(
    componentesWar.validar("war:gui_menu_scrotch_creation_preview_pixel", {
      width: 0,
      height: 90,
    }),
    false,
  );
  assert.equal(
    componentesWar.validar("war:gui_menu_scrotch_creation_preview_camera", {
      distance: 12,
      movement: "horizontal",
    }),
    true,
  );
});

test("los adjuntos conservan una instantanea inmutable de la configuracion", () => {
  const registro = new RegistroComponentes();
  registro.registrar({
    id: "war:config_test",
    version: 1,
    family: "test",
    type: "component",
    validate: () => true,
  });
  const original = { camera: { distance: 12 }, layers: ["terrain"] };
  const adjunto = registro.adjuntar("war:config_test", {}, original);
  original.camera.distance = 99;
  original.layers.push("entities");
  assert.equal(adjunto.configuracion.camera.distance, 12);
  assert.deepEqual(adjunto.configuracion.layers, ["terrain"]);
  assert.throws(() => {
    adjunto.configuracion.camera.distance = 4;
  });
});

test("un host no recibe dos veces el mismo componente GUI", () => {
  const host = {};
  const primero = marcarComponenteGUI(host, "war:gui_menu", { role: "first" });
  const segundo = marcarComponenteGUI(host, "war:gui_menu", { role: "first" });
  assert.equal(segundo, primero);
  assert.equal(obtenerComponentesGUI(host).size, 1);
  assert.equal(segundo.configuracion.role, "first");
  assert.throws(() =>
    marcarComponenteGUI(host, "war:gui_menu", { role: "second" }),
  );
});

test("un registro fallido no deja componentes fantasma", () => {
  const registro = new RegistroComponentes();
  assert.throws(() =>
    registro.registrar({
      id: "war:registro_fallido",
      version: 1,
      family: "test",
      type: "component",
      validate: () => true,
      onRegister: () => {
        throw new Error("fallo controlado");
      },
    }),
  );
  assert.equal(registro.obtener("war:registro_fallido"), null);
});

test("las previews de mundo usan 2D, pixel y camara estatica", () => {
  const preview = { width: 160, height: 90 };
  prepararPreviewMundo(preview);
  prepararPreviewMundo(preview);
  const componentes = obtenerComponentesGUI(preview);
  assert.equal(componentes.size, 4);
  assert.equal(
    componentes.get("war:gui_menu_scrotch_creation_preview_camera").configuracion.movement,
    "static",
  );
  assert.deepEqual(
    componentes.get("war:gui_menu_scrotch_creation_preview_pixel").configuracion,
    { width: 160, height: 90, imageSmoothing: false },
  );
});

test("Preview Menu valida todo antes de adjuntar y no mezcla 2D con 3D", () => {
  const invalido = {};
  assert.throws(() => prepararPreviewMenu(invalido, { width: 0, height: 90 }));
  assert.equal(obtenerComponentesGUI(invalido).size, 0);

  const preview2d = {};
  prepararPreviewMenu(preview2d, { mode: "2d" });
  assert.throws(() => prepararPreviewMenu(preview2d, { mode: "3d" }));
  assert.equal(
    obtenerComponentesGUI(preview2d).has("war:gui_menu_scrotch_creation_preview_3d"),
    false,
  );
});

test("los botones dinamicos reciben la familia GUI una sola vez", () => {
  const boton = { dataset: {} };
  prepararBotonMenu(boton, "play-world");
  prepararBotonMenu(boton, "play-world");
  assert.equal(obtenerComponentesGUI(boton).size, 3);
  assert.match(boton.dataset.warComponents, /war:gui_menu_button/);
});

test("Preview Menu adjunta la rama correcta sin depender de un DOM real", () => {
  const host = {};
  prepararPreviewMenu(host, {
    mode: "3d",
    width: 128,
    height: 72,
    cameraDistance: 12,
    cameraMovement: "orbit",
  });
  const ids = new Set(obtenerComponentesGUI(host).keys());
  for (const id of [
    "war:gui_menu_scrotch_creation_preview",
    "war:gui_menu_scrotch_creation_preview_3d",
    "war:gui_menu_scrotch_creation_preview_pixel",
    "war:gui_menu_scrotch_creation_preview_camera",
  ]) {
    assert.ok(ids.has(id), `falta ${id}`);
  }
  assert.equal(ids.has("war:gui_menu_scrotch_creation_preview_2d"), false);
});

test("el registro rechaza ids invalidos, padres ausentes y duplicados", () => {
  const registro = new RegistroComponentes();
  assert.throws(() =>
    registro.registrar({
      id: "componente-malo",
      version: 1,
      family: "test",
      type: "component",
      validate: () => true,
    }),
  );
  assert.throws(() =>
    registro.registrar({
      id: "war:componente_con_padre",
      version: 1,
      family: "test",
      type: "component",
      parent: "war:padre",
      validate: () => true,
    }),
  );
  assert.throws(() =>
    registro.registrar({
      id: "war:hijo_otra_familia",
      version: 1,
      family: "otra",
      type: "subcomponent",
      parent: "war:padre",
      validate: () => true,
    }),
  );
  assert.throws(() =>
    registro.registrar({
      id: "war:hijo",
      version: 1,
      family: "test",
      type: "subcomponent",
      parent: "war:padre",
      validate: () => true,
    }),
  );
  registro.registrar({
    id: "war:padre",
    version: 1,
    family: "test",
    type: "component",
    validate: () => true,
  });
  assert.throws(() =>
    registro.registrar({
      id: "war:padre",
      version: 1,
      family: "test",
      type: "component",
      validate: () => true,
    }),
  );
});
