import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { RECENT_STORY_PHOTO_COUNT, STORY_IMAGE_MAX_BYTES, STORY_VIDEO_MAX_BYTES } from '@/constants/stories';
import { useThemeTokens } from '@/hooks/use-theme';
import { mediaKindFromPicker, publishStory } from '@/lib/stories';

type Draft = {
  uri: string;
  kind: 'image' | 'video';
  mimeType?: string;
};

type RecentPhoto = {
  id: string;
  uri: string;
};

type GalleryStatus = 'loading' | 'ready' | 'denied' | 'unavailable';

export default function CreateStoryScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [galleryStatus, setGalleryStatus] = useState<GalleryStatus>('loading');
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capturing = useRef(false);
  const askedCamera = useRef(false);

  useEffect(() => {
    if (!permission || permission.granted || askedCamera.current) {
      return;
    }
    askedCamera.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const MediaLibrary = await import('expo-media-library');
        const response = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
        if (!active) {
          return;
        }
        if (!response.granted) {
          setGalleryStatus('denied');
          return;
        }

        const assets = await new MediaLibrary.Query()
          .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
          .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
          .limit(RECENT_STORY_PHOTO_COUNT)
          .exe();

        const recent = (
          await Promise.all(
            assets.map(async (asset) => {
              try {
                const uri = await asset.getUri();
                return uri ? { id: asset.id, uri } : null;
              } catch {
                return null;
              }
            })
          )
        ).filter((photo): photo is RecentPhoto => photo !== null);

        if (!active) {
          return;
        }
        setPhotos(recent);
        setGalleryStatus('ready');
      } catch {
        if (active) {
          setGalleryStatus('unavailable');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing.current) {
      return;
    }
    capturing.current = true;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (picture?.uri) {
        setError(null);
        setDraft({ uri: picture.uri, kind: 'image', mimeType: 'image/jpeg' });
      }
    } catch {
      setError('Não foi possível tirar a foto.');
    } finally {
      capturing.current = false;
    }
  }

  async function importFile() {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      const kind = mediaKindFromPicker(asset.mimeType, asset.uri);
      const limit = kind === 'video' ? STORY_VIDEO_MAX_BYTES : STORY_IMAGE_MAX_BYTES;
      if (!kind || (typeof asset.size === 'number' && asset.size > limit)) {
        setError(!kind ? 'Não foi possível carregar este ficheiro.' : 'Este ficheiro é demasiado grande.');
        return;
      }
      setError(null);
      setDraft({
        uri: asset.uri,
        kind,
        mimeType: asset.mimeType ?? undefined,
      });
    } catch {
      Alert.alert('Ficheiros', 'Não foi possível abrir o seletor de ficheiros.');
    }
  }

  async function publish() {
    if (!draft || publishing) {
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await publishStory({
        uri: draft.uri,
        type: draft.kind,
        mimeType: draft.mimeType,
      });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível publicar a story.');
      setPublishing(false);
    }
  }

  if (draft) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.background.canvas }]}>
        <View style={styles.preview}>
          {draft.kind === 'video' ? (
            <DraftVideo uri={draft.uri} />
          ) : (
            <Image source={{ uri: draft.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
        </View>
        <View
          style={[
            styles.previewBar,
            {
              backgroundColor: tokens.background.surface,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {error ? (
            <Text style={[styles.error, { color: tokens.text.primary }]}>{error}</Text>
          ) : null}
          <View style={styles.previewActions}>
            <Pressable
              onPress={() => {
                if (publishing) return;
                setDraft(null);
                setError(null);
              }}
              disabled={publishing}
              accessibilityRole="button"
              accessibilityLabel="Voltar à câmara"
              style={styles.secondaryAction}
            >
              <Text style={{ color: tokens.text.primary, fontWeight: '600' }}>Voltar</Text>
            </Pressable>
            <Pressable
              onPress={() => void publish()}
              disabled={publishing}
              accessibilityRole="button"
              accessibilityLabel="Publicar story"
              style={[styles.publish, { backgroundColor: tokens.accent.teal.default }]}
            >
              {publishing ? (
                <ActivityIndicator color={tokens.text.onAccent} />
              ) : (
                <Text style={{ color: tokens.text.onAccent, fontWeight: '700' }}>Publicar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const galleryMessage =
    galleryStatus === 'denied'
      ? 'Sem acesso à galeria. Podes usar a câmara ou importar um ficheiro.'
      : galleryStatus === 'unavailable'
        ? 'As fotos recentes não estão disponíveis nesta versão. A câmara e a importação de ficheiros continuam disponíveis.'
        : galleryStatus === 'ready' && photos.length === 0
          ? 'Ainda não há fotos recentes.'
          : null;

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <View style={styles.cameraStage}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackText}>
              {permission && !permission.granted
                ? 'A câmara não está disponível. Podes escolher uma foto recente ou importar um ficheiro.'
                : 'A preparar a câmara…'}
            </Text>
            {permission && !permission.granted && permission.canAskAgain ? (
              <Pressable onPress={() => void requestPermission()} style={styles.allowButton}>
                <Text style={styles.allowText}>Permitir câmara</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View pointerEvents="box-none" style={[styles.cameraChrome, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={styles.roundButton}
          >
            <SymbolView name={closeIcon} size={16} tintColor="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => void importFile()}
            accessibilityRole="button"
            accessibilityLabel="Importar ficheiro"
            style={styles.roundButton}
          >
            <SymbolView name={folderIcon} size={18} tintColor="#FFFFFF" />
          </Pressable>
        </View>

        {permission?.granted ? (
          <View style={styles.shutterRow} pointerEvents="box-none">
            <Pressable
              onPress={() => void takePhoto()}
              disabled={!cameraReady}
              accessibilityRole="button"
              accessibilityLabel="Tirar fotografia"
              style={[styles.shutter, !cameraReady && styles.shutterDisabled]}
            >
              <View style={styles.shutterCore} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.strip,
          {
            backgroundColor: tokens.background.surface,
            borderTopColor: tokens.border.subtle,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {galleryStatus === 'loading' ? (
          <ActivityIndicator color={tokens.accent.teal.default} />
        ) : galleryMessage ? (
          <Text style={[styles.stripMessage, { color: tokens.text.secondary }]}>{galleryMessage}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => {
                  setError(null);
                  setDraft({ uri: photo.uri, kind: 'image' });
                }}
                accessibilityRole="button"
                accessibilityLabel="Usar foto recente"
              >
                <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}
        {error ? <Text style={[styles.error, { color: tokens.text.primary }]}>{error}</Text> : null}
      </View>
    </View>
  );
}

function DraftVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (next) => {
    next.loop = true;
    next.play();
  });

  return (
    <VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
  );
}

const closeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

const folderIcon: SymbolViewProps['name'] = {
  ios: 'folder',
  android: 'folder',
  web: 'folder',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cameraStage: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  fallbackText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  allowButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  allowText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cameraChrome: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  shutterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  shutterCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  strip: {
    minHeight: 118,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingTop: 12,
  },
  stripRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumb: {
    width: 72,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#1E2326',
  },
  stripMessage: {
    paddingHorizontal: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  preview: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publish: {
    flex: 1.4,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
