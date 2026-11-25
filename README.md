# telemetria-ia

Mide cuánto consumes de IA en tu PC: tokens de entrada, caché, salida y razonamiento, llamadas, sesiones y costo
(cuando la herramienta lo informa), **por modelo, effort, herramienta, proveedor, día y proyecto**. También muestra cuánto
llevas del límite de ChatGPT en Codex.

Lee solo los historiales que cada herramienta ya guarda en tu PC. No necesita cuentas, claves ni internet, y funciona
con o sin orquestador ([claude-orquestador](https://github.com/NemiasVasquez/claude-orquestador),
[orquestar-codex](https://github.com/Labcron-x/orquestar-codex)).

## Inicio rápido

Requisito: Node.js 22.13 o más nuevo (`node -v`). No tiene dependencias.

```bash
git clone https://github.com/Labcron-x/telemetria-ia.git   # en cualquier carpeta
cd telemetria-ia
npm link                                                   # una sola vez: crea el comando "telemetria"
telemetria                                                 # tu consumo de los últimos 7 días
telemetria html --abrir                                    # lo mismo con gráficos, en el navegador
```

`npm link` deja el comando `telemetria` disponible en cualquier carpeta y terminal (PowerShell, CMD o Git Bash).
Si no quieres usarlo, llama al archivo con su ruta completa: `node D:\ruta\telemetria-ia\bin\telemetria.js`.

### ¿Tengo que estar en la carpeta del proyecto?

**No.** `telemetria` no mira la carpeta donde estás: lee los historiales de tu usuario (`~/.claude`, `~/.codex`,
`~/.local/share/opencode`, `~/.gemini`), así que desde cualquier carpeta mide **todo** el consumo de la PC, de todos
tus proyectos.

- Para ver un solo proyecto no hace falta entrar en él: usa `--proyecto <parte del nombre>`, por ejemplo
  `telemetria --proyecto ucvmas`.
- Tampoco hace falta tener abierto Claude, Codex ni otro programa: lee lo que ya quedó guardado.

### Actualizar o quitar

```bash
git -C <carpeta de telemetria-ia> pull     # actualizar (con npm link no hay que reinstalar)
npm uninstall -g telemetria-ia             # quitar el comando; luego borra la carpeta si quieres
```

### Usarlo como skill (preguntarle a la IA)

Puedes preguntarle a Claude Code o a Codex desde cualquier proyecto, sin buscar la carpeta de telemetria-ia.
Desde la carpeta donde lo clonaste, instala la skill:

```bash
node instalar-skill.js             # instala donde ya exista la carpeta de Claude Code o Codex
node instalar-skill.js --claude    # solo Claude Code; crea su carpeta si hace falta
node instalar-skill.js --codex     # solo Codex; crea su carpeta si hace falta
node instalar-skill.js --quitar    # quita la skill de ambos; se puede combinar con --claude o --codex
```

Después de `git pull`, vuelve a correr `node instalar-skill.js` para actualizarla. Si Claude Code o Codex estaban
abiertos, abre una sesión nueva. Usa `/telemetria` en Claude Code, `$telemetria` en Codex, o pregunta
“¿cuánto consumí esta semana?”, “¿qué modelo uso más?” o “¿cuánto consumió el proyecto X?”.

Así **sí** se gastan unos pocos tokens: la IA corre el comando y lee una vista corta. Correr el comando directamente
en la terminal sigue siendo gratis, sin consumo de tokens.

## Usar

| Quiero saber… | Comando |
|---|---|
| Cuánto consumí esta semana (todo) | `telemetria` |
| Cuánto consumí hoy / en el mes / desde siempre | `telemetria 1` / `telemetria 30` / `telemetria todo` |
| Qué modelo uso más | `telemetria --por modelo` |
| Con qué effort trabaja cada modelo | `telemetria --por effort` |
| Cuánto consume cada herramienta (Claude Code, Codex, OpenCode…) | `telemetria --por herramienta` |
| Cómo va día a día | `telemetria --por dia` |
| Qué proyectos consumen más y con qué modelo | `telemetria --por proyecto` |
| Cuánto consumió un proyecto | `telemetria --proyecto ucvmas` |
| Verlo con gráficos | `telemetria html --abrir` |
| Cuánto me queda del límite de ChatGPT | sale al final de cualquier comando, en **Límites** |
| Pasar los datos a otro programa | `telemetria json` ([formato](docs/datos.md)) |

Las opciones se combinan: `telemetria 30 --por modelo --proyecto ucvmas` o `telemetria html todo --proyecto ucvmas --abrir`.
Sintaxis completa: `telemetria [json|html] [días|todo] [--por <vista>] [--proyecto <texto>]`, y para `html` además
`--salida <ruta>` (por defecto `~/.cache/telemetria-ia/reporte.html`) y `--abrir`. `telemetria --ayuda` lo resume.

Ejemplo de `telemetria --por modelo` (cifras inventadas):

```
Consumo de IA · últimos 7 días (desde 18/11 16:46)

Por modelo

Modelo            | Herramientas | Sesiones | Llamadas | Entrada |  Caché | Salida | Razon. | Costo US$
claude-opus-5-5   | Claude Code  |       10 |      600 |  100.0M |  98.0M | 500.0k | 200.0k |         —
big-pickle        | OpenCode     |       30 |      400 |   25.0M |  22.0M | 100.0k | 170.0k |      0.00
gpt-6.1-sol       | Codex        |        7 |      110 |    6.0M |   5.6M | 120.0k |  38.0k |         —

Límites

Codex (plan team): 10 % de la ventana de 5 h (se renueva 21:22) · 9 % semanal (se renueva 27/11 16:40)
```

### Qué muestra cada vista

Sin `--por` salen todas, en este orden; con `--por <vista>` solo esa. Límites y avisos salen siempre al final.

1. **`modelo`:** suma el mismo modelo aunque se use desde varias herramientas; herramientas, sesiones, llamadas,
   entrada, caché, salida, razonamiento y costo.
2. **`effort`:** cada modelo separado por nivel de razonamiento (`low`, `medium`, `high`, `xhigh`…).
3. **`herramienta`:** proveedor, sesiones y consumo; debajo, el detalle por modelo.
4. **`dia`:** tokens de cada herramienta por día.
5. **`proyecto`:** las 10 carpetas con más consumo, con hasta 5 modelos y su effort debajo.

Con `--proyecto`, el encabezado indica el filtro y todas las cifras (también en JSON y HTML) son solo de los proyectos
cuyo nombre contiene ese texto, sin distinguir mayúsculas.

El reporte HTML muestra todo junto: tarjetas de totales, barras por día, porcentaje por herramienta y por modelo,
tablas por modelo y effort, por herramienta y por proyecto, y los límites. Es un archivo que se abre con doble clic,
funciona sin internet y se adapta al teléfono.

## Qué lee

| Herramienta | De dónde | Proveedor |
|---|---|---|
| Claude Code | `~/.claude/projects/**/*.jsonl` | Anthropic |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl` (y los límites de ChatGPT) | OpenAI |
| OpenCode | `~/.local/share/opencode/opencode.db` (solo lectura) | el del modelo (p. ej. OpenCode Zen) |
| Gemini CLI | `~/.gemini/tmp/*/chats/` | Google |
| Antigravity (agy) | `~/.gemini/antigravity*/brain/*/.system_generated/logs/transcript_full.jsonl` | Google (Antigravity) |
| Qwen Code, Qoder, MiniMax Code | registro de `orquestar-codex` (`~/.local/share/orquestar-codex/consumo.jsonl`) | Alibaba, Qoder, MiniMax |

Respeta `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `XDG_DATA_HOME` y `ORQ_CONSUMO` si los usas. `TELEMETRIA_HOME` cambia la
carpeta base (sirve para pruebas).

## Privacidad

- Solo lee fechas, modelos, effort, tokens, costo, ids de sesión y la carpeta del proyecto. **Nunca** lee ni guarda el
  contenido de tus conversaciones.
- De la base de OpenCode solo consulta las tablas de mensajes y sesiones; nunca las de cuentas o credenciales.
- No se conecta a internet ni envía nada: todo queda en tu PC.

## Cómo leer los números

- **Entrada** incluye la **caché**: lo que el modelo vuelve a leer de un turno anterior. Suele ser más del 90 % y es
  mucho más barata o gratis.
- **Razonamiento:** lo que informa cada herramienta. En algunos proveedores ya está dentro de **Salida**.
- **Effort:** nivel de razonamiento configurado para la llamada; no es una cantidad de tokens. `—` significa sin dato.
  Se toma de estos metadatos:

  | Herramienta | De dónde sale effort |
  |---|---|
  | Claude Code | `perTurnEffort` en la línea `assistant`; si falta, `effort` |
  | Codex | `turn_context.payload.effort`, hasta el próximo contexto |
  | Antigravity | Sufijo `-minimal`, `-low`, `-medium`, `-high` o `-xhigh`; conserva el modelo completo |
  | OpenCode | `data.variant`, si existe |
  | Gemini CLI y orquestadores | Sin dato (`null`) |

- **Costo:** solo aparece si la herramienta lo guarda (OpenCode). Con planes de suscripción (Claude, ChatGPT) no hay
  costo por llamada; no se estiman precios.
- **Llamadas:** cada respuesta del modelo. **Sesiones:** cada conversación o tarea.
- **Proyectos:** la misma carpeta escrita distinto se junta; los worktrees `wt-<repo>-<ID>` cuentan como su repo; las
  consultas sueltas del orquestador y las carpetas temporales se agrupan.
- Un `?` en modelo significa que la herramienta no guardó el nombre del modelo en esa llamada.

## Preguntas frecuentes

**¿El reporte consume tokens?** En la terminal y el HTML, no: `telemetria` es un programa local que solo lee archivos.
Si lo pides a la IA mediante la skill, sí gasta unos pocos tokens: la IA corre el comando y lee una vista corta.

**¿Tengo que correrlo dentro de un proyecto? No.** Mide toda la PC desde cualquier carpeta; para uno solo, usa
`--proyecto` (ver [arriba](#tengo-que-estar-en-la-carpeta-del-proyecto)).

**¿Mide lo que hacen los agentes del orquestador?** Sí. Lo que corren OpenCode, Codex, agy y Gemini CLI queda en sus
propios historiales; Qwen, Qoder y MiniMax se toman del registro de `orquestar-codex`. Sus consultas sueltas se agrupan
como `(consultas del orquestador)` y sus worktrees cuentan como el repo.

**¿Por qué Entrada es tan grande?** Porque incluye la caché: en cada turno el modelo vuelve a leer la conversación. La
columna **Caché** muestra cuánto de eso salió de caché (más barato o gratis).

## Desarrollo

```bash
node --test     # pruebas con datos inventados; no leen tu historial
```

El formato de los datos está en [docs/datos.md](docs/datos.md). Cada fuente es un archivo en `fuentes/` que devuelve
registros; `lib/agregar.js` los resume y `lib/html.js` dibuja el reporte.
