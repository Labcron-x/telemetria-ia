'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const generarHtml = require('../lib/html.js');

function ejemplo() {
  return {
    generado: '2026-11-25T20:00:00.000Z',
    periodo: {
      dias: 7,
      desde: '2026-11-18T20:00:00.000Z',
      hasta: '2026-11-25T20:00:00.000Z',
    },
    totales: {
      entrada: 80000, cache: 34083, salida: 2500, razonamiento: 400,
      costo: 1.5, mensajes: 9, sesiones: 4,
    },
    herramientas: [
      {
        herramienta: 'Claude Code', proveedor: 'Anthropic', entrada: 53063, cache: 34083,
        salida: 289, razonamiento: 161, costo: null, mensajes: 5, sesiones: 2,
        modelos: [{ modelo: 'claude-opus-5-5', entrada: 53063, cache: 34083, salida: 289, razonamiento: 161, costo: null, mensajes: 5 }],
      },
      {
        herramienta: 'Codex', proveedor: 'OpenAI', entrada: 22000, cache: 8000,
        salida: 1800, razonamiento: 200, costo: 1.2, mensajes: 3, sesiones: 1,
        modelos: [{ modelo: 'gpt-5-codex', entrada: 22000, cache: 8000, salida: 1800, razonamiento: 200, costo: 1.2, mensajes: 3 }],
      },
      {
        herramienta: 'OpenCode', proveedor: 'OpenCode Zen', entrada: 4937, cache: 0,
        salida: 411, razonamiento: 39, costo: 0.3, mensajes: 1, sesiones: 1,
        modelos: [{ modelo: 'qwen3-coder', entrada: 4937, cache: 0, salida: 411, razonamiento: 39, costo: 0.3, mensajes: 1 }],
      },
    ],
    dias: [
      { dia: '2026-11-23', herramientas: { 'Claude Code': { entrada: 10000, cache: 3000, salida: 100 } } },
      { dia: '2026-11-24', herramientas: { 'Claude Code': { entrada: 20000, cache: 5000, salida: 100 }, Codex: { entrada: 8000, cache: 2000, salida: 600 } } },
      { dia: '2026-11-25', herramientas: { Codex: { entrada: 14000, cache: 6000, salida: 1200 }, OpenCode: { entrada: 4937, cache: 0, salida: 411 } } },
    ],
    proyectos: [
      { proyecto: 'D:\\a\\ucvmas', entrada: 53063, salida: 289, mensajes: 5 },
      { proyecto: '<script>alert(1)</script>', entrada: 22000, salida: 1800, mensajes: 3 },
    ],
    limites: [{
      herramienta: 'Codex', plan: 'team',
      ventanas: [
        { nombre: '5 h', usado: 24, renueva: '2026-11-25T19:58:00.000Z' },
        { nombre: 'semanal', usado: 7, renueva: '2026-11-27T21:40:00.000Z' },
      ],
    }],
    avisos: ['Qwen Code: sin historial en esta PC'],
  };
}

test('HTML completo, en español y sin recursos externos', () => {
  const html = generarHtml(ejemplo());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.trimEnd().endsWith('</html>'));
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>Telemetría de IA<\/title>/);
  assert.ok(html.includes('Últimos 7 días · 18/11/2026 – 25/11/2026'));
  assert.ok(html.includes('Generado: 25/11/2026 20:00'));
  assert.ok(!html.includes('http://') && !html.includes('https://'));
  assert.ok(!html.includes('<script'));
  assert.match(html, /overflow-x: auto/);
  assert.match(html, /prefers-color-scheme: dark/);
});

test('muestra herramientas, modelos, totales y números en ambos formatos', () => {
  const html = generarHtml(ejemplo());
  for (const texto of ['Claude Code', 'Codex', 'OpenCode', 'claude-opus-5-5', 'gpt-5-codex', 'qwen3-coder']) {
    assert.ok(html.includes(texto), `falta ${texto}`);
  }
  for (const columna of ['Herramienta', 'Proveedor', 'Modelo', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razonamiento', 'Costo', 'Proyecto']) {
    assert.ok(html.includes(`${columna}</th>`), `falta columna ${columna}`);
  }
  assert.ok(html.includes('53.063'));
  assert.ok(html.includes('80k'));
  assert.ok(html.includes('34.1k'));
  assert.ok(html.includes('de la entrada'));
  assert.ok(html.includes('US$ 1,20'));
  assert.ok(html.includes('US$ 1,50'));
  assert.ok(html.includes('—'));
  assert.ok(!html.includes('US$ 0,00'));
});

test('gráfico SVG diario con títulos, leyenda y barras por herramienta', () => {
  const html = generarHtml(ejemplo());
  assert.match(html, /<svg class="grafico"/);
  assert.match(html, /<rect class="segmento tool-claude"/);
  assert.match(html, /<rect class="segmento tool-codex"/);
  assert.ok(html.includes('<title>Claude Code · 23/11: 10.1k tokens</title>'));
  assert.match(html, /<span class="swatch tool-opencode"/);
  assert.match(html, /role="img" aria-label="Consumo diario de tokens por herramienta"/);
  assert.match(html, /class="barra" role="img"[^>]*><i class="tool-claude" style="width:\d+\.\d+%"/);
});

test('escapa proyectos, modelos y avisos', () => {
  const datos = ejemplo();
  datos.herramientas[0].modelos[0].modelo = '<img src=x onerror=1>';
  datos.avisos = ['Aviso <b> & "x"'];
  const html = generarHtml(datos);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=1&gt;'));
  assert.ok(html.includes('Aviso &lt;b&gt; &amp; &quot;x&quot;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
});

test('límites con progreso y renovación en hora local', () => {
  const html = generarHtml(ejemplo());
  assert.ok(html.includes('Codex (plan team)'));
  assert.ok(html.includes('5 h'));
  assert.ok(html.includes('24 %'));
  assert.ok(html.includes('semanal'));
  assert.ok(html.includes('7 %'));
  assert.match(html, /role="progressbar" aria-label="Uso de 5 h" aria-valuenow="24"/);
  assert.ok(html.includes('Se renueva:'));
  assert.ok(html.includes('(hora local)'));
  assert.ok(html.includes('Qwen Code: sin historial en esta PC'));
});

test('sin herramientas muestra solo el aviso de vacío', () => {
  const datos = ejemplo();
  datos.herramientas = [];
  datos.dias = [];
  datos.proyectos = [];
  const html = generarHtml(datos);
  assert.ok(html.includes('Sin consumo de IA en este periodo.'));
  for (const texto of ['Consumo diario', 'Porcentaje por herramienta', 'Proyectos']) {
    assert.ok(!html.includes(texto), `no debería aparecer ${texto}`);
  }
  assert.ok(html.includes('Límites'));
  assert.ok(html.includes('Avisos'));
});

test('todo el historial y costo nulo', () => {
  const datos = ejemplo();
  datos.periodo = { dias: null, desde: null, hasta: null };
  datos.totales.costo = null;
  const html = generarHtml(datos);
  assert.ok(html.includes('Todo el historial'));
  assert.ok(html.includes('—'));
  assert.ok(!html.includes('US$ 1,50'));
});

test('diseño flexible a 390 px: tarjetas, SVG y barras', () => {
  const html = generarHtml(ejemplo());
  assert.match(html, /repeat\(auto-fill, minmax\(140px, 1fr\)\)/);
  assert.match(html, /html, body \{ min-width: 0; \}/);
  assert.match(html, /<svg class="grafico" viewBox="0 0 \d+ \d+"/);
  assert.match(html, /\.grafico \{ display: block; width: 100%; max-width: 100%; height: auto; \}/);
  assert.match(html, /\.reparto li \{ display: flex;/);
  assert.match(html, /\.barra \{ flex: 1 1 auto; min-width: 0;/);
  assert.ok(!html.includes('minmax(120px'));
});

test('tablas con scroll propio, proyecto que parte y números fijos', () => {
  const html = generarHtml(ejemplo());
  assert.match(html, /\.scroll \{ overflow-x: auto; max-width: 100%; min-width: 0; \}/);
  assert.equal((html.match(/class="scroll"><table/g) ?? []).length, 2);
  assert.match(html, /\.num \{ text-align: right; white-space: nowrap;/);
  assert.match(html, /<th scope="row" class="proyecto">/);
  assert.match(html, /\.proyecto \{ overflow-wrap: anywhere;/);
  assert.ok(html.includes('class="num">53.063'));
});

test('filas de modelo con sangrado CSS y sin flecha', () => {
  const html = generarHtml(ejemplo());
  assert.ok(!html.includes('↳'));
  assert.match(html, /\.fila-modelo \.modelo \{ padding-left: 1\.4rem; \}/);
  assert.match(html, /<tr class="fila-modelo"><th scope="row"><\/th><td>—<\/td><td class="modelo">/);
});
