# War 3D

**War 3D v1.7.4** es un juego 3D de bloques para navegador pensado primero para móvil.

## Jugar

**GitHub Pages:** <https://h9k99rpg8n-cloud.github.io/War-3D/>

## Contenido actual

- Mundos seleccionables de 64×64, 96×96 o 128×128 con relieve, árboles y texturas generadas por código.
- Movimiento hacia delante, atrás y los lados.
- Salto en ambos modos y vuelo con ascenso y descenso en Creativo.
- Joystick táctil en el lado izquierdo.
- Cámara táctil arrastrando el lado derecho de la pantalla.
- Controles de escritorio con WASD o flechas y arrastre del ratón.
- Inventario 2.0 con seis espacios rápidos, mochila de 18 espacios y pilas táctiles combinables mediante drag & drop.
- Render optimizado con mallas instanciadas por tipo y resolución limitada para móviles.

## Cambios de la v1.7.4

- Recolección protegida: dos objetos de distinto tipo ya no pueden reservar la misma última casilla del inventario.
- Los objetos que no logren entrar al inventario regresan al mundo en lugar de desaparecer.
- Los bloques rotos caen sobre el soporte que tienen debajo y ya no saltan a la superficie desde otra altura.
- Joystick, cámara, salto, vuelo y teclado se reinician al abrir un menú o perder el foco, evitando controles pegados.
- Cola de autoguardado corregida: si hay cambios durante una escritura, se guarda una segunda instantánea actualizada.
- Terreno de 128×128 optimizado con claves numéricas y un solo índice de bloques, reduciendo considerablemente la memoria sin quitar capas ni contenido.
- Compatibilidad reforzada con Safari y dispositivos antiguos al capturar punteros y solicitar almacenamiento persistente.
- Conserva el Inventario 2.0, mundos existentes, entidades, agua, físicas, ciclo de día y noche y todos los modos de la v1.7.3.

## Cambios de la v1.7.3

- Nuevo **Inventario 2.0** de 24 espacios: seis de acceso rápido y 18 dentro de la mochila.
- Pilas reales por casilla: un mismo bloque puede ocupar varias pilas y las cantidades se combinan al soltar una sobre otra.
- Drag & drop táctil entre la mochila y el acceso rápido, con casilla marcada, detalle del objeto y contador de capacidad.
- Acción **Ordenar** para compactar y acomodar automáticamente las pilas guardadas en la mochila.
- Catálogo de Creativo integrado al inventario; permite marcar cualquier casilla y asignarle un bloque o huevo ilimitado.
- Migración automática del inventario de los mundos 1.7.2 al formato nuevo sin perder cantidades ni la selección rápida.
- El juego se pausa de forma segura mientras el inventario o el menú están abiertos, evitando movimiento y ataques accidentales.
- Selector de mundos y creador convertidos en vistas de pantalla completa, sin el borde exterior que aparecía en algunos iPhone.
- Pantalla de carga colocada por encima del lanzador para eliminar el marco de otro color al abrir un mundo guardado.
- Perfil WebGL liviano para móviles con cuatro núcleos o menos, menor consumo de resolución y render reducido tras menús completos.

## Cambios de la v1.7.2

- Nuevo lanzador animado: el logotipo pixelado se escribe, se borra y vuelve a aparecer antes de jugar.
- Biblioteca de mundos múltiples con tarjetas, vista previa voxel, fecha de creación y última modificación.
- Estado vacío ilustrado con una Araña Umbral confundida que todavía no encuentra un mundo.
- Creador reorganizado con nombre de hasta 24 caracteres, Supervivencia o Creativo, tipo y tamaño del mundo.
- Tres dificultades: Pacífica sin aparición natural de hostiles, Normal con tres arañas y cuatro zombis, y Difícil con grupos más numerosos y agresivos.
- Tiempo configurable por mundo: ciclo normal, día permanente o noche permanente.
- Guardado automático con `idb` e IndexedDB cada diez segundos, al ocultar la pestaña y al salir del juego.
- Persistencia de bloques rotos y colocados, inventario, salud, posición, cámara, vuelo y avance del ciclo solar.
- Menú de tres puntos dentro de la partida con la acción segura **Guardar y salir**.
- Sol renovado como disco voxel tridimensional formado por pequeños cubos pixelados, en armonía con la luna.
- Cada mundo utiliza una semilla propia para variar el relieve, los lagos, las playas y los árboles.

## Cambios de la v1.7.1

- El agua ya no existe como bloque dentro del mapa: ahora es un volumen líquido independiente con superficie conectada.
- Rapier detecta los lagos mediante sensores físicos sin convertirlos en paredes ni empujar al jugador.
- Nuevo bloque de tierra con textura procedural propia y capas subterráneas diferenciadas del pasto.
- Textura de arena renovada con granos y vetas más naturales, conservando el estilo de 16×16 píxeles.
- Zombi rediseñado con piel verde claramente reconocible, ropa azul deteriorada y mayor contraste frente a las arañas.
- Los zombis permanecen después de la noche, se incendian al recibir luz solar, emiten partículas y mueren tras quemarse.
- Cada araña natural tiene 50% de probabilidad de permanecer durante el día.
- Catálogo exclusivo de Creativo con todos los bloques disponibles y asignación directa a la barra rápida.
- Huevos de aparición para generar manualmente una Araña Umbral o un Zombi Errante.
- Reacción de daño ampliada: la cámara gira, se inclina y tiembla brevemente al recibir un ataque.
- Correcciones de agua, colisiones, inventario, transición día/noche y aparición de entidades.

## Cambios de la v1.7

- Segunda entidad hostil original: el **Zombi Resquebrajado**, con textura procedural propia y animaciones separadas de caminar, correr y atacar.
- Los zombis aparecen únicamente de noche en grupos de tres y desaparecen al terminar la noche.
- En Creativo, las arañas ya no detectan al jugador ni activan ataques; los zombis hostiles no se generan.
- Reacción al daño con una sacudida breve de cámara y corazones reconstruidos como figuras pixeladas.
- El agua dejó de ser una colección de cubos transparentes: los lagos usan una superficie conectada, orillas continuas, brillo y textura animada.
- Arena con gravedad mediante Rapier en Supervivencia; en Creativo permanece exactamente donde se coloca.
- Inventario táctil con drag & drop entre sus seis casillas, incluidas las vacías. Los íconos solo aparecen al poseer el bloque (o por ser ilimitados en Creativo).
- Sol cuadrado con textura procedural de 16×16 píxeles para mantener el mismo lenguaje visual voxel/pixel de la luna.
- Correcciones de interacción, aparición nocturna, colisiones y estados de interfaz.

## Cambios de la v1.6

- Selector de tamaño al crear el mundo: pequeño (64×64), mediano (96×96) o grande (128×128).
- Profundidad aumentada de tres a dieciséis capas completamente rompibles.
- Render de superficie optimizado: los bloques enterrados existen, pero solo se envían a la GPU cuando quedan expuestos.
- Lagos procedurales con agua transparente atravesable, fondos de arena y playas irregulares.
- Movimiento acuático con avance reducido, hundimiento suave y ascenso usando el botón de salto.
- Primer bloque de arena con textura procedural y stack máximo de 47.
- Nueva barra compacta de seis espacios; pasto 35, hojas 36, madera 37 y arena 47, más dos espacios futuros.
- Sol reconstruido con pequeños cubos para acompañar el estilo voxel de la luna.
- Textura pixelada más detallada para el cuerpo y las patas de la Araña Umbral.
- Protección adicional frente a errores de carga o ejecución y generación segura lejos del agua inicial.

## Cambios de la v1.5

- Mundo ampliado de 64×64 a 96×96 bloques para explorar mucho más terreno.
- Nuevo botón de salto para móvil y tecla Espacio en escritorio.
- Vuelo exclusivo de Creativo: se activa con el botón VOLAR o la tecla F, se asciende con salto y se desciende con BAJAR o Shift.
- Los bloques del mundo y los objetos que sueltan comparten ahora exactamente los mismos materiales y texturas procedurales.
- Animación completa de ataque para la Araña Umbral, con preparación, embestida, patas delanteras y golpe sincronizado.
- Las arañas mueven las patas y el cuerpo al escalar bloques en vez de elevarse instantáneamente.
- Detección enemiga limitada a cinco bloques, menor velocidad de persecución y ataques más espaciados.
- Física vertical, aterrizaje sobre bloques y revisión de colisiones para evitar obstáculos invisibles.

## Cambios de la v1.4

- Modo Supervivencia con cinco corazones, daño, muerte y reaparición.
- Modo Creativo con pasto, hojas y madera ilimitados y mallas que crecen bajo demanda.
- Mundo normal para ambos modos y mundo plano exclusivo de Creativo.
- Ciclo de siete minutos: día, atardecer, noche y amanecer.
- Sol animado y media luna construida mediante pequeños cubos.
- Primera entidad: Araña Umbral con modelo, ojos y ocho patas animadas por matrices.
- Arañas nocturnas con cono de visión frontal, persecución y ataques.
- Pasto con cara superior de césped, laterales de tierra y base propia.
- Texturas diferenciadas para las hojas, la corteza y los anillos de la madera.
- Colisiones corregidas para impedir bloques dentro del jugador y permitir escapar de una intersección previa.

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
- Rapier 3D `0.19.3` para la gravedad de la arena y los sensores físicos del agua.
- idb `8.0.3` sobre IndexedDB para mundos múltiples y guardado automático.
- HTML, CSS y JavaScript modular sin proceso de compilación.
- Despliegue automático con GitHub Pages.

## Ejecutar localmente

Por usar módulos ES, abre el proyecto desde un servidor HTTP local. Por ejemplo:

```bash
python3 -m http.server 8080
```

Después visita `http://localhost:8080`.
