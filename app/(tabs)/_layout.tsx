// // import React, { useEffect } from 'react';
// // import { Tabs } from 'expo-router';
// // import { Home, MessageSquare, Wallet, Compass, User } from 'lucide-react-native';
// // import { useTranslation } from '@/hooks/useLanguage';
// // import { DEFAULT_TAB_BAR_STYLE } from '@/constants/tabBarStyles';
// // import messaging from "@react-native-firebase/messaging";
// // import notifee, { AndroidImportance } from "@notifee/react-native";
// // import Toast from "@/components/Toast";
// // import { useToast } from "@/hooks/useToast";
// // import { storage } from "@/utils/storage";
// // import {
// //   Alert,
// //   Platform,
// //   PermissionsAndroid,
// // } from "react-native";

// // async function requestUserPermission() {
// //   if (Platform.OS === "ios") {
// //     const authStatus = await messaging().requestPermission();
// //     return (
// //       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
// //       authStatus === messaging.AuthorizationStatus.PROVISIONAL
// //     );
// //   } else if (Platform.OS === "android" && Platform.Version >= 33) {
// //     const result = await PermissionsAndroid.request(
// //       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
// //     );
// //     return result === PermissionsAndroid.RESULTS.GRANTED;
// //   }
// //   return true;
// // }



// // export default function TabLayout() {
// //   const { t } = useTranslation();
// //   const { toast, showSuccess, showError, hideToast } = useToast();
  

// //   useEffect(() => {
// //     const setupNotifications = async () => {
// //       try {
// //         const granted = await requestUserPermission();

// //         if (granted) {
// //           showSuccess("Notification Permission Granted ✅");

// //           const token = await messaging().getToken();
// //           console.log("FCM Token:", token); // will show in adb logcat
// //           Alert.alert("FCM Token", token);  // visible in release build
// //           showSuccess(`FCM Token: ${token}`);

// //           if (token) {
// //             try {
// //               Alert.alert("Sending Token", "📤 Sending FCM token to server...");

// //               const authToken = await storage.getAuthToken();
// //               const userId = await storage.getUserId();

// //               if (!authToken) {
// //                 Alert.alert("Auth Error", "❌ No auth token found");
// //                 return;
// //               }

// //               const response = await fetch('https://db.subspace.money/v1/graphql', {
// //                 method: 'POST',
// //                 headers: {
// //                   'Content-Type': 'application/json',
// //                   'Authorization': `Bearer ${authToken}`
// //                 },
// //                 body: JSON.stringify({
// //                   query: `
// //                     mutation MyMutation($user_id: uuid = "", $fcm_token: String = "") {
// //                         insert_whatsub_fcm_token(objects: {user_id: $user_id, fcm_token: $fcm_token}, on_conflict: {constraint: whatsub_fcm_token_user_id_fcm_token_key, update_columns: fcm_token}) {
// //                           affected_rows
// //                         }
// //                       }
// //                   `,
// //                   variables: {
// //                     user_id: userId,
// //                     fcm_token: token,
// //                   }
// //                 })
// //               });

// //               const result = await response.json();
// //               Alert.alert("Server Response", `✅ Response: ${JSON.stringify(result)}`);
// //               return result;

// //             } catch (error) {
// //               console.error('Error sending fcm token to server:', error);
// //               Alert.alert("Server Error", `❌ Error: ${error}`);
// //               throw error;
// //             }
// //           }
// //         } else {
// //           showError("Notification Permission Denied ❌");
// //         }

// //         if (Platform.OS === "android") {
// //           await notifee.createChannel({
// //             id: "default",
// //             name: "Default Channel",
// //             importance: AndroidImportance.HIGH,
// //             sound: "default",
// //           });
// //         }
// //       } catch (error) {
// //         console.log("Notification setup error:", error);
// //       }
// //     };

// //     setupNotifications();
// //   }, []); 

// //   return (
// //     <Tabs
// //       screenOptions={{
// //         headerShown: false,
// //         tabBarStyle: DEFAULT_TAB_BAR_STYLE,
// //         tabBarActiveTintColor: '#6366F1',
// //         tabBarInactiveTintColor: '#6B7280',
// //         tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
// //         tabBarIconStyle: { marginBottom: 2 },
// //         tabBarLabelPosition: 'below-icon',
// //       }}
// //     >
// //       <Tabs.Screen
// //         name="home"
// //         options={{
// //           title: t('nav.home'),
// //           tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="explore"
// //         options={{
// //           title: t('nav.explore'),
// //           tabBarIcon: ({ size, color }) => <Compass size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="wallet"
// //         options={{
// //           title: t('nav.wallet'),
// //           tabBarIcon: ({ size, color }) => <Wallet size={24} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="chat"
// //         options={{
// //           title: t('nav.chat'),
// //           tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="account"
// //         options={{
// //           title: t('nav.account'),
// //           tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
// //         }}
// //       />
// //       {/* Hidden tab */}
// //       <Tabs.Screen name="index" options={{ href: null }} />
// //     </Tabs>
// //   );
// // }



// import React, { useEffect } from 'react';
// import { Tabs } from 'expo-router';
// import { Home, MessageSquare, Wallet, Compass, User } from 'lucide-react-native';
// import { useTranslation } from '@/hooks/useLanguage';
// import { DEFAULT_TAB_BAR_STYLE } from '@/constants/tabBarStyles';
// import messaging from "@react-native-firebase/messaging";
// import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
// import Toast from "@/components/Toast";
// import { useToast } from "@/hooks/useToast";
// import { storage } from "@/utils/storage";
// import {
//   Alert,
//   Platform,
//   PermissionsAndroid,
//   AppState,
// } from "react-native";
// import handleNotificationRouting from '@/utils/handleNotificationRouting'

// async function requestUserPermission() {
//   if (Platform.OS === "ios") {
//     const authStatus = await messaging().requestPermission();
//     return (
//       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//       authStatus === messaging.AuthorizationStatus.PROVISIONAL
//     );
//   } else if (Platform.OS === "android" && Platform.Version >= 33) {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//     );
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// }

// // Background message handler (must be outside of component)
// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   console.log('Message handled in the background!', remoteMessage);
  
//   // Display notification using notifee
//   // await notifee.displayNotification({
//   //   title: remoteMessage.notification?.title || 'New Message',
//   //   body: remoteMessage.notification?.body || 'You have a new message',
//   //   android: {
//   //     channelId: 'default',
//   //     importance: AndroidImportance.HIGH,
//   //     smallIcon: 'ic_launcher', // Make sure you have this icon
//   //     pressAction: {
//   //       id: 'default',
//   //     },
//   //   },
//   //   ios: {
//   //     sound: 'default',
//   //   },
//   //   data: remoteMessage.data,
//   // });
// });

// export default function TabLayout() {
//   const { t } = useTranslation();
//   const { toast, showSuccess, showError, hideToast } = useToast();
  
//   useEffect(() => {
//     const setupNotifications = async () => {
//       try {
//         const granted = await requestUserPermission();

//         if (granted) {
//           showSuccess("Notification Permission Granted ✅");

//           const token = await messaging().getToken();
//           console.log("FCM Token:", token);
          
//           if (token) {
//             try {
//               const authToken = await storage.getAuthToken();
//               const userId = await storage.getUserId();

//               if (!authToken) {
//                 Alert.alert("Auth Error", "❌ No auth token found");
//                 return;
//               }

//               const response = await fetch('https://db.subspace.money/v1/graphql', {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                   'Authorization': `Bearer ${authToken}`
//                 },
//                 body: JSON.stringify({
//                   query: `
//                     mutation MyMutation($user_id: uuid = "", $fcm_token: String = "") {
//                         insert_whatsub_fcm_token(objects: {user_id: $user_id, fcm_token: $fcm_token}, on_conflict: {constraint: whatsub_fcm_token_user_id_fcm_token_key, update_columns: fcm_token}) {
//                           affected_rows
//                         }
//                       }
//                   `,
//                   variables: {
//                     user_id: userId,
//                     fcm_token: token,
//                   }
//                 })
//               });

//               const result = await response.json();
//               console.log("Token sent to server:", result);
              
//             } catch (error) {
//               console.error('Error sending fcm token to server:', error);
//             }
//           }
//         } else {
//           showError("Notification Permission Denied ❌");
//         }

//         // Create notification channel for Android
//         if (Platform.OS === "android") {
//           await notifee.createChannel({
//             id: "default",
//             name: "Default Channel",
//             importance: AndroidImportance.HIGH,
//             sound: "default",
//             vibration: true,
//           });
//         }
//       } catch (error) {
//         console.log("Notification setup error:", error);
//       }
//     };

//     setupNotifications();

//     // Handle foreground messages
//     const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
//       Alert.alert('A new FCM message arrived in foreground!', JSON.stringify(remoteMessage));
//       handleNotificationRouting(remoteMessage);
//       // Display notification in foreground using notifee
//       // await notifee.displayNotification({
//       //   title: remoteMessage.notification?.title || 'New Message',
//       //   body: remoteMessage.notification?.body || 'You have a new message',
//       //   android: {
//       //     channelId: 'default',
//       //     importance: AndroidImportance.HIGH,
//       //     // smallIcon: 'ic_launcher',
//       //     pressAction: {
//       //       id: 'default',
//       //     },
//       //   },
//       //   ios: {
//       //     sound: 'default',
//       //   },
//       //   data: remoteMessage.data,
//       // });
//     });

//     // Handle notification opened app from background/quit state
//     messaging()
//       .getInitialNotification()
//       .then(remoteMessage => {
//         if (remoteMessage) {
//           Alert.alert(
//             'Line 329: Notification caused app to open from quit state:',
//             remoteMessage.notification?.body,
//           );
//           handleNotificationRouting(remoteMessage);
//           // Handle navigation or other actions based on notification data
//         }
//       });

//     // Handle notification opened app from background state
//     const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
//       Alert.alert(
//         'Line 340: Notification caused app to open from background state:',
//         remoteMessage?.notification?.body,
//       );
//       // Handle navigation or other actions based on notification data
//       handleNotificationRouting(remoteMessage);
//     });

//     // Handle notifee notification events (tap, dismiss, etc.)
//     // const unsubscribeNotifeeEvents = notifee.onForegroundEvent(({ type, detail }) => {
//     //   switch (type) {
//     //     case EventType.DISMISSED:
//     //       console.log('User dismissed notification', detail.notification);
//     //       break;
//     //     case EventType.PRESS:
//     //       console.log('User pressed notification', detail.notification);
//     //       // Handle navigation based on notification data
//     //       break;
//     //   }
//     // });

//     // Token refresh listener
//     const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(token => {
//       console.log('FCM token refreshed:', token);
//       // Send new token to your server
//       // You might want to call your token update function here
//     });

//     // Cleanup function
//     return () => {
//       unsubscribeOnMessage();
//       unsubscribeOnNotificationOpenedApp();
//       // unsubscribeNotifeeEvents();
//       unsubscribeOnTokenRefresh();
//     };
//   }, []); 

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarStyle: DEFAULT_TAB_BAR_STYLE,
//         tabBarActiveTintColor: '#6366F1',
//         tabBarInactiveTintColor: '#6B7280',
//         tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
//         tabBarIconStyle: { marginBottom: 2 },
//         tabBarLabelPosition: 'below-icon',
//       }}
//     >
//       <Tabs.Screen
//         name="home"
//         options={{
//           title: t('nav.home'),
//           tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="explore"
//         options={{
//           title: t('nav.explore'),
//           tabBarIcon: ({ size, color }) => <Compass size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="wallet"
//         options={{
//           title: t('nav.wallet'),
//           tabBarIcon: ({ size, color }) => <Wallet size={24} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="chat"
//         options={{
//           title: t('nav.chat'),
//           tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="account"
//         options={{
//           title: t('nav.account'),
//           tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
//         }}
//       />
//       {/* Hidden tab */}
//       <Tabs.Screen name="index" options={{ href: null }} />
//     </Tabs>
//   );
// }

// // import React, { useEffect } from "react";
// // import { Tabs, useRouter, useNavigationContainerRef } from "expo-router";
// // import { Home, MessageSquare, Wallet, Compass, User } from "lucide-react-native";
// // import { DEFAULT_TAB_BAR_STYLE } from "@/constants/tabBarStyles";
// // import { useTranslation } from "@/hooks/useLanguage";
// // import messaging from "@react-native-firebase/messaging";
// // import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
// // import { Alert, Platform, PermissionsAndroid } from "react-native";

// // import { setPendingNotification, consumePendingNotification } from "@/utils/notificationQueue";
// // import handleNotificationRouting from "@/utils/handleNotificationRouting";

// // // 🔹 Request permission
// // async function requestUserPermission() {
// //   if (Platform.OS === "ios") {
// //     const authStatus = await messaging().requestPermission();
// //     return (
// //       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
// //       authStatus === messaging.AuthorizationStatus.PROVISIONAL
// //     );
// //   } else if (Platform.OS === "android" && Platform.Version >= 33) {
// //     const result = await PermissionsAndroid.request(
// //       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
// //     );
// //     return result === PermissionsAndroid.RESULTS.GRANTED;
// //   }
// //   return true;
// // }

// // // 🔹 Capture cold start notification before React mounts
// // messaging().getInitialNotification().then(remoteMessage => {
// //   if (remoteMessage) {
// //     setPendingNotification(remoteMessage);
// //   }
// // });

// // export default function TabLayout() {
// //   const { t } = useTranslation();

// //   useEffect(() => {
// //     const setupNotifications = async () => {
// //       try {
// //         const granted = await requestUserPermission();
// //         if (!granted) {
// //           console.log("❌ Notification permission denied");
// //         }

// //         // Create Android channel
// //         if (Platform.OS === "android") {
// //           await notifee.createChannel({
// //             id: "default",
// //             name: "Default Channel",
// //             importance: AndroidImportance.HIGH,
// //             sound: "default",
// //           });
// //         }
// //       } catch (error) {
// //         console.log("Notification setup error:", error);
// //       }
// //     };

// //     setupNotifications();

// //     // 🔹 Foreground FCM listener
// //     const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
// //       console.log("📩 Foreground message:", remoteMessage);

// //       // Show system notification
// //       await notifee.displayNotification({
// //         title: remoteMessage.notification?.title ?? "New Message",
// //         body: remoteMessage.notification?.body ?? "You have a new notification",
// //         android: { channelId: "default", pressAction: { id: "default" } },
// //         ios: { sound: "default" },
// //         data: remoteMessage.data,
// //       });
// //     });

// //     // 🔹 Background → foreground
// //     const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
// //       console.log("🔙 App opened from background via notification:", remoteMessage);
// //       setPendingNotification(remoteMessage);
// //     });

// //     // 🔹 Notifee tap handler (works for foreground notifications)
// //     const unsubscribeNotifeeEvents = notifee.onForegroundEvent(({ type, detail }) => {
// //       if (type === EventType.PRESS) {
// //         console.log("👆 Notifee notification tapped:", detail.notification);
// //         setPendingNotification({ data: detail.notification?.data });
// //       }
// //     });

// //     // 🔹 FCM token refresh
// //     const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(token => {
// //       console.log("🔄 FCM token refreshed:", token);
// //     });

// //     // Cleanup
// //     return () => {
// //       unsubscribeOnMessage();
// //       unsubscribeOnNotificationOpenedApp();
// //       unsubscribeNotifeeEvents();
// //       unsubscribeOnTokenRefresh();
// //     };
// //   }, []);

// //   // 🔹 Consume queued notification once navigation is ready
// //   // useEffect(() => {
// //   //   const unsub = rootNavigation?.addListener("state", () => {
// //   //     const msg = consumePendingNotification();
// //   //     if (msg) {
// //   //       handleNotificationNavigation(msg);
// //   //     }
// //   //   });
// //   //   return unsub;
// //   // }, [rootNavigation]);

// //   const router = useRouter();
// //   const navigationRef = useNavigationContainerRef();

// //   useEffect(() => {
// //     if (!navigationRef.isReady) return;

// //     const msg = consumePendingNotification();
// //     if (msg) {
// //       handleNotificationRouting(msg);
// //     }
// //   }, [navigationRef.isReady]);

// //   return (
// //     <Tabs
// //       screenOptions={{
// //         headerShown: false,
// //         tabBarStyle: DEFAULT_TAB_BAR_STYLE,
// //         tabBarActiveTintColor: "#6366F1",
// //         tabBarInactiveTintColor: "#6B7280",
// //         tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
// //         tabBarIconStyle: { marginBottom: 2 },
// //         tabBarLabelPosition: "below-icon",
// //       }}
// //     >
// //       <Tabs.Screen
// //         name="home"
// //         options={{
// //           title: t("nav.home"),
// //           tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="explore"
// //         options={{
// //           title: t("nav.explore"),
// //           tabBarIcon: ({ size, color }) => <Compass size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="wallet"
// //         options={{
// //           title: t("nav.wallet"),
// //           tabBarIcon: ({ size, color }) => <Wallet size={24} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="chat"
// //         options={{
// //           title: t("nav.chat"),
// //           tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
// //         }}
// //       />
// //       <Tabs.Screen
// //         name="account"
// //         options={{
// //           title: t("nav.account"),
// //           tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
// //         }}
// //       />
// //       {/* Hidden tab */}
// //       <Tabs.Screen name="index" options={{ href: null }} />
// //     </Tabs>
// //   );
// // }



// app/(tabs)/_layout.tsx
import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, MessageSquare, Wallet, Compass, User } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useLanguage';
import { DEFAULT_TAB_BAR_STYLE } from '@/constants/tabBarStyles';
// import messaging from "@react-native-firebase/messaging";
import { useToast } from "@/hooks/useToast";
import { storage } from "@/utils/storage"; 
import {
  Platform,
  PermissionsAndroid,
} from "react-native";

// async function requestUserPermission() {
//   if (Platform.OS === "ios") {
//     const authStatus = await messaging().requestPermission();
//     return (
//       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//       authStatus === messaging.AuthorizationStatus.PROVISIONAL
//     );
//   } else if (Platform.OS === "android" && Platform.Version >= 33) {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//     );
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// }

// async function registerFCMToken(token: any) {
//   try {
//     const authToken = await storage.getAuthToken();
//     const userId = await storage.getUserId();

//     if (!authToken || !userId) {
//       console.error("Missing auth token or user ID");
//       return false;
//     }

//     const response = await fetch('https://db.subspace.money/v1/graphql', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${authToken}`
//       },
//       body: JSON.stringify({
//         query: `
//           mutation MyMutation($user_id: uuid = "", $fcm_token: String = "") {
//             insert_whatsub_fcm_token(
//               objects: {user_id: $user_id, fcm_token: $fcm_token}, 
//               on_conflict: {
//                 constraint: whatsub_fcm_token_user_id_fcm_token_key, 
//                 update_columns: fcm_token
//               }
//             ) {
//               affected_rows
//             }
//           }
//         `,
//         variables: {
//           user_id: userId,
//           fcm_token: token,
//         }
//       })
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const result = await response.json();
//     console.log("FCM token registered successfully:", result);
//     return true;
    
//   } catch (error) {
//     console.error('Error registering FCM token:', error);
//     return false;
//   }
// }

export default function TabLayout() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  
  // useEffect(() => {
  //   console.log('Tab layout mounted - setting up notifications');
    
  //   const setupNotificationsAfterLogin = async () => {
  //     try {
  //       // Request permission (only after login)
  //       const granted = await requestUserPermission();

  //       if (granted) {
  //         showSuccess("Notification Permission Granted ✅");

  //         // Get FCM token and register it
  //         const token = await messaging().getToken();
  //         console.log("FCM Token:", token);
          
  //         if (token) {
  //           const success = await registerFCMToken(token);
  //           if (success) {
  //             console.log("FCM token registered with server");
  //           }
  //         }
  //       } else {
  //         showError("Notification Permission Denied ❌");
  //       }
  //     } catch (error) {
  //       console.error("Notification setup error:", error);
  //       showError("Failed to setup notifications");
  //     }
  //   };

  //   // Set up notifications after a small delay to ensure user is fully logged in
  //   const timer = setTimeout(setupNotificationsAfterLogin, 1000);

  //   // Handle foreground messages with user feedback
  //   const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
  //     console.log('Foreground message in tab layout:', remoteMessage);
      
  //     // Show user-friendly notification
  //     if (remoteMessage.notification?.title) {
  //       showSuccess(`📱 ${remoteMessage.notification.title}`);
  //     }
  //   });

    // Token refresh listener (handle token updates after login)
  //   const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
  //     console.log('FCM token refreshed in tab layout:', newToken);
  //     const success = await registerFCMToken(newToken);
  //     if (success) {
  //       console.log("Refreshed token registered successfully");
  //     }
  //   });

  //   return () => {
  //     clearTimeout(timer);
  //     unsubscribeOnMessage();
  //     unsubscribeOnTokenRefresh();
  //   };
  // }, []); 

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: DEFAULT_TAB_BAR_STYLE,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('nav.explore'),
          tabBarIcon: ({ size, color }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('nav.wallet'),
          tabBarIcon: ({ size, color }) => <Wallet size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('nav.account'),
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      {/* Hidden tab */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}