# War 3D

**War 3D v1.1** es un prototipo 3D para navegador pensado primero para móvil.

## Jugar

**GitHub Pages:** <https://h9k99rpg8n-cloud.github.io/War-3D/>

## Contenido actual

- Mundo de cubos de colores con relieve suave.
- Movimiento hacia delante, atrás y los lados.
- Joystick táctil en el lado izquierdo.
- Cámara táctil arrastrando el lado derecho de la pantalla.
- Controles de escritorio con WASD o flechas y arrastre del ratón.
- Render optimizado con terreno instanciado y resolución limitada para móviles.

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
