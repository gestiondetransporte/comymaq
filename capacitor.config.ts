import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.comymaq.app',
  appName: 'COMYMAQ',
  webDir: 'dist',
  server: {
    url: 'https://81259e17-de12-4694-9e58-a115feb9395a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
