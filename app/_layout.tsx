import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, marginBottom: insets.bottom }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade_from_bottom',
            animationDuration: 300,
            statusBarStyle: 'light',
          }}
        />
      </KeyboardAvoidingView>
    </KeyboardProvider>
  );
}
