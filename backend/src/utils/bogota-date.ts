/**
 * Retorna la fecha/hora actual en zona horaria de Bogotá (America/Bogota, UTC-5).
 * Usar siempre que se necesite "ahora" para guardar en BD o mostrar al usuario.
 */
export function getBogotaDate(): Date {
  const now = new Date();
  const bogota = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );
  return bogota;
}
