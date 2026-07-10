const THREE_VERSION = "0.185.1";
const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`;

const game = document.querySelector("#game");
const canvas = document.querySelector("#game-canvas");
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loading-text");
const errorPanel = document.querySelector("#error-panel");
const errorMessage = document.querySelector("#error-message");
const versionBadge = document.querySelector("#version-badge");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystick-knob");
const lookZone = document.querySelector("#look-zone");

try {
  loadingText.textContent = "Cargando Three.js…";
  const THREE = await import(THREE_URL);
  startGame(THREE);
} catch (error) {
  console.error(error);
  loading.hidden = true;
  errorPanel.hidden = false;
  errorMessage.textContent =
    "No se pudo cargar el motor 3D. Comprueba tu conexión a internet y recarga la página.";
}

function startGame(THREE) {
  const GRID_SIZE = 36;
  const TILE_SIZE = 2;
  const WORLD_HALF = (GRID_SIZE * TILE_SIZE) / 2;
  const WORLD_LIMIT = WORLD_HALF - TILE_SIZE * 1.1;
  const EYE_HEIGHT = 1.68;
  const MOVE_SPEED = 6.4;
  const LOOK_SPEED = 0.0036;
  const TERRAIN_BOTTOM = -1.7;

  versionBadge.textContent = `v0.1 • THREE ${THREE_VERSION}`;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (error) {
    throw new Error("WebGL no está disponible en este navegador.", { cause: error });
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b9d9);
  scene.fog = new THREE.Fog(0x87b9d9, 30, 82);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.08,
    130,
  );
  camera.rotation.order = "YXZ";

  const hemisphere = new THREE.HemisphereLight(0xe9f6ff, 0x4f4539, 2.25);
  scene.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xfff2d1, 2.5);
  sunlight.position.set(-22, 30, 16);
  scene.add(sunlight);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe6a2, fog: false }),
  );
  sun.position.set(-31, 33, -55);
  scene.add(sun);

  const heights = createTerrain();

  let yaw = Math.PI * 0.18;
  let pitch = -0.06;
  camera.position.set(0, sampleTerrainHeight(0, 0) + EYE_HEIGHT, 10);
  camera.rotation.set(pitch, yaw, 0);

  const joystickInput = { x: 0, forward: 0 };
  const keys = new Set();
  let joystickPointer = null;
  let lookPointer = null;
  let lastLookX = 0;
  let lastLookY = 0;
  let lastFrame = performance.now();

  bindControls();
  window.addEventListener("resize", resizeRenderer);
  window.addEventListener("orientationchange", resizeRenderer);
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  renderer.setAnimationLoop(renderFrame);
  renderer.render(scene, camera);

  requestAnimationFrame(() => {
    loading.classList.add("is-leaving");
    window.setTimeout(() => {
      loading.hidden = true;
    }, 460);
  });

  function createTerrain() {
    const topHeights = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0.02,
      flatShading: true,
    });
    const terrain = new THREE.InstancedMesh(cube, material, GRID_SIZE * GRID_SIZE);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    const palettes = [
      new THREE.Color(0x5f9864),
      new THREE.Color(0x79a765),
      new THREE.Color(0xc49a5a),
      new THREE.Color(0xa46150),
      new THREE.Color(0x66859a),
      new THREE.Color(0x9a6f98),
    ];

    let instance = 0;
    for (let z = 0; z < GRID_SIZE; z += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const worldX = (x - (GRID_SIZE - 1) / 2) * TILE_SIZE;
        const worldZ = (z - (GRID_SIZE - 1) / 2) * TILE_SIZE;
        const nx = x - (GRID_SIZE - 1) / 2;
        const nz = z - (GRID_SIZE - 1) / 2;

        const waves =
          Math.sin(nx * 0.29) * 0.35 +
          Math.cos(nz * 0.33) * 0.27 +
          Math.sin((nx + nz) * 0.18) * 0.2;
        const top = Math.round(waves * 4) * 0.13;
        topHeights[z][x] = top;

        const cubeHeight = top - TERRAIN_BOTTOM;
        position.set(worldX, TERRAIN_BOTTOM + cubeHeight / 2, worldZ);
        scale.set(TILE_SIZE * 0.975, cubeHeight, TILE_SIZE * 0.975);
        matrix.compose(position, rotation, scale);
        terrain.setMatrixAt(instance, matrix);

        const region =
          Math.sin(nx * 0.14 + 1.8) +
          Math.cos(nz * 0.16 - 0.7) +
          Math.sin((nx - nz) * 0.08);
        const paletteIndex = Math.abs(Math.floor((region + 3) * 1.17)) % palettes.length;
        color.copy(palettes[paletteIndex]);
        color.offsetHSL(0, 0, hash2D(x, z) * 0.055 - 0.0275);
        terrain.setColorAt(instance, color);
        instance += 1;
      }
    }

    terrain.instanceMatrix.needsUpdate = true;
    terrain.instanceColor.needsUpdate = true;
    terrain.computeBoundingBox();
    terrain.computeBoundingSphere();
    scene.add(terrain);
    return topHeights;
  }

  function hash2D(x, z) {
    const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function sampleTerrainHeight(worldX, worldZ) {
    const gridX = THREE.MathUtils.clamp(
      worldX / TILE_SIZE + (GRID_SIZE - 1) / 2,
      0,
      GRID_SIZE - 1,
    );
    const gridZ = THREE.MathUtils.clamp(
      worldZ / TILE_SIZE + (GRID_SIZE - 1) / 2,
      0,
      GRID_SIZE - 1,
    );
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, GRID_SIZE - 1);
    const z1 = Math.min(z0 + 1, GRID_SIZE - 1);
    const tx = gridX - x0;
    const tz = gridZ - z0;
    const a = THREE.MathUtils.lerp(heights[z0][x0], heights[z0][x1], tx);
    const b = THREE.MathUtils.lerp(heights[z1][x0], heights[z1][x1], tx);
    return THREE.MathUtils.lerp(a, b, tz);
  }

  function bindControls() {
    joystick.addEventListener("pointerdown", (event) => {
      if (joystickPointer !== null) return;
      joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
      markControlsUsed();
    });

    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointer) return;
      updateJoystick(event);
    });

    const releaseJoystick = (event) => {
      if (event.pointerId !== joystickPointer) return;
      joystickPointer = null;
      joystickInput.x = 0;
      joystickInput.forward = 0;
      joystickKnob.style.transform = "translate(-50%, -50%)";
    };

    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
    joystick.addEventListener("lostpointercapture", () => {
      joystickPointer = null;
      joystickInput.x = 0;
      joystickInput.forward = 0;
      joystickKnob.style.transform = "translate(-50%, -50%)";
    });

    lookZone.addEventListener("pointerdown", (event) => {
      if (lookPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      lookPointer = event.pointerId;
      lastLookX = event.clientX;
      lastLookY = event.clientY;
      lookZone.setPointerCapture(event.pointerId);
      markControlsUsed();
    });

    lookZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== lookPointer) return;
      const deltaX = event.clientX - lastLookX;
      const deltaY = event.clientY - lastLookY;
      lastLookX = event.clientX;
      lastLookY = event.clientY;
      yaw -= deltaX * LOOK_SPEED;
      pitch = THREE.MathUtils.clamp(pitch - deltaY * LOOK_SPEED, -1.12, 1.12);
    });

    const releaseLook = (event) => {
      if (event.pointerId === lookPointer) lookPointer = null;
    };
    lookZone.addEventListener("pointerup", releaseLook);
    lookZone.addEventListener("pointercancel", releaseLook);
    lookZone.addEventListener("lostpointercapture", () => {
      lookPointer = null;
    });

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keys.add(key);
        markControlsUsed();
      }
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });

    window.addEventListener("blur", () => keys.clear());
  }

  function updateJoystick(event) {
    const bounds = joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxDistance = bounds.width * 0.32;
    let deltaX = event.clientX - centerX;
    let deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      deltaX *= scale;
      deltaY *= scale;
    }

    const normalizedX = deltaX / maxDistance;
    const normalizedY = -deltaY / maxDistance;
    const deadZone = 0.08;
    joystickInput.x = Math.abs(normalizedX) > deadZone ? normalizedX : 0;
    joystickInput.forward = Math.abs(normalizedY) > deadZone ? normalizedY : 0;
    joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
  }

  function markControlsUsed() {
    game.classList.add("controls-used");
  }

  function renderFrame(now) {
    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    let strafe = joystickInput.x;
    let forward = joystickInput.forward;
    if (keys.has("a") || keys.has("arrowleft")) strafe -= 1;
    if (keys.has("d") || keys.has("arrowright")) strafe += 1;
    if (keys.has("w") || keys.has("arrowup")) forward += 1;
    if (keys.has("s") || keys.has("arrowdown")) forward -= 1;

    const inputLength = Math.hypot(strafe, forward);
    if (inputLength > 1) {
      strafe /= inputLength;
      forward /= inputLength;
    }

    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    camera.position.x += (rightX * strafe + forwardX * forward) * MOVE_SPEED * delta;
    camera.position.z += (rightZ * strafe + forwardZ * forward) * MOVE_SPEED * delta;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WORLD_LIMIT, WORLD_LIMIT);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WORLD_LIMIT, WORLD_LIMIT);

    const targetHeight = sampleTerrainHeight(camera.position.x, camera.position.z) + EYE_HEIGHT;
    const heightBlend = 1 - Math.exp(-10 * delta);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetHeight, heightBlend);
    camera.rotation.set(pitch, yaw, 0);

    renderer.render(scene, camera);
  }

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
  }
}
