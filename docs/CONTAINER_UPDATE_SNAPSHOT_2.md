# War 3D — Container Update, Snapshot 2

Versión: `1.7.5-snapshot.2`

La segunda snapshot se concentra en estabilidad, interfaz, crafteo y reducción
del trabajo sostenido del motor. No sustituye el proyecto ni adelanta contenido
de Snapshot 3.

## Resumen ejecutivo

- Se corrigió desde la causa raíz el error que detenía la minería después de
  abrir un menú, guardar o continuar jugando.
- El agua consulta ahora un componente `war:water_interaction`; arena y agua no
  pueden ocupar la misma celda.
- El sol tradicional y Pixelar usa una textura procedural propia, un material
  sin iluminación y liberación explícita de recursos.
- Ajustes globales vive en el menú principal, separado de los datos de cada
  mundo, con diez categorías y vistas previas.
- Inventario, ajustes, estaciones y libro de recetas son interfaces completas
  que bloquean la entrada del mundo mientras están abiertas.
- La mesa de crafteo utiliza una cuadrícula manual de 6×6 y el libro de recetas
  es una ayuda independiente.
- Supervivencia comparte una sola constante de 92 objetos por stack; Creativo
  utiliza stacks lógicamente infinitos sin serializar `Infinity`.
- La división táctil de stacks conserva cantidades y no modifica nada al
  cancelar.
- La carga regional incorpora prioridad de cámara, cancelación e histéresis.
- El renderizador incorpora perfiles reales, límite de resolución, límite de
  FPS, resolución dinámica y pausa por visibilidad.

## Error crítico reproducido y causa

### Síntoma

La prueba táctil reproducía este recorrido:

1. Crear un mundo.
2. Romper un bloque correctamente.
3. Abrir y cerrar el inventario.
4. Intentar romper otro bloque.
5. El bloque quedaba seleccionado, pero la operación nunca terminaba.

El controlador registraba intentos y cancelaciones, por lo que no era un
problema de raycasting ni de falta de objetivo.

### Causa raíz

El gesto `pointerdown` guardaba su inicio con `performance.now()`, pero el
progreso se calculaba con el reloj simulado del mundo. Ese segundo reloj se
pausa al abrir una interfaz. Después de cerrar el menú, ambos relojes mantenían
un desfase permanente y el progreso no podía alcanzar el 100 %.

También se protegió la propiedad del puntero frente a `pointerup` perdidos por
Safari durante una reconstrucción de malla.

### Corrección

- La minería usa exclusivamente el reloj de simulación.
- El objetivo se conserva por clave lógica y se vuelve a consultar si una malla
  regional fue reemplazada.
- El toque directo conserva la mira central como respaldo estable.
- Una operación terminada libera su puntero sin depender de un evento tardío.
- Romper un bloque actualiza únicamente las regiones vecinas necesarias.

La prueba E2E aprobó minería al crear, después de abrir/cerrar inventario y
después de guardar/recargar.

## Arquitectura añadida o ampliada

| Área | Archivos principales | Responsabilidad |
|---|---|---|
| Interacción | `src/mundo/interaccionBloques.js` | Reloj único, objetivos estables y métricas |
| Agua | `src/fisica/interaccionAgua.js` | Componente `war:water_interaction` |
| Visuales | `src/renderizado/registroVisuales.js` | Variantes tradicional/Pixelar y fallback |
| Texturas | `src/renderizado/texturasBloques.js` | Piedra, lisa, tierra, arena y mesa diferenciadas |
| Inventario | `src/inventario/constantes.js` | Límite 92, stacks infinitos y división |
| Crafteo | `src/crafteo/crafteoManual.js` | Cuadrícula 6×6 y validación posicional |
| Rendimiento | `src/rendimiento/perfiles.js` | Perfiles conectados al motor |
| Métricas | `src/rendimiento/monitorRendimiento.js` | Frames, picos, carga sostenida y memoria WebGL |
| Carga | `src/mundo/cargaPantalla.js` | Histéresis, prioridad y tareas cancelables |
| Consejos | `src/interfaz/consejosCarga.js` | Consejos traducibles y filtrados por función |
| Ajustes | `src/interfaz/ajustesGlobales.js` | Preferencias del dispositivo separadas del mundo |
| Contratos | `src/contratos/containerUpdate.ts` | Nuevos tipos estrictos de Snapshot 2 |

## Cambios visuales

- Sol tradicional y Pixelar independientes de la luna y de la iluminación.
- Filtrado nearest-neighbor para recursos Pixelar.
- Registro central con fallback controlado, sin recurrir a emojis.
- Iconos SVG tradicionales y pixelados para las acciones principales.
- Piedra con fragmentos y grietas; piedra lisa con patrón más uniforme.
- Tierra con grumos y piedras pequeñas; arena con grano fino y tonos propios.
- Mesa de crafteo con cara superior de herramientas, laterales de trabajo y
  base independiente.
- Vistas previas de joystick, estilos visuales y perfiles de rendimiento.

## Interfaces

- Ajustes globales desde la portada con categorías Juego, Pantalla, Gráficos,
  Controles, Interfaz, Sonido, Rendimiento, Accesibilidad, Experimentos y Datos.
- Preferencias globales y configuración de mundo se almacenan por separado.
- Menús principales a pantalla completa con `safe-area`.
- Movimiento, cámara, ataque, minería y colocación se bloquean al abrir una
  interfaz y se restauran al cerrarla.
- Las diez categorías de Ajustes permanecen accesibles en horizontal; en
  retrato se convierten en una tira desplazable.

## Inventario, stacks y estaciones

- Fuente de verdad única: `SURVIVAL_MAX_STACK = 92`.
- La recolección llena primero stacks compatibles y después casillas vacías.
- El excedente no se elimina si no existe capacidad.
- Creativo serializa `{ amount: 1, infinite: true }`; nunca usa valores
  numéricos inválidos.
- El diálogo de división muestra original, selección y restante.
- Dividir 12 en 3 produce exactamente stacks de 3 y 9.
- La mesa usa 36 celdas y valida forma, posición, tipo y cantidad.
- El libro muestra recetas e ingredientes, pero no fabrica sin consumirlos.
- Cerrar la mesa devuelve ingredientes sin perderlos.
- El horno mantiene arena + combustible de carbón = cristal y respeta el
  límite de salida.

## Rendimiento

### Medición anterior

La escena móvil de referencia de Snapshot 1, con viewport táctil 844×390 y
distancia de carga 2, registró aproximadamente:

- 21 regiones activas.
- 24 llamadas de dibujo.
- 116 724 triángulos.
- Una reconstrucción general al iniciar.

### Medición de Snapshot 2

En varias semillas de la misma escena:

- 21 regiones activas.
- 23–24 llamadas de dibujo.
- 109 840–117 504 triángulos.
- 7–8 geometrías WebGL y 21–22 texturas activas.
- Una reconstrucción general al iniciar.
- Al romper dos bloques, la reconstrucción general permaneció en 1; solo se
  actualizaron cuatro grupos regionales afectados.

La cantidad de triángulos cambia con la plantilla, el relieve y el agua. La
mejora principal medible de esta snapshot no es una reducción artificial del
terreno, sino evitar reconstrucciones completas por un cambio local.

### Controles conectados al motor

- Bajo: carga 5, pixel ratio máximo 1, 30 FPS.
- Equilibrado: carga 6, pixel ratio máximo 1,25, 45 FPS.
- Alto: carga 10, pixel ratio máximo 1,6, 60 FPS.
- Personalizado: resolución, FPS y distancia configurables.
- Resolución dinámica con intervalos de estabilidad.
- Pausa completa de render y simulación al ocultar la pestaña.
- Entidades y agua se limitan a regiones activas.

### Límites de la medición

Chromium automatizado usó renderizado WebGL por software y lectura de píxeles,
por lo que sus 6–9 FPS no representan un teléfono real. El navegador tampoco
expone una API fiable de temperatura. No se afirma que la temperatura de un
iPhone haya sido medida.

El build aumentó porque Snapshot 2 incorpora interfaces, contratos y lógica:

- HTML: 47,64 kB; 10,70 kB gzip.
- CSS: 78,38 kB; 16,29 kB gzip.
- JavaScript: 173,31 kB; 58,81 kB gzip.

La validación térmica y una sesión prolongada en hardware físico siguen siendo
necesarias antes de llamar estable a la snapshot.

## Pruebas ejecutadas

`npm run check`:

- TypeScript estricto aprobado.
- 24 pruebas unitarias y de integración aprobadas.
- Detección de dependencias circulares aprobada.
- Build Vite de producción aprobado.

`npm run test:e2e`:

- Ajustes globales y diez categorías.
- Perfil Bajo y joystick Oscuro.
- Creación de mundo Pixelar.
- Sol Pixelar con material sin iluminación.
- 36 celdas de crafteo.
- Minería táctil al crear.
- Minería después del inventario.
- Guardado, salida, recarga y nueva minería.
- Render WebGL validado mediante lectura de píxeles.
- Máximo de 30 draw calls en la escena de muestra.

Durante E2E se bloqueó intencionalmente la red de Rapier e `idb` para verificar
los respaldos de gravedad e IndexedDB nativo. Three.js sí se sirvió localmente.

## Limitaciones conocidas

- Pixelar continúa marcado como experimental: los recursos compatibles cambian
  de forma coordinada, pero contenido futuro puede utilizar un fallback
  registrado hasta recibir su arte propio.
- El agua experimental corrige arena, deduplica actualizaciones y usa
  presupuesto; todavía no pretende simular todos los líquidos posibles.
- El editor HUD sigue siendo experimental.
- La configuración de sonido se guarda, pero no existen sonidos finales.
- No se ejecutó un perfilador térmico en un iPhone 11 físico.
- Una prueba prolongada de varias horas en iOS/Android real queda pendiente.
- El runtime continúa en JavaScript modular; TypeScript estricto cubre los
  contratos, no una conversión total.

## Reservado para Snapshot 3

- Contenido, biomas, entidades, minerales o estaciones nuevas.
- API pública de plugins.
- Audio final.
- Ampliación del sistema de líquidos.
- Contenido que no fue anunciado para Snapshot 2.

## Tabla final

| Sistema | Antes | Snapshot 2 | Estado | Pruebas | Observaciones |
|---|---|---|---|---|---|
| Destrucción de bloques | Fallaba tras pausar o continuar | Reloj unificado y objetivo por clave | Corregido | Unitarias + E2E | Aprobada al crear, tras inventario y tras recargar |
| Agua y arena | Interacción inestable | `war:water_interaction` | Implementado | Aprobadas | Sin celda compartida ni ciclos |
| Sol | Podía aparecer negro | Textura tradicional/Pixelar sin iluminación | Implementado | E2E | Alfa, color y filtrado controlados |
| Ajustes | Fragmentados por mundo | Menú global completo | Implementado | E2E | Preferencias globales separadas |
| Pixelar | Aplicación parcial | Registro coordinado y SVG pixelados | Experimental | Unitarias + E2E | Fallback registrado para recursos futuros |
| Texturas | Patrones demasiado parecidos | Diseños procedurales diferenciados | Implementado | Build + inspección | Mesa con caras distintas |
| Mesa de crafteo | Lista de recetas | Cuadrícula manual 6×6 | Implementado | Unitarias + E2E DOM | Libro separado |
| Stacks | Capacidades mezcladas | Máximo 92, división e infinito lógico | Implementado | Aprobadas | Sin `Infinity` serializado |
| Rendimiento | Reconstrucciones amplias y pocos controles | Regiones parciales, perfiles y pausa | Experimental medido | Unitarias + E2E | Falta prueba térmica física |
