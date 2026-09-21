import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isUserId } from '@/lib/messages';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ConversationPlaceholderScreen() {
  const { conversationId } = useLocalSearchParams<{
    conversationId: string | string[];
  }>();
  const id = firstParam(conversationId);
  const isValid = Boolean(id && isUserId(id));

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Mensagem" onBack={() => router.back()} showBorder={false} />
      {isValid ? (
        <View style={styles.body}>
          <EmptyState
            title="Conversa aberta"
            description="Esta conversa foi criada. As mensagens ainda não aparecem neste ecrã."
          />
          <Text variant="caption" tone="secondary" style={styles.note}>
            O envio fica para o passo seguinte.
          </Text>
        </View>
      ) : (
        <EmptyState
          title="Conversa indisponível"
          description="Não encontrámos esta conversa."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.six,
  },
  note: {
    textAlign: 'center',
    paddingHorizontal: Spacing.five,
  },
});
