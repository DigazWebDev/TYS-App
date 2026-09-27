import { useEffect, useState } from 'react';
import { Image as ReactNativeImage, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Button, Text } from '@/components/ui';
import {
  POST_IMAGE_MIME_TYPES,
  POST_MEDIA_MAX_ITEMS,
  POST_MEDIA_MAX_VIDEOS,
  POST_VIDEO_MIME_TYPES,
} from '@/constants/post-media';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import {
  mergePostMediaDrafts,
  movePostMediaDraft,
  removePostMediaDraft,
  type IncomingPostMedia,
  type PostMediaDraft,
} from '@/lib/post-media-draft';

type PostMediaComposerProps = {
  items: PostMediaDraft[];
  disabled?: boolean;
  onChange: (items: PostMediaDraft[], notice: string | null) => void;
};

export function PostMediaComposer({
  items,
  disabled = false,
  onChange,
}: PostMediaComposerProps) {
  const tokens = useThemeTokens();
  const [activeIndex, setActiveIndex] = useState(0);
  const [offerSamples, setOfferSamples] = useState(false);
  const active = items[activeIndex] ?? items[0];
  const videoCount = items.filter((item) => item.kind === 'video').length;
  const remaining = POST_MEDIA_MAX_ITEMS - items.length;

  useEffect(() => {
    if (activeIndex > 0 && activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [activeIndex, items.length]);

  function applyIncoming(incoming: IncomingPostMedia[]) {
    const result = mergePostMediaDrafts(items, incoming);
    const added = result.items.length - items.length;
    if (added > 0) {
      setActiveIndex(items.length);
    }
    onChange(result.items, result.error);
  }

  async function pickFromLibrary() {
    if (disabled || remaining <= 0) {
      onChange(items, `Podes escolher até ${POST_MEDIA_MAX_ITEMS} ficheiros.`);
      return;
    }

    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setOfferSamples(true);
        onChange(
          items,
          'A galeria não autorizou o acesso. Podes escolher ficheiros ou usar os exemplos locais.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      applyIncoming(
        result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          pickerType: asset.type,
        })),
      );
    } catch {
      setOfferSamples(true);
      onChange(items, 'Não foi possível abrir a galeria. Podes usar os exemplos locais.');
    }
  }

  function useLocalSamples() {
    if (disabled || remaining <= 0) {
      onChange(items, `Podes escolher até ${POST_MEDIA_MAX_ITEMS} ficheiros.`);
      return;
    }

    applyIncoming(
      SAMPLE_IMAGES.map((asset, index) => {
        const resolved = ReactNativeImage.resolveAssetSource(asset);
        return {
          uri: resolved.uri,
          mimeType: 'image/png',
          fileName: `exemplo-0${index + 1}.png`,
          fileSize: null,
          pickerType: 'image' as const,
        };
      }),
    );
  }

  async function pickFromFiles() {
    if (disabled || remaining <= 0) {
      onChange(items, `Podes escolher até ${POST_MEDIA_MAX_ITEMS} ficheiros.`);
      return;
    }

    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: [...POST_IMAGE_MIME_TYPES, ...POST_VIDEO_MIME_TYPES],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      applyIncoming(
        result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.name,
          fileSize: asset.size,
        })),
      );
    } catch {
      setOfferSamples(true);
      onChange(items, 'Não foi possível abrir os ficheiros. Podes usar os exemplos locais.');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          onPress={() => {
            void pickFromLibrary();
          }}
          disabled={disabled || remaining <= 0}
          accessibilityLabel="Escolher da galeria"
          style={styles.action}
        >
          Galeria
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            void pickFromFiles();
          }}
          disabled={disabled || remaining <= 0}
          accessibilityLabel="Escolher ficheiros"
          style={styles.action}
        >
          Ficheiros
        </Button>
      </View>

      {offerSamples ? (
        <Button
          variant="secondary"
          onPress={useLocalSamples}
          disabled={disabled || remaining <= 0}
          accessibilityLabel="Usar fotografias de exemplo"
        >
          Exemplos locais
        </Button>
      ) : null}

      <Text variant="caption" tone="secondary">
        {items.length}/{POST_MEDIA_MAX_ITEMS} ficheiros · {videoCount}/{POST_MEDIA_MAX_VIDEOS} vídeos.
        A seleção fica neste ecrã.
      </Text>
      {items.some(
        (item) => item.mimeType === 'image/heic' || item.mimeType === 'image/heif',
      ) ? (
        <Text variant="caption" tone="secondary">
          HEIC e HEIF aparecem só nesta pré-visualização.
        </Text>
      ) : null}

      {active ? (
        <View
          style={[
            styles.preview,
            { backgroundColor: tokens.background.elevated },
          ]}
        >
          {active.kind === 'video' ? (
            <DraftVideo key={active.id} uri={active.uri} />
          ) : (
            <Image
              source={{ uri: active.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={active.fileName ?? 'Fotografia selecionada'}
            />
          )}
        </View>
      ) : null}

      {items.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {items.map((item, index) => {
              const selected = item.id === active?.id;
              return (
                <View key={item.id} style={styles.tileWrap}>
                  <Pressable
                    onPress={() => setActiveIndex(index)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.kind === 'video'
                        ? `Vídeo ${index + 1}`
                        : `Fotografia ${index + 1}`
                    }
                    accessibilityState={{ selected }}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: tokens.background.elevated,
                        borderColor: selected
                          ? tokens.accent.teal.default
                          : tokens.border.subtle,
                      },
                    ]}
                  >
                    {item.kind === 'image' ? (
                      <Image
                        source={{ uri: item.uri }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <SymbolView
                        name={playIcon}
                        size={22}
                        tintColor={tokens.text.primary}
                      />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const next = removePostMediaDraft(items, index);
                      const nextActive =
                        index < activeIndex
                          ? activeIndex - 1
                          : Math.min(activeIndex, Math.max(0, next.length - 1));
                      setActiveIndex(nextActive);
                      onChange(next, null);
                    }}
                    disabled={disabled}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover elemento ${index + 1}`}
                    style={[styles.remove, { backgroundColor: tokens.background.surface }]}
                  >
                    <SymbolView
                      name={removeIcon}
                      size={12}
                      tintColor={tokens.text.primary}
                    />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.reorder}>
            <Pressable
              onPress={() => {
                const next = movePostMediaDraft(items, activeIndex, -1);
                if (next !== items) {
                  setActiveIndex(activeIndex - 1);
                  onChange(next, null);
                }
              }}
              disabled={disabled || activeIndex <= 0}
              accessibilityRole="button"
              accessibilityLabel="Mover para trás"
              style={({ pressed }) => [
                styles.reorderButton,
                {
                  backgroundColor: tokens.background.surface,
                  borderColor: tokens.border.subtle,
                  opacity: disabled || activeIndex <= 0 ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <SymbolView name={backIcon} size={18} tintColor={tokens.text.primary} />
              <Text variant="meta">Para trás</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const next = movePostMediaDraft(items, activeIndex, 1);
                if (next !== items) {
                  setActiveIndex(activeIndex + 1);
                  onChange(next, null);
                }
              }}
              disabled={disabled || activeIndex >= items.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Mover para a frente"
              style={({ pressed }) => [
                styles.reorderButton,
                {
                  backgroundColor: tokens.background.surface,
                  borderColor: tokens.border.subtle,
                  opacity:
                    disabled || activeIndex >= items.length - 1
                      ? 0.4
                      : pressed
                        ? 0.7
                        : 1,
                },
              ]}
            >
              <Text variant="meta">Para a frente</Text>
              <SymbolView name={forwardIcon} size={18} tintColor={tokens.text.primary} />
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

function DraftVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls
    />
  );
}

const SAMPLE_IMAGES = [
  require('../../../assets/images/icon.png'),
  require('../../../assets/images/splash-icon.png'),
  require('../../../assets/images/logo-glow.png'),
] as const;

const removeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

const playIcon: SymbolViewProps['name'] = {
  ios: 'play.fill',
  android: 'play_arrow',
  web: 'play_arrow',
};

const backIcon: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
};

const forwardIcon: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  strip: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  tileWrap: {
    width: 76,
    height: 76,
  },
  tile: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorder: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reorderButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
