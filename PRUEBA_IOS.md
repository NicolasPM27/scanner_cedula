# Guía: Probar en dispositivo iOS

## Requisitos previos
- Mac y iPhone en la **misma red WiFi**
- Xcode instalado
- Backend y SQL Server corriendo

---

## Paso 1: Obtener IP local de tu Mac

```bash
ipconfig getifaddr en0
```

Ejemplo de resultado: `192.168.1.100` ← **Esta es tu IP**

---

## Paso 2: Iniciar backend con conexión a red local

```bash
cd /Users/nicolaspadilla/Desktop/FOMAG/scanner_cedula

# Iniciar Docker (SQL Server + API)
cd docker
docker-compose up -d

# Verificar que el API está corriendo
curl http://localhost:3000/api/health
```

**Importante**: El backend debe escuchar en `0.0.0.0` para aceptar conexiones externas. Docker Compose ya está configurado así.

---

## Paso 3: Actualizar configuración Angular

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://192.168.1.100:3000/api',  // ← TU IP LOCAL AQUÍ
};
```

---

## Paso 4: Build y sincronizar con iOS

```bash
# Desde la raíz del proyecto
npm run build

# Sincronizar con iOS
npx cap sync ios

# Abrir en Xcode
npx cap open ios
```

---

## Paso 5: Configurar Xcode

1. **Selecciona tu dispositivo físico** en el selector de destino (arriba a la izquierda)
2. Ve a **Signing & Capabilities** del target `App`
3. Selecciona tu **Team** de desarrollo
4. Asegúrate que el **Bundle Identifier** sea único: `com.fomag.app.tunombre`

---

## Paso 6: Ejecutar en dispositivo

1. Conecta tu iPhone con cable USB
2. Desbloquea el iPhone y confía en tu Mac cuando te pregunte
3. Click en ▶️ **Run** en Xcode
4. En el iPhone: **Settings → General → VPN & Device Management → Confiar en desarrollador**
5. Abre la app nuevamente

---

## Verificar conexión

Una vez abierta la app:

1. Ve a la pantalla de verificación
2. Escanea una cédula o ingresa datos manualmente
3. Observa los logs en Xcode Console
4. Si hay error de conexión, verifica:
   - ✅ Mac y iPhone en misma red WiFi
   - ✅ IP correcta en `environment.ts`
   - ✅ Backend corriendo: `http://TU_IP:3000/api/health`
   - ✅ Firewall de Mac permite conexiones al puerto 3000

---

## Permitir conexiones en Firewall (si es necesario)

```bash
# Abrir Preferencias del Sistema → Seguridad → Firewall
# Desactivar temporalmente el firewall O
# Agregar excepción para Node.js/Docker
```

---

## Alternativa: Ionic Live Reload

Para desarrollo más ágil (cambios se reflejan automáticamente):

```bash
# Terminal 1: Iniciar con live reload
ionic cap run ios --livereload --external --host=0.0.0.0

# Esto:
# - Sirve la app desde tu IP local
# - Abre Xcode automáticamente
# - Los cambios se reflejan en tiempo real
```

⚠️ **Nota**: Con live reload, NO necesitas editar `environment.ts` manualmente, Ionic lo hace automáticamente.

---

## Troubleshooting

### Error: "Failed to fetch" o "Network request failed"

```bash
# 1. Verifica que el backend responde desde el iPhone
# Abre Safari en el iPhone y ve a:
http://TU_IP:3000/api/health

# Deberías ver: {"status":"ok",...}
```

### Error: "Connection timed out"

- Verifica firewall de Mac
- Confirma que estás en la misma red WiFi
- Prueba hacer ping desde el iPhone a tu Mac

### Error de certificado SSL

Si usas HTTPS, necesitas:
1. Certificado SSL válido o
2. Configurar `cleartext: true` en capacitor.config.ts (ya está configurado)

---

## Volver a desarrollo con localhost

Después de probar, revierte los cambios:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // ← Volver a localhost
};
```

```bash
npm run build
npx cap sync
```
