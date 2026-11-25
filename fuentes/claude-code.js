'use strict';
const path = require('node:path');
const { numero: n, costo, fecha, registro, lector, archivos, lineas } = require('./comun');

module.exports = lector('Claude Code', async (ctx, home) => {
  const vistos = new Set();
  const raiz = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), 'projects');
  for (const ruta of await archivos(raiz, r => r.endsWith('.jsonl'), ctx)) {
    await lineas(ruta, /"usage"/, ctx, dato => {
      const mensaje = dato.message;
      if (dato.type !== 'assistant' || !mensaje?.usage || !mensaje.id || vistos.has(mensaje.id)
        || mensaje.model?.startsWith('<')) return;
      const instante = fecha(dato.timestamp);
      if (!Number.isFinite(instante) || instante < ctx.desde) return;
      vistos.add(mensaje.id);
      const uso = mensaje.usage;
      ctx.registros.push(registro('Claude Code', 'Anthropic', {
        modelo: mensaje.model || '?', fecha: instante,
        entrada: n(uso.input_tokens) + n(uso.cache_creation_input_tokens) + n(uso.cache_read_input_tokens),
        cache: n(uso.cache_read_input_tokens), salida: n(uso.output_tokens),
        razonamiento: n(uso.output_tokens_details?.thinking_tokens), costo: costo(dato.costUSD),
        sesion: dato.sessionId || path.basename(ruta, '.jsonl'), proyecto: dato.cwd || null,
      }));
    });
  }
});
