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
