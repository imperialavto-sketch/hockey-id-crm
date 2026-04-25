import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { theme } from '@/constants/theme';
import { isDemoMode } from '@/lib/config';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Введите email и пароль');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { loginWithEmailPassword } = await import('@/services/authService');
      const { mobileToken, user } = await loginWithEmailPassword(trimmedEmail, password);
      await login(mobileToken, user);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <ScreenContainer>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Вход</Text>
            <Text style={styles.subtitle}>Войдите как тренер</Text>

            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Пароль"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              secureTextEntry
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PrimaryButton
              title={loading ? 'Вход...' : 'Войти'}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password}
              style={styles.button}
            />

            {isDemoMode ? (
              <Text style={styles.hint}>
                Демо: coach@hockey.edu / admin123 (или учётная запись из базы школы)
              </Text>
            ) : (
              <Text style={styles.hint}>
                Введите email и пароль пользователя школы из CRM (роль тренера).
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl * 2,
  },
  title: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
});
