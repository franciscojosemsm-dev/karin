-- La identidad de las personas se registra solo al recibir la denuncia (mediante las funciones del canal y del registro interno).
-- Después es de solo lectura para la empresa, para que no pueda alterarse.
revoke insert, update on public.denuncia_identidad from authenticated;
drop policy if exists identidad_crear on public.denuncia_identidad;
drop policy if exists identidad_editar on public.denuncia_identidad;
