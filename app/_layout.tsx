// // import React, { useEffect, useState } from "react";
// // import { Stack, router } from "expo-router";
// // import { StatusBar } from "expo-status-bar";
// // import * as SplashScreen from "expo-splash-screen";
// // import { Alert, Platform, PermissionsAndroid } from 'react-native';
// // import { useFrameworkReady } from '@/hooks/useFrameworkReady';
// // import { checkAuthStatus } from '@/stores/authStore';
// // import { useLanguage, useTranslation } from '@/hooks/useLanguage';
// // import messaging from '@react-native-firebase/messaging';
// // import notifee, { AndroidImportance } from '@notifee/react-native';
// // import Toast from '@/components/Toast';
// // import { useToast } from '@/hooks/useToast';


// // SplashScreen.preventAutoHideAsync();
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

// // export default function RootLayout() {
// //   useFrameworkReady();
// //   const [isLoading, setIsLoading] = useState(true);
// //   const { isLanguageSelected, loadLanguage } = useLanguage();
// //   const { toast, showSuccess, showError, hideToast } = useToast();
// //   const [isMounted, setIsMounted] = useState(false);

// //   useEffect(() => {
// //     initializeApp();
// //   }, []);
// //   useEffect(() => {
// //     setIsMounted(true);
// //   }, []);

// //   const initializeApp = async () => {
// //     try {
// //       // Small delay for smooth init
// //       await new Promise(resolve => setTimeout(resolve, 400));

// //       await loadLanguage();
// //       const isAuthenticated = await checkAuthStatus();

// //       await SplashScreen.hideAsync();

// //       if (isAuthenticated) {
// //         router.replace('/(tabs)/home');
// //       } else if (!isLanguageSelected) {
// //         router.replace('/language-selection');
// //       } else {
// //         router.replace('/auth');
// //       }
// //     } catch (error) {
// //       console.error('Error initializing app:', error);
// //       await SplashScreen.hideAsync();
// //       router.replace('/language-selection');
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     const setupNotifications = async () => {
// //       try {
// //         const granted = await requestUserPermission();

// //         if (granted) {
// //           if (isMounted) showSuccess("Notification Permission Granted ✅");

// //           const token = await messaging().getToken();
// //           if (isMounted) {
// //             setTimeout(() => {
// //               showSuccess(`FCM Token: ${token}`);
// //             }, 500);
// //           }
// //         } else {
// //           if (isMounted) showError("Notification Permission Denied ❌");
// //         }

// //         if (Platform.OS === 'android') {
// //           await notifee.createChannel({
// //             id: 'default',
// //             name: 'Default Channel',
// //             importance: AndroidImportance.HIGH,
// //             sound: 'default',
// //           });
// //         }
// //       } catch (error) {
// //         console.log('Notification setup error:', error);
// //       }
// //     };

// //     setupNotifications();
// //   }, [isMounted]);


// //   const handleNotificationNavigation = (remoteMessage: any) => {
// //     // Navigate based on notification data
// //     // if (remoteMessage.data?.screen) {
// //     //   router.push(remoteMessage.data.screen);
// //     // }
// //     // Add more navigation logic based on your notification payload

// //     router.replace('/(tabs)/home');
// //   };

// //   return (
// //     <>
// //       <Stack
// //         screenOptions={{
// //           headerShown: false,
// //           contentStyle: { backgroundColor: "#0E0E0E" },
// //         }}
// //       >
// //         <Stack.Screen name="index" />
// //         <Stack.Screen name="language-selection" />
// //         <Stack.Screen name="auth" />
// //         <Stack.Screen name="(tabs)" />
// //         <Stack.Screen name="+not-found" />
// //       </Stack>
// //       <Toast
// //         visible={toast.visible}
// //         message={toast.message}
// //         type={toast.type}
// //         onHide={hideToast}
// //       />
// //       <StatusBar style="light" translucent />
// //     </>
// //   );
// // }


// import React, { useEffect, useState } from "react";
// import { Stack, router } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import * as SplashScreen from "expo-splash-screen";
// import {
//   Alert,
//   Platform,
//   PermissionsAndroid,
// } from "react-native";
// import { useFrameworkReady } from "@/hooks/useFrameworkReady";
// import { checkAuthStatus } from "@/stores/authStore";
// import { useLanguage, useTranslation } from "@/hooks/useLanguage";
// import messaging from "@react-native-firebase/messaging";
// import notifee, { AndroidImportance } from "@notifee/react-native";
// import Toast from "@/components/Toast";
// import { useToast } from "@/hooks/useToast";
// import { storage, STORAGE_KEYS } from "@/utils/storage";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// SplashScreen.preventAutoHideAsync();

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

// export default function RootLayout() {
//   useFrameworkReady();
//   const [isLoading, setIsLoading] = useState(true);
//   const { isLanguageSelected, loadLanguage } = useLanguage();
//   const { toast, showSuccess, showError, hideToast } = useToast();

//   useEffect(() => {
//     initializeApp();
//   }, []);

//   const initializeApp = async () => {
//     try {
//       await new Promise((resolve) => setTimeout(resolve, 400));

//       await loadLanguage();
//       const isAuthenticated = await checkAuthStatus();

//       await SplashScreen.hideAsync();
//       // const isBlocked = await AsyncStorage.getItem(STORAGE_KEYS.isBlocked);
//       // if(isBlocked){
//       //     router.replace("/AccountBlockedScreen");
//       // }
//       if (isAuthenticated) {
//         router.replace("/(tabs)/home");
//       } else if (!isLanguageSelected) {
//         router.replace("/language-selection");
//       } else {
//         router.replace("/auth");
//       }
//     } catch (error) {
//       console.error("Error initializing app:", error);
//       await SplashScreen.hideAsync();
//       router.replace("/language-selection");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // useEffect(() => {
//   //   const setupNotifications = async () => {
//   //     try {
//   //       const granted = await requestUserPermission();

//   //       if (granted) {
//   //         showSuccess("Notification Permission Granted ✅");

//   //         const token = await messaging().getToken();
//   //         console.log("FCM Token:", token); // will show in adb logcat
//   //         Alert.alert("FCM Token", token);  // visible in release build
//   //         showSuccess(`FCM Token: ${token}`);

//   //         if (token) {
//   //           try {
//   //             Alert.alert("Sending Token", "📤 Sending FCM token to server...");

//   //             const authToken = await storage.getAuthToken();
//   //             const userId = await storage.getUserId();

//   //             if (!authToken) {
//   //               Alert.alert("Auth Error", "❌ No auth token found");
//   //               return;
//   //             }

//   //             const response = await fetch('https://db.subspace.money/v1/graphql', {
//   //               method: 'POST',
//   //               headers: {
//   //                 'Content-Type': 'application/json',
//   //                 'Authorization': `Bearer ${authToken}`
//   //               },
//   //               body: JSON.stringify({
//   //                 query: `
//   //                   mutation MyMutation($user_id: uuid = "", $fcm_token: String = "") {
//   //                       insert_whatsub_fcm_token(objects: {user_id: $user_id, fcm_token: $fcm_token}, on_conflict: {constraint: whatsub_fcm_token_user_id_fcm_token_key, update_columns: fcm_token}) {
//   //                         affected_rows
//   //                         user_id
//   //                         created_at
//   //                         updated_at
//   //                       }
//   //                     }
//   //                 `,
//   //                 variables: {
//   //                   user_id: userId,
//   //                   fcm_token: token,
//   //                 }
//   //               })
//   //             });

//   //             const result = await response.json();
//   //             Alert.alert("Server Response", `✅ Response: ${JSON.stringify(result)}`);
//   //             return result;

//   //           } catch (error) {
//   //             console.error('Error sending fcm token to server:', error);
//   //             Alert.alert("Server Error", `❌ Error: ${error}`);
//   //             throw error;
//   //           }
//   //         }
//   //       } else {
//   //         showError("Notification Permission Denied ❌");
//   //       }

//   //       if (Platform.OS === "android") {
//   //         await notifee.createChannel({
//   //           id: "default",
//   //           name: "Default Channel",
//   //           importance: AndroidImportance.HIGH,
//   //           sound: "default",
//   //         });
//   //       }
//   //     } catch (error) {
//   //       console.log("Notification setup error:", error);
//   //     }
//   //   };

//   //   setupNotifications();
//   // }, []); 

//   return (
//     <>
//       <Stack
//         screenOptions={{
//           headerShown: false,
//           contentStyle: { backgroundColor: "#0E0E0E" },
//         }}
//       >
//         <Stack.Screen name="index" />
//         <Stack.Screen name="language-selection" />
//         <Stack.Screen name="auth" />
//         <Stack.Screen name="(tabs)" />
//         <Stack.Screen name="+not-found" />
//       </Stack>
//       <Toast
//         visible={toast.visible}
//         message={toast.message}
//         type={toast.type}
//         onHide={hideToast}
//       />
//       <StatusBar style="light" translucent />
//     </>
//   );
// }

// app/_layout.tsx (Enhanced version)
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform } from "react-native";
import { router } from 'expo-router';
import { notificationStore } from '@/utils/NotificationStore';

// Enhanced notification routing with store
const handleNotificationRouting = async (remoteMessage: any) => {
  console.log('=== ENHANCED NOTIFICATION ROUTING ===');
  console.log('Message:', JSON.stringify(remoteMessage, null, 2));
  
  if (!remoteMessage?.data) {
    console.log('No notification data, navigating to home');
    router.replace('/(tabs)/home');
    return;
  }

  // Store the notification data for complex routing
  await notificationStore.setPendingNavigation(remoteMessage.data);
  
  // Navigate to the appropriate tab - specific routing will be handled by individual screens
  const { route, room_id, service_id } = remoteMessage.data;
  
  setTimeout(() => {
    try {
      if(room_id){
        router.replace({
          pathname: '/chat/conversation',
          params: {
            roomId: room_id
          }
        });
      }
      else if(service_id){
        router.replace({
          pathname: '/product-details',
          params: {
            id: service_id,
          }
        });
      }
      else if(route){
        switch (route) {
          case 'chat':
            router.replace('/(tabs)/chat');
            break;
          case 'profile':
            router.replace('/(tabs)/account');
            break;
          case 'wallet':
            router.replace('/(tabs)/wallet');
            break;
          case 'explore':
            router.replace('/(tabs)/explore');
            break;
          default:
            router.replace('/(tabs)/home');
            break;
        }
      }
      else{
        router.replace('/home');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      router.replace('/(tabs)/home');
    }
  }, 1500);
};

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message received:', remoteMessage);
  // Store for later processing when app opens
  if (remoteMessage?.data) {
    await notificationStore.setPendingNavigation(remoteMessage.data);
  }
});

export default function RootLayout() {
  useEffect(() => {
    console.log('Root layout mounted');

    // Create notification channel for Android
    if (Platform.OS === "android") {
      notifee.createChannel({
        id: "default",
        name: "Default Channel",
        importance: AndroidImportance.HIGH,
        sound: "default",
        vibration: true,
      }).catch(console.error);
    }

    // Handle notification opened app from background/quit state
    messaging()
      .getInitialNotification()
      .then(async remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from notification (quit state)');
          await handleNotificationRouting(remoteMessage);
        }
      })
      .catch(error => {
        console.error('getInitialNotification error:', error);
      });

    // Handle notification opened app from background state
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(async remoteMessage => {
      console.log('App opened from notification (background state)');
      await handleNotificationRouting(remoteMessage);
    });

    // Handle foreground messages (just log, UI feedback handled in tab layout)
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received in root layout');
      // Store the data in case user wants to navigate later
      if (remoteMessage?.data) {
        await notificationStore.setPendingNavigation(remoteMessage.data);
      }
    });

    return () => {
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnMessage();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}