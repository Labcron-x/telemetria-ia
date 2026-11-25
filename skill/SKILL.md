---
name: telemetria
description: Muestra el consumo de IA de esta PC (tokens de entrada, caché, salida y razonamiento, llamadas, sesiones y costo si se informa) por modelo, effort, herramienta (Claude Code, Codex, OpenCode, Gemini CLI, Antigravity), día y proyecto, y el % usado del límite de ChatGPT en Codex. Usar cuando se pregunte "cuánto consumí", "mi telemetría", "mi consumo de IA", "qué modelo uso más", "con qué effort trabajo", "cuánto gastó el proyecto X", "cuánto me queda de Codex o ChatGPT", "reporte de consumo", o con /telemetria o $telemetria.
---

# Telemetría de IA

`telemetria-ia` es un programa local: lee los historiales que cada herramienta guarda en esta PC (sin IA y sin
internet) y mide todo el consumo, de todos los proyectos, sin importar la carpeta actual.

Programa: `node "{{RAIZ}}/bin/telemetria.js"` (en esta skill, `T`). **Córrelo tú**: es un solo comando, delegarlo
gasta más de lo que ahorra.

## Qué correr

Elige la vista que responde la pregunta, para que la salida sea corta (lo que imprime también son tokens que lees):

| Pregunta | Comando |
|---|---|
| ¿Cuánto consumí? (semana) | `T --por herramienta` |
| ¿Hoy? ¿En el mes? ¿Desde siempre? | `T 1 --por herramienta` · `T 30 --por herramienta` · `T todo --por herramienta` |
| ¿Qué modelo uso más? | `T --por modelo` |
| ¿Con qué effort trabaja cada modelo? | `T --por effort` |
| ¿Cómo va por día? | `T --por dia` |
| ¿Qué proyectos consumen más? | `T --por proyecto` |
| ¿Cuánto consumió el proyecto X? | `T --por modelo --proyecto X` (X = parte del nombre de la carpeta) |
| ¿Cuánto me queda de Codex / ChatGPT? | `T 1 --por herramienta` y lee la sección **Límites** |
| Reporte completo, con gráficos | `T html --abrir` (ver abajo) |

Periodo: número de días (7 por defecto) o `todo`. `--por` y `--proyecto` se combinan. `T --ayuda` lo resume.

## Cómo responder

- Resume en 3 a 6 líneas con las cifras que responden la pregunta (por ejemplo: modelo principal y su %, entrada y
  salida, effort, límite de Codex). No pegues la tabla completa salvo que la pidan.
- **Entrada** incluye la caché (suele ser más del 90 %); destaca la salida y la caché, no solo la entrada.
- `—` en effort o en costo significa que esa herramienta no lo guarda; no lo inventes ni estimes precios.
- Para el reporte HTML, di la ruta que imprime el comando y que se abrió en el navegador.

## Permisos

- Solo lee archivos de la carpeta de usuario; no cambia nada. En Codex con sandbox, leer está permitido.
- `html` escribe `~/.cache/telemetria-ia/reporte.html` y `--abrir` abre el navegador: en Codex con sandbox, pide
  permisos elevados para ese comando con una justificación corta.
- Si falla con `node:sqlite`, la PC tiene Node anterior a 22.13: dile al usuario que lo actualice.
