import { describe, it, expect } from 'vitest';
import { crearBoveda, abrirConClave, abrirConRecuperacion, reenvolverConClave, cifrar, descifrar, nuevoCodigoRecuperacion } from './cripto';

const IT = 310_000; // mínimo aceptado por la base; en producción se usan 600.000

describe('bóveda de expedientes', () => {
  it('cifra y descifra con la clave y con el código de recuperación', async () => {
    const codigo = nuevoCodigoRecuperacion();
    expect(codigo).toMatch(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/);
    const { guardada, dek } = await crearBoveda('clave del investigador 2026', codigo, IT);
    const c = await cifrar(dek, { nombre: 'Persona Testigo', acta: 'ñandú ✓'.repeat(20000) });
    expect(c.datos).not.toContain('Persona');
    const k1 = await abrirConClave(guardada, 'clave del investigador 2026');
    expect((await descifrar<{ nombre: string }>(k1, c.iv, c.datos)).nombre).toBe('Persona Testigo');
    const k2 = await abrirConRecuperacion(guardada, codigo.toLowerCase().replace(/-/g, ' '));
    expect((await descifrar<{ acta: string }>(k2, c.iv, c.datos)).acta.length).toBe(140000);
  }, 30000);

  it('rechaza una clave o un código incorrectos', async () => {
    const { guardada } = await crearBoveda('clave correcta larga', nuevoCodigoRecuperacion(), IT);
    await expect(abrirConClave(guardada, 'clave incorrecta')).rejects.toThrow();
    await expect(abrirConRecuperacion(guardada, nuevoCodigoRecuperacion())).rejects.toThrow();
  }, 30000);

  it('el código de recuperación permite fijar una clave nueva sin perder los expedientes', async () => {
    const codigo = nuevoCodigoRecuperacion();
    const { guardada, dek } = await crearBoveda('clave olvidada larga', codigo, IT);
    const c = await cifrar(dek, { ok: true });
    const nueva = await reenvolverConClave(guardada, codigo, 'clave nueva muy larga');
    await expect(abrirConClave(nueva, 'clave olvidada larga')).rejects.toThrow();
    expect(await descifrar(await abrirConClave(nueva, 'clave nueva muy larga'), c.iv, c.datos)).toEqual({ ok: true });
  }, 30000);

  it('cada guardado usa un IV distinto y detecta alteraciones', async () => {
    const { dek } = await crearBoveda('otra clave larga', nuevoCodigoRecuperacion(), IT);
    const a = await cifrar(dek, { x: 1 }), b = await cifrar(dek, { x: 1 });
    expect(a.iv).not.toBe(b.iv);
    const alterado = a.datos.slice(0, -4) + (a.datos.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    await expect(descifrar(dek, a.iv, alterado)).rejects.toThrow();
  }, 30000);
});
