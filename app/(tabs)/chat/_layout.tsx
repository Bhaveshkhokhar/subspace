// app/(tabs)/chat/_layout.tsx  (or wherever your ChatLayout lives)
import { Stack } from 'expo-router';
import { ChatSocketProvider } from '@/context/ChatSocketProvider';

export default function ChatLayout() {
  return (
    <ChatSocketProvider>
      <Stack screenOptions={{ headerShown: false ,contentStyle: { backgroundColor: '#0E0E0E' }}}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="group-info" />
        <Stack.Screen name="conversation" />
        <Stack.Screen name="welcome-message" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="expiry-verification" />
      </Stack>
    </ChatSocketProvider>
  );
}
