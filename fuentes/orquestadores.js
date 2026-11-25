'use strict';
const path = require('node:path');
const { numero: n, costo, fecha, registro, lector, archivos, lineas } = require('./comun');

module.exports = lector('Orquestadores', async (ctx, home) => {
  if (process.env.ORQ_CONSUMO === 'off') { ctx.archivos++; return; }
  const ruta = path.resolve(process.env.ORQ_CONSUMO || path.join(home, '.local', 'share', 'orquestar-codex', 'consumo.jsonl'));
  const agentes = { qwen: ['Qwen Code', 'Alibaba (Qwen)'], qoder: ['Qoder', 'Qoder'], mcode: ['MiniMax Code', 'MiniMax'] };
  for (const archivo of await archivos(path.dirname(ruta), r => r === ruta, ctx, false)) {
    await lineas(archivo, /"agente"/, ctx, dato => {
      if (!Object.hasOwn(agentes, dato.agente) || dato.sin_datos) return;
      const instante = fecha(dato.fecha);
      if (!Number.isFinite(instante) || instante < ctx.desde) return;
      ctx.registros.push(registro(...agentes[dato.agente], { modelo: dato.modelo || '?', fecha: instante,
        entrada: n(dato.entrada), cache: n(dato.cache), salida: n(dato.salida), razonamiento: n(dato.razonamiento),
        costo: costo(dato.costo), sesion: `${dato.repo}/${dato.id}`, proyecto: dato.repo || null }));
    });
  }
});
