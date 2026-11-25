'use strict';
const path = require('node:path');
const { numero: n, fecha, registro, lector, archivos, lineas } = require('./comun');

module.exports = lector('Codex', async (ctx, home) => {
  let ultimaCuota = -Infinity;
  const raiz = path.join(process.env.CODEX_HOME || path.join(home, '.codex'), 'sessions');
  for (const ruta of await archivos(raiz, r => /^rollout-.*\.jsonl$/.test(path.basename(r)), ctx)) {
    let sesion = path.basename(ruta, '.jsonl'), proyecto = null, modelo = '?', effort = null;
    let anterior = {};
    await lineas(ruta, /"(?:session_meta|turn_context|token_count)"/, ctx, dato => {
      const p = dato.payload;
      if (!p) return;
      if (dato.type === 'session_meta') { sesion = p.id || sesion; proyecto = p.cwd || proyecto; return; }
      if (dato.type === 'turn_context') {
        modelo = p.model || '?'; effort = p.effort ?? null; proyecto = p.cwd || proyecto; return;
      }
      if (dato.type !== 'event_msg' || p.type !== 'token_count') return;
      const instante = fecha(dato.timestamp);
      if (Number.isFinite(instante) && instante >= ctx.desde && p.rate_limits && instante >= ultimaCuota) {
        const ventanas = ['primary', 'secondary'].flatMap(clave => {
          const v = p.rate_limits[clave];
          if (!v || !Number.isFinite(v.used_percent)) return [];
          const renueva = typeof v.resets_at === 'number' ? fecha(v.resets_at) : NaN;
          return [{ nombre: v.window_minutes === 10080 ? 'semanal' : `${v.window_minutes / 60} h`,
            usado: v.used_percent, renueva: Number.isFinite(renueva) ? new Date(renueva).toISOString() : null }];
        });
        ctx.limites = [{ herramienta: 'Codex', plan: p.rate_limits.plan_type || '?', ventanas }];
        ultimaCuota = instante;
      }
      const uso = p.info?.total_token_usage;
      if (!uso) return;
      const diferencia = clave => Math.max(0, n(uso[clave]) - n(anterior[clave]));
      const datos = { entrada: diferencia('input_tokens'), cache: diferencia('cached_input_tokens'),
        salida: diferencia('output_tokens'), razonamiento: diferencia('reasoning_output_tokens') };
      anterior = uso;
      if (!Number.isFinite(instante) || instante < ctx.desde || !Object.values(datos).some(v => v > 0)) return;
      ctx.registros.push(registro('Codex', 'OpenAI', { ...datos, modelo, effort, fecha: instante, sesion, proyecto }));
    });
  }
});
