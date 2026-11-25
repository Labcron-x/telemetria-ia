'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { agregar } = require('../lib/agregar');
const { corto, dinero, tabla, terminal } = require('../lib/formato');
const ahora = new Date(2026, 10, 25, 12).getTime();
const base = { herramienta: 'Codex', proveedor: 'OpenAI', modelo: 'a', effort: null, fecha: ahora, entrada: 10,
  cache: 2, salida: 3, razonamiento: 1, costo: null, sesion: 's1', proyecto: '/repo' };

test('Agregado cumple la forma exacta, ordena y cuenta sesiones por herramienta', () => {
  const registros = [base, { ...base, modelo: 'b', effort: 'high', entrada: 30, costo: 0.5 },
    { ...base, herramienta: 'Claude Code', proveedor: 'Anthropic', effort: 'xhigh', entrada: 100, costo: 0, proyecto: null }];
  const limites = [{ herramienta: 'Codex', plan: 'team', ventanas: [] }], avisos = ['fuente ausente'];
  const a = agregar({ registros, limites, avisos, dias: 1, ahora });
  assert.deepEqual(Object.keys(a), ['generado', 'periodo', 'filtro', 'totales', 'modelos', 'herramientas', 'dias', 'proyectos', 'limites', 'avisos']);
  assert.equal(a.filtro, null);
  assert.deepEqual(a.periodo, { dias: 1, desde: new Date(ahora - 86400000).toISOString(), hasta: new Date(ahora).toISOString() });
  assert.equal(a.generado, new Date(ahora).toISOString());
  assert.deepEqual(a.totales, { entrada: 140, cache: 6, salida: 9, razonamiento: 3, costo: 0.5, mensajes: 3, sesiones: 2 });
  assert.deepEqual(a.modelos, [
    { modelo: 'a', herramientas: ['Claude Code', 'Codex'], entrada: 110, cache: 4, salida: 6, razonamiento: 2,
      costo: 0, mensajes: 2, sesiones: 2, efforts: [
        { effort: 'xhigh', entrada: 100, cache: 2, salida: 3, razonamiento: 1, costo: 0, mensajes: 1 },
        { effort: null, entrada: 10, cache: 2, salida: 3, razonamiento: 1, costo: null, mensajes: 1 }] },
    { modelo: 'b', herramientas: ['Codex'], entrada: 30, cache: 2, salida: 3, razonamiento: 1,
      costo: 0.5, mensajes: 1, sesiones: 1, efforts: [
        { effort: 'high', entrada: 30, cache: 2, salida: 3, razonamiento: 1, costo: 0.5, mensajes: 1 }] },
  ]);
  assert.deepEqual(a.herramientas, [
    { herramienta: 'Claude Code', proveedor: 'Anthropic', entrada: 100, cache: 2, salida: 3, razonamiento: 1,
      costo: 0, mensajes: 1, sesiones: 1, modelos: [{ modelo: 'a', entrada: 100, cache: 2, salida: 3, razonamiento: 1, costo: 0, mensajes: 1 }] },
    { herramienta: 'Codex', proveedor: 'OpenAI', entrada: 40, cache: 4, salida: 6, razonamiento: 2, costo: 0.5,
      mensajes: 2, sesiones: 1, modelos: [
        { modelo: 'b', entrada: 30, cache: 2, salida: 3, razonamiento: 1, costo: 0.5, mensajes: 1 },
        { modelo: 'a', entrada: 10, cache: 2, salida: 3, razonamiento: 1, costo: null, mensajes: 1 }] },
  ]);
  assert.deepEqual(a.dias, [{ dia: '2026-11-25', herramientas: {
    Codex: { entrada: 40, cache: 4, salida: 6 }, 'Claude Code': { entrada: 100, cache: 2, salida: 3 } } }]);
  assert.deepEqual(a.proyectos, [{ proyecto: '/repo', entrada: 40, cache: 4, salida: 6, mensajes: 2, modelos: [
    { modelo: 'b', effort: 'high', entrada: 30, salida: 3, mensajes: 1 },
    { modelo: 'a', effort: null, entrada: 10, salida: 3, mensajes: 1 },
  ] }]);
  assert.deepEqual(a.limites, limites);
  assert.deepEqual(a.avisos, avisos);
});

test('Filtra ambos extremos, agrupa días locales, conserva costo null y limita a 15 proyectos', () => {
  const medianoche = new Date(2026, 10, 25).getTime();
  const a = agregar({ ahora, dias: 1, registros: [
    { ...base, fecha: ahora - 86400000 - 1 }, { ...base, fecha: ahora + 1 },
    { ...base, fecha: medianoche - 1 }, { ...base, fecha: medianoche },
  ] });
  assert.equal(a.totales.mensajes, 2);
  assert.equal(a.totales.costo, null);
  assert.deepEqual(a.dias.map(d => d.dia), ['2026-11-24', '2026-11-25']);
  const todo = agregar({ dias: null, ahora, registros: Array.from({ length: 20 }, (_, i) => ({
    ...base, fecha: ahora - 100 * 86400000, proyecto: `/p${i}`, entrada: i, sesion: `s${i}` })) });
  assert.deepEqual(todo.periodo, { dias: null, desde: null, hasta: new Date(ahora).toISOString() });
  assert.equal(todo.proyectos.length, 15);
  assert.equal(todo.proyectos[0].proyecto, '/p19');
  assert.equal(todo.proyectos[14].proyecto, '/p5');
  assert.equal(todo.totales.sesiones, 20);
});

test('Sin registros mantiene los campos y colecciones del contrato', () => {
  const a = agregar({ ahora, dias: null });
  assert.deepEqual(a.totales, { entrada: 0, cache: 0, salida: 0, razonamiento: 0, costo: null, mensajes: 0, sesiones: 0 });
  assert.equal(a.filtro, null);
  for (const campo of ['modelos', 'herramientas', 'dias', 'proyectos', 'limites', 'avisos']) assert.deepEqual(a[campo], []);
});

test('Agrupa modelo y effort por proyecto, deduplica herramientas y sesiones y devuelve el filtro tal cual', () => {
  const filtro = { proyecto: 'Repo' };
  const a = agregar({ ahora, filtro, registros: [base, base,
    { ...base, effort: 'high', entrada: 50 }, { ...base, effort: 'high', entrada: 40, sesion: 's2' },
    { ...base, herramienta: 'Gemini CLI', entrada: 5 },
    { ...base, proyecto: '/otro', effort: 'high', entrada: 1 },
  ] });
  assert.equal(a.filtro, filtro);
  assert.deepEqual(a.modelos[0].herramientas, ['Codex', 'Gemini CLI']);
  assert.equal(a.modelos[0].sesiones, 3);
  assert.equal(a.modelos[0].costo, null);
  assert.deepEqual(a.modelos[0].efforts.map(e => [e.effort, e.entrada, e.mensajes]), [['high', 91, 3], [null, 25, 3]]);
  assert.deepEqual(a.proyectos[0], { proyecto: '/repo', entrada: 115, cache: 10, salida: 15, mensajes: 5, modelos: [
    { modelo: 'a', effort: 'high', entrada: 90, salida: 6, mensajes: 2 },
    { modelo: 'a', effort: null, entrada: 25, salida: 9, mensajes: 3 },
  ] });
  assert.deepEqual(a.proyectos[1].modelos, [{ modelo: 'a', effort: 'high', entrada: 1, salida: 3, mensajes: 1 }]);
});

test('Formato abrevia tokens, alinea columnas y elimina controles de terminal', () => {
  assert.equal(corto(1200), '1.2k'); assert.equal(corto(3400000), '3.4M');
  assert.equal(dinero(null), '—'); assert.equal(dinero(0), '0.00');
  assert.equal(tabla(['Texto', 'N'], [['a', 23], ['bbb', 1]], [1]), 'Texto |  N\na     | 23\nbbb   |  1');
  assert.ok(!tabla(['Texto'], [['\x1b[31m\n']]).includes('\x1b'));
});

test('Terminal limita proyectos a 10 y sus modelos a 5, con sangrado y effort null visible', () => {
  const a = agregar({ ahora, registros: Array.from({ length: 11 }, (_, p) =>
    Array.from({ length: 6 }, (_, m) => ({ ...base, proyecto: `/p${p}`, modelo: `modelo${p}-${m}`, entrada: 100 - p - m }))).flat() });
  const salida = terminal(a, 'proyecto');
  assert.match(salida, /Proyecto \/ Modelo\s+\| Effort\s+\| Llamadas\s+\| Entrada\s+\| Salida/);
  assert.match(salida, /\n  modelo0-0\s+\| —/);
  assert.ok(salida.includes('/p9') && !salida.includes('/p10'));
  assert.ok(salida.includes('modelo9-4') && !salida.includes('modelo0-5'));
});

test('Terminal elimina controles en filtro y effort y conserva límites y avisos sin consumo', () => {
  const a = agregar({ ahora, filtro: { proyecto: 'repo\x1b\n' }, registros: [{ ...base, effort: 'high\x1b\n' }] });
  assert.ok(!terminal(a, 'effort').includes('\x1b'));
  assert.match(terminal(a, 'effort'), /proyecto: repo  /);
  const vacio = terminal(agregar({ ahora, avisos: ['sin datos'], limites: [{ herramienta: 'Codex', plan: 'team', ventanas: [] }] }), 'modelo');
  assert.match(vacio, /Sin consumo de IA/);
  assert.ok(vacio.indexOf('Límites') < vacio.indexOf('Avisos'));
});
