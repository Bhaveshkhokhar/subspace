// index.js (root of your project)
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import RootLayout from './app/_layout'; // adjust path

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  // If you want, you can show a Notifee notification here too
});

AppRegistry.registerComponent('main', () => RootLayout);
