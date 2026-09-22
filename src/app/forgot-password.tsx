import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

import { Button, Header, Input, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { friendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const canSubmit = email.trim().length > 0;

  async function handleReset() {
    if (!canSubmit || submitting.current) {
      return;
    }

    submitting.current = true;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    submitting.current = false;
    setLoading(false);

    if (error) {
      Alert.alert(
        'Erro',
        friendlyAuthError(error, 'Não foi possível enviar o email. Tenta novamente.')
      );
      return;
    }

    Alert.alert(
      'Verifica o email',
      'Se existir uma conta com este email, enviaremos um link para repor a palavra-passe.'
    );
  }

  return (
    <Screen>
      <Header title="Palavra-passe" onBack={() => router.back()} showBorder={false} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text variant="body" tone="secondary">
            Indica o email da tua conta. Se estiver registado, recebes um link
            para escolheres uma nova palavra-passe.
          </Text>

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
          />

          <Button
            onPress={handleReset}
            loading={loading}
            disabled={!canSubmit}
          >
            Enviar link
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
