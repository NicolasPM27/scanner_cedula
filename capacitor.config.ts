import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fomag.app',
  appName: 'Actualizacion de datos',
  webDir: 'www',
  // Servidor de desarrollo - descomentar y configurar IP para pruebas en dispositivo
  // server: {
  //   url: 'http://192.168.1.100:8100',  // Reemplazar con tu IP local
  //   cleartext: true
  // },
  ios: {
    scheme: 'App',
    // Usar CocoaPods en lugar de SPM (requerido para ML Kit plugins)
    useCocoaPods: true
  }
};

export default config;
