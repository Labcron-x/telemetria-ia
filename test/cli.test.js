'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const cli = path.resolve(__dirname, '../bin/telemetria.js');

async function entorno(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'telemetria-cli-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const env = { ...process.env, TELEMETRIA_HOME: home };
  for (const k of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'XDG_DATA_HOME', 'ORQ_CONSUMO']) delete env[k];
  const ejecutar = args => spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', timeout: 15000 });
  return { home, ejecutar };
}

test('CLI sin datos, JSON parseable, ayuda y argumentos inválidos', async t => {
  const { ejecutar } = await entorno(t);
  const vacio = ejecutar([]);
  assert.equal(vacio.status, 0);
  assert.match(vacio.stdout, /Consumo de IA · últimos 7 días \(desde/);
  assert.match(vacio.stdout, /Sin consumo de IA en este periodo\./);
  assert.match(vacio.stdout, /Avisos/);
  const json = ejecutar(['json', 'todo']);
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).periodo.dias, null);
  assert.equal(ejecutar(['--ayuda']).status, 0);
  for (const args of [['0'], ['-1'], ['1.5'], ['foo'], ['json', '7', 'extra'], ['--abrir'],
    ['html', '--salida'], ['html', '--abrir', '--abrir'], ['--ayuda', 'extra'], ['999999999999999999']]) {
    assert.equal(ejecutar(args).status, 2, args.join(' '));
  }
});

test('CLI presenta secciones, filtra periodo y no imprime mensajes', async t => {
  const { home, ejecutar } = await entorno(t);
  const directorio = path.join(home, '.claude/projects/prueba');
  await fs.mkdir(directorio, { recursive: true });
  const mensaje = { type: 'assistant', timestamp: new Date().toISOString(), sessionId: 'c', cwd: '/proyecto',
    message: { id: 'm', model: 'modelo-test', content: 'MENSAJE_PRIVADO_INVENTADO',
      usage: { input_tokens: 1200, cache_read_input_tokens: 10, output_tokens: 4 } } };
  await fs.writeFile(path.join(directorio, 's.jsonl'), [mensaje,
    { ...mensaje, timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), message: { ...mensaje.message, id: 'viejo' } }]
    .map(d => JSON.stringify(d)).join('\n'));
  const codex = path.join(home, '.codex/sessions');
  await fs.mkdir(codex, { recursive: true });
  await fs.writeFile(path.join(codex, 'rollout-cuotas.jsonl'), JSON.stringify({ timestamp: new Date().toISOString(),
    type: 'event_msg', payload: { type: 'token_count', info: null, rate_limits: { plan_type: 'team',
      primary: { used_percent: 24, window_minutes: 300, resets_at: Math.floor(Date.now() / 1000) + 3600 },
      secondary: { used_percent: 7, window_minutes: 10080, resets_at: Math.floor(Date.now() / 1000) + 86400 },
    } } }));
  const terminal = ejecutar(['1']);
  assert.equal(terminal.status, 0);
  for (const seccion of ['Por herramienta', 'Por modelo', 'Por día', 'Proyectos', 'Avisos']) assert.ok(terminal.stdout.includes(seccion));
  assert.match(terminal.stdout, /1\.2k/);
  assert.match(terminal.stdout, /—/);
  assert.match(terminal.stdout, /Codex \(plan team\): 24 % de la ventana de 5 h \(se renueva .+\) · 7 % semanal \(se renueva .+\)/);
  assert.ok(!terminal.stdout.includes('MENSAJE_PRIVADO_INVENTADO'));
  assert.equal(JSON.parse(ejecutar(['json', '1']).stdout).totales.mensajes, 1);
  assert.equal(JSON.parse(ejecutar(['json', 'todo']).stdout).totales.mensajes, 2);
});

test('CLI HTML respeta la disponibilidad del generador y las rutas de salida', async t => {
  const { home, ejecutar } = await entorno(t);
  let existe = true;
  try { await fs.access(path.resolve(__dirname, '../lib/html.js')); } catch { existe = false; }
  const resultado = ejecutar(['html']);
  if (!existe) {
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /lib\/html\.js/);
    return;
  }
  assert.equal(resultado.status, 0, resultado.stderr);
  const predeterminada = path.join(home, '.cache/telemetria-ia/reporte.html');
  assert.equal(resultado.stdout.trim(), predeterminada);
  assert.match(await fs.readFile(predeterminada, 'utf8'), /html/i);
  const salida = path.join(home, 'con espacios', 'reporte.html');
  const explicita = ejecutar(['html', 'todo', '--salida', salida]);
  assert.equal(explicita.status, 0, explicita.stderr);
  assert.equal(explicita.stdout.trim(), salida);
  assert.match(await fs.readFile(salida, 'utf8'), /html/i);
});

test('CLI silencia únicamente el aviso experimental de SQLite', async t => {
  const { home, ejecutar } = await entorno(t);
  const directorio = path.join(home, '.local/share/opencode');
  await fs.mkdir(directorio, { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(directorio, 'opencode.db'));
  db.exec('CREATE TABLE message(id TEXT, session_id TEXT, time_created INTEGER, data TEXT); CREATE TABLE session(id TEXT, directory TEXT); CREATE TABLE account(token TEXT);');
  db.prepare('INSERT INTO account VALUES (?)').run('TOKEN_FALSO_NO_EXPORTAR');
  db.close();
  const salida = ejecutar(['json']);
  assert.equal(salida.status, 0);
  assert.equal(salida.stderr, '');
  assert.ok(!salida.stdout.includes('TOKEN_FALSO_NO_EXPORTAR'));
});
