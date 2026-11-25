#!/usr/bin/env node
'use strict';
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { recolectar } = require('../fuentes');
const { terminal, vistas } = require('../lib/formato');

const uso = `Uso:
  telemetria [días|todo] [--por <vista>] [--proyecto <texto>]   (7 días por defecto)
  telemetria json [días|todo] [--por <vista>] [--proyecto <texto>]
  telemetria html [días|todo] [--por <vista>] [--proyecto <texto>] [--salida <ruta>] [--abrir]
  telemetria --ayuda

--por elige una sección de la terminal (sin esta opción se muestran todas):
  modelo: consumo por modelo, sumando herramientas
  effort: consumo por modelo y nivel de razonamiento
  herramienta: consumo por herramienta y sus modelos
  dia: tokens diarios por herramienta
  proyecto: proyectos y sus modelos con effort
Límites y avisos se muestran siempre al final. JSON y HTML conservan el reporte completo.
--proyecto filtra carpetas por texto, sin distinguir mayúsculas, en los tres formatos.`;

function argumentos(args) {
  if (args.length === 1 && args[0] === '--ayuda') return { ayuda: true };
  const resto = [...args];
  const modo = ['json', 'html'].includes(resto[0]) ? resto.shift() : 'terminal';
  let dias = 7, salida, abrir = false, por, proyecto;
  if (resto[0] && !resto[0].startsWith('--')) {
    const valor = resto.shift();
    if (valor === 'todo') dias = null;
    else if (/^[1-9]\d*$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) <= 100000000) dias = Number(valor);
    else throw new Error('Periodo inválido.');
  }
  while (resto.length) {
    const opcion = resto.shift();
    if (opcion === '--por' && por === undefined && resto[0] && !resto[0].startsWith('--')) {
      por = resto.shift();
      if (!vistas.includes(por)) throw new Error(`Vista desconocida. Vistas válidas: ${vistas.join(', ')}.`);
    }
    else if (opcion === '--proyecto' && proyecto === undefined && resto[0] && !resto[0].startsWith('--')) proyecto = resto.shift();
    else if (modo === 'html' && opcion === '--abrir' && !abrir) abrir = true;
    else if (modo === 'html' && opcion === '--salida' && salida === undefined && resto[0] && !resto[0].startsWith('--')) salida = resto.shift();
    else throw new Error('Argumentos inválidos.');
  }
  return { modo, dias, salida, abrir, por, filtro: proyecto === undefined ? null : { proyecto } };
}

async function abrirArchivo(ruta) {
  const comando = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  // La variable evita reinterpretar caracteres del nombre como órdenes de cmd.
  const args = process.platform === 'win32' ? ['/d', '/v:off', '/c', 'start', '""', '"%TELEMETRIA_REPORTE%"'] : [ruta];
  await new Promise((resolver, rechazar) => {
    const hijo = spawn(comando, args, { stdio: 'ignore', windowsHide: true,
      ...(process.platform === 'win32' ? { windowsVerbatimArguments: true,
        env: { ...process.env, TELEMETRIA_REPORTE: ruta } } : {}) });
    hijo.once('error', rechazar);
    hijo.once('exit', codigo => codigo === 0 ? resolver() : rechazar(new Error('No se pudo abrir el reporte.')));
  });
}

async function main() {
  let opciones;
  try { opciones = argumentos(process.argv.slice(2)); }
  catch (error) { console.error(`${error.message}\n${uso}`); process.exitCode = 2; return; }
  if (opciones.ayuda) { console.log(uso); return; }
  let html;
  if (opciones.modo === 'html') {
    try { html = require('../lib/html.js'); }
    catch { console.error('No está disponible lib/html.js para generar el reporte HTML.'); process.exitCode = 1; return; }
  }
  const home = process.env.TELEMETRIA_HOME || os.homedir();
  const agregado = await recolectar({ home, dias: opciones.dias, filtro: opciones.filtro });
  if (opciones.modo === 'json') console.log(JSON.stringify(agregado, null, 2));
  else if (opciones.modo === 'terminal') console.log(terminal(agregado, opciones.por));
  else {
    const ruta = path.resolve(opciones.salida || path.join(home, '.cache', 'telemetria-ia', 'reporte.html'));
    const contenido = html(agregado);
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, contenido, 'utf8');
    console.log(ruta);
    if (opciones.abrir) await abrirArchivo(ruta);
  }
}

main().catch(() => { console.error('No se pudo completar el reporte de telemetría.'); process.exitCode = 1; });
