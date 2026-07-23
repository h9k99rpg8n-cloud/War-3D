# War 3D — Container Update, Snapshot 1

Versión: `1.7.5-snapshot.1`

Esta snapshot establece una base funcional para Container Update sin reescribir
War 3D. El runtime continúa usando módulos ES existentes; se añadieron contratos
TypeScript estrictos, registros de datos y sistemas aislados que pueden migrarse
progresivamente.

## Arquitectura incorporada

| Área | Módulo principal | Responsabilidad |
|---|---|---|
| Contenido | `src/contenido/registroContenido.js` | Bloques, objetos, herramientas, huevos, resistencia y drops |
| Comportamientos | `src/comportamientos/registroComportamientos.js` | Registro validado y extensible `war:*` |
| Plantillas | `src/generacion/plantillasMundo.js` | Cinco plantillas de supervivencia y mundo plano creativo |
| Mundo | `src/mundo/terrenoContainer.js` | Columnas deterministas, montañas, cuevas, minerales y geometría activa |
| Carga | `src/mundo/cargaPantalla.js` | Regiones 8×8, prioridad, cola, carga y descarga |
| Crafteo | `src/crafteo/recetas.js` y `sistemaCrafteo.js` | Recetas basadas en datos y fabricación transaccional |
| Estaciones | `src/crafteo/estaciones.js` | Mesa de crafteo y horno persistente |
| Jugador | `src/jugador/brazoPrimeraPersona.js` | Brazo, animaciones y objeto seleccionado |
| Interfaz | `src/interfaz/ajustes.js` y `editorHud.js` | Ajustes categorizados, skins y editor experimental |
| Guardado | `src/guardado/almacenMundos.js` | Documento v3, validación y migración de mundos anteriores |
| Contratos | `src/contratos/containerUpdate.ts` | Interfaces estrictas de mundo, recetas, estaciones y comportamientos |

La preparación de plugins se limita deliberadamente a registros, contratos y
puntos internos de extensión. No existe todavía una API pública para instalar
plugins.

## Contenido funcional de esta snapshot

- Mundos de 64, 96, 128, 192 y hasta 256 bloques por lado.
- Cinco plantillas deterministas para supervivencia y mundo plano exclusivo de
  creativo.
- Carga de pantalla por regiones 8×8, distancia 6 recomendada y máximo 32.
- Piedra, piedra lisa, mineral de carbón, mineral de hierro, tablones, mesa de
  crafteo, horno y cristal.
- Palos naturales deterministas con probabilidad del 50 % por árbol.
- Pico de madera con nivel, velocidad, daño y durabilidad.
- Crafteo de tablones, palos, mesa, pico, horno y piedra lisa mediante un
  registro de recetas.
- Horno con entrada, combustible, salida, progreso y transformación correcta de
  arena en cristal usando carbón.
- Montañas, cuevas y vetas de minerales generadas durante la creación.
- Esqueleto de umbral voxel con huevo, arco, ataque a distancia y proyectiles
  que consultan colisiones del terreno.
- Inventario creativo vacío al comenzar, catálogo infinito y mochila de 24
  casillas con barra rápida de seis.
- Brazo visible en primera persona y representación del objeto seleccionado.
- Iconografía SVG sin emojis finales, tres apariencias de joystick y editor HUD
  experimental con coordenadas normalizadas.
- Estilos visuales Tradicional y Pixelar experimental con texturas distintas y
  filtrado nearest-neighbor.
- Guardado v3 con migración no destructiva de mundos 1.7.

## Pruebas y mediciones

`npm run check` aprobó:

- TypeScript estricto sin errores.
- 17 pruebas unitarias y de integración.
- Detección de dependencias circulares.
- Build de producción con Vite.

La prueba móvil automatizada utilizó un viewport táctil de 844×390. Creó un
mundo, comprobó render real mediante lectura de píxeles WebGL, abrió el
inventario creativo y cambió el joystick desde Ajustes. Con distancia 2 se
observaron 21 regiones activas, aproximadamente 22 llamadas de dibujo y
115 000 triángulos; el valor exacto varía con la plantilla y la semilla.

Build medido:

- JavaScript: 140,36 kB; 49,21 kB comprimido.
- CSS: 69,00 kB; 14,56 kB comprimido.
- HTML: 33,91 kB; 8,03 kB comprimido.

Estas cifras son mediciones de Chromium automatizado, no equivalen a una prueba
de FPS en un iPhone físico.

## Estado de la primera snapshot

| Función | Estado | Pruebas | Rendimiento | Observaciones |
|---|---|---|---|---|
| Sistema Pixelar | Experimental | Typecheck y build aprobados | Texturas de 8×8 con nearest | Selección al crear mundo; alternancia segura en vivo y descarga selectiva siguen pendientes |
| Plantillas | Implementado | Aprobadas | Generación determinista | Cinco para supervivencia; plano solo en creativo |
| Carga de pantalla | Implementado | Aprobadas y E2E móvil | 21 regiones activas en la muestra | Regiones 8×8, cola priorizada y descarga; el mallado puede seguir optimizándose |
| Crafteo | Implementado | Aprobadas | Operación transaccional pequeña | Recetas fuera de la interfaz |
| Horno | Implementado | Aprobadas | Actualización limitada por frame | Estado guardable; arena + combustible de carbón = cristal |
| Cuevas | Experimental | Generación y búsqueda aprobadas | Se generan como datos, no después de cargar | Requieren más balance de entradas y navegación |
| Esqueleto de umbral | Experimental | Huevo y neutralidad creativa aprobados | Se pausa fuera de distancia activa | Persistencia, drop de arco y prueba automatizada completa de flechas quedan pendientes |
| Agua | Parcial / Experimental | Colisión lógica aprobada | Sin cuerpos rígidos por celda | Geometría regional y agua clásica funcionan; `war:water_flow` todavía no simula flujo lateral |

## Limitaciones conocidas

- Los módulos de ejecución siguen en JavaScript; TypeScript estricto cubre los
  contratos nuevos, no una conversión total del runtime.
- El editor HUD permite mover, escalar, guardar, cancelar y restaurar, pero la
  ocultación individual y la resolución avanzada de superposiciones necesitan
  una snapshot posterior.
- Pixelar se selecciona al crear el mundo. El cambio en caliente no se habilita
  hasta garantizar que todos los recursos puedan reemplazarse y liberarse sin
  romper WebGL.
- Las entidades nuevas todavía no se serializan completamente.
- El cristal es funcional y transparente, pero la eliminación especializada de
  caras internas entre cristales contiguos queda como optimización posterior.
- El agua experimental conserva colisión de celda y geometría conectada; el
  sistema de flujo con cola y presupuesto por fotograma aún está pendiente.
- No se ha validado esta snapshot en un iPhone 7 físico. La compatibilidad real
  con Safari antiguo debe medirse antes de declararla estable.

## Siguiente snapshot recomendada

Priorizar flujo experimental del agua, persistencia de entidades y proyectiles,
pruebas de flechas contra paredes, liberación explícita de recursos Pixelar,
mallado de cristal y pruebas en dispositivos iOS/Android reales.
