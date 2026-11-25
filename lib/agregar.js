'use strict';

const ordenar = (a, b) => b.entrada - a.entrada;
const vacio = () => ({ entrada: 0, cache: 0, salida: 0, razonamiento: 0, costo: null, mensajes: 0 });
function sumar(grupo, r) {
  for (const campo of ['entrada', 'cache', 'salida', 'razonamiento']) grupo[campo] += r[campo];
  if (typeof r.costo === 'number' && Number.isFinite(r.costo)) grupo.costo = (grupo.costo ?? 0) + r.costo;
  grupo.mensajes++;
}
function diaLocal(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function agregar({ registros = [], limites = [], avisos = [], dias = 7, ahora = Date.now() }) {
  const hasta = Number(ahora);
  const desde = dias === null ? -Infinity : hasta - dias * 86400000;
  const totales = vacio(), sesiones = new Set(), herramientas = new Map(), porDia = new Map(), proyectos = new Map();
  for (const r of registros) {
    if (!Number.isFinite(r.fecha) || r.fecha < desde || r.fecha > hasta) continue;
    sumar(totales, r);
    sesiones.add(JSON.stringify([r.herramienta, r.sesion]));
    const clave = JSON.stringify([r.herramienta, r.proveedor]);
    if (!herramientas.has(clave)) herramientas.set(clave, { herramienta: r.herramienta, proveedor: r.proveedor,
      ...vacio(), sesiones: new Set(), modelos: new Map() });
    const h = herramientas.get(clave);
    sumar(h, r);
    h.sesiones.add(r.sesion);
    if (!h.modelos.has(r.modelo)) h.modelos.set(r.modelo, { modelo: r.modelo, ...vacio() });
    sumar(h.modelos.get(r.modelo), r);
    const dia = diaLocal(r.fecha);
    if (!porDia.has(dia)) porDia.set(dia, new Map());
    const d = porDia.get(dia);
    if (!d.has(r.herramienta)) d.set(r.herramienta, { entrada: 0, cache: 0, salida: 0 });
    for (const campo of ['entrada', 'cache', 'salida']) d.get(r.herramienta)[campo] += r[campo];
    if (r.proyecto !== null && r.proyecto !== undefined) {
      if (!proyectos.has(r.proyecto)) proyectos.set(r.proyecto, { proyecto: r.proyecto, entrada: 0, salida: 0, mensajes: 0 });
      const p = proyectos.get(r.proyecto);
      p.entrada += r.entrada; p.salida += r.salida; p.mensajes++;
    }
  }
  return {
    generado: new Date(hasta).toISOString(),
    periodo: { dias, desde: dias === null ? null : new Date(desde).toISOString(), hasta: new Date(hasta).toISOString() },
    totales: { ...totales, sesiones: sesiones.size },
    herramientas: [...herramientas.values()].sort(ordenar).map(h => ({ ...h, sesiones: h.sesiones.size,
      modelos: [...h.modelos.values()].sort(ordenar) })),
    dias: [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, h]) => ({ dia, herramientas: Object.fromEntries(h) })),
    proyectos: [...proyectos.values()].sort(ordenar).slice(0, 15), limites, avisos,
  };
}

module.exports = { agregar };
