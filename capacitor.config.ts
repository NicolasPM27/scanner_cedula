import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fomag.app',
  appName: 'Scanner Cedula',
  webDir: 'www',
  ios: {
    scheme: 'App',
    // Usar CocoaPods en lugar de SPM (requerido para ML Kit plugins)
    useCocoaPods: true
  }
};

export default config;
