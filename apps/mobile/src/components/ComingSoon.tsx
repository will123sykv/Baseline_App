import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space, type } from '@/theme';
import { Card } from './ui';

/** Placeholder for tabs whose phase hasn't been built yet. */
export function ComingSoon({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <Text style={[type.title, { color: colors.text }]}>{title}</Text>
        <Card title={phase}>
          {items.map((item) => (
            <View key={item} style={{ flexDirection: 'row', gap: space.sm }}>
              <Text style={{ color: colors.textFaint }}>•</Text>
              <Text style={[type.body, { color: colors.textDim, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
