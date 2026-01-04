import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gigglz.app',
  appName: 'Gigglz',
  webDir: 'public', // Temporary, will use remote server
  server: {
    // Development: use local IP (phone must be on same WiFi)
    // Production: change to your Vercel URL
    url: 'http://192.168.1.141:3000',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    AdMob: {
      appIdAndroid: 'ca-app-pub-1140758415112389~6606152744', // Gigglz Android
      appIdIos: 'ca-app-pub-1140758415112389~9949860754'      // Gigglz iOS
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    }
  }
};

export default config;
