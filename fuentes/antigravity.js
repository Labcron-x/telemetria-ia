'use strict';
const path = require('node:path');
const { numero: n, fecha, registro, lector, archivos, lineas } = require('./comun');

module.exports = lector('Antigravity', async (ctx, home) => {
  const vistos = new Set();
  for (const variante of ['antigravity-cli', 'antigravity', 'antigravity-ide']) {
    const raiz = path.join(home, '.gemini', variante, 'brain');
    for (const ruta of await archivos(raiz, r => path.basename(r) === 'transcript_full.jsonl'
      && path.relative(raiz, r).split(path.sep).length === 4
      && path.basename(path.dirname(r)) === 'logs'
      && path.basename(path.dirname(path.dirname(r))) === '.system_generated', ctx)) {
      const sesion = path.relative(raiz, ruta).split(path.sep)[0];
      await lineas(ruta, /"(?:input_tokens|cache_read_tokens|output_tokens|thinking_tokens)"/, ctx, dato => {
        const clave = `${sesion}\0${dato.step_index}`;
        if (dato.step_index === undefined || vistos.has(clave)) return;
        const instante = fecha(dato.created_at);
        if (!Number.isFinite(instante) || instante < ctx.desde) return;
        const entrada = n(dato.input_tokens) + n(dato.cache_read_tokens);
        if (!(entrada + n(dato.output_tokens) + n(dato.thinking_tokens) > 0)) return;
        vistos.add(clave);
        ctx.registros.push(registro('Antigravity', 'Google (Antigravity)', { modelo: dato.model || '?',
          fecha: instante, entrada, cache: n(dato.cache_read_tokens), salida: n(dato.output_tokens),
          razonamiento: n(dato.thinking_tokens), sesion }));
      });
    }
  }
});
