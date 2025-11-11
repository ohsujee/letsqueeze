import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.letsqueeze.app',
  appName: 'LetsQueeze',
  webDir: 'public', // Temporary, will use remote server
  server: {
    // Development: use local server
    // Production: change to your Vercel URL
    url: 'http://localhost:3000',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
