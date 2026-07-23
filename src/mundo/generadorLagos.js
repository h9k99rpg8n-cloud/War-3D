export function crearMapaLagos(
  tamanoCuadricula,
  tipoMundo,
  profundidadMaxima = 2,
  semillaMundo = 0,
  pesos = {},
) {
  const total = tamanoCuadricula * tamanoCuadricula;
  const profundidades = new Uint8Array(total);
  const playas = new Uint8Array(total);
  if (tipoMundo !== "normal") return crearResultado(profundidades, playas);

  const centro = (tamanoCuadricula - 1) / 2;
  const pesoLagos = limitar(Number(pesos.lagos) || 1, 0.2, 1.6);
  const pesoArena = limitar(Number(pesos.arena) || 1, 0.35, 1.8);
  const cantidad = Math.max(
    1,
    Math.round((tamanoCuadricula / 32) * pesoLagos),
  );
  const lagos = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    const angulo =
      (indice / cantidad) * Math.PI * 2 + hash(indice, 17, semillaMundo) * 0.72;
    const distancia =
      tamanoCuadricula * (0.3 + hash(indice, 29, semillaMundo) * 0.08);
    lagos.push({
      x: centro + Math.cos(angulo) * distancia,
      z: centro + Math.sin(angulo) * distancia,
      radioX: (5.8 + hash(indice, 41, semillaMundo) * 4.4) *
        (0.84 + pesoLagos * 0.16),
      radioZ: (5.4 + hash(indice, 53, semillaMundo) * 4.8) *
        (0.84 + pesoLagos * 0.16),
      semilla: 71 + indice * 19 + (semillaMundo % 431),
    });
  }

  for (let z = 2; z < tamanoCuadricula - 2; z += 1) {
    for (let x = 2; x < tamanoCuadricula - 2; x += 1) {
      let distanciaMinima = Number.POSITIVE_INFINITY;
      for (const lago of lagos) {
        const dx = (x - lago.x) / lago.radioX;
        const dz = (z - lago.z) / lago.radioZ;
        const irregularidad =
          (hash(x + lago.semilla, z - lago.semilla, semillaMundo) - 0.5) * 0.16 +
          Math.sin((x + z + lago.semilla) * 0.43) * 0.045;
        distanciaMinima = Math.min(
          distanciaMinima,
          Math.hypot(dx, dz) + irregularidad,
        );
      }

      const indiceCelda = z * tamanoCuadricula + x;
      if (distanciaMinima < 1) {
        profundidades[indiceCelda] =
          distanciaMinima < 0.56 ? profundidadMaxima : 1;
      } else if (distanciaMinima < 1.16 + pesoArena * 0.12) {
        playas[indiceCelda] = 1;
      }
    }
  }

  // El área inicial siempre queda seca para evitar aparecer dentro del agua.
  for (let z = 0; z < tamanoCuadricula; z += 1) {
    for (let x = 0; x < tamanoCuadricula; x += 1) {
      if (Math.hypot(x - centro, z - (centro + 5)) > 9) continue;
      const indiceCelda = z * tamanoCuadricula + x;
      profundidades[indiceCelda] = 0;
      playas[indiceCelda] = 0;
    }
  }

  return crearResultado(profundidades, playas);

  function crearResultado(profundidad, playa) {
    return {
      profundidadEn(x, z) {
        return profundidad[z * tamanoCuadricula + x] ?? 0;
      },
      esPlaya(x, z) {
        return playa[z * tamanoCuadricula + x] === 1;
      },
      obtenerCantidadCeldasAgua() {
        let cantidadAgua = 0;
        for (const valor of profundidad) if (valor > 0) cantidadAgua += 1;
        return cantidadAgua;
      },
    };
  }
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function hash(a, b, semilla = 0) {
  const valor = Math.sin(a * 127.1 + b * 311.7 + semilla * 0.000173) * 43758.5453;
  return valor - Math.floor(valor);
}
