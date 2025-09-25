import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="language" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="savings" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="shared-subscription-settings" />
      <Stack.Screen name="quick-reply" />
      <Stack.Screen name="shared-subscriptions" />
      <Stack.Screen name="friends" />
      <Stack.Screen name="ai-mailbox" />
      <Stack.Screen name="order-history" />
      <Stack.Screen name="blogs" />
      <Stack.Screen name="help-support" />
      <Stack.Screen name="app-info" />
      <Stack.Screen name="team" />
    </Stack>
  );
}
