import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Упс!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Экран не найден.</Text>
        <Link href="/" asChild>
          <Pressable>
            <Text style={styles.link}>На главную</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  link: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
});
