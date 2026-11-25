'use strict';
const path = require('node:path');
const { stat } = require('node:fs/promises');
const { numero: n, costo, registro, lector } = require('./comun');

function sqlite() {
  const emitir = process.emitWarning;
  process.emitWarning = function (aviso, tipo, ...resto) {
    if ((tipo === 'ExperimentalWarning' || aviso?.name === 'ExperimentalWarning')
      && /sqlite/i.test(String(aviso))) return;
    return emitir.call(this, aviso, tipo, ...resto);
  };
  try { return require('node:sqlite').DatabaseSync; }
  finally { process.emitWarning = emitir; }
}

module.exports = lector('OpenCode', async (ctx, home) => {
  const ruta = path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'opencode', 'opencode.db');
  try {
    const info = await stat(ruta);
    ctx.archivos++;
    if (info.mtimeMs < ctx.desde) return;
  } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const DatabaseSync = sqlite();
  const db = new DatabaseSync(ruta, { readOnly: true });
  try {
    // No se selecciona data: SQLite extrae únicamente los metadatos permitidos.
    const consulta = db.prepare(`SELECT m.id, m.session_id, m.time_created, s.directory,
      json_extract(m.data, '$.tokens') AS tokens, json_extract(m.data, '$.cost') AS cost,
      json_extract(m.data, '$.modelID') AS model, json_extract(m.data, '$.providerID') AS provider
      FROM message m LEFT JOIN session s ON s.id = m.session_id
      WHERE m.time_created >= ? AND CASE WHEN json_valid(m.data)
        THEN json_extract(m.data, '$.role') = 'assistant' ELSE 0 END`);
    for (const fila of consulta.iterate(ctx.desde)) {
      try {
        const t = JSON.parse(fila.tokens || '{}');
        const entrada = n(t.input) + n(t.cache?.read) + n(t.cache?.write);
        if (!(entrada + n(t.output) + n(t.reasoning) > 0)) continue;
        ctx.registros.push(registro('OpenCode', fila.provider === 'opencode' ? 'OpenCode Zen' : fila.provider || '?', {
          modelo: fila.model || '?', fecha: fila.time_created, entrada, cache: n(t.cache?.read),
          salida: n(t.output), razonamiento: n(t.reasoning), costo: costo(fila.cost),
          sesion: fila.session_id, proyecto: fila.directory || null,
        }));
      } catch { ctx.errores++; }
    }
  } finally { db.close(); }
});
