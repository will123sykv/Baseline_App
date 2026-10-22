import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTransparent: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Log weight', presentation: 'modal' }} />
        <Stack.Screen name="step0" options={{ title: 'Step 0 check', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
