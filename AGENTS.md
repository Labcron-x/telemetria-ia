# Instrucciones para agentes

Trabajas en un worktree de git, en la rama `agente/<ID>`. Tu tarea está en `docs/agentes/tareas/<ID>.md`.

`telemetria-ia` mide el consumo de IA de una PC (tokens, caché, salida, razonamiento y costo si se informa) por
herramienta, proveedor y modelo, leyendo **solo** los historiales locales que cada herramienta ya guarda. Solo Node.js
(>= 22.13) y su librería estándar (`node:sqlite`, `node:test`): **sin dependencias de npm**.

## Reglas

- Toca **solo** los archivos que la tarea permite. Si necesitas cambiar otro, anótalo en "Dudas" del reporte.
- No cambies el contrato que fija la tarea (nombres, rutas, formas de datos).
- Privacidad: nunca leas, guardes ni imprimas el contenido de los mensajes; solo fechas, modelos, tokens, costo,
  ids de sesión y carpeta del proyecto. No leas los historiales reales de esta PC: las pruebas usan datos inventados.
- Escribe en español, breve y directo.
- Prohibido: `git push`, `merge`, `rebase`, `reset --hard`, `git worktree`, `rm -rf`, publicar y subir secretos.

## Verificación

- `node --test`

## Al terminar

1. Escribe `docs/agentes/reportes/<ID>.md` con: resumen, archivos tocados, salida de la verificación (las últimas
   líneas) y dudas.
2. No corras `git add` ni `git commit`: tus cambios se guardan en la rama al terminar.
