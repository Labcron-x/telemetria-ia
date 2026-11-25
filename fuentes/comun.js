'use strict';

const fs = require('node:fs');
const { readdir, stat } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');

const numero = valor => typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, valor) : 0;
const costo = valor => typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
function fecha(valor) {
  if (typeof valor === 'number') return valor < 1e12 ? valor * 1000 : valor;
  return typeof valor === 'string' ? Date.parse(valor) : NaN;
}
function registro(herramienta, proveedor, datos = {}) {
  return { herramienta, proveedor, modelo: '?', effort: null, fecha: NaN, entrada: 0, cache: 0,
    salida: 0, razonamiento: 0, costo: null, sesion: '', proyecto: null, ...datos };
}

function normalizarProyecto(ruta, home, { plataforma = process.platform, temporal = os.tmpdir() } = {}) {
  if (typeof ruta !== 'string' || !ruta) return null;
  const p = plataforma === 'win32' ? path.win32 : path.posix;
  const normalizar = valor => {
    let resultado = p.normalize(valor);
    if (plataforma === 'win32') resultado = resultado.replace(/^[a-z]:/, unidad => unidad.toUpperCase());
    const raiz = p.parse(resultado).root;
    while (resultado.length > raiz.length && resultado.endsWith(p.sep)) resultado = resultado.slice(0, -1);
    return resultado;
  };
  let proyecto = normalizar(ruta);
  const hogar = typeof home === 'string' && home ? normalizar(home) : null;
  const dentro = base => {
    if (!base || !p.isAbsolute(base) || !p.isAbsolute(proyecto)) return false;
    const relativa = p.relative(base, proyecto);
    return !p.isAbsolute(relativa) && relativa !== '..' && !relativa.startsWith(`..${p.sep}`);
  };
  // Los límites de carpeta evitan confundir Temp con Temp-extra o home con home2.
  if (dentro(temporal && normalizar(temporal)) || dentro(hogar && p.join(hogar, 'AppData', 'Local', 'Temp'))) {
    const nombre = plataforma === 'win32' ? proyecto.toLowerCase() : proyecto;
    return nombre.includes('orq-consulta-') ? '(consultas del orquestador)' : '(carpetas temporales)';
  }
  // El sufijo del ID puede ser numérico: T-2, CX-12, REV-3, T o 12.
  proyecto = proyecto.split(p.sep).map(parte => parte.replace(/^wt-(.+?)-[A-Z0-9]+(?:-\d+)?$/, '$1')).join(p.sep);
  if (dentro(hogar)) {
    const relativa = p.relative(hogar, proyecto);
    return relativa ? `~${p.sep}${relativa}` : '~';
  }
  return proyecto;
}

// Cada fuente solo consulta metadatos; nunca accede a propiedades de contenido.
function lector(nombre, ejecutar) {
  return { nombre, async leer({ home, desde = -Infinity }) {
    const contexto = { registros: [], limites: [], archivos: 0, errores: 0, desde };
    try { await ejecutar(contexto, home); } catch { contexto.errores++; }
    // Se aplica a todos los lectores, incluso a resultados parciales y proyecto null.
    for (const r of contexto.registros) r.proyecto = normalizarProyecto(r.proyecto, home);
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

module.exports = { numero, costo, fecha, registro, normalizarProyecto, lector, archivos, lineas };
