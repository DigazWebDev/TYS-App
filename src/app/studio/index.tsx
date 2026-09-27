import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useThemeTokens } from '@/hooks/use-theme';
import { openStudioPreview } from '@/lib/navigation';
import { setStudioPhoto } from '@/lib/studio-draft';

export default function StudioScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const capturing = useRef(false);
  const askedCamera = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setCameraReady(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || askedCamera.current) {
      return;
    }
    askedCamera.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  function openPhoto(uri: string) {
    setStudioPhoto(uri);
    openStudioPreview();
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing.current) {
      return;
    }
    capturing.current = true;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (picture?.uri) {
        setError(null);
        openPhoto(picture.uri);
      }
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : String(caught);
      setError(`Não foi possível tirar a foto. ${detail}`);
    } finally {
      capturing.current = false;
    }
  }

  async function openGallery() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      setError(null);
      openPhoto(result.assets[0].uri);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Não foi possível abrir a galeria.';
      Alert.alert('Galeria', detail);
    }
  }

  function toggleFacing() {
    setCameraReady(false);
    setMountError(null);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  const cameraGranted = Boolean(permission?.granted);
  const showCamera = cameraGranted && focused && mountError === null;

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        {showCamera ? (
          <CameraView
            key={facing}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
            onMountError={(event) => {
              setCameraReady(false);
              setMountError(event.message);
            }}
          />
        ) : (
          <View style={styles.fallback}>
            {!permission ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.fallbackText}>A preparar a câmara…</Text>
              </>
            ) : mountError ? (
              <>
                <Text style={styles.fallbackText}>Não foi possível iniciar a câmara.</Text>
                <Text selectable style={styles.diagnostic}>
                  {mountError}
                </Text>
                <Pressable
                  onPress={() => setMountError(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar a câmara outra vez"
                  style={styles.allowButton}
                >
                  <Text style={styles.allowText}>Tentar outra vez</Text>
                </Pressable>
              </>
            ) : !permission.granted && permission.canAskAgain ? (
              <>
                <Text style={styles.fallbackText}>
                  A câmara ainda não tem permissão.
                </Text>
                <Pressable
                  onPress={() => void requestPermission()}
                  accessibilityRole="button"
                  accessibilityLabel="Permitir câmara"
                  style={styles.allowButton}
                >
                  <Text style={styles.allowText}>Permitir câmara</Text>
                </Pressable>
              </>
            ) : !permission.granted ? (
              <Text style={styles.fallbackText}>
                A permissão da câmara foi recusada. Podes escolher uma fotografia na galeria.
              </Text>
            ) : (
              <Text style={styles.fallbackText}>A iniciar a câmara…</Text>
            )}
          </View>
        )}

        <View pointerEvents="box-none" style={[styles.chrome, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Fechar Studio"
            style={styles.roundButton}
          >
            <SymbolView name={closeIcon} size={16} tintColor="#FFFFFF" />
          </Pressable>
          {cameraGranted ? (
            <Pressable
              onPress={toggleFacing}
              accessibilityRole="button"
              accessibilityLabel={
                facing === 'back' ? 'Usar câmara frontal' : 'Usar câmara traseira'
              }
              style={styles.roundButton}
            >
              <SymbolView name={flipIcon} size={18} tintColor="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.roundButton} />
          )}
        </View>

        {showCamera ? (
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
          styles.galleryBar,
          {
            backgroundColor: tokens.background.surface,
            borderTopColor: tokens.border.subtle,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {error ? (
          <Text variant="caption" selectable style={[styles.error, { color: tokens.text.primary }]}>
            {error}
          </Text>
        ) : (
          <Text variant="caption" tone="secondary" style={styles.galleryHint}>
            Escolhe uma fotografia que já tenhas no telemóvel.
          </Text>
        )}
        <Pressable
          onPress={() => void openGallery()}
          accessibilityRole="button"
          accessibilityLabel="Abrir galeria"
          style={({ pressed }) => [
            styles.galleryButton,
            {
              borderColor: tokens.border.subtle,
              backgroundColor: tokens.background.elevated,
            },
            pressed && styles.galleryPressed,
          ]}
        >
          <Text variant="meta">Abrir galeria</Text>
        </Pressable>
      </View>
    </View>
  );
}

const closeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

const flipIcon: SymbolViewProps['name'] = {
  ios: 'arrow.triangle.2.circlepath.camera',
  android: 'cameraswitch',
  web: 'cameraswitch',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  stage: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  fallbackText: {
    color: '#F4F6F6',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  diagnostic: {
    color: 'rgba(244,246,246,0.72)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  allowButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  allowText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  galleryBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  galleryHint: {
    textAlign: 'center',
  },
  galleryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPressed: {
    opacity: 0.72,
  },
  error: {
    textAlign: 'center',
  },
});
