'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { agregar } = require('../lib/agregar');
const { corto, dinero, tabla } = require('../lib/formato');
const ahora = new Date(2026, 10, 25, 12).getTime();
const base = { herramienta: 'Codex', proveedor: 'OpenAI', modelo: 'a', fecha: ahora, entrada: 10,
  cache: 2, salida: 3, razonamiento: 1, costo: null, sesion: 's1', proyecto: '/repo' };

test('Agregado cumple la forma exacta, ordena y cuenta sesiones por herramienta', () => {
  const registros = [base, { ...base, modelo: 'b', entrada: 30, costo: 0.5 },
    { ...base, herramienta: 'Claude Code', proveedor: 'Anthropic', entrada: 100, costo: 0, proyecto: null }];
  const limites = [{ herramienta: 'Codex', plan: 'team', ventanas: [] }], avisos = ['fuente ausente'];
  const a = agregar({ registros, limites, avisos, dias: 1, ahora });
  assert.deepEqual(Object.keys(a), ['generado', 'periodo', 'totales', 'herramientas', 'dias', 'proyectos', 'limites', 'avisos']);
  assert.deepEqual(a.periodo, { dias: 1, desde: new Date(ahora - 86400000).toISOString(), hasta: new Date(ahora).toISOString() });
  assert.equal(a.generado, new Date(ahora).toISOString());
  assert.deepEqual(a.totales, { entrada: 140, cache: 6, salida: 9, razonamiento: 3, costo: 0.5, mensajes: 3, sesiones: 2 });
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
  assert.deepEqual(a.proyectos, [{ proyecto: '/repo', entrada: 40, salida: 6, mensajes: 2 }]);
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
  for (const campo of ['herramientas', 'dias', 'proyectos', 'limites', 'avisos']) assert.deepEqual(a[campo], []);
});

test('Formato abrevia tokens, alinea columnas y elimina controles de terminal', () => {
  assert.equal(corto(1200), '1.2k'); assert.equal(corto(3400000), '3.4M');
  assert.equal(dinero(null), '—'); assert.equal(dinero(0), '0.00');
  assert.equal(tabla(['Texto', 'N'], [['a', 23], ['bbb', 1]], [1]), 'Texto |  N\na     | 23\nbbb   |  1');
  assert.ok(!tabla(['Texto'], [['\x1b[31m\n']]).includes('\x1b'));
});
