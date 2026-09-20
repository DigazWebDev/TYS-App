import { StyleSheet, View } from 'react-native';

import { EmptyState, Header, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Mensagens" showBorder={false} />
      <View style={styles.body}>
        <EmptyState
          title="Mensagens privadas"
          description="As conversas ainda não estão ligadas à base de dados. Não enviamos mensagens fictícias — o schema de DMs, follows e presença fica pendente de aprovação."
        />
        <Text variant="caption" tone="secondary" style={styles.note}>
          Quando o schema for aprovado, esta área passa a listar conversas reais.
        </Text>
      </View>
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
