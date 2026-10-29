import { describe, it, expect } from 'vitest';
import { feriadosDelAnio, pascua } from './feriados';
import { sumarHabiles, calcularHitos, esHabil } from './plazos';
import { fechaEnChile } from './fechas';

// Lista de contraste: calendario de feriados nacionales 2026 y 2027 publicado por calendariochile.com, sin los regionales
// ni el Domingo de Resurrección. Solo difiere en el Día de los Pueblos Indígenas: ese sitio usa el 20 de junio fijo, mientras
// la Ley 21.357 lo fija en el día del solsticio, que en hora de Chile cae el 21 de junio en ambos años (como informó CNN Chile para 2026).
const nacionales: Record<number, string[]> = {
  2026: ['2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', '2026-05-21', '2026-06-21', '2026-06-29', '2026-07-16', '2026-08-15',
    '2026-09-18', '2026-09-19', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25'],
  2027: ['2027-01-01', '2027-03-26', '2027-03-27', '2027-05-01', '2027-05-21', '2027-06-21', '2027-06-28', '2027-07-16', '2027-08-15',
    '2027-09-18', '2027-09-19', '2027-10-11', '2027-10-31', '2027-11-01', '2027-12-08', '2027-12-25']
};

describe('feriados', () => {
  it('coinciden con el calendario 2026 y 2027', () => {
    for (const anio of [2026, 2027]) expect([...feriadosDelAnio(anio).keys()].sort()).toEqual(nacionales[anio]);
  });
  it('Pascua', () => { expect(pascua(2026)).toBe('2026-04-05'); expect(pascua(2027)).toBe('2027-03-28'); expect(pascua(2024)).toBe('2024-03-31'); });
  it('solsticio en hora de Chile en años ya conocidos', () => {
    // 2023: miércoles 21; 2024: jueves 20; 2025: viernes 20 (feriados efectivamente observados)
    expect(feriadosDelAnio(2023).get('2023-06-21')).toMatch(/Pueblos Indígenas/);
    expect(feriadosDelAnio(2024).get('2024-06-20')).toMatch(/Pueblos Indígenas/);
    expect(feriadosDelAnio(2025).get('2025-06-20')).toMatch(/Pueblos Indígenas/);
  });
  it('traslados de la Ley 19.668 y del 31 de octubre', () => {
    expect(feriadosDelAnio(2025).get('2025-06-29')).toMatch(/San Pedro/);       // domingo: no se traslada
    expect(feriadosDelAnio(2028).get('2028-06-26')).toMatch(/San Pedro/);       // jueves 29 → lunes 26
    expect(feriadosDelAnio(2029).get('2029-10-15')).toMatch(/Dos Mundos/);      // viernes 12 → lunes 15
    expect(feriadosDelAnio(2028).get('2028-10-27')).toMatch(/Evangélicas/);     // martes 31 → viernes 27
    expect(feriadosDelAnio(2029).get('2029-11-02')).toMatch(/Evangélicas/);     // miércoles 31 → viernes 2
  });
});

describe('días hábiles', () => {
  it('excluyen sábados, domingos, festivos y los días que agrega la empresa', () => {
    expect(esHabil('2026-10-30')).toBe(true);
    expect(esHabil('2026-10-31')).toBe(false);
    expect(esHabil('2026-12-08')).toBe(false);
    expect(esHabil('2026-11-02', ['2026-11-02'])).toBe(false);
  });
  it('se cuentan desde el día siguiente', () => {
    expect(sumarHabiles('2026-10-29', 3)).toBe('2026-11-03');           // vie 30, lun 2, mar 3 (sáb 31 y dom 1 son feriados de fin de semana)
    expect(sumarHabiles('2026-12-04', 3)).toBe('2026-12-10');           // lun 7, mié 9, jue 10 (8 es feriado)
    expect(sumarHabiles('2026-09-16', 2)).toBe('2026-09-21');           // jue 17, lun 21 (18 y 19 feriados)
  });
});

describe('reloj de plazos', () => {
  const recibida = '2026-10-29T15:00:00Z'; // jueves 29, 12:00 en Chile
  it('investigación interna', () => {
    const h = calcularHitos({ recibida_en: recibida, decision: 'investigacion_interna' }, '2026-10-29');
    const v = Object.fromEntries(h.map(x => [x.clave, x.vence]));
    expect(v.resguardo).toBe('2026-10-29');
    expect(v.decision).toBe('2026-11-03');
    expect(v.investigacion).toBe(sumarHabiles('2026-10-29', 30));
    expect(v.remision).toBe(sumarHabiles(v.investigacion!, 2));
    expect(h.find(x => x.clave === 'remision')!.estimado).toBe(true);
    expect(h.find(x => x.clave === 'pronunciamiento')!.informativo).toBe(true);
  });
  it('los hitos registrados recalculan los siguientes', () => {
    const h = calcularHitos({ recibida_en: recibida, decision: 'investigacion_interna', investigacion_cerrada_en: '2026-11-20', informe_remitido_en: '2026-11-23', pronunciamiento_notificado_en: '2026-12-10' }, '2026-12-01');
    const v = Object.fromEntries(h.map(x => [x.clave, x]));
    expect(v.remision.vence).toBe('2026-11-24');
    expect(v.remision.estado).toBe('cumplido');
    expect(v.medidas.vence).toBe('2026-12-25'); // 15 días corridos desde el 10 de diciembre
  });
  it('sin pronunciamiento: 15 días corridos desde que vencen los 30 días de la DT', () => {
    const h = calcularHitos({ recibida_en: recibida, informe_remitido_en: '2026-11-23' }, '2026-12-01');
    const pron = h.find(x => x.clave === 'pronunciamiento')!.vence!;
    expect(pron).toBe(sumarHabiles('2026-11-23', 30));
    const m = h.find(x => x.clave === 'medidas')!;
    expect(m.vence! > pron).toBe(true);
  });
  it('derivación obligatoria si quien denuncia la pide o es contra un representante del empleador', () => {
    const h = calcularHitos({ recibida_en: recibida, solicita_derivacion: true }, '2026-10-29');
    expect(h.some(x => x.clave === 'investigacion_dt')).toBe(true);
    expect(h.some(x => x.clave === 'investigacion')).toBe(false);
    expect(h.find(x => x.clave === 'decision')!.titulo).toMatch(/Derivar/);
  });
  it('estados', () => {
    const h = calcularHitos({ recibida_en: recibida }, '2026-11-05');
    expect(h.find(x => x.clave === 'resguardo')!.estado).toBe('vencido');
    expect(h.find(x => x.clave === 'decision')!.estado).toBe('vencido');
    const h2 = calcularHitos({ recibida_en: recibida, medidas_resguardo_en: '2026-10-30' }, '2026-11-02');
    expect(h2.find(x => x.clave === 'resguardo')!.estado).toBe('cumplido_tarde');
    expect(h2.find(x => x.clave === 'decision')!.estado).toBe('proximo');
  });
  it('la fecha de recepción se toma en hora de Chile', () => {
    expect(fechaEnChile('2026-10-30T02:30:00Z')).toBe('2026-10-29'); // 23:30 del 29 en Chile (horario de verano, UTC-3)
  });
});
