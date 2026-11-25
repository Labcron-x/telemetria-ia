'use strict';
const os = require('node:os');
const { agregar } = require('../lib/agregar');
const lectores = ['claude-code', 'codex', 'opencode', 'gemini-cli', 'antigravity', 'orquestadores'].map(n => require(`./${n}`));

async function recolectar({ home = process.env.TELEMETRIA_HOME || os.homedir(), dias = 7, ahora = Date.now(), filtro = null } = {}) {
  const desde = dias === null ? -Infinity : Number(ahora) - dias * 86400000;
  const resultados = await Promise.all(lectores.map(l => l.leer({ home, desde })));
  const registros = resultados.flatMap(r => r.registros).filter(r => !filtro
    || (r.proyecto !== null && r.proyecto.toLowerCase().includes(filtro.proyecto.toLowerCase())));
  return agregar({ registros, limites: resultados.flatMap(r => r.limites),
    avisos: resultados.flatMap(r => r.aviso ? [r.aviso] : []), dias, ahora, filtro });
}

module.exports = { lectores, recolectar };
