/**
 * Ambiente de producción (Azure App Service / Static Web Apps).
 *
 * En Azure, el frontend y backend están detrás del mismo dominio
 * usando un reverse proxy (Azure Front Door, App Gateway, etc.),
 * por lo que '/api' funciona como ruta relativa.
 *
 * Si backend y frontend están en dominios separados:
 *   apiUrl: 'https://fomag-api.azurewebsites.net/api'
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
