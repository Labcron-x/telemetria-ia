# Formato de datos

## Registro (uno por llamada al modelo)

Cada lector de `fuentes/` devuelve registros con esta forma:

```js
{
  herramienta: "Claude Code",   // Claude Code | Codex | OpenCode | Gemini CLI | Antigravity | Qwen Code | Qoder | MiniMax Code
  proveedor: "Anthropic",       // quién cobra o pone la cuota (ver tabla de fuentes del README)
  modelo: "claude-opus-5-5",    // "?" si la fuente no lo dice
  fecha: 1795635573931,         // ms epoch
  entrada: 53063,               // tokens de entrada, INCLUIDA la caché
  cache: 34083,                 // de la entrada, los leídos de caché
  salida: 289,
  razonamiento: 161,            // lo que informe la fuente (en algunos proveedores ya está dentro de salida)
  costo: null,                  // US$ solo si la fuente lo informa; si no, null
  sesion: "id",                 // id de la sesión o conversación
  proyecto: "D:\\a\\ucvmas"     // carpeta de trabajo, o null
}
```

## Agregado (`telemetria json` y entrada de `lib/html.js`)

```js
{
  generado: "2026-11-25T20:00:00.000Z",
  periodo: { dias: 7, desde: "2026-11-18T20:00:00.000Z", hasta: "2026-11-25T20:00:00.000Z" }, // dias y desde: null con "todo"
  totales: { entrada, cache, salida, razonamiento, costo, mensajes, sesiones },
  herramientas: [               // ordenadas por entrada descendente
    { herramienta, proveedor, entrada, cache, salida, razonamiento, costo, mensajes, sesiones,
      modelos: [ { modelo, entrada, cache, salida, razonamiento, costo, mensajes } ] }  // por entrada descendente
  ],
  dias: [                       // un elemento por día local del periodo con datos, en orden ascendente
    { dia: "2026-11-25", herramientas: { "Claude Code": { entrada, cache, salida }, "Codex": { ... } } }
  ],
  proyectos: [ { proyecto, entrada, salida, mensajes } ],   // los 15 con más entrada; sin los de proyecto null
  limites: [                    // cuotas que la herramienta informa (hoy solo Codex)
    { herramienta: "Codex", plan: "team",
      ventanas: [ { nombre: "5 h", usado: 24, renueva: "2026-11-25T19:58:00.000Z" },
                  { nombre: "semanal", usado: 7, renueva: "2026-11-27T21:40:00.000Z" } ] }
  ],
  avisos: [ "Qwen Code: sin historial en esta PC" ]          // fuentes no encontradas o con errores
}
```

`costo` en totales, herramientas y modelos es `null` si ningún registro del grupo trae costo.
