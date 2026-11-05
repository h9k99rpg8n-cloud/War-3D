# War 3D 2.0 — War Buildy 02

Versión técnica: `2.0.0-buildy.2`
Título de trabajo: **Sound & Living Menu**

## Objetivo

La Buildy 01 dejó los cimientos de componentes. Esta Buildy pone encima las dos
cosas que más se notaban como ausencia: **el juego era completamente mudo** y
**la portada no mostraba el mundo**. Ninguna de las dos se resolvió con un
parche: las dos se construyeron como sistemas nuevos y reutilizables.

## 1. Sonido procedural real

No hay ni un archivo de audio en el repositorio. Cada sonido se **sintetiza**
con DSP propio, así que:

- no hay descargas, ni CDN, ni licencias de audio;
- el juego pesa lo mismo que antes;
- cada sonido tiene variantes y nunca se repite idéntico.

### Arquitectura

| Archivo | Responsabilidad |
| --- | --- |
| `src/audio/dsp.js` | Filtros biquad, ruido blanco y marrón, envolventes, reverb por combs, saturación, fundidos, variación de tono. Sin dependencias del navegador. |
| `src/audio/catalogoSonidos.js` | Definición por capas de los 30 sonidos: materiales, criaturas, jugador e interfaz. Determinista por semilla. |
| `src/audio/motorAudio.js` | `AudioContext`, mezcla maestra, compresor, `PannerNode` espacial, voz del oyente y generación repartida en tareas cortas. |
| `scripts/exportar-sonidos.cjs` | Exporta el catálogo completo a WAV para escucharlo fuera del juego. |

### Cómo se construye un sonido

Cada efecto se arma en tres capas, como en un estudio:

1. **transitorio** — el golpe seco (ruido filtrado con caída de 4–30 ms);
2. **cuerpo** — el material (barrido de filtro sobre ruido o sobre un seno);
3. **cola** — una reverberación corta que da espacio.

Ejemplos concretos:

- **Piedra** → transitorio de 2.9 kHz + seno de 1180 Hz desafinado encima.
- **Madera** → banda estrecha (Q 3.2) + triángulo a 430 Hz: suena hueco.
- **Cristal** → dos parciales agudos que caen de tono: tintineo real.
- **Araña** → dos dientes de sierra disonantes con vibrato de 92 Hz
  (el chirrido), modulación de amplitud a 38 Hz para el frotar de quitina y
  un clic de quelícero al final.
- **Zombi** → voz glotal con tres **formantes** desplazándose (430 / 780 /
  1180 Hz), respiración marrón y crujido de garganta, más temblor de cinta.
  Es la diferencia entre "un pitido" y "algo que gruñe".
- **Esqueleto** → roce de cuerda, crujido del arco de hueso y silbido de flecha.

### Integración en el juego

| Evento | Sonido |
| --- | --- |
| Romper bloque | `war:romper_<material>` (9 materiales) |
| Colocar bloque | `war:colocar_bloque` |
| Recoger objeto | `war:recoger` |
| Avanzar a pie | `war:paso_<material>` según el bloque bajo los pies |
| Saltar | `war:salto` |
| Recibir daño / morir | `war:jugador_dano`, `war:jugador_muerte` |
| Araña | pasos, ataque y muerte |
| Zombi | gemido ambiental, ataque |
| Esqueleto | arco y huesos |
| Menú | `war:ui_clic`, `war:ui_abrir` |

Los sonidos de criaturas usan **paneo espacial real**: se atenúan con la
distancia (`distanceModel: inverse`) y se colocan a izquierda o derecha según la
posición de la cámara. El oyente se actualiza cada cuadro con la posición y el
giro del jugador.

El volumen global de Ajustes ya se aplica al motor (antes solo se guardaba).

## 2. Partículas del mismo bloque

Al romper un bloque salen 9–14 esquirlas que usan **la textura real** del
material, no un color plano. Se dibujan en un único `InstancedMesh` por tipo,
con física propia (gravedad, rebote en el suelo, giro y desvanecido). Ver
`src/renderizado/particulasBloques.js`.

## 3. Menú principal con vista previa 3D

La portada ya no es un fondo CSS: es un **mundo voxel vivo**.

- `src/menu/terrenoMenu.js` genera el paisaje a partir de la semilla textual
  **`WAR`**, con ruido fractal determinista, y graba las letras W-A-R en el
  propio relieve del terreno.
- `src/menu/vistaMenu3D.js` lo dibuja con Three.js en un canvas a pantalla
  completa de la portada, con cámara propia orbitando, nubes en parallax,
  nieve en las cumbres y agua en las zonas bajas.
- `src/menu/menuMundos.js` pinta la miniatura de cada tarjeta de mundo con el
  mismo generador, así que cada tarjeta refleja su semilla real.

La portada se registra como `war:gui_menu_scrotch_creation_preview_3d` con
cámara `orbit`, usando los contratos que la Buildy 01 solo dejó preparados.

### Distribución de la portada

- Botones **alineados a la izquierda**, en columna y en orden: **JUGAR**,
  **AJUSTES**, versión.
- Vista 3D de fondo ocupando todo el panel, con degradado para que el texto se
  lea.
- En móvil (≤780 px) la columna pasa a centrada y la viñeta se vuelve vertical.
- Si WebGL falla, se conserva el fondo CSS y el menú **sigue funcionando**.

## Pruebas

- `test/audio.test.js` (9 pruebas) — catálogo válido, síntesis sin NaN ni
  saturación, determinismo, variantes distintas, sin clics al inicio ni al
  final, mapa material → sonido.
- `test/menu.test.js` (8 pruebas) — semilla WAR determinista, semillas
  distintas, relieve real, letras grabadas, alturas positivas, vestido del
  terreno y continuidad del ruido.

Total del proyecto: **53 pruebas**, `typecheck` estricto y `build` en verde.

## Herramienta de revisión

```bash
node scripts/exportar-sonidos.cjs --out /tmp/war3d-sonidos
```

Escribe 93 WAV (todas las variantes) para escucharlos con cualquier
reproductor.

## Fuera de alcance

- Música de fondo y ambientes por bioma.
- Chunks nuevos, lava y Liquid Core (siguen pendientes).
- Modelos de audio 3D personalizados (HRTF).

## Siguiente Buildy

Liquid Core: agua y lava como componentes genéricos, sustituyendo los casos
sueltos `war:water_*`.
