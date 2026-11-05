/**
 * DSP mínimo y determinista para War 3D.
 *
 * Todo el audio del juego se sintetiza aquí, sin descargar archivos. Este
 * módulo no depende del navegador: también se ejecuta en Node, lo que permite
 * exportar los sonidos a WAV para revisarlos y probarlos automáticamente.
 */

export const FRECUENCIA_MUESTREO = 48_000;

/** PRNG determinista (mulberry32). Misma semilla → mismo sonido. */
export function crearAleatorio(semilla = 1) {
  let estado = (Number(semilla) || 1) >>> 0;
  return function aleatorio() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearBuffer(duracionSegundos, frecuenciaMuestreo = FRECUENCIA_MUESTREO) {
  const largo = Math.max(1, Math.round(duracionSegundos * frecuenciaMuestreo));
  return { datos: new Float32Array(largo), frecuenciaMuestreo };
}

export function ruido(duracionSegundos, aleatorio, frecuenciaMuestreo = FRECUENCIA_MUESTREO) {
  const { datos } = crearBuffer(duracionSegundos, frecuenciaMuestreo);
  for (let i = 0; i < datos.length; i += 1) {
    datos[i] = aleatorio() * 2 - 1;
  }
  return datos;
}

/** Ruido "marrón": más graves y menos agresivo que el blanco. */
export function ruidoMarron(duracionSegundos, aleatorio, frecuenciaMuestreo = FRECUENCIA_MUESTREO) {
  const { datos } = crearBuffer(duracionSegundos, frecuenciaMuestreo);
  let ultimo = 0;
  for (let i = 0; i < datos.length; i += 1) {
    const blanco = aleatorio() * 2 - 1;
    ultimo = (ultimo + 0.02 * blanco) / 1.02;
    datos[i] = ultimo * 3.5;
  }
  return datos;
}

/**
 * Biquad RBJ. `f` y `q` pueden ser números o funciones de t∈[0,1] para
 * barrer el filtro durante el sonido (clave para "whoosh" y gemidos).
 */
export function filtro(entrada, opciones) {
  const {
    tipo = "bandpass",
    f = 1000,
    q = 1,
    ganancia = 0,
    frecuenciaMuestreo = FRECUENCIA_MUESTREO,
  } = opciones;
  const salida = new Float32Array(entrada.length);
  const bloque = 32;
  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a1 = 0;
  let a2 = 0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const total = entrada.length;

  for (let inicio = 0; inicio < total; inicio += bloque) {
    const t = inicio / total;
    const frecuencia = Math.max(
      20,
      Math.min(frecuenciaMuestreo * 0.45, typeof f === "function" ? f(t) : f),
    );
    const qActual = Math.max(0.05, typeof q === "function" ? q(t) : q);
    const w0 = (2 * Math.PI * frecuencia) / frecuenciaMuestreo;
    const cos = Math.cos(w0);
    const sen = Math.sin(w0);
    const alfa = sen / (2 * qActual);
    let a0 = 1;

    if (tipo === "lowpass") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alfa;
      a1 = -2 * cos;
      a2 = 1 - alfa;
    } else if (tipo === "highpass") {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alfa;
      a1 = -2 * cos;
      a2 = 1 - alfa;
    } else if (tipo === "notch") {
      b0 = 1;
      b1 = -2 * cos;
      b2 = 1;
      a0 = 1 + alfa;
      a1 = -2 * cos;
      a2 = 1 - alfa;
    } else if (tipo === "peaking") {
      const A = Math.pow(10, ganancia / 40);
      b0 = 1 + alfa * A;
      b1 = -2 * cos;
      b2 = 1 - alfa * A;
      a0 = 1 + alfa / A;
      a1 = -2 * cos;
      a2 = 1 - alfa / A;
    } else {
      // bandpass con ganancia 0 dB en el pico
      b0 = alfa;
      b1 = 0;
      b2 = -alfa;
      a0 = 1 + alfa;
      a1 = -2 * cos;
      a2 = 1 - alfa;
    }

    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;
    const fin = Math.min(total, inicio + bloque);
    for (let i = inicio; i < fin; i += 1) {
      const x0 = entrada[i];
      const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      salida[i] = y0;
    }
  }
  return salida;
}

/** Envolvente exponencial con ataque lineal corto. */
export function envolvente(largo, { ataque = 0.002, caida = 0.2, curva = 3 } = {}) {
  const salida = new Float32Array(largo);
  const muestrasAtaque = Math.max(1, Math.round(ataque * FRECUENCIA_MUESTREO));
  for (let i = 0; i < largo; i += 1) {
    if (i < muestrasAtaque) {
      salida[i] = i / muestrasAtaque;
      continue;
    }
    const t = (i - muestrasAtaque) / Math.max(1, largo - muestrasAtaque);
    salida[i] = Math.pow(Math.max(0, 1 - t), curva) * Math.exp(-t * caida);
  }
  return salida;
}

export function oscilador(
  frecuencia,
  duracionSegundos,
  { tipo = "sine", fase = 0, frecuenciaMuestreo = FRECUENCIA_MUESTREO } = {},
) {
  const { datos } = crearBuffer(duracionSegundos, frecuenciaMuestreo);
  let acumulada = fase;
  for (let i = 0; i < datos.length; i += 1) {
    const f = typeof frecuencia === "function"
      ? frecuencia(i / datos.length)
      : frecuencia;
    acumulada += (2 * Math.PI * f) / frecuenciaMuestreo;
    const sen = Math.sin(acumulada);
    if (tipo === "saw") datos[i] = 2 * (acumulada / (2 * Math.PI) % 1) - 1;
    else if (tipo === "square") datos[i] = sen >= 0 ? 1 : -1;
    else if (tipo === "triangle") datos[i] = (2 / Math.PI) * Math.asin(sen);
    else datos[i] = sen;
  }
  return datos;
}

export function aplicar(entrada, ...procesos) {
  let salida = entrada;
  for (const proceso of procesos) salida = proceso(salida);
  return salida;
}

export function escalar(entrada, factor) {
  const salida = new Float32Array(entrada.length);
  for (let i = 0; i < entrada.length; i += 1) salida[i] = entrada[i] * factor;
  return salida;
}

export function multiplicar(entrada, envolventeActual) {
  const salida = new Float32Array(entrada.length);
  for (let i = 0; i < entrada.length; i += 1) {
    salida[i] = entrada[i] * (envolventeActual[i] ?? 0);
  }
  return salida;
}

/** Suma varias capas alineadas al inicio, recortando al largo pedido. */
export function mezclar(capas, duracionSegundos, frecuenciaMuestreo = FRECUENCIA_MUESTREO) {
  const total = Math.max(1, Math.round(duracionSegundos * frecuenciaMuestreo));
  const salida = new Float32Array(total);
  for (const { datos, desplazamiento = 0, ganancia = 1 } of capas) {
    const desde = Math.round(desplazamiento * frecuenciaMuestreo);
    for (let i = 0; i < datos.length; i += 1) {
      const destino = desde + i;
      if (destino < 0 || destino >= total) continue;
      salida[destino] += datos[i] * ganancia;
    }
  }
  return salida;
}

/** Reverb corto por combs en paralelo: da "espacio" a golpes y criaturas. */
export function reverberar(entrada, {
  mezcla = 0.25,
  tiempos = [0.031, 0.043, 0.057, 0.073],
  realimentacion = 0.62,
  frecuenciaMuestreo = FRECUENCIA_MUESTREO,
} = {}) {
  const salida = new Float32Array(entrada.length);
  for (const tiempo of tiempos) {
    const retardo = Math.max(1, Math.round(tiempo * frecuenciaMuestreo));
    const buffer = new Float32Array(retardo);
    let indice = 0;
    for (let i = 0; i < entrada.length; i += 1) {
      const leido = buffer[indice];
      const escrito = entrada[i] + leido * realimentacion;
      buffer[indice] = escrito;
      indice = (indice + 1) % retardo;
      salida[i] += leido / tiempos.length;
    }
  }
  for (let i = 0; i < entrada.length; i += 1) {
    salida[i] = entrada[i] * (1 - mezcla) + salida[i] * mezcla;
  }
  return salida;
}

/** Saturación suave tipo cinta: da cuerpo y evita pinchazos digitales. */
export function saturar(entrada, cantidad = 1.4) {
  const salida = new Float32Array(entrada.length);
  const normalizador = Math.tanh(cantidad);
  for (let i = 0; i < entrada.length; i += 1) {
    salida[i] = Math.tanh(entrada[i] * cantidad) / normalizador;
  }
  return salida;
}

/** Fundido de entrada y salida para que ningún sonido empiece o acabe con clic. */
export function fundir(entrada, { entradaMs = 1.5, salidaMs = 12 } = {}) {
  const salida = new Float32Array(entrada);
  const muestrasEntrada = Math.max(1, Math.round((entradaMs / 1000) * FRECUENCIA_MUESTREO));
  const muestrasSalida = Math.max(1, Math.round((salidaMs / 1000) * FRECUENCIA_MUESTREO));
  for (let i = 0; i < Math.min(muestrasEntrada, salida.length); i += 1) {
    salida[i] *= i / muestrasEntrada;
  }
  for (let i = 0; i < Math.min(muestrasSalida, salida.length); i += 1) {
    const indice = salida.length - 1 - i;
    salida[indice] *= i / muestrasSalida;
  }
  return salida;
}

/** Normaliza al pico indicado (por defecto 0.89, deja aire para mezclar). */
export function normalizar(entrada, pico = 0.89) {
  let maximo = 0;
  for (let i = 0; i < entrada.length; i += 1) {
    const valor = Math.abs(entrada[i]);
    if (valor > maximo) maximo = valor;
  }
  if (maximo < 1e-6) return entrada;
  const factor = pico / maximo;
  const salida = new Float32Array(entrada.length);
  for (let i = 0; i < entrada.length; i += 1) salida[i] = entrada[i] * factor;
  return salida;
}

export function limitarMuestras(datos, minimo = -1, maximo = 1) {
  const salida = new Float32Array(datos.length);
  for (let i = 0; i < datos.length; i += 1) {
    salida[i] = Math.max(minimo, Math.min(maximo, datos[i]));
  }
  return salida;
}

/** Desplazamiento de tono simple por remuestreo (para variar cada variante). */
export function variarTono(entrada, factor) {
  if (Math.abs(factor - 1) < 1e-3) return entrada;
  const largo = Math.max(1, Math.round(entrada.length / factor));
  const salida = new Float32Array(largo);
  for (let i = 0; i < largo; i += 1) {
    const posicion = i * factor;
    const indice = Math.floor(posicion);
    const resto = posicion - indice;
    const a = entrada[Math.min(indice, entrada.length - 1)] ?? 0;
    const b = entrada[Math.min(indice + 1, entrada.length - 1)] ?? 0;
    salida[i] = a + (b - a) * resto;
  }
  return salida;
}
