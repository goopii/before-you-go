import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.malte.beforeyougo',
  appName: 'Before You Go',
  webDir: 'dist',
  backgroundColor: '#dde5ce',
  plugins: {
    SystemBars: { style: 'LIGHT', insetsHandling: 'native', initialViewportFitValueHint: 'cover' },
  },
}

export default config
