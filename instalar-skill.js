'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const marca = '.origen-telemetria-ia';
const interfaz = `interface:
  display_name: "Telemetría de IA"
  short_description: "Consumo de IA de la PC por modelo, effort, herramienta y proyecto"
  default_prompt: "Usa $telemetria para mostrar mi consumo de IA de esta semana."
policy:
  allow_implicit_invocation: true
`;

function estado(ruta) {
  try { return fs.lstatSync(ruta); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function comprobar(ruta, directorio = false) {
  const dato = estado(ruta);
  if (dato && !(directorio ? dato.isDirectory() : dato.isFile())) {
    throw new Error(`ruta no segura: ${ruta}`);
  }
}

function procesar(destino, quitar, plantilla) {
  const carpeta = path.resolve(destino.base, 'skills', 'telemetria');
  const origen = path.join(carpeta, marca);
  const dato = estado(carpeta);
  if (dato && (!dato.isDirectory() || !estado(origen)?.isFile())) {
    console.log(`${destino.nombre}: omitida: carpeta ajena o enlace en ${carpeta}`);
    return 1;
  }
  if (quitar) {
    // La ruta absoluta queda limitada a skills/telemetria y requiere la marca propia.
    if (dato) fs.rmSync(carpeta, { recursive: true });
    console.log(`${destino.nombre}: ${dato ? 'quitada de' : 'omitida: no está instalada en'} ${carpeta}`);
    return 0;
  }
  const skill = path.join(carpeta, 'SKILL.md');
  comprobar(skill);
  comprobar(origen);
  if (destino.codex) {
    comprobar(path.join(carpeta, 'agents'), true);
    comprobar(path.join(carpeta, 'agents', 'openai.yaml'));
  }
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(origen, `${__dirname.replace(/\\/g, '/')}\n`);
  fs.writeFileSync(skill, plantilla);
  if (destino.codex) {
    fs.mkdirSync(path.join(carpeta, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(carpeta, 'agents', 'openai.yaml'), interfaz);
  }
  console.log(`${destino.nombre}: instalada en ${carpeta}`);
  return 0;
}

function principal() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--claude', '--codex', '--quitar'].includes(arg))) {
    console.error('Uso: node instalar-skill.js [--claude] [--codex] [--quitar]');
    return 2;
  }
  const home = process.env.TELEMETRIA_HOME || os.homedir();
  const destinos = [
    { nombre: 'Claude Code', opcion: '--claude', base: process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude') },
    { nombre: 'Codex', opcion: '--codex', base: process.env.CODEX_HOME || path.join(home, '.codex'), codex: true },
  ];
  const explicito = args.includes('--claude') || args.includes('--codex');
  const quitar = args.includes('--quitar');
  const plantilla = quitar ? null : fs.readFileSync(path.join(__dirname, 'skill', 'SKILL.md'), 'utf8')
    .replaceAll('{{RAIZ}}', () => __dirname.replace(/\\/g, '/'));
  let codigo = 0, elegidos = 0;
  for (const destino of destinos) {
    if (explicito && !args.includes(destino.opcion)) continue;
    try {
      if (!explicito && !quitar && !fs.existsSync(destino.base)) {
        console.log(`${destino.nombre}: omitida: no existe la carpeta base ${destino.base}`);
        continue;
      }
      elegidos++;
      codigo = Math.max(codigo, procesar(destino, quitar, plantilla));
    } catch (error) {
      console.log(`${destino.nombre}: omitida: ${error.message}`);
      codigo = 1;
    }
  }
  if (!elegidos) {
    console.log('No existe ninguna carpeta base de Claude Code o Codex. Usa --claude o --codex para crearla.');
    codigo = 2;
  }
  console.log('Claude Code: /telemetria; Codex: $telemetria; o pregunta "¿cuánto consumí esta semana?".');
  console.log('Si Claude Code o Codex estaban abiertos, abre una sesión nueva para que vean la skill.');
  return codigo;
}

try { process.exitCode = principal(); } catch (error) {
  console.error(`No se pudo instalar la skill: ${error.message}`);
  process.exitCode = 1;
}
