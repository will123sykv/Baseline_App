import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';
import { Text, type ColorValue } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';
import { colors } from '@/theme';

function icon(name: SymbolViewProps['name'], fallback: string) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} tintColor={color} size={22} fallback={<Text style={{ color, fontSize: 16 }}>{fallback}</Text>} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('gauge.with.needle', '◎') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('fork.knife', '◍') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: icon('dumbbell', '▤') }} />
      <Tabs.Screen name="trends" options={{ title: 'Trends', tabBarIcon: icon('chart.xyaxis.line', '∿') }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('bubble.left.and.text.bubble.right', '…') }} />
    </Tabs>
  );
}
