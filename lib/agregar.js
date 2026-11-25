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

function agregar({ registros = [], limites = [], avisos = [], dias = 7, ahora = Date.now(), filtro = null }) {
  const hasta = Number(ahora);
  const desde = dias === null ? -Infinity : hasta - dias * 86400000;
  const totales = vacio(), sesiones = new Set(), modelos = new Map(), herramientas = new Map(), porDia = new Map(), proyectos = new Map();
  for (const r of registros) {
    if (!Number.isFinite(r.fecha) || r.fecha < desde || r.fecha > hasta) continue;
    sumar(totales, r);
    const sesion = JSON.stringify([r.herramienta, r.sesion]);
    sesiones.add(sesion);
    const effort = r.effort ?? null;
    if (!modelos.has(r.modelo)) modelos.set(r.modelo, { modelo: r.modelo, herramientas: new Set(),
      ...vacio(), sesiones: new Set(), efforts: new Map() });
    const m = modelos.get(r.modelo);
    sumar(m, r);
    m.herramientas.add(r.herramienta);
    m.sesiones.add(sesion);
    if (!m.efforts.has(effort)) m.efforts.set(effort, { effort, ...vacio() });
    sumar(m.efforts.get(effort), r);
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
      if (!proyectos.has(r.proyecto)) proyectos.set(r.proyecto, { proyecto: r.proyecto,
        entrada: 0, cache: 0, salida: 0, mensajes: 0, modelos: new Map() });
      const p = proyectos.get(r.proyecto);
      p.entrada += r.entrada; p.cache += r.cache; p.salida += r.salida; p.mensajes++;
      const claveModelo = JSON.stringify([r.modelo, effort]);
      if (!p.modelos.has(claveModelo)) p.modelos.set(claveModelo, { modelo: r.modelo, effort, entrada: 0, salida: 0, mensajes: 0 });
      const pm = p.modelos.get(claveModelo);
      pm.entrada += r.entrada; pm.salida += r.salida; pm.mensajes++;
    }
  }
  return {
    generado: new Date(hasta).toISOString(),
    periodo: { dias, desde: dias === null ? null : new Date(desde).toISOString(), hasta: new Date(hasta).toISOString() },
    filtro,
    totales: { ...totales, sesiones: sesiones.size },
    modelos: [...modelos.values()].sort(ordenar).map(m => ({ ...m, herramientas: [...m.herramientas].sort(),
      sesiones: m.sesiones.size, efforts: [...m.efforts.values()].sort(ordenar) })),
    herramientas: [...herramientas.values()].sort(ordenar).map(h => ({ ...h, sesiones: h.sesiones.size,
      modelos: [...h.modelos.values()].sort(ordenar) })),
    dias: [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, h]) => ({ dia, herramientas: Object.fromEntries(h) })),
    proyectos: [...proyectos.values()].sort(ordenar).slice(0, 15)
      .map(p => ({ ...p, modelos: [...p.modelos.values()].sort(ordenar) })), limites, avisos,
  };
}

module.exports = { agregar };
