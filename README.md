# War 3D

**War 3D v1.3** es un prototipo 3D para navegador pensado primero para móvil.

## Jugar

**GitHub Pages:** <https://h9k99rpg8n-cloud.github.io/War-3D/>

## Contenido actual

- Mundo ampliado de cubos con relieve, árboles y texturas generadas por código.
- Movimiento hacia delante, atrás y los lados.
- Joystick táctil en el lado izquierdo.
- Cámara táctil arrastrando el lado derecho de la pantalla.
- Controles de escritorio con WASD o flechas y arrastre del ratón.
- Inventario para recoger, seleccionar y colocar pasto, hojas y madera.
- Render optimizado con mallas instanciadas por tipo y resolución limitada para móviles.

## Cambios de la v1.3

- Primeros árboles del mundo, formados por troncos de madera y copas de hojas.
- Texturas pixeladas procedurales para diferenciar pasto, hojas y madera sin descargar imágenes.
- Inventario ampliado a tres espacios: pasto (32), hojas (32) y madera (35).
- Selección del tipo de bloque que se desea colocar.
- Los bloques rotos caen, flotan en el mundo y solo se recogen cuando el jugador pasa cerca.
- Pantalla inicial para crear el primer mundo y asignarle un nombre.
- Optimización adicional de resolución para dispositivos táctiles y Android.

## Cambios de la v1.2

- Mapa ampliado de 36×36 a 64×64 bloques.
- Iluminación global clara y materiales verdes sin zonas café o negras.
- Bloques reales con varias capas que pueden romperse manteniendo pulsado.
- Contorno de selección y barra de progreso durante la rotura.
- Bloque 3D flotante que vuela hacia el jugador al ser recogido.
- Inventario de Bloque de pasto con stack máximo de 32.
- Botón para colocar bloques apuntando con la mira.
- Joystick, cámara, movimiento y HUD original conservados.

## Cambios de la v1.1

- Código separado en módulos de configuración, interfaz, renderizado, mundo y controles.
- Sistema de iluminación renovado para mostrar claramente los colores del terreno.
- Bloques unidos sin separaciones visibles hacia el vacío.
- Joystick, cámara, movimiento e interfaz conservados sin cambios de funcionamiento.

## Tecnología

- Three.js `0.185.1` mediante módulo ES.
- HTML, CSS y JavaScript modular sin proceso de compilación.
- Despliegue automático con GitHub Pages.

## Ejecutar localmente

Por usar módulos ES, abre el proyecto desde un servidor HTTP local. Por ejemplo:

```bash
python3 -m http.server 8080
```

Después visita `http://localhost:8080`.
