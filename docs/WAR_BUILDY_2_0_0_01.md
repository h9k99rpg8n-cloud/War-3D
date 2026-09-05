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
