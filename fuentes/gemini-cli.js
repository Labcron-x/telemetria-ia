'use strict';
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { numero: n, fecha, registro, lector, archivos, lineas } = require('./comun');

module.exports = lector('Gemini CLI', async (ctx, home) => {
  const raiz = path.join(home, '.gemini', 'tmp');
  const ultimos = new Map();
  for (const ruta of await archivos(raiz, r => /^session-.*\.jsonl?$/.test(path.basename(r))
    && path.basename(path.dirname(r)) === 'chats' && path.dirname(path.dirname(path.dirname(r))) === raiz, ctx)) {
    let proyecto = null, sesion = path.basename(ruta).replace(/\.jsonl?$/, '');
    try { proyecto = (await readFile(path.join(path.dirname(ruta), '..', '.project_root'), 'utf8')).trim() || null; }
    catch (error) { if (error.code !== 'ENOENT') ctx.errores++; }
    let indice = 0;
    const recibir = dato => {
      if (dato.$set !== undefined || dato.$rewindTo !== undefined) return;
      if (dato.sessionId) sesion = dato.sessionId;
      if (dato.type !== 'gemini' || !dato.tokens) return;
      const instante = fecha(dato.timestamp);
      if (!Number.isFinite(instante)) return;
      const t = dato.tokens;
      const clave = `${sesion}\0${dato.id || `${ruta}:${indice++}`}`;
      ultimos.set(clave, registro('Gemini CLI', 'Google', { modelo: dato.model || '?', fecha: instante,
        entrada: n(t.input), cache: n(t.cached), salida: n(t.output), razonamiento: n(t.thoughts), sesion, proyecto }));
    };
    if (ruta.endsWith('.jsonl')) await lineas(ruta, /"(?:sessionId|gemini)"/, ctx, recibir);
    else {
      try {
        const dato = JSON.parse(await readFile(ruta, 'utf8'));
        sesion = dato.sessionId || sesion;
        for (const mensaje of dato.messages || []) {
          try { recibir(mensaje); } catch { ctx.errores++; }
        }
      } catch { ctx.errores++; }
    }
  }
  ctx.registros = [...ultimos.values()].filter(r => r.fecha >= ctx.desde);
});
