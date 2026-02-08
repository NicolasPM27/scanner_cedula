/**
 * Ambiente para Capacitor (iOS / Android).
 *
 * En dispositivos nativos NO hay proxy de Angular.
 * La app se ejecuta como archivo local (file:// o capacitor://),
 * por lo que necesita la URL absoluta del backend.
 *
 * Para desarrollo local con dispositivo/emulador:
 *   - Android emulator: http://10.0.2.2:3000/api
 *   - iOS simulator:    http://localhost:3000/api
 *   - Dispositivo real: http://<IP_LOCAL>:3000/api
 *
 * Para producción móvil, apuntar al backend de Azure.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
