import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gigglz.app',
  appName: 'Gigglz',
  webDir: 'public', // Temporary, will use remote server
  server: {
    // Production: Vercel deployment
    url: 'https://app.gigglz.fun',
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
      providers: ['google.com', 'apple.com']
      // iOS: Uses CLIENT_ID from GoogleService-Info.plist automatically
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
