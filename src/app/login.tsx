import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { type Href, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';

import { BrandWordmark } from '@/components/BrandWordmark';
import { Button, Divider, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useThemeName, useThemeTokens } from '@/hooks/use-theme';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const themeName = useThemeName();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleLogin() {
    if (!canSubmit || submitting.current) {
      if (!canSubmit) {
        Alert.alert('Erro', 'Preenche o email e a password.');
      }
      return;
    }

    submitting.current = true;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    submitting.current = false;
    setLoading(false);

    if (error) {
      Alert.alert('Erro ao entrar', error.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <Atmosphere />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
        >
          <View style={styles.brand}>
            <BrandWordmark size="hero" />
            <Text variant="body" tone="secondary" style={styles.tagline}>
              Partilha o que te move.{'\n'}Conecta com o que importa.
            </Text>
          </View>

          <View style={styles.form}>
            <Text variant="overline" tone="secondary">
              ENTRA NA TYS
            </Text>

            <View style={styles.fields}>
              <Input
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email"
                left={<FieldIcon name={{ ios: 'envelope', android: 'mail', web: 'mail' }} />}
              />

              <Input
                placeholder="Password"
                secureTextEntry={!passwordVisible}
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
                left={<FieldIcon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} />}
                right={
                  <Pressable
                    onPress={() => setPasswordVisible((value) => !value)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisible ? 'Esconder password' : 'Mostrar password'
                    }
                  >
                    <FieldIcon
                      name={
                        passwordVisible
                          ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                          : { ios: 'eye', android: 'visibility', web: 'visibility' }
                      }
                    />
                  </Pressable>
                }
              />
            </View>

            <Button
              onPress={handleLogin}
              loading={loading}
              disabled={!canSubmit}
              accessibilityLabel="Entrar"
              style={styles.submit}
            >
              Entrar  →
            </Button>

            <Pressable
              onPress={() => router.push('/forgot-password' as Href)}
              accessibilityRole="link"
              accessibilityLabel="Esqueceste-te da palavra-passe?"
              hitSlop={8}
              style={({ pressed }) => [styles.centerLink, pressed && styles.pressed]}
            >
              <Text variant="caption" tone="secondary">
                Esqueceste-te da palavra-passe?
              </Text>
            </Pressable>

            <Divider label="ou" style={styles.separator} />

            <Pressable
              onPress={() => router.push('/register')}
              accessibilityRole="link"
              accessibilityLabel="Criar conta"
              hitSlop={8}
              style={({ pressed }) => [styles.centerLink, pressed && styles.pressed]}
            >
              <Text variant="meta" tone="secondary" style={styles.centerText}>
                Não tens conta?{' '}
                <Text variant="meta" tone="accent">
                  Criar conta  →
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Atmosphere() {
  const tokens = useThemeTokens();
  const themeName = useThemeName();
  const mist =
    themeName === 'dark' ? tokens.accent.teal.muted : tokens.background.elevated;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.ribbonA, { backgroundColor: mist }]} />
      <View
        style={[
          styles.ribbonB,
          {
            backgroundColor:
              themeName === 'dark'
                ? tokens.accent.teal.muted
                : tokens.background.surface,
          },
        ]}
      />
      <View
        style={[
          styles.ribbonC,
          { backgroundColor: tokens.background.elevated },
        ]}
      />
    </View>
  );
}

function FieldIcon({ name }: { name: SymbolViewProps['name'] }) {
  const tokens = useThemeTokens();

  return (
    <SymbolView
      name={name}
      size={16}
      weight="regular"
      tintColor={tokens.text.secondary}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'flex-start',
    paddingTop: Spacing.two,
  },
  tagline: {
    marginTop: Spacing.four,
    lineHeight: 22,
  },
  form: {
    paddingBottom: Spacing.two,
  },
  fields: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  submit: {
    marginTop: Spacing.four,
  },
  centerLink: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
  separator: {
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.72,
  },
  ribbonA: {
    position: 'absolute',
    width: 560,
    height: 220,
    borderRadius: 140,
    top: 72,
    right: -220,
    opacity: 0.55,
    transform: [{ rotate: '-28deg' }],
  },
  ribbonB: {
    position: 'absolute',
    width: 620,
    height: 200,
    borderRadius: 140,
    top: 168,
    right: -260,
    opacity: 0.4,
    transform: [{ rotate: '-28deg' }],
  },
  ribbonC: {
    position: 'absolute',
    width: 480,
    height: 180,
    borderRadius: 120,
    bottom: -80,
    left: -200,
    opacity: 0.28,
    transform: [{ rotate: '16deg' }],
  },
});
