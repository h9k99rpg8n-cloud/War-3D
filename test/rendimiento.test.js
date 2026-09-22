import test from "node:test";
import assert from "node:assert/strict";
import { crearMonitorRendimiento } from "../src/rendimiento/monitorRendimiento.js";

test("30, 45 y 60 FPS limitados no se confunden con sobrecarga", () => {
  for (const fps of [30, 45, 60]) {
    const monitor = crearMonitorRendimiento();
    for (let i = 0; i < fps * 12; i++) {
      monitor.registrarFrame(1000 / fps, { objetivoMs: 1000 / fps, trabajoMs: 5 });
    }
    assert.equal(monitor.hayCargaSostenida(), false, String(fps));
    assert.equal(monitor.hayMargenSostenido(), true, String(fps));
  }
});

test("el monitor tolera cuantización de 45 FPS en pantallas de 60 Hz", () => {
  const monitor = crearMonitorRendimiento();
  for (let i = 0; i < 360; i++) monitor.registrarFrame(1000 / 30, { objetivoMs: 1000 / 45, trabajoMs: 5 });
  assert.equal(monitor.hayCargaSostenida(), false);
});

test("sobrecarga real, recuperación, cambio de límite y pausa reinician la adaptación", () => {
  const monitor = crearMonitorRendimiento();
  for (let i = 0; i < 120; i++) monitor.registrarFrame(100, { objetivoMs: 1000 / 30, trabajoMs: 60 });
  assert.equal(monitor.hayCargaSostenida(), true);
  assert.equal(monitor.hayMargenSostenido(), false);
  for (let i = 0; i < 360; i++) monitor.registrarFrame(1000 / 30, { objetivoMs: 1000 / 30, trabajoMs: 5 });
  assert.equal(monitor.hayCargaSostenida(), false);
  assert.equal(monitor.hayMargenSostenido(), true);
  monitor.registrarFrame(1000 / 60, { objetivoMs: 1000 / 60, trabajoMs: 5 });
  assert.equal(monitor.hayMargenSostenido(), false);
  monitor.reiniciarMedicion();
  assert.equal(monitor.obtenerResumen().framePromedioMs, 0);
  assert.equal(monitor.hayCargaSostenida(), false);
});
