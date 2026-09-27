import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState, Header, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import type { AppNotification } from '@/types/notification';

type NotificationsStatus = 'loading' | 'ready';

const STATUS: NotificationsStatus = 'ready';
const ITEMS: AppNotification[] = [];

export default function NotificationsScreen() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Notificações"
        showBorder={false}
        onBack={() => router.back()}
      />
      <NotificationsBody status={STATUS} items={ITEMS} />
    </Screen>
  );
}

function NotificationsBody({
  status,
  items,
}: {
  status: NotificationsStatus;
  items: readonly AppNotification[];
}) {
  if (status === 'loading') {
    return <NotificationsLoading />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sem notificações"
        description="Likes, comentários, novos seguidores e mensagens vão aparecer aqui."
      />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} />
      ))}
    </View>
  );
}

function NotificationsLoading() {
  const tokens = useThemeTokens();
  const block = { backgroundColor: tokens.background.elevated };

  return (
    <View style={styles.loading} accessibilityLabel="A carregar notificações">
      <ActivityIndicator color={tokens.accent.teal.default} />
      <View style={[styles.line, block]} />
      <View style={[styles.line, block]} />
      <View style={[styles.lineShort, block]} />
    </View>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  return (
    <View
      style={styles.row}
      accessibilityRole="summary"
      accessibilityLabel={`${item.title}. ${item.body}`}
    >
      <View style={styles.copy}>
        <Text variant="meta">{item.title}</Text>
        <Text variant="caption" tone="secondary">
          {item.body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.two,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  copy: {
    gap: Spacing.one,
  },
  loading: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
    alignItems: 'center',
  },
  line: {
    alignSelf: 'stretch',
    height: 14,
    borderRadius: Radius.sm,
  },
  lineShort: {
    alignSelf: 'stretch',
    width: '55%',
    height: 14,
    borderRadius: Radius.sm,
  },
});
