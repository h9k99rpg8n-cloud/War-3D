import test from "node:test";
import assert from "node:assert/strict";
import {
  RegistroComponentes,
  componentesWar,
} from "../src/componentes/registroComponentes.js";
import {
  obtenerComponentesGUI,
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
