'use strict';

function corto(numero) {
  if (numero >= 1e6) return `${(numero / 1e6).toFixed(1)}M`;
  if (numero >= 1e3) return `${(numero / 1e3).toFixed(1)}k`;
  return String(numero);
}
const dinero = costo => costo === null ? '—' : costo.toFixed(2);
// Evita que una ruta o un identificador altere la terminal con controles ANSI.
const texto = valor => String(valor ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
function tabla(cabeceras, filas, numericas = []) {
  const celdas = [cabeceras, ...filas].map(f => f.map(texto));
  const anchos = cabeceras.map((_, i) => Math.max(...celdas.map(f => Array.from(f[i]).length)));
  return celdas.map(f => f.map((v, i) => {
    const espacios = ' '.repeat(anchos[i] - Array.from(v).length);
    return numericas.includes(i) ? espacios + v : v + espacios;
  }).join(' | ')).join('\n');
}
function fechaCorta(instante, ahora, incluirDia = false) {
  const d = new Date(instante), hoy = new Date(ahora);
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const mismoDia = d.toDateString() === hoy.toDateString();
  return !incluirDia && mismoDia ? hora : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`;
}
function terminal(a) {
  const periodo = a.periodo.dias === null ? 'todo el historial'
    : `últimos ${a.periodo.dias} días (desde ${fechaCorta(a.periodo.desde, a.generado, true)})`;
  const partes = [`Consumo de IA · ${periodo}`];
  if (!a.totales.mensajes) partes.push('Sin consumo de IA en este periodo.');
  else {
    const consumo = r => [corto(r.mensajes), corto(r.entrada), corto(r.cache), corto(r.salida), corto(r.razonamiento), dinero(r.costo)];
    partes.push('Por herramienta', tabla(['Herramienta', 'Proveedor', 'Sesiones', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razon.', 'Costo US$'],
      a.herramientas.map(h => [h.herramienta, h.proveedor, corto(h.sesiones), ...consumo(h)]), [2, 3, 4, 5, 6, 7, 8]));
    partes.push('Por modelo', tabla(['Herramienta', 'Modelo', 'Llamadas', 'Entrada', 'Caché', 'Salida', 'Razon.', 'Costo US$'],
      a.herramientas.flatMap(h => h.modelos.map(m => [h.herramienta, m.modelo, ...consumo(m)])), [2, 3, 4, 5, 6, 7]));
    const nombres = [...new Set(a.herramientas.map(h => h.herramienta))];
    partes.push('Por día', tabla(['Día', ...nombres, 'Total'], a.dias.map(d => {
      const valores = nombres.map(n => (d.herramientas[n]?.entrada || 0) + (d.herramientas[n]?.salida || 0));
      return [d.dia, ...valores.map(corto), corto(valores.reduce((s, v) => s + v, 0))];
    }), nombres.map((_, i) => i + 1).concat(nombres.length + 1)));
    partes.push('Proyectos (10 con más entrada)', tabla(['Proyecto', 'Entrada', 'Salida', 'Llamadas'],
      a.proyectos.slice(0, 10).map(p => [p.proyecto, corto(p.entrada), corto(p.salida), corto(p.mensajes)]), [1, 2, 3]));
  }
  if (a.limites.length) partes.push('Límites', ...a.limites.map(l => `${texto(l.herramienta)} (plan ${texto(l.plan)}): `
    + l.ventanas.map(v => `${v.usado} % ${v.nombre === 'semanal' ? 'semanal' : `de la ventana de ${texto(v.nombre)}`}`
      + (v.renueva ? ` (se renueva ${fechaCorta(v.renueva, a.generado)})` : '')).join(' · ')));
  if (a.avisos.length) partes.push('Avisos', ...a.avisos.map(texto));
  return partes.join('\n\n');
}

module.exports = { corto, dinero, tabla, terminal };
