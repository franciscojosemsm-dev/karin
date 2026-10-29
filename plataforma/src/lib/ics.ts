import type { Hito } from './plazos';

const esc = (s: string) => s.replace(/[\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');

/** Calendario .ics con los vencimientos pendientes de una denuncia (eventos de día completo). */
export function calendarioIcs(titulo: string, hitos: Hito[], url: string): string {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const eventos = hitos.filter(h => h.vence && !h.cumplido).map((h, i) => {
    const d = h.vence!.replace(/-/g, '');
    return ['BEGIN:VEVENT', `UID:${titulo.replace(/\W/g, '')}-${h.clave}-${i}@plataforma-karin`, `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(`${titulo}: ${h.titulo}`)}`,
      `DESCRIPTION:${esc(`${h.base}${h.estimado ? ' (fecha más tardía posible, depende de un hito anterior)' : ''}. ${url}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(h.titulo)}`, 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ruiz & Morales//Plataforma Karin//ES', 'CALSCALE:GREGORIAN', ...eventos, 'END:VCALENDAR'].join('\r\n');
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
