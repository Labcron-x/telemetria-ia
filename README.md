# telemetria-ia

Mide cuánto consumes de IA en tu PC: tokens de entrada, caché, salida y razonamiento, llamadas, sesiones y costo
(cuando la herramienta lo informa), **por modelo, effort, herramienta, proveedor, día y proyecto**. También muestra cuánto
llevas del límite de ChatGPT en Codex.

Lee solo los historiales que cada herramienta ya guarda en tu PC. No necesita cuentas, claves ni internet, y funciona
con o sin orquestador ([claude-orquestador](https://github.com/NemiasVasquez/claude-orquestador),
[orquestar-codex](https://github.com/Labcron-x/orquestar-codex)).

## Instalar

Requisito: Node.js 22.13 o más nuevo. No tiene dependencias.

```bash
git clone https://github.com/Labcron-x/telemetria-ia.git
cd telemetria-ia
npm link            # deja el comando "telemetria" disponible en cualquier carpeta (opcional)
```

Sin `npm link`, usa `node bin/telemetria.js` en lugar de `telemetria`.

## Usar

| Comando | Qué hace |
|---|---|
| `telemetria` | Tablas en la terminal de los últimos 7 días |
| `telemetria 30` / `telemetria todo` | Otro periodo (días) o todo el historial |
| `telemetria 30 --por modelo` | Solo el consumo por modelo; vistas: `modelo`, `effort`, `herramienta`, `dia`, `proyecto` |
| `telemetria --por effort --proyecto mi-repo` | Consumo por modelo y effort, solo de proyectos que contienen `mi-repo` (sin distinguir mayúsculas) |
| `telemetria html --abrir` | Reporte con gráficos en el navegador (`~/.cache/telemetria-ia/reporte.html`; `--salida <ruta>` lo cambia) |
| `telemetria json` | Los mismos datos en JSON, para otros programas ([formato](docs/datos.md)) |
| `telemetria json todo --proyecto mi-repo` / `telemetria html 30 --proyecto mi-repo` | Filtra también el JSON o el HTML por proyecto |

Sintaxis: `telemetria [días|todo] [--por <vista>] [--proyecto <texto>]`, también con `json` o `html` antes del periodo.
`--por` elige la sección de terminal; JSON y HTML conservan el reporte completo del periodo y proyecto elegidos.
Consulta `telemetria --ayuda` para ver las opciones.

En la terminal sale:

1. **Por modelo:** suma el mismo modelo entre herramientas; muestra herramientas, sesiones, llamadas, entrada, caché,
   salida, razonamiento y costo.
2. **Por modelo + effort:** llamadas y consumo para cada nivel de razonamiento del modelo.
3. **Por herramienta:** proveedor, sesiones y consumo; debajo, el detalle por herramienta y modelo.
4. **Por día:** tokens de cada herramienta por día.
5. **Proyectos:** las 10 carpetas con más entrada, con hasta 5 modelos y sus efforts debajo, sangrados.
6. **Límites y avisos:** cuotas de Codex y herramientas sin historial o archivos ilegibles; aparecen al final con cualquier vista.

Sin `--por` salen todas las secciones en ese orden. Con `--proyecto`, el encabezado indica el filtro y todas las cifras
corresponden solo a los proyectos coincidentes; el JSON incluye `filtro: { proyecto: "texto" }` (o `null` sin filtro).

El reporte HTML muestra lo mismo con tarjetas de totales, barras por día, el reparto por herramienta y los límites. Se
abre con doble clic, funciona sin internet y se adapta al teléfono.

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

**¿El reporte consume tokens? No:** `telemetria` es un programa local que solo lee archivos; ni la terminal ni el HTML
usan IA. Solo gastarías tokens si le pides a una IA que lo corra y lea la salida.

## Desarrollo

```bash
node --test     # pruebas con datos inventados; no leen tu historial
```

El formato de los datos está en [docs/datos.md](docs/datos.md). Cada fuente es un archivo en `fuentes/` que devuelve
registros; `lib/agregar.js` los resume y `lib/html.js` dibuja el reporte.
