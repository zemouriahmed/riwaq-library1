// Capacitor configuration, prepared for a future Android/iOS build (Phase 6).
// Not used by the web build. To enable later:
//   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
//   npx cap add android && npx cap add ios
//   npm run build && npx cap sync
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.smartlibrary.reader',
  appName: 'Smart Library',
  webDir: 'dist',
  server: { androidScheme: 'https' },
}

export default config
