'use strict';
const os = require('node:os');
const { agregar } = require('../lib/agregar');
const lectores = ['claude-code', 'codex', 'opencode', 'gemini-cli', 'antigravity', 'orquestadores'].map(n => require(`./${n}`));

async function recolectar({ home = process.env.TELEMETRIA_HOME || os.homedir(), dias = 7, ahora = Date.now() } = {}) {
  const desde = dias === null ? -Infinity : Number(ahora) - dias * 86400000;
  const resultados = await Promise.all(lectores.map(l => l.leer({ home, desde })));
  return agregar({ registros: resultados.flatMap(r => r.registros), limites: resultados.flatMap(r => r.limites),
    avisos: resultados.flatMap(r => r.aviso ? [r.aviso] : []), dias, ahora });
}

module.exports = { lectores, recolectar };
