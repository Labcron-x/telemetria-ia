'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { lectores, recolectar } = require('../fuentes');
const ahora = Date.parse('2026-11-25T20:00:00Z');
const iso = delta => new Date(ahora + delta).toISOString();
const secreto = 'CONTENIDO_PRIVADO_INVENTADO_NO_EXPORTAR';

async function entorno(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'telemetria-fuentes-'));
  const claves = ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'XDG_DATA_HOME', 'ORQ_CONSUMO', 'TELEMETRIA_HOME'];
  const anteriores = Object.fromEntries(claves.map(k => [k, process.env[k]]));
  for (const k of claves) delete process.env[k];
  process.env.TELEMETRIA_HOME = home;
  t.after(async () => {
    for (const k of claves) {
      if (anteriores[k] === undefined) delete process.env[k]; else process.env[k] = anteriores[k];
    }
    await fs.rm(home, { recursive: true, force: true });
  });
  const escribir = async (relativa, datos) => {
    const ruta = path.join(home, relativa);
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, typeof datos === 'string' ? datos : datos.map(d => JSON.stringify(d)).join('\n'));
    // La fecha del fixture, independiente del reloj de la máquina.
    await fs.utimes(ruta, new Date(ahora), new Date(ahora));
    return ruta;
  };
  const leer = nombre => lectores.find(l => l.nombre === nombre).leer({ home, desde: ahora - 86400000 });
  return { home, escribir, leer };
}

test('Claude deduplica ids, suma caché y omite sintéticos, fechas y archivos antiguos', async t => {
  const { escribir, leer } = await entorno(t);
  const mensaje = { type: 'assistant', timestamp: iso(-1000), sessionId: 'c1', cwd: '/repo', costUSD: 0.25,
    message: { id: 'm1', model: 'claude-test', content: secreto, usage: { input_tokens: 10,
      cache_creation_input_tokens: 4, cache_read_input_tokens: 6, output_tokens: 3,
      output_tokens_details: { thinking_tokens: 2 } } } };
  await escribir('.claude/projects/a/s.jsonl', [mensaje, mensaje,
    { ...mensaje, message: { ...mensaje.message, id: 'sintetico', model: '<synthetic>' } },
    { ...mensaje, timestamp: iso(-2 * 86400000), message: { ...mensaje.message, id: 'viejo' } }]);
  await escribir('.claude/projects/b/roto.jsonl', '{"usage":\n' + JSON.stringify({ ...mensaje, message: { ...mensaje.message, id: 'm2' } }));
  const antiguo = await escribir('.claude/projects/antiguo.jsonl', [{ ...mensaje, message: { ...mensaje.message, id: 'mtime' } }]);
  await fs.utimes(antiguo, new Date(0), new Date(0));
  const resultado = await leer('Claude Code');
  assert.equal(resultado.registros.length, 2);
  assert.deepEqual(resultado.registros[0], { herramienta: 'Claude Code', proveedor: 'Anthropic', modelo: 'claude-test',
    fecha: ahora - 1000, entrada: 20, cache: 6, salida: 3, razonamiento: 2, costo: 0.25, sesion: 'c1', proyecto: '/repo' });
  assert.match(resultado.aviso, /ilegibles/);
  assert.ok(!JSON.stringify(resultado).includes(secreto));
});

test('Codex conserva la base anterior al periodo, cambia modelo y toma la última cuota entre archivos', async t => {
  const { escribir, leer } = await entorno(t);
  const evento = (delta, entrada, salida, cuota = null) => ({ timestamp: iso(delta), type: 'event_msg',
    payload: { type: 'token_count', info: entrada === null ? null : { total_token_usage: {
      input_tokens: entrada, cached_input_tokens: entrada / 2, output_tokens: salida, reasoning_output_tokens: salida / 2 } }, rate_limits: cuota } });
  const cuota = { plan_type: 'team', primary: { used_percent: 24, window_minutes: 300, resets_at: ahora / 1000 + 60 },
    secondary: { used_percent: 7, window_minutes: 10080, resets_at: ahora / 1000 + 86400 } };
  await escribir('.codex/sessions/2026/rollout-a.jsonl', [
    { type: 'session_meta', payload: { id: 's1', cwd: '/a', content: secreto } },
    { type: 'turn_context', payload: { model: 'modelo-a' } }, evento(-2 * 86400000, 100, 10),
    evento(-10000, 140, 20), evento(-9000, 140, 20),
    { type: 'turn_context', payload: { model: 'modelo-b', cwd: '/b' } }, evento(-1000, 200, 30), evento(0, null, null, cuota),
  ]);
  await escribir('.codex/sessions/rollout-z.jsonl', [evento(-2000, null, null, { ...cuota, plan_type: 'viejo' })]);
  const r = await leer('Codex');
  assert.equal(r.aviso, null);
  assert.deepEqual(r.registros.map(d => [d.modelo, d.entrada, d.cache, d.salida, d.razonamiento, d.proyecto]),
    [['modelo-a', 40, 20, 10, 5, '/a'], ['modelo-b', 60, 30, 10, 5, '/b']]);
  assert.deepEqual(r.limites, [{ herramienta: 'Codex', plan: 'team', ventanas: [
    { nombre: '5 h', usado: 24, renueva: iso(60000) }, { nombre: 'semanal', usado: 7, renueva: iso(86400000) },
  ] }]);
  assert.ok(!JSON.stringify(r).includes(secreto));
});

test('OpenCode consulta metadatos, filtra en SQL, suma costo y no exporta credenciales', async t => {
  const { home, leer } = await entorno(t);
  const ruta = path.join(home, '.local/share/opencode/opencode.db');
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(ruta);
  db.exec('CREATE TABLE message(id TEXT, session_id TEXT, time_created INTEGER, data TEXT); CREATE TABLE session(id TEXT, directory TEXT); CREATE TABLE account(token TEXT);');
  db.prepare('INSERT INTO account VALUES (?)').run(secreto);
  db.prepare('INSERT INTO session VALUES (?, ?)').run('o1', '/opencode');
  const insertar = db.prepare('INSERT INTO message VALUES (?, ?, ?, ?)');
  const datos = { role: 'assistant', modelID: 'modelo-o', providerID: 'opencode', content: secreto,
    cost: 0.15, tokens: { input: 10, output: 5, reasoning: 2, cache: { read: 3, write: 4 } } };
  insertar.run('1', 'o1', ahora - 1000, JSON.stringify(datos));
  insertar.run('2', 'o1', ahora, JSON.stringify({ ...datos, providerID: 'otro', cost: 0 }));
  insertar.run('3', 'o1', ahora, JSON.stringify({ ...datos, role: 'user' }));
  insertar.run('4', 'o1', ahora - 2 * 86400000, JSON.stringify(datos));
  insertar.run('5', 'o1', ahora, JSON.stringify({ ...datos, tokens: {} }));
  insertar.run('6', 'o1', ahora, '{roto');
  db.close();
  await fs.utimes(ruta, new Date(ahora), new Date(ahora));
  const r = await leer('OpenCode');
  assert.equal(r.aviso, null);
  assert.equal(r.registros.length, 2);
  assert.deepEqual(r.registros.map(d => [d.proveedor, d.entrada, d.cache, d.salida, d.razonamiento, d.costo, d.proyecto]),
    [['OpenCode Zen', 17, 3, 5, 2, 0.15, '/opencode'], ['otro', 17, 3, 5, 2, 0, '/opencode']]);
  const a = await recolectar({ home, dias: 1, ahora });
  assert.equal(a.totales.costo, 0.15);
  assert.ok(!JSON.stringify(a).includes(secreto));
});

test('Gemini conserva la última actualización por id y admite JSON antiguo y proyecto', async t => {
  const { escribir, leer } = await entorno(t);
  await escribir('.gemini/tmp/hash/.project_root', '/gemini\n');
  const mensaje = { id: 'g1', timestamp: iso(-1000), type: 'gemini', model: 'gemini-test', content: secreto,
    tokens: { input: 20, cached: 5, output: 4, thoughts: 2, tool: 99 } };
  await escribir('.gemini/tmp/hash/chats/session-a.jsonl', [{ sessionId: 'g' }, mensaje,
    { ...mensaje, tokens: { ...mensaje.tokens, input: 30 } }, { $set: mensaje }, { $rewindTo: 'g1' },
    { ...mensaje, id: 'antiguo', timestamp: iso(-2 * 86400000) }]);
  await escribir('.gemini/tmp/otro/chats/session-b.json', JSON.stringify({ sessionId: 'g-antiguo', messages: [mensaje] }, null, 2));
  const r = await leer('Gemini CLI');
  assert.equal(r.aviso, null);
  assert.equal(r.registros.length, 2);
  const actual = r.registros.find(d => d.sesion === 'g');
  assert.equal(actual.entrada, 30);
  assert.equal(actual.cache, 5);
  assert.equal(actual.razonamiento, 2);
  assert.equal(actual.proyecto, '/gemini');
  assert.equal(r.registros.find(d => d.sesion === 'g-antiguo').proyecto, null);
  assert.ok(!JSON.stringify(r).includes(secreto));
});

test('Antigravity lee solo transcript_full, deduplica pasos y admite ISO, ms y segundos', async t => {
  const { escribir, leer } = await entorno(t);
  const prefijo = '.gemini/antigravity-cli/brain/conversacion/.system_generated/logs/';
  const dato = { step_index: 0, created_at: iso(-1000), model: 'agy-test', input_tokens: 10,
    cache_read_tokens: 8, output_tokens: 3, thinking_tokens: 2, thinking: secreto };
  await escribir(prefijo + 'transcript_full.jsonl', [dato, dato, { ...dato, step_index: 1, created_at: ahora },
    { ...dato, step_index: 2, created_at: ahora / 1000 }, { ...dato, step_index: 3, created_at: iso(-2 * 86400000) }]);
  await escribir(prefijo + 'transcript.jsonl', [{ ...dato, step_index: 4 }]);
  await escribir(prefijo + 'chunks/transcript_full.jsonl', [{ ...dato, step_index: 5 }]);
  for (const variante of ['antigravity', 'antigravity-ide']) {
    await escribir(`.gemini/${variante}/brain/${variante}/.system_generated/logs/transcript_full.jsonl`, [dato]);
  }
  await escribir('.gemini/antigravity-ide/brain/conversacion/.system_generated/logs/transcript_full.jsonl', [dato]);
  const r = await leer('Antigravity');
  assert.equal(r.registros.length, 5);
  assert.ok(r.registros.every(d => d.entrada === 18 && d.proyecto === null && d.razonamiento === 2));
  assert.ok(!JSON.stringify(r).includes(secreto));
});

test('Gemini continúa después de un elemento dañado del JSON antiguo', async t => {
  const { escribir, leer } = await entorno(t);
  await escribir('.gemini/tmp/hash/chats/session-rota.json', JSON.stringify({ sessionId: 'g', messages: [null,
    { id: 'valido', type: 'gemini', timestamp: iso(0), tokens: { input: 3 } }] }));
  const r = await leer('Gemini CLI');
  assert.equal(r.registros.length, 1);
  assert.equal(r.registros[0].entrada, 3);
  assert.match(r.aviso, /ilegibles/);
});

test('Orquestadores incluye solo qwen, qoder y mcode y respeta off', async t => {
  const { escribir, leer } = await entorno(t);
  const dato = { fecha: iso(-1000), repo: '/repo', id: 't1', modelo: 'prueba', entrada: 8,
    cache: 3, salida: 2, razonamiento: 1, costo: 0.1 };
  await escribir('.local/share/orquestar-codex/consumo.jsonl', ['qwen', 'qoder', 'mcode', 'agy', 'opencode', 'gemini-cli', 'codex']
    .map(agente => ({ ...dato, agente })).concat([{ ...dato, agente: 'qwen', sin_datos: true },
      { ...dato, agente: 'qwen', fecha: iso(-2 * 86400000) }]));
  const r = await leer('Orquestadores');
  assert.deepEqual(r.registros.map(d => [d.herramienta, d.proveedor, d.sesion]), [
    ['Qwen Code', 'Alibaba (Qwen)', '/repo/t1'], ['Qoder', 'Qoder', '/repo/t1'], ['MiniMax Code', 'MiniMax', '/repo/t1']]);
  process.env.ORQ_CONSUMO = 'off';
  assert.deepEqual(await leer('Orquestadores'), { registros: [], limites: [], aviso: null });
});

test('Las fuentes ausentes, archivos rotos y rutas alternativas no interrumpen la recolección', async t => {
  const { home, escribir, leer } = await entorno(t);
  const vacio = await recolectar({ home, dias: 7, ahora });
  assert.equal(vacio.avisos.length, 6);
  assert.equal(vacio.totales.mensajes, 0);
  await escribir('.local/share/opencode/opencode.db', 'base rota inventada');
  assert.match((await leer('OpenCode')).aviso, /ilegibles/);
  process.env.CODEX_HOME = path.join(home, 'codex-alternativo');
  process.env.CLAUDE_CONFIG_DIR = path.join(home, 'claude-alternativo');
  process.env.XDG_DATA_HOME = path.join(home, 'xdg-alternativo');
  process.env.ORQ_CONSUMO = path.join(home, 'orq-alternativo.jsonl');
  await escribir('codex-alternativo/sessions/rollout-1.jsonl', []);
  await escribir('claude-alternativo/projects/1.jsonl', []);
  await escribir('orq-alternativo.jsonl', []);
  assert.equal((await leer('Codex')).aviso, null);
  assert.equal((await leer('Claude Code')).aviso, null);
  assert.equal((await leer('Orquestadores')).aviso, null);
  assert.match((await leer('OpenCode')).aviso, /sin historial/);
});
