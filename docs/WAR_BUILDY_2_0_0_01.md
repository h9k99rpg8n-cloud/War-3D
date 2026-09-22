# War 3D 2.0 — War Buildy 01

Versión técnica: `2.0.0-buildy.1`

## Objetivo

Esta Buildy inicia la rama 2.0 con un cambio deliberadamente pequeño: convertir el sistema de componentes en una base formal antes de añadir líquidos, chunks, biomas o contenido grande.

El aspecto y el gameplay principal deben permanecer prácticamente iguales. El valor de esta Buildy está debajo de la interfaz.

## Component Core

Se añade `src/componentes/registroComponentes.js` con un registro genérico capaz de:

- registrar componentes y subcomponentes con IDs `war:*`;
- validar configuraciones antes de adjuntarlas;
- declarar jerarquías padre/hijo;
- consultar descendencia;
- listar descendientes directos o recursivos;
- filtrar por familia, tipo y estado experimental;
- rechazar IDs inválidos, padres ausentes y duplicados.

Los comportamientos antiguos de `src/comportamientos` se conservan por compatibilidad. La migración se hará por Buildys y no mediante una reescritura total.

## Familia GUI inicial

Componentes incluidos:

- `war:gui_menu`
- `war:gui_menu_scrotch`
- `war:gui_menu_label`
- `war:gui_menu_label_color`
- `war:gui_menu_label_texture`
- `war:gui_menu_label_material`
- `war:gui_menu_label_bold`
- `war:gui_menu_label_bold_color`
- `war:gui_menu_label_bold_texture`
- `war:gui_menu_label_bold_material`
- `war:gui_menu_label_animation`
- `war:gui_menu_icon`
- `war:gui_menu_button`
- `war:gui_menu_button_opacity`
- `war:gui_menu_button_animation`
- `war:gui_menu_scrotch_creation_preview`
- `war:gui_menu_scrotch_creation_preview_2d`
- `war:gui_menu_scrotch_creation_preview_3d`
- `war:gui_menu_scrotch_creation_preview_pixel`
- `war:gui_menu_scrotch_creation_preview_camera`

`Scrotch` es el nombre interno elegido por el proyecto para la familia de pantallas visuales del menú.

## Integración con la interfaz existente

`src/interfaz/componentesMenu.js` conecta la portada actual con los nuevos componentes sin rediseñarla todavía.

La portada se marca como menú/Scrotch, el título como label animado y los botones principales como botones GUI con opacidad y animación de presión. Esto incluye la vista y los botones de Ajustes globales ya existentes, sin cambiar su aspecto.

También queda preparada la función `prepararPreviewMenu()` para previews 2D o 3D, resolución interna tipo pixel y cámara de preview. `src/contratos/componentCore.ts` declara los modos, el contenido 3D futuro y el contrato de cámara. La renderización 3D real se implementará en una Buildy posterior.

Las tarjetas de mundo adjuntan sus componentes al crear cada canvas, sin observación continua del DOM. Esto evita observers persistentes y garantiza que una preview dinámica reciba Preview, 2D, Pixel y cámara `static` una sola vez.

## Correcciones y protecciones

- El nuevo registro rechaza componentes duplicados.
- Los subcomponentes no pueden registrarse antes que su padre.
- La opacidad se limita a `0..1`.
- Las previews pixeladas requieren dimensiones válidas entre 1 y 2048 px.
- El contrato Pixel fija `imageSmoothing: false` y rechaza dimensiones decimales.
- La cámara de preview valida distancia y tipos de movimiento (`static`, `horizontal`, `orbit`).
- Las configuraciones adjuntas se copian y congelan recursivamente para evitar mutaciones accidentales después del registro.
- Un host no vuelve a adjuntar el mismo componente si la preparación de GUI se ejecuta otra vez.
- Reutilizar un componente con otra configuración se rechaza en vez de conservar silenciosamente datos obsoletos.
- Las jerarquías rechazan padres no compatibles y familias padre/hijo distintas.
- La preparación de Preview valida el contrato completo antes de adjuntar nada y no permite mezclar 2D con 3D.

## Pruebas

`test/componentes.test.js` valida el catálogo GUI inicial, jerarquías, configuraciones inválidas, adjuntos inmutables, duplicados y previews dinámicas.

## Revisión de estabilidad — septiembre de 2026

Se mantiene `2.0.0-buildy.1`: esta revisión corrige Buildy 01, no añade una Buildy nueva ni modifica formatos de mundos, recetas, inventario, entidades o generación.

### Fallos reproducidos y corregidos

- La copia inmutable conservaba `Map` y `Date` mutables por referencia. Ahora solo admite datos primitivos finitos, objetos planos y arrays. Rechaza recursos vivos, funciones, símbolos y accessors sin ejecutar getters. Conserva ciclos y referencias compartidas; la comparación deja de desbordar la pila al readjuntar configuraciones cíclicas.
- Deduplicación por host también en el registro, no solo en GUI. `obtenerAdjunto()` consulta la capacidad sin depender de `dataset`. Rechazo de reentrada del mismo `onAttach`; los adjuntos distintos creados por un hook no se pierden.
- Previews con Pixel o Camera ya adjuntos y diferentes fallaban después de añadir otros componentes. Se verifican los conflictos antes de cualquier adjunto, incluso si se crearon directamente en el core.
- Un `onRegister` que registraba hijos y luego fallaba dejaba huérfanos. Se revierte el conjunto de registros de esa operación. Los hooks deben ser síncronos; sus efectos externos no se pueden deshacer automáticamente.
- IDs, versiones, dimensiones y distancias dejan de aceptar coerciones silenciosas de objetos, booleanos o cadenas numéricas.
- El monitor confundía 30 FPS limitados con sobrecarga. Ahora conoce el intervalo objetivo y el tiempo de trabajo medido en CPU, permite recuperación con margen sostenido y reinicia la medición tras pausas o cambios de objetivo. No mide tiempo GPU ni temperatura.
- La prueba de arquitectura encontraba cero imports por un escape erróneo en la expresión regular. Ahora usa el parser de TypeScript, incluye `main.js`, reexports, imports por efectos e imports dinámicos literales; verifica rutas y tiene pruebas negativas con ciclos deliberados.

### Optimización acotada de minería

Las ediciones locales actualizan solo las instancias afectadas. Al retirar una instancia se utiliza la última para cubrir el hueco y se actualiza el índice de selección. La geometría, materiales, identidad lógica y archivos de guardado no cambian. Los bounds se amplían de forma conservadora para raycast, sin recorrer todo el material en cada edición. Se conserva la protección de culling para WebKit.

Escenario reproducible: `war:stone_ridges`, semilla `431991`, tamaño 256, distancia 2, 21 regiones cargadas; romper la primera instancia de pasto. Conteo de llamadas a `InstancedMesh.setMatrixAt`:

| Trabajo de una rotura | Base `205a792` | Revisión |
| --- | ---: | ---: |
| Escrituras de matrices | 1781 | 2 |
| Reconstrucciones globales adicionales | 0 | 0 |

Es una reducción de trabajo localizado, no una medición de FPS ni calentamiento en iPhone. La ampliación de capacidad y la carga regional todavía requieren sincronización completa. El agua sigue reconstruyendo su superficie y no incorpora propagación nueva ni Liquid Engine. El meshing por caras y regiones queda pendiente.

### Verificación y límites

- `npm run check`: 52 pruebas aprobadas, build Vite y TypeScript estricto.
- La cobertura de TypeScript ahora incluye los JS de Component Core, su utilidad de configuración, el adaptador GUI y el monitor. No cubre todavía todo el JavaScript del juego.
- Pruebas nuevas de índices, matrices y bounds tras rotura, reposición, crecimiento de buffers y carga regional, además de exportación y recarga de cambios.
- E2E usa `tap` para botones, comprueba previews dinámicas sin duplicados y datos realmente persistidos. Conserva el escenario sin CDN de idb/Rapier para verificar IndexedDB nativo y física de respaldo; no demuestra el camino Rapier.
- En el entorno local de esta revisión, Chromium estaba incompleto (ejecutable de cero bytes) y la descarga oficial terminó en timeout/502. E2E local bloqueado antes del navegador, no aprobado.
- El workflow de PR ejecuta check y E2E. Pages depende de esa verificación antes de desplegar. No se omiten pruebas fallidas para publicar.
- Los parámetros internos `particulas` y `calidadAgua` de los perfiles siguen reservados, sin aplicación al motor. No se presentan aquí como optimizaciones realizadas. Tampoco se ha hecho una sesión prolongada en hardware móvil.

Para ejecutar E2E en un entorno con navegador disponible:

```sh
npx playwright install chromium
npm run test:e2e
```

También se admite `WAR_CHROMIUM_PATH` con un ejecutable Chromium válido.

## Fuera de alcance

Esta Buildy NO implementa todavía:

- Liquid Engine;
- lava;
- chunks nuevos;
- biomas;
- preview 3D final;
- sonidos finales;
- rediseño visual completo;
- mods/APIs públicas.

La siguiente Buildy puede concentrarse exclusivamente en agua y la migración desde casos específicos `war:water_*` hacia un Liquid Core genérico.
