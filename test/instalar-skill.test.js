'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const marca = '.origen-telemetria-ia';

function entorno(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetria-skill-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(home)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(home).startsWith('telemetria-skill-'));
    fs.rmSync(home, { recursive: true, force: true });
  });
  const env = { ...process.env, TELEMETRIA_HOME: home };
  for (const clave of Object.keys(env)) {
    if (['CLAUDE_CONFIG_DIR', 'CODEX_HOME'].includes(clave.toUpperCase())) delete env[clave];
  }
  const ejecutar = (args = []) => spawnSync(process.execPath, [path.join(repo, 'instalar-skill.js'), ...args],
    { env, cwd: home, encoding: 'utf8', timeout: 15000 });
  const carpeta = nombre => path.join(home, nombre, 'skills', 'telemetria');
  return { home, env, ejecutar, carpeta };
}

test('Sin carpetas base avisa y termina con 2 sin crearlas', t => {
  const { home, ejecutar } = entorno(t);
  const salida = ejecutar();
  assert.equal(salida.status, 2, salida.stderr);
  assert.match(salida.stdout, /No existe ninguna carpeta base/);
  assert.match(salida.stdout, /Claude Code: omitida:/);
  assert.match(salida.stdout, /Codex: omitida:/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('Detecta solo la base existente y reemplaza todas las raíces desde otra carpeta', t => {
  const { home, ejecutar, carpeta } = entorno(t);
  fs.mkdirSync(path.join(home, '.claude'));
  const salida = ejecutar();
  assert.equal(salida.status, 0, salida.stderr);
  const plantilla = fs.readFileSync(path.join(repo, 'skill', 'SKILL.md'), 'utf8');
  const instalada = fs.readFileSync(path.join(carpeta('.claude'), 'SKILL.md'), 'utf8');
  assert.equal(instalada, plantilla.replaceAll('{{RAIZ}}', () => repo.replace(/\\/g, '/')));
  assert.ok(!instalada.includes('{{RAIZ}}'));
  assert.ok(!instalada.includes('\\'));
  assert.ok(fs.existsSync(path.join(carpeta('.claude'), marca)));
  assert.ok(!fs.existsSync(path.join(home, '.codex')));
  assert.match(salida.stdout, /Claude Code: instalada en/);
  assert.match(salida.stdout, /\/telemetria/);
  assert.match(salida.stdout, /\$telemetria/);
  assert.match(salida.stdout, /¿cuánto consumí esta semana\?/);
  assert.match(salida.stdout, /sesión nueva/);
});

test('Codex se detecta solo y genera openai.yaml con el contrato exacto', t => {
  const { home, ejecutar, carpeta } = entorno(t);
  fs.mkdirSync(path.join(home, '.codex'));
  assert.equal(ejecutar().status, 0);
  assert.ok(!fs.existsSync(path.join(home, '.claude')));
  assert.equal(fs.readFileSync(path.join(carpeta('.codex'), 'agents', 'openai.yaml'), 'utf8'),
    'interface:\n' +
    '  display_name: "Telemetría de IA"\n' +
    '  short_description: "Consumo de IA de la PC por modelo, effort, herramienta y proyecto"\n' +
    '  default_prompt: "Usa $telemetria para mostrar mi consumo de IA de esta semana."\n' +
    'policy:\n  allow_implicit_invocation: true\n');
});

test('Las opciones crean solo los destinos elegidos y respetan las variables de configuración', t => {
  const { home, env, ejecutar, carpeta } = entorno(t);
  env.CLAUDE_CONFIG_DIR = path.join(home, 'claude con espacios');
  env.CODEX_HOME = path.join(home, 'codex con espacios');
  assert.equal(ejecutar(['--claude']).status, 0);
  assert.ok(fs.existsSync(path.join(env.CLAUDE_CONFIG_DIR, 'skills', 'telemetria', marca)));
  assert.ok(!fs.existsSync(env.CODEX_HOME));
  assert.equal(ejecutar(['--codex']).status, 0);
  assert.ok(fs.existsSync(path.join(env.CODEX_HOME, 'skills', 'telemetria', 'agents', 'openai.yaml')));
  assert.ok(!fs.existsSync(carpeta('.claude')));
  assert.ok(!fs.existsSync(carpeta('.codex')));
});

test('Reinstalar es estable, actualiza archivos propios y conserva otros archivos', t => {
  const { ejecutar, carpeta } = entorno(t);
  const args = ['--claude', '--codex'];
  assert.equal(ejecutar(args).status, 0);
  const skill = path.join(carpeta('.codex'), 'SKILL.md');
  const yaml = path.join(carpeta('.codex'), 'agents', 'openai.yaml');
  const original = [fs.readFileSync(skill, 'utf8'), fs.readFileSync(yaml, 'utf8')];
  assert.equal(ejecutar(args).status, 0);
  assert.deepEqual([fs.readFileSync(skill, 'utf8'), fs.readFileSync(yaml, 'utf8')], original);
  fs.writeFileSync(skill, 'versión anterior');
  fs.writeFileSync(yaml, 'versión anterior');
  const otro = path.join(carpeta('.codex'), 'personal.txt');
  fs.writeFileSync(otro, 'conservar');
  assert.equal(ejecutar(args).status, 0);
  assert.deepEqual([fs.readFileSync(skill, 'utf8'), fs.readFileSync(yaml, 'utf8')], original);
  assert.equal(fs.readFileSync(otro, 'utf8'), 'conservar');
});

test('Una carpeta ajena se conserva al instalar y quitar; el otro destino sigue procesándose', t => {
  const { ejecutar, carpeta } = entorno(t);
  const ajena = carpeta('.claude');
  fs.mkdirSync(ajena, { recursive: true });
  const skill = path.join(ajena, 'SKILL.md');
  fs.writeFileSync(skill, 'skill ajena');
  const salida = ejecutar(['--claude', '--codex']);
  assert.equal(salida.status, 1);
  assert.match(salida.stdout, /Claude Code: omitida: carpeta ajena/);
  assert.match(salida.stdout, /Codex: instalada en/);
  assert.equal(fs.readFileSync(skill, 'utf8'), 'skill ajena');
  assert.deepEqual(fs.readdirSync(ajena), ['SKILL.md']);
  assert.equal(ejecutar(['--quitar']).status, 1);
  assert.equal(fs.readFileSync(skill, 'utf8'), 'skill ajena');
  assert.ok(!fs.existsSync(carpeta('.codex')));
});

test('Quitar respeta la selección y conserva bases y otras skills; se puede repetir', t => {
  const { home, ejecutar, carpeta } = entorno(t);
  assert.equal(ejecutar(['--claude', '--codex']).status, 0);
  const otra = path.join(home, '.codex', 'skills', 'otra');
  fs.mkdirSync(otra);
  assert.equal(ejecutar(['--quitar', '--claude']).status, 0);
  assert.ok(!fs.existsSync(carpeta('.claude')));
  assert.ok(fs.existsSync(carpeta('.codex')));
  assert.equal(ejecutar(['--quitar']).status, 0);
  assert.ok(!fs.existsSync(carpeta('.codex')));
  assert.ok(fs.existsSync(otra));
  assert.ok(fs.existsSync(path.join(home, '.claude')));
  assert.equal(ejecutar(['--quitar']).status, 0);
});

test('Rechaza argumentos desconocidos sin crear destinos', t => {
  const { home, ejecutar } = entorno(t);
  assert.equal(ejecutar(['--otro']).status, 2);
  assert.deepEqual(fs.readdirSync(home), []);
});
