'use strict';

const COLORES = new Map([
  ['Claude Code', 'claude'],
  ['Codex', 'codex'],
  ['OpenCode', 'opencode'],
  ['Gemini CLI', 'gemini'],
  ['Antigravity', 'antigravity'],
  ['Qwen Code', 'qwen'],
  ['Qoder', 'qoder'],
  ['MiniMax Code', 'minimax'],
]);

const NUMERICAS = new Set(['Sesiones', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razonamiento', 'Costo']);

const ESTILO = `
:root {
  color-scheme: light dark;
  --bg: #ffffff; --fg: #111827; --muted: #4b5563; --borde: #d1d5db;
  --fondo: #f9fafb; --rejilla: #e5e7eb;
  --t-claude: #9a3412; --t-codex: #0f766e; --t-opencode: #1d4ed8;
  --t-gemini: #6d28d9; --t-antigravity: #be185d; --t-qwen: #15803d;
  --t-qoder: #b91c1c; --t-minimax: #0369a1; --t-otro: #57534e;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a; --fg: #e5e7eb; --muted: #cbd5e1; --borde: #475569;
    --fondo: #1e293b; --rejilla: #334155;
    --t-claude: #fdba74; --t-codex: #5eead4; --t-opencode: #93c5fd;
    --t-gemini: #c4b5fd; --t-antigravity: #f9a8d4; --t-qwen: #86efac;
    --t-qoder: #fca5a5; --t-minimax: #7dd3fc; --t-otro: #d6d3d1;
  }
}
* { box-sizing: border-box; }
html, body { min-width: 0; }
body { margin: 0 auto; max-width: 1040px; padding: 1rem; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; overflow-wrap: anywhere; }
h1 { font-size: 1.7rem; margin-bottom: .2rem; }
h2 { font-size: 1.2rem; margin-top: 2rem; }
h3 { font-size: .9rem; }
.periodo, .generado { margin: .15rem 0; color: var(--muted); }
.tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .6rem; margin: 1rem 0; min-width: 0; }
.tarjeta { background: var(--fondo); border: 1px solid var(--borde); border-radius: .6rem; padding: .7rem; }
.tarjeta h3 { margin: 0; color: var(--muted); }
.tarjeta p { margin: .3rem 0 0; font-size: 1.3rem; font-weight: 700; }
.tarjeta small { display: block; font-size: .75rem; font-weight: 400; color: var(--muted); }
.tool-claude { --c: var(--t-claude); } .tool-codex { --c: var(--t-codex); }
.tool-opencode { --c: var(--t-opencode); } .tool-gemini { --c: var(--t-gemini); }
.tool-antigravity { --c: var(--t-antigravity); } .tool-qwen { --c: var(--t-qwen); }
.tool-qoder { --c: var(--t-qoder); } .tool-minimax { --c: var(--t-minimax); }
.tool-otro { --c: var(--t-otro); }
.grafico { display: block; width: 100%; max-width: 100%; height: auto; }
.rejilla { stroke: var(--rejilla); } .eje-linea { stroke: var(--borde); }
.eje { fill: var(--muted); font-size: 11px; }
.segmento { fill: var(--c); }
.leyenda { display: flex; flex-wrap: wrap; gap: .4rem .9rem; list-style: none; padding: 0; }
.leyenda li { display: flex; align-items: center; gap: .35rem; }
.swatch { display: inline-block; width: .8rem; height: .8rem; border-radius: .2rem; background: var(--c); }
.reparto { list-style: none; padding: 0; }
.reparto li { display: flex; align-items: center; gap: .6rem; min-width: 0; margin: .45rem 0; }
.reparto li > span { flex: 0 1 auto; min-width: 0; }
.barra { flex: 1 1 auto; min-width: 0; height: .8rem; background: var(--rejilla); border-radius: .4rem; overflow: hidden; }
.barra i { display: block; height: 100%; border-radius: .4rem; background: var(--c); }
.reparto strong { flex: 0 0 3.5rem; text-align: right; white-space: nowrap; }
.scroll { overflow-x: auto; max-width: 100%; min-width: 0; }
table { border-collapse: collapse; width: 100%; font-size: .85rem; }
th, td { border-bottom: 1px solid var(--borde); padding: .4rem .5rem; text-align: left; vertical-align: top; }
thead th { background: var(--fondo); white-space: nowrap; }
.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.modelo { white-space: nowrap; }
.proyecto { overflow-wrap: anywhere; word-break: break-word; min-width: 0; }
.fila-modelo { color: var(--muted); }
table th, table td { overflow-wrap: normal; }
.fila-modelo .modelo { padding-left: 1.4rem; white-space: nowrap; }
.limite { margin: .8rem 0; }
.limite-cabecera { display: flex; justify-content: space-between; gap: 1rem; }
.progreso { height: .75rem; background: var(--rejilla); border-radius: .4rem; overflow: hidden; margin: .3rem 0; }
.progreso i { display: block; height: 100%; background: var(--t-codex); }
.limite p { margin: 0; color: var(--muted); font-size: .85rem; }
.aviso { background: var(--fondo); border-left: 3px solid var(--t-otro); padding: .5rem .7rem; margin: .4rem 0; }
.vacio { padding: 1rem 0; color: var(--muted); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 520px) {
  body { padding: .6rem; }
  th, td { padding: .35rem .4rem; }
}
`.trim();

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\/\//g, '&#47;&#47;');
}

function num(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function entero(valor) {
  return String(Math.round(num(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function corto(valor) {
  const n = num(valor);
  const c = (x) => x.toFixed(1).replace(/\.0$/, '');
  if (Math.abs(n) >= 1e6) return `${c(n / 1e6)}M`;
  if (Math.abs(n) >= 1e3) return `${c(n / 1e3)}k`;
  return String(Math.round(n));
}

function costo(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `US$ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fecha(iso, local = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso ?? '');
  const anio = local ? d.getFullYear() : d.getUTCFullYear();
  const mes = local ? d.getMonth() + 1 : d.getUTCMonth() + 1;
  const dia = local ? d.getDate() : d.getUTCDate();
  return `${pad(dia)}/${pad(mes)}/${anio}`;
}

function hora(iso, local = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = local ? d.getHours() : d.getUTCHours();
  const m = local ? d.getMinutes() : d.getUTCMinutes();
  return `${pad(h)}:${pad(m)}`;
}

function fechaDia(dia) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dia));
  return partes ? `${partes[3]}/${partes[2]}` : esc(dia ?? '');
}

function clase(herramienta) {
  return COLORES.get(herramienta) ?? 'otro';
}

function porcentaje(parte, total) {
  return num(total) > 0 ? `${Math.round(num(parte) / num(total) * 100)} %` : '0 %';
}

function celdaNum(valor) {
  return `<td class="num">${valor}</td>`;
}

function encabezados(columnas) {
  return columnas.map((c) => `<th scope="col"${NUMERICAS.has(c) ? ' class="num"' : ''}>${esc(c)}</th>`).join('');
}

function tarjetas(totales) {
  const t = totales ?? {};
  const datos = [
    ['Entrada', corto(t.entrada), ''],
    ['Caché', corto(t.cache), `${porcentaje(t.cache, t.entrada)} de la entrada`],
    ['Salida', corto(t.salida), ''],
    ['Razonamiento', corto(t.razonamiento), ''],
    ['Sesiones', entero(t.sesiones), ''],
    ['Llamadas', entero(t.mensajes), ''],
    ['Costo', costo(t.costo), ''],
  ];
  return `<section class="tarjetas" aria-label="Totales">${datos.map(([nombre, valor, nota]) =>
    `<article class="tarjeta"><h3>${esc(nombre)}</h3><p>${valor}${nota ? `<small>${esc(nota)}</small>` : ''}</p></article>`
  ).join('')}</section>`;
}

function grafico(dias) {
  const lista = Array.isArray(dias) ? dias : [];
  const anchoTotal = Math.max(360, lista.length * 68 + 48);
  const altoTotal = 220;
  const izq = 42;
  const der = 16;
  const arriba = 16;
  const abajo = 52;
  const ancho = anchoTotal - izq - der;
  const alto = altoTotal - arriba - abajo;
  const base = arriba + alto;
  const grupos = lista.map((dia) => Object.entries(dia?.herramientas ?? {})
    .map(([h, v]) => ({ herramienta: h, valor: num(v?.entrada) + num(v?.salida) })));
  const totales = grupos.map((gs) => gs.reduce((suma, g) => suma + g.valor, 0));
  const maximo = Math.max(1, ...totales);
  let svg = `<svg class="grafico" viewBox="0 0 ${anchoTotal} ${altoTotal}" role="img" aria-label="Consumo diario de tokens por herramienta">`;
  svg += '<title>Consumo diario de tokens por herramienta</title>';
  svg += `<line class="rejilla" x1="${izq}" y1="${arriba}" x2="${anchoTotal - der}" y2="${arriba}"/>`;
  svg += `<text class="eje" x="${izq - 6}" y="${arriba + 4}" text-anchor="end">${corto(maximo)}</text>`;
  svg += `<line class="eje-linea" x1="${izq}" y1="${base}" x2="${anchoTotal - der}" y2="${base}"/>`;
  svg += `<text class="eje" x="${izq - 6}" y="${base + 4}" text-anchor="end">0</text>`;
  lista.forEach((dia, i) => {
    const x = izq + (i + 0.5) * (ancho / lista.length);
    const anchoBarra = Math.min(40, ancho / lista.length * 0.68);
    let y = base;
    for (const g of grupos[i]) {
      if (g.valor <= 0) continue;
      const altura = g.valor / maximo * alto;
      y -= altura;
      svg += `<rect class="segmento tool-${clase(g.herramienta)}" x="${(x - anchoBarra / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${anchoBarra.toFixed(1)}" height="${altura.toFixed(1)}"><title>${esc(g.herramienta)} · ${fechaDia(dia?.dia)}: ${corto(g.valor)} tokens</title></rect>`;
    }
    svg += `<text class="eje" x="${x.toFixed(1)}" y="${altoTotal - 14}" text-anchor="middle">${fechaDia(dia?.dia)}</text>`;
  });
  return `${svg}</svg>`;
}

function leyenda(herramientas, dias) {
  const nombres = [...new Set([
    ...herramientas.map((h) => h?.herramienta),
    ...(Array.isArray(dias) ? dias.flatMap((dia) => Object.keys(dia?.herramientas ?? {})) : []),
  ])].filter(Boolean);
  return `<ul class="leyenda" aria-label="Colores por herramienta">${nombres.map((nombre) =>
    `<li><span class="swatch tool-${clase(nombre)}" aria-hidden="true"></span>${esc(nombre)}</li>`
  ).join('')}</ul>`;
}

function reparto(lista, nombreDe, colorDe) {
  const elementos = Array.isArray(lista) ? lista : [];
  const nombre = nombreDe ?? ((x) => x?.herramienta ?? '?');
  const color = colorDe ?? ((x) => clase(x?.herramienta));
  const total = elementos.reduce((suma, h) => suma + num(h?.entrada) + num(h?.salida), 0);
  return `<ul class="reparto">${elementos.map((h) => {
    const partes = num(h?.entrada) + num(h?.salida);
    const pct = total > 0 ? partes / total * 100 : 0;
    const texto = porcentaje(partes, total);
    const etiqueta = esc(nombre(h));
    return `<li><span>${etiqueta}</span><div class="barra" role="img" aria-label="${etiqueta}: ${texto}"><i class="tool-${color(h)}" style="width:${pct.toFixed(2)}%"></i></div><strong>${texto}</strong></li>`;
  }).join('')}</ul>`;
}

function tablaHerramientas(herramientas) {
  const columnas = ['Herramienta', 'Proveedor', 'Modelo', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razonamiento', 'Costo'];
  const filas = [];
  for (const h of herramientas) {
    filas.push(`<tr class="fila-herramienta"><th scope="row">${esc(h?.herramienta ?? '?')}</th><td>${esc(h?.proveedor ?? '—')}</td><td>—</td>${celdaNum(entero(h?.mensajes))}${celdaNum(entero(h?.entrada))}${celdaNum(entero(h?.cache))}${celdaNum(entero(h?.salida))}${celdaNum(entero(h?.razonamiento))}${celdaNum(costo(h?.costo))}</tr>`);
    for (const m of Array.isArray(h?.modelos) ? h.modelos : []) {
      filas.push(`<tr class="fila-modelo"><th scope="row"></th><td>—</td><td class="modelo">${esc(m?.modelo ?? '?')}</td>${celdaNum(entero(m?.mensajes))}${celdaNum(entero(m?.entrada))}${celdaNum(entero(m?.cache))}${celdaNum(entero(m?.salida))}${celdaNum(entero(m?.razonamiento))}${celdaNum(costo(m?.costo))}</tr>`);
    }
  }
  return `<section><h2>Reparto por herramienta</h2><div class="scroll"><table><caption class="sr-only">Consumo por herramienta y modelo</caption><thead><tr>${encabezados(columnas)}</tr></thead><tbody>${filas.join('')}</tbody></table></div></section>`;
}

function tablaModelos(modelos) {
  const columnas = ['Modelo', 'Herramientas', 'Sesiones', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razonamiento', 'Costo'];
  const filas = [];
  for (const m of modelos) {
    const herramientas = Array.isArray(m?.herramientas) && m.herramientas.length
      ? m.herramientas.map((h) => esc(h)).join(', ')
      : '—';
    filas.push(`<tr><th scope="row" class="modelo">${esc(m?.modelo ?? '?')}</th><td>${herramientas}</td>${celdaNum(entero(m?.sesiones))}${celdaNum(entero(m?.mensajes))}${celdaNum(entero(m?.entrada))}${celdaNum(entero(m?.cache))}${celdaNum(entero(m?.salida))}${celdaNum(entero(m?.razonamiento))}${celdaNum(costo(m?.costo))}</tr>`);
    for (const e of Array.isArray(m?.efforts) ? m.efforts : []) {
      const effort = e?.effort == null ? 'sin dato' : esc(e.effort);
      filas.push(`<tr class="fila-modelo"><th scope="row" class="modelo">${effort}</th><td>—</td><td class="num">—</td>${celdaNum(entero(e?.mensajes))}${celdaNum(entero(e?.entrada))}${celdaNum(entero(e?.cache))}${celdaNum(entero(e?.salida))}${celdaNum(entero(e?.razonamiento))}${celdaNum(costo(e?.costo))}</tr>`);
    }
  }
  const barras = reparto(modelos.slice(0, 8), (m) => m?.modelo ?? '?', () => 'otro');
  return `<section><h2>Por modelo y effort</h2>${barras}<div class="scroll"><table><caption class="sr-only">Consumo por modelo y effort</caption><thead><tr>${encabezados(columnas)}</tr></thead><tbody>${filas.join('')}</tbody></table></div></section>`;
}

function tablaProyectos(proyectos) {
  const columnas = ['Proyecto', 'Modelo', 'Effort', 'Llamadas', 'Entrada', 'Salida'];
  const filas = [];
  for (const p of proyectos) {
    filas.push(`<tr><th scope="row" class="proyecto">${esc(p?.proyecto ?? '?')}</th><td>—</td><td>—</td>${celdaNum(entero(p?.mensajes))}${celdaNum(entero(p?.entrada))}${celdaNum(entero(p?.salida))}</tr>`);
    for (const m of Array.isArray(p?.modelos) ? p.modelos : []) {
      const effort = m?.effort == null ? '—' : esc(m.effort);
      filas.push(`<tr class="fila-modelo"><th scope="row"></th><td class="modelo">${esc(m?.modelo ?? '?')}</td><td>${effort}</td>${celdaNum(entero(m?.mensajes))}${celdaNum(entero(m?.entrada))}${celdaNum(entero(m?.salida))}</tr>`);
    }
  }
  const cuerpo = filas.length ? `<div class="scroll"><table><caption class="sr-only">Consumo por proyecto</caption><thead><tr>${encabezados(columnas)}</tr></thead><tbody>${filas.join('')}</tbody></table></div>` : '<p class="vacio">Sin datos de proyectos.</p>';
  return `<section><h2>Proyectos</h2>${cuerpo}</section>`;
}

function bloqueLimites(limites) {
  return `<section><h2>Límites</h2>${limites.map((l) => {
    const plan = l?.plan ? ` (plan ${esc(l.plan)})` : '';
    const ventanas = (Array.isArray(l?.ventanas) ? l.ventanas : []).map((v) => {
      const usado = Math.max(0, Math.min(100, num(v?.usado)));
      return `<div class="limite"><div class="limite-cabecera"><span>${esc(v?.nombre ?? 'ventana')}</span><span>${usado} %</span></div><div class="progreso" role="progressbar" aria-label="Uso de ${esc(v?.nombre ?? 'ventana')}" aria-valuenow="${usado}" aria-valuemin="0" aria-valuemax="100"><i style="width:${usado}%"></i></div><p>Se renueva: ${fecha(v?.renueva, true)} ${hora(v?.renueva, true)} (hora local)</p></div>`;
    }).join('');
    return `<article><h3>${esc(l?.herramienta ?? '?')}${plan}</h3>${ventanas}</article>`;
  }).join('')}</section>`;
}

function bloqueAvisos(avisos) {
  return `<section><h2>Avisos</h2><ul class="leyenda">${avisos.map((a) => `<li class="aviso">${esc(a)}</li>`).join('')}</ul></section>`;
}

module.exports = function generarHtml(datos) {
  const d = datos && typeof datos === 'object' ? datos : {};
  const totales = d.totales ?? {};
  const herramientas = Array.isArray(d.herramientas) ? d.herramientas : [];
  const modelos = Array.isArray(d.modelos) ? d.modelos : [];
  const dias = Array.isArray(d.dias) ? d.dias : [];
  const proyectos = Array.isArray(d.proyectos) ? d.proyectos : [];
  const limites = Array.isArray(d.limites) ? d.limites : [];
  const avisos = Array.isArray(d.avisos) ? d.avisos : [];
  const per = d.periodo ?? {};
  const periodo = per.dias
    ? `Últimos ${entero(per.dias)} días · ${fecha(per.desde)} – ${fecha(per.hasta)}`
    : 'Todo el historial';

  const filtro = d.filtro && d.filtro.proyecto != null
    ? `<p class="periodo">Proyecto: ${esc(d.filtro.proyecto)}</p>`
    : '';
  let cuerpo = `<header><h1>Telemetría de IA</h1><p class="periodo">${esc(periodo)}</p>${filtro}<p class="generado">Generado: ${fecha(d.generado)} ${hora(d.generado)}</p></header>`;
  cuerpo += tarjetas(totales);

  if (herramientas.length) {
    cuerpo += `<section><h2>Consumo diario</h2>${grafico(dias)}${leyenda(herramientas, dias)}</section>`;
    cuerpo += `<section><h2>Porcentaje por herramienta</h2>${reparto(herramientas)}</section>`;
    if (modelos.length) cuerpo += tablaModelos(modelos);
    cuerpo += tablaHerramientas(herramientas);
    cuerpo += tablaProyectos(proyectos);
  } else {
    cuerpo += '<p class="vacio">Sin consumo de IA en este periodo.</p>';
  }

  if (limites.length) cuerpo += bloqueLimites(limites);
  if (avisos.length) cuerpo += bloqueAvisos(avisos);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Telemetría de IA</title>
<style>${ESTILO}</style>
</head>
<body>
${cuerpo}
</body>
</html>`;
};
