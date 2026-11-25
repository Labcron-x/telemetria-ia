'use strict';

const fs = require('node:fs');
const { readdir, stat } = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const numero = valor => typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, valor) : 0;
const costo = valor => typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
function fecha(valor) {
  if (typeof valor === 'number') return valor < 1e12 ? valor * 1000 : valor;
  return typeof valor === 'string' ? Date.parse(valor) : NaN;
}
function registro(herramienta, proveedor, datos = {}) {
  return { herramienta, proveedor, modelo: '?', fecha: NaN, entrada: 0, cache: 0,
    salida: 0, razonamiento: 0, costo: null, sesion: '', proyecto: null, ...datos };
}

// Cada fuente solo consulta metadatos; nunca accede a propiedades de contenido.
function lector(nombre, ejecutar) {
  return { nombre, async leer({ home, desde = -Infinity }) {
    const contexto = { registros: [], limites: [], archivos: 0, errores: 0, desde };
    try { await ejecutar(contexto, home); } catch { contexto.errores++; }
    return { registros: contexto.registros, limites: contexto.limites,
      aviso: contexto.errores ? `${nombre}: se omitieron archivos o líneas ilegibles`
        : contexto.archivos ? null : `${nombre}: sin historial en esta PC` };
  } };
}

async function archivos(raiz, aceptar, contexto, recursivo = true) {
  const encontrados = [];
  async function visitar(directorio) {
    let entradas;
    try { entradas = await readdir(directorio, { withFileTypes: true }); }
    catch (error) { if (error.code !== 'ENOENT') contexto.errores++; return; }
    for (const entrada of entradas) {
      const ruta = path.join(directorio, entrada.name);
      if (entrada.isDirectory() && recursivo) await visitar(ruta);
      else if (entrada.isFile() && aceptar(ruta)) {
        try {
          contexto.archivos++;
          if ((await stat(ruta)).mtimeMs >= contexto.desde) encontrados.push(ruta);
        } catch { contexto.errores++; }
      }
    }
  }
  await visitar(raiz);
  return encontrados.sort();
}

async function lineas(ruta, clave, contexto, recibir) {
  const flujo = fs.createReadStream(ruta, { encoding: 'utf8' });
  const lector = readline.createInterface({ input: flujo, crlfDelay: Infinity });
  // readline no propaga todos los errores del flujo a su iterador.
  flujo.on('error', () => lector.close());
  try {
    for await (const linea of lector) {
      if (!clave.test(linea)) continue;
      try { recibir(JSON.parse(linea)); } catch { contexto.errores++; }
    }
    if (flujo.errored) contexto.errores++;
  } catch { contexto.errores++; }
  finally { lector.close(); flujo.destroy(); }
}

module.exports = { numero, costo, fecha, registro, lector, archivos, lineas };
