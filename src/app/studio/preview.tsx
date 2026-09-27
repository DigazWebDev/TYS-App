import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getStudioDraft } from '@/lib/studio-draft';
import type { StudioOverlayType } from '@/types/studio';

const TOOLS: {
  type: StudioOverlayType;
  label: string;
  icon: SymbolViewProps['name'];
}[] = [
  {
    type: 'text',
    label: 'Texto',
    icon: { ios: 'textformat', android: 'title', web: 'title' },
  },
  {
    type: 'link',
    label: 'Links',
    icon: { ios: 'link', android: 'link', web: 'link' },
  },
  {
    type: 'time-weather',
    label: 'Hora',
    icon: { ios: 'clock', android: 'schedule', web: 'schedule' },
  },
  {
    type: 'sticker',
    label: 'Stickers',
    icon: { ios: 'face.smiling', android: 'mood', web: 'mood' },
  },
  {
    type: 'emoji',
    label: 'Emojis',
    icon: { ios: 'smiley', android: 'sentiment_satisfied', web: 'sentiment_satisfied' },
  },
  {
    type: 'music',
    label: 'Música',
    icon: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  },
];

export default function StudioPreviewScreen() {
  const insets = useSafeAreaInsets();
  const draft = getStudioDraft();

  return (
    <View style={styles.root}>
      <View style={[styles.chrome, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar à câmara"
          style={styles.close}
        >
          <SymbolView name={closeIcon} size={16} tintColor="#F4F6F6" />
        </Pressable>
      </View>

      {draft ? (
        <Image
          source={{ uri: draft.uri }}
          style={styles.photo}
          contentFit="contain"
          accessibilityLabel="Fotografia do Studio"
        />
      ) : (
        <View style={styles.missing}>
          <Text style={styles.missingText}>
            Não há fotografia para pré-visualizar.
          </Text>
        </View>
      )}

      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.note}>
          Estas ferramentas ainda não estão disponíveis. Nada é publicado.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tools}
        >
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.type}
              disabled
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel={`${tool.label}, indisponível`}
              style={styles.tool}
            >
              <SymbolView name={tool.icon} size={20} tintColor="rgba(244,246,246,0.45)" />
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.unavailable}>Indisponível</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const closeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 2,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photo: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  missingText: {
    color: '#F4F6F6',
    textAlign: 'center',
  },
  toolbar: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
    backgroundColor: '#0B0E10',
  },
  note: {
    color: 'rgba(244,246,246,0.72)',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    fontSize: 13,
    lineHeight: 18,
  },
  tools: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  tool: {
    width: 84,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.72,
  },
  toolLabel: {
    color: 'rgba(244,246,246,0.55)',
    fontSize: 12,
  },
  unavailable: {
    color: 'rgba(244,246,246,0.4)',
    fontSize: 10,
  },
});
