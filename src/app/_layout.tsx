import { Stack } from 'expo-router';

import { useAuthSession } from '@/hooks/use-auth-session';

export default function RootLayout() {
  const { isReady, isLoggedIn } = useAuthSession();

  if (!isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-story" />
        <Stack.Screen name="explore" />
        <Stack.Screen
          name="story/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
