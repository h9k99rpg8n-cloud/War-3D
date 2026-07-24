const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { chromium } = require("playwright");

let servidor = null;
let navegador = null;

(async () => {
  process.stdout.write("E2E: iniciando servidor…\n");
  const { createServer } = await import("vite");
  servidor = await createServer({
    root: join(__dirname, ".."),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  });
  await servidor.listen();
  process.stdout.write("E2E: servidor listo…\n");
  let executablePath =
    process.env.WAR_CHROMIUM_PATH || chromium.executablePath();
  if (!existsSync(executablePath)) {
    executablePath =
      await require("@sparticuz/chromium").default.executablePath();
  }
  navegador = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  process.stdout.write("E2E: navegador listo…\n");
  const context = await navegador.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  page.setDefaultTimeout(10_000);
  const errores = [];
  page.on("pageerror", (error) => errores.push(error.message));
  page.on("request", (solicitud) => {
    if (solicitud.url().includes("cdn.jsdelivr.net")) {
      process.stdout.write(`E2E request: ${solicitud.url()}\n`);
    }
  });
  page.on("requestfailed", (solicitud) => {
    if (solicitud.url().includes("cdn.jsdelivr.net")) {
      process.stdout.write(
        `E2E request failed: ${solicitud.url()} · ${solicitud.failure()?.errorText}\n`,
      );
    }
  });
  page.on("console", (mensaje) => {
    process.stdout.write(`E2E browser ${mensaje.type()}: ${mensaje.text()}\n`);
    if (
      mensaje.type() === "error" &&
      !mensaje.text().startsWith("Failed to load resource: net::ERR_FAILED")
    ) {
      errores.push(mensaje.text());
    }
  });

  const threeEntrada = require.resolve("three");
  const threeModulo = join(dirname(threeEntrada), "three.module.js");
  const threeCore = join(dirname(threeEntrada), "three.core.js");
  await page.route("**/three@0.185.1/build/three.module.js", (ruta) =>
    ruta.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: readFileSync(threeModulo),
    }),
  );
  await page.route("**/three@0.185.1/build/three.core.js", (ruta) =>
    ruta.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: readFileSync(threeCore),
    }),
  );
  await page.route("**/idb@8.0.3/+esm", (ruta) => ruta.abort());
  await page.route("**/rapier3d-compat@0.19.3/rapier.mjs", (ruta) => ruta.abort());

  await page.goto("http://127.0.0.1:4173/", {
    waitUntil: "domcontentloaded",
    timeout: 10_000,
  });
  process.stdout.write("E2E: portada cargada…\n");
  await page.click("#launcher-settings-button");
  await page.waitForSelector("#launcher-settings:not([hidden])");
  assert.equal(
    await page.locator("[data-global-settings-tab]").count(),
    10,
  );
  await page.click('[data-global-settings-tab="rendimiento"]');
  await page.waitForTimeout(420);
  await page.screenshot({
    path: "/tmp/war-3d-snapshot2-settings.png",
    fullPage: true,
  });
  await page.click('[data-performance-profile="basico"]');
  await page.click('[data-global-settings-tab="controles"]');
  await page.click('[data-joystick-preview="dark"]');
  await page.click("#launcher-settings-back");
  await page.click("#play-button");
  await page.waitForSelector("#empty-worlds:not([hidden])");
  await page.click("#create-first-world");
  process.stdout.write("E2E: creando mundo móvil…\n");
  await page.fill("#world-name", "Container móvil");
  await page.locator('input[name="gameMode"][value="creativo"]').evaluate(
    (entrada) => {
      entrada.checked = true;
      entrada.dispatchEvent(new Event("change", { bubbles: true }));
    },
  );
  await page.locator('input[name="worldSize"][value="64"]').evaluate(
    (entrada) => {
      entrada.checked = true;
      entrada.dispatchEvent(new Event("change", { bubbles: true }));
    },
  );
  await page.locator("#load-distance").evaluate((entrada) => {
    entrada.value = "2";
    entrada.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator('select[name="visualStyle"]').evaluate((entrada) => {
    entrada.value = "pixelar";
    entrada.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.click('#world-form button[type="submit"]');
  process.stdout.write("E2E: solicitud de mundo enviada…\n");
  await page.waitForFunction(
    () =>
      document.querySelector("#loading")?.hidden === true &&
      document.querySelector("#start-screen")?.hidden === true,
    null,
    { timeout: 30_000 },
  );
  process.stdout.write("E2E: mundo renderizado…\n");
  const diagnostico = await page.evaluate(() =>
    globalThis.__WAR3D_DEBUG__?.snapshot(),
  );
  process.stdout.write(`E2E diagnóstico: ${JSON.stringify(diagnostico)}\n`);
  assert.ok(diagnostico.visible.pasto > 0);
  assert.ok(diagnostico.render.triangles > 0);
  assert.deepEqual(diagnostico.sun, {
    style: "pixelar",
    texture: "sun-pixelar",
    unlit: true,
  });
  assert.equal(await page.locator("#game").getAttribute("data-visual-style"), "pixelar");
  assert.equal(
    await page.locator("#inventory-button use").getAttribute("href"),
    "#icon-bag-pixel",
  );
  assert.equal(await page.locator("#error-panel").getAttribute("hidden"), "");
  assert.equal(await page.locator("#inventory-bar .inventory-slot").count(), 6);
  assert.equal(await page.locator("#crafting-grid .crafting-grid__cell").count(), 36);

  const mineriaAntes = diagnostico.performance.interaction.completadas;
  await romperBloqueTactil(page, cdp, mineriaAntes);

  await page.click("#inventory-button");
  await page.waitForSelector("#inventory-panel:not([hidden])");
  assert.equal(
    await page.locator("#inventory-panel .inventory-slot--panel").count(),
    24,
  );
  assert.ok(await page.locator("#inventory-catalog-list button").count() >= 20);
  await page.click("#inventory-close");
  await romperBloqueTactil(
    page,
    cdp,
    await page.evaluate(
      () =>
        globalThis.__WAR3D_DEBUG__.snapshot().performance.interaction
          .completadas,
    ),
  );

  await page.click("#game-menu-button");
  await page.click("#world-settings-button");
  await page.waitForSelector("#settings-panel:not([hidden])");
  await page.click('[data-settings-tab="controles"]');
  await page.selectOption("#settings-joystick", "dark");
  assert.equal(await page.locator("#game").getAttribute("data-joystick-skin"), "dark");
  await page.click("#settings-close");

  await page.waitForTimeout(1_200);
  const diagnosticoEstable = await page.evaluate(() =>
    globalThis.__WAR3D_DEBUG__?.snapshot(),
  );
  process.stdout.write(
    `E2E rendimiento estable: ${JSON.stringify(diagnosticoEstable.performance)}\n`,
  );
  assert.ok(diagnosticoEstable.performance.interaction.completadas >= 1);
  assert.ok(diagnosticoEstable.render.calls <= 30);

  await page.waitForTimeout(120);
  const pixeles = await page.evaluate(() =>
    globalThis.__WAR3D_DEBUG__.leerPixeles(),
  );
  process.stdout.write(`E2E píxeles: ${JSON.stringify(pixeles)}\n`);
  assert.ok(diagnostico.fog.near < diagnostico.fog.far);
  assert.ok(new Set(pixeles.muestras.map((pixel) => pixel.join(","))).size > 1);
  await page.screenshot({
    path: "/tmp/war-3d-container-mobile.png",
    fullPage: true,
  });

  await page.click("#game-menu-button");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click("#exit-world-button"),
  ]);
  await page.click("#play-button");
  await page.waitForSelector(".world-card__play");
  await page.click(".world-card__play");
  await page.waitForFunction(
    () =>
      document.querySelector("#loading")?.hidden === true &&
      document.querySelector("#start-screen")?.hidden === true,
    null,
    { timeout: 30_000 },
  );
  await romperBloqueTactil(page, cdp, 0);
  process.stdout.write("E2E minería aprobada también después de guardar y recargar.\n");

  assert.deepEqual(errores, []);
  await navegador.close();
  navegador = null;
  await servidor.close();
  servidor = null;
  process.stdout.write(
    "E2E móvil aprobado: creación, render, inventario creativo y ajustes.\n",
  );
})().catch(async (error) => {
  console.error(error);
  await navegador?.close().catch(() => {});
  await servidor?.close().catch(() => {});
  process.exit(1);
});

async function romperBloqueTactil(page, cdp, completadasAntes) {
  const candidatos = await page.evaluate(() => {
    const puntos = [];
    for (const y of [205, 225, 245, 265, 285, 305, 325]) {
      for (const x of [345, 390, 440, 500, 570, 640, 710, 775]) {
        if (
          document.elementFromPoint(x, y)?.id === "look-zone" &&
          globalThis.__WAR3D_DEBUG__.interactionTarget(x, y)
        ) {
          puntos.push({ x, y });
        }
      }
    }
    return puntos;
  });
  process.stdout.write(
    `E2E objetivos táctiles libres: ${candidatos.map(({ x, y }) => `${x}:${y}`).join(" · ")}\n`,
  );
  for (const { x, y } of candidatos) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 4, radiusY: 4 }],
    });
    await page.waitForTimeout(500);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    const completadas = await page.evaluate(
      () =>
        globalThis.__WAR3D_DEBUG__?.snapshot()?.performance?.interaction
          ?.completadas ?? 0,
    );
    if (completadas > completadasAntes) break;
  }
  const diagnosticoFinal = await page.evaluate(
    () => globalThis.__WAR3D_DEBUG__?.snapshot()?.performance?.interaction,
  );
  process.stdout.write(
    `E2E estado de minería tras gesto: ${JSON.stringify(diagnosticoFinal)}\n`,
  );
  await page.waitForFunction(
    (antes) =>
      globalThis.__WAR3D_DEBUG__?.snapshot()?.performance?.interaction
        ?.completadas > antes,
    completadasAntes,
  );
}
