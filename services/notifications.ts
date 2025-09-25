// // src/services/notifications.ts
// import { Platform, PermissionsAndroid } from "react-native";
// import messaging, { AuthorizationStatus } from "@react-native-firebase/messaging";
// import notifee, { AndroidImportance } from "@notifee/react-native";
// import { storage } from "@/utils/storage";

// /**
//  * Create an Android channel named "default".
//  * Not needed on iOS, but safe to call on both.
//  */
// export async function createAndroidChannel() {
//   if (Platform.OS === "android") {
//     try {
//       await notifee.createChannel({
//         id: "default",
//         name: "Default",
//         importance: AndroidImportance.HIGH,
//       });
//     } catch (e) {
//       console.warn("[createAndroidChannel] failed", e);
//     }
//   }
// }

// /**
//  * Request / check push permission for both platforms.
//  * - On Android pre-13 we don't need runtime POST_NOTIFICATIONS.
//  * - On Android 13+ we ask for POST_NOTIFICATIONS via PermissionsAndroid (safer).
//  * - We always call messaging().requestPermission() (it works cross-platform).
//  *
//  * Returns true if permission is granted (Authorized or Provisional)
//  */
// export async function requestUserPermission(): Promise<boolean> {
//   try {
//     // Android 13 (API 33) needs runtime POST_NOTIFICATIONS permission
//     if (Platform.OS === "android" && Platform.Version >= 33) {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.log("[Permissions] POST_NOTIFICATIONS not granted");
//         // fallthrough to messaging().requestPermission() which may still return provisional/authorized on iOS
//       }
//     }

//     const authStatus = await messaging().requestPermission();
//     const enabled =
//       authStatus === AuthorizationStatus.AUTHORIZED ||
//       authStatus === AuthorizationStatus.PROVISIONAL;

//     console.log("[FCM] authorization status:", authStatus);
//     return enabled;
//   } catch (err) {
//     console.warn("[requestUserPermission] error:", err);
//     return false;
//   }
// }

// /**
//  * Placeholder: send FCM token to your backend (so your server can send pushes).
//  * Replace with actual API call.
//  */
// export async function sendTokenToServer(token: string) {
//     try {
//           const authToken = await storage.getAuthToken();
//           const userId = await storage.getUserId();
//           if (!authToken) return;
    
//           const response = await fetch('https://db.subspace.money/v1/graphql', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${authToken}`
//             },
//             body: JSON.stringify({
//               query: `
//                 mutation MyMutation(\$user_id: uuid = "", \$fcm_token: String = "") {
//                     insert_whatsub_fcm_token(objects: {user_id: \$user_id, fcm_token: \$fcm_token}, on_conflict: {constraint: whatsub_fcm_token_user_id_fcm_token_key, update_columns: fcm_token}) {
//                       affected_rows
//                     }
//                   }
//               `,
//               variables: {
//                 user_id: userId,
//                 fcm_token: token,
//               }
//             })
//           });
//         } catch (error) {
//           console.error('Error sending fcm token to server:', error);
//         }
// }