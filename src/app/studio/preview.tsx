import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image as RNImage,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { studioPulse } from '@/components/studio/studio-haptic';
import { StudioOverlay, type StudioSheetState } from '@/components/studio/StudioOverlay';
import {
  StudioCanvas,
  type StudioCanvasHandle,
  type StudioComposeDraft,
  type StudioElementCommit,
} from '@/components/studio/StudioCanvas';
import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { validateStudioUrl } from '@/lib/studio-link';
import { nextPhotoViewport } from '@/lib/studio-viewport';
import { getStudioDraft, replaceStudioElements } from '@/lib/studio-draft';
import {
  isStudioText,
  type StudioElement,
  type StudioLinkElement,
  type StudioMusicElement,
  type StudioStickerElement,
  type StudioTextAlign,
} from '@/types/studio';

const TEXT_COLORS = ['#FFFFFF', '#111213', '#F5D76E', '#FF5C5C', '#7EE0D6'] as const;
const TEXT_SIZES = [
  { label: 'Pequeno', value: 20 },
  { label: 'Médio', value: 32 },
  { label: 'Grande', value: 48 },
] as const;
const TEXT_ALIGNS: { label: string; value: StudioTextAlign }[] = [
  { label: 'Esq.', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Dir.', value: 'right' },
];

type PhotoSize = { width: number; height: number };
type StageSize = { width: number; height: number };
type PhotoFrame = { x: number; y: number; width: number; height: number };

export default function StudioPreviewScreen() {
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<StudioCanvasHandle>(null);
  const draft = getStudioDraft();
  const [elements, setElements] = useState<StudioElement[]>(() => draft?.elements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [compose, setCompose] = useState<StudioComposeDraft | null>(null);
  const [sheet, setSheet] = useState<StudioSheetState | null>(null);
  const sheetRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoViewport, setPhotoViewport] = useState<StageSize | null>(null);
  const [visibleStage, setVisibleStage] = useState<StageSize>({ width: 0, height: 0 });
  const [toolsHidden, setToolsHidden] = useState(false);
  const [natural, setNatural] = useState<PhotoSize | null>(null);
  const composeRef = useRef(compose);
  const cancelOnHide = useRef(false);
  const keyboardOpen = useRef(false);
  const cancelComposeRef = useRef<() => void>(() => undefined);
  const closeSheetRef = useRef<() => void>(() => undefined);
  composeRef.current = compose;
  sheetRef.current = sheet !== null;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (compose) {
          cancelComposeRef.current();
          return true;
        }
        if (sheetRef.current) {
          if (keyboardOpen.current) {
            Keyboard.dismiss();
            return true;
          }
          closeSheetRef.current();
          return true;
        }
        if (previewing) {
          setPreviewing(false);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [compose, previewing]),
  );

  const photoRect = useMemo(
    () =>
      containRect(
        photoViewport?.width ?? 0,
        photoViewport?.height ?? 0,
        natural?.width ?? 0,
        natural?.height ?? 0,
      ),
    [natural?.height, natural?.width, photoViewport?.height, photoViewport?.width],
  );
  const canvasWidth = photoViewport?.width ?? 0;
  const canvasHeight = photoViewport?.height ?? 0;

  useEffect(() => {
    if (!draft?.uri) {
      return undefined;
    }
    let active = true;
    RNImage.getSize(
      draft.uri,
      (width, height) => {
        if (active && width > 0 && height > 0) {
          setNatural({ width, height });
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [draft?.uri]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      keyboardOpen.current = true;
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpen.current = false;
      if (cancelOnHide.current) {
        cancelOnHide.current = false;
        setCompose(null);
      }
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function persist(next: StudioElement[]) {
    setElements(next);
    replaceStudioElements(next);
  }

  function nextZ() {
    return elements.reduce((highest, item) => Math.max(highest, item.zIndex), 0) + 1;
  }

  function rememberNatural(width: number, height: number) {
    setNatural((current) =>
      current?.width === width && current.height === height ? current : { width, height },
    );
  }

  function beginCompose(next: StudioComposeDraft) {
    setSelectedId(next.elementId);
    setPreviewing(false);
    setCompose(next);
    setNotice(null);
  }

  function startText(x: number, y: number) {
    beginCompose({
      elementId: null,
      mode: 'text',
      content: '',
      x,
      y,
      color: '#FFFFFF',
      fontSize: 32,
      align: 'center',
      background: false,
    });
  }

  function editElement(id: string) {
    const item = elements.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    if (isStudioText(item)) {
      beginCompose({
        elementId: item.id,
        mode: item.type,
        content: item.content,
        x: item.x,
        y: item.y,
        color: item.style.color,
        fontSize: item.style.fontSize,
        align: item.style.align,
        background: item.style.background,
      });
      return;
    }
    if (item.type === 'link') {
      setSheet({ kind: 'link', elementId: item.id, url: item.url, label: item.label });
      return;
    }
    if (item.type === 'music') {
      setSheet({
        kind: 'music',
        elementId: item.id,
        uri: item.uri,
        title: item.title,
        artist: item.artist,
        fileName: item.fileName,
        mimeType: item.mimeType,
      });
    }
  }

  function selectElement(id: string) {
    const zIndex = nextZ();
    setSelectedId(id);
    persist(elements.map((item) => (item.id === id ? { ...item, zIndex } : item)));
  }

  function commitCompose() {
    const current = composeRef.current;
    if (!current || current.content.trim().length === 0) {
      setCompose(null);
      return;
    }
    const content = current.content.trim();
    if (current.elementId) {
      persist(
        elements.map((item) => {
          if (item.id !== current.elementId || !isStudioText(item)) {
            return item;
          }
          return {
            ...item,
            content,
            style: {
              color: current.color,
              fontSize: current.fontSize,
              align: current.align,
              background: current.mode === 'text' && current.background,
            },
          };
        }),
      );
      setSelectedId(current.elementId);
    } else {
      const created: StudioElement = {
        id: createId(),
        type: current.mode,
        content,
        x: current.x,
        y: current.y,
        scale: 1,
        rotation: 0,
        zIndex: nextZ(),
        style: {
          color: current.color,
          fontSize: current.mode === 'emoji' ? 48 : current.fontSize,
          align: current.mode === 'emoji' ? 'center' : current.align,
          background: current.mode === 'text' && current.background,
        },
      };
      persist([...elements, created]);
      setSelectedId(created.id);
    }
    Keyboard.dismiss();
    setCompose(null);
  }

  function confirmCompose() {
    const current = composeRef.current;
    if (!current || current.content.trim().length === 0) {
      return;
    }
    studioPulse('confirm');
    commitCompose();
  }

  function finishCompose() {
    const current = composeRef.current;
    if (!current) {
      return;
    }
    if (current.content.trim().length === 0) {
      if (!current.elementId) {
        cancelCompose();
      }
      return;
    }
    confirmCompose();
  }

  function cancelCompose() {
    if (keyboardOpen.current) {
      cancelOnHide.current = true;
      Keyboard.dismiss();
      return;
    }
    setCompose(null);
  }
  cancelComposeRef.current = cancelCompose;

  function grabElement(id: string) {
    setToolsHidden(true);
    setSelectedId((current) => (current === id ? current : id));
  }

  function releaseGesture() {
    setToolsHidden(false);
  }

  function commitElement(next: StudioElementCommit) {
    const zIndex = nextZ();
    setSelectedId(next.id);
    persist(
      elements.map((item) =>
        item.id === next.id
          ? {
              ...item,
              x: next.x,
              y: next.y,
              scale: next.scale,
              rotation: next.rotation,
              zIndex,
            }
          : item,
      ),
    );
  }

  function duplicateSelected() {
    const item = elements.find((entry) => entry.id === selectedId);
    if (!item) {
      return;
    }
    const copy: StudioElement = {
      ...item,
      id: createId(),
      x: clampValue(item.x + 0.06, 0.08, 0.92),
      y: clampValue(item.y + 0.06, 0.08, 0.92),
      zIndex: nextZ(),
    };
    persist([...elements, copy]);
    setSelectedId(copy.id);
  }

  function deleteElement(id: string) {
    cancelOnHide.current = false;
    studioPulse('trash');
    persist(elements.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    if (composeRef.current?.elementId === id) {
      Keyboard.dismiss();
      setCompose(null);
    }
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }
    deleteElement(selectedId);
  }

  function closeSheet() {
    if (keyboardOpen.current) {
      Keyboard.dismiss();
    }
    setSheet(null);
  }
  closeSheetRef.current = closeSheet;

  function placeCenter() {
    return canvasRef.current?.visibleCenter() ?? { x: 0.5, y: 0.5 };
  }

  function startLink() {
    setSheet({ kind: 'link', elementId: null, url: '', label: '' });
  }

  function startMusic() {
    setSheet({
      kind: 'music',
      elementId: null,
      uri: '',
      title: '',
      artist: '',
      fileName: '',
      mimeType: null,
    });
  }

  function startStickers() {
    setSheet({ kind: 'stickers' });
  }

  function saveLink(value: { url: string; label: string }) {
    const current = sheet;
    if (!current || current.kind !== 'link') {
      return;
    }
    if (current.elementId) {
      persist(
        elements.map((item) =>
          item.id === current.elementId && item.type === 'link'
            ? { ...item, url: value.url, label: value.label }
            : item,
        ),
      );
      setSelectedId(current.elementId);
    } else {
      const center = placeCenter();
      const created: StudioLinkElement = {
        id: createId(),
        type: 'link',
        url: value.url,
        label: value.label,
        x: center.x,
        y: center.y,
        scale: 1,
        rotation: 0,
        zIndex: nextZ(),
      };
      persist([...elements, created]);
      setSelectedId(created.id);
    }
    studioPulse('confirm');
    closeSheet();
  }

  function saveMusic(value: {
    uri: string;
    title: string;
    artist: string;
    fileName: string;
    mimeType: string | null;
  }) {
    const current = sheet;
    if (!current || current.kind !== 'music') {
      return;
    }
    if (current.elementId) {
      persist(
        elements.map((item) =>
          item.id === current.elementId && item.type === 'music'
            ? { ...item, ...value }
            : item,
        ),
      );
      setSelectedId(current.elementId);
    } else {
      const center = placeCenter();
      const created: StudioMusicElement = {
        id: createId(),
        type: 'music',
        ...value,
        x: center.x,
        y: center.y,
        scale: 1,
        rotation: 0,
        zIndex: nextZ(),
      };
      persist([...elements, created]);
      setSelectedId(created.id);
    }
    studioPulse('confirm');
    closeSheet();
  }

  function pickSticker(stickerId: string) {
    const center = placeCenter();
    const created: StudioStickerElement = {
      id: createId(),
      type: 'sticker',
      stickerId,
      x: center.x,
      y: center.y,
      scale: 1,
      rotation: 0,
      zIndex: nextZ(),
    };
    persist([...elements, created]);
    setSelectedId(created.id);
    studioPulse('confirm');
    closeSheet();
  }

  async function openSelectedLink() {
    const item = elements.find((entry) => entry.id === selectedId);
    if (!item || item.type !== 'link') {
      return;
    }
    const checked = validateStudioUrl(item.url);
    if (!checked.ok) {
      setNotice(checked.error);
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(checked.url);
    } catch {
      setNotice('Não foi possível abrir o endereço.');
    }
  }

  function saveDraft() {
    replaceStudioElements(elements);
    setNotice('Guardado só nesta sessão. Fecha a app e o rascunho desaparece.');
  }

  function togglePreview() {
    Keyboard.dismiss();
    setCompose(null);
    setSelectedId(null);
    setPreviewing((current) => !current);
  }

  const selected = elements.find((item) => item.id === selectedId) ?? null;
  const trimmed = compose?.content.trim() ?? '';

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (compose) {
              cancelCompose();
              return;
            }
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={compose ? 'Cancelar escrita' : 'Voltar à câmara'}
          style={styles.iconButton}
        >
          <SymbolView name={backIcon} size={18} tintColor="#F4F6F6" />
        </Pressable>
        <View style={styles.headerSpacer} />
        {compose?.elementId && trimmed.length === 0 ? (
          <Pressable
            onPress={() => {
              if (compose.elementId) {
                deleteElement(compose.elementId);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Eliminar texto"
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>Eliminar</Text>
          </Pressable>
        ) : null}
        {compose ? (
          <Pressable
            onPress={finishCompose}
            accessibilityRole="button"
            accessibilityLabel="Confirmar texto"
            style={styles.iconButton}
          >
            <SymbolView name={confirmIcon} size={22} tintColor="#F4F6F6" />
          </Pressable>
        ) : (
          <Pressable
            onPress={togglePreview}
            disabled={!draft}
            accessibilityRole="button"
            accessibilityLabel={previewing ? 'Voltar a editar' : 'Pré-visualizar'}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>{previewing ? 'Editar' : 'Ver'}</Text>
          </Pressable>
        )}
        <View pointerEvents="none" style={styles.headerTitle}>
          <Text style={styles.title}>Studio</Text>
        </View>
      </View>

      {draft ? (
        <View
          style={styles.stage}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setVisibleStage((current) =>
              current.width === width && current.height === height ? current : { width, height },
            );
            setPhotoViewport((current) => nextPhotoViewport(current, { width, height }));
          }}
        >
          {compose ? (
            <Pressable
              style={styles.stageDismiss}
              onPress={finishCompose}
              accessibilityRole="button"
              accessibilityLabel="Confirmar texto"
            />
          ) : null}
          {photoRect ? (
            <StudioCanvas
              ref={canvasRef}
              uri={draft.uri}
              stageWidth={canvasWidth}
              stageHeight={canvasHeight}
              frame={photoRect}
              elements={elements}
              selectedId={selectedId}
              previewing={previewing}
              compose={compose}
              viewportHeight={visibleStage.height > 0 ? visibleStage.height : canvasHeight}
              inputInset={compose?.mode === 'text' ? 52 : 8}
              onComposeChange={(content) =>
                setCompose((current) => (current ? { ...current, content } : current))
              }
              onSelect={selectElement}
              onGrab={grabElement}
              onEdit={editElement}
              onBlankTap={startText}
              onCommit={commitElement}
              onDelete={deleteElement}
              onComposeOutside={finishCompose}
              onGestureEnd={releaseGesture}
              onNaturalSize={rememberNatural}
            />
          ) : (
            <Image
              source={{ uri: draft.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel="Fotografia do Studio"
              onLoad={(event) => {
                const width = event.source?.width ?? 0;
                const height = event.source?.height ?? 0;
                if (width > 0 && height > 0) {
                  rememberNatural(width, height);
                }
              }}
            />
          )}
          {compose?.mode === 'text' ? (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              style={styles.styleOverlay}
              contentContainerStyle={styles.styleBar}
            >
          {TEXT_COLORS.map((color) => {
            const active = compose.color === color;
            return (
              <Pressable
                key={color}
                onPress={() => setCompose({ ...compose, color })}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${color}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  active ? styles.swatchSelected : null,
                ]}
              />
            );
          })}
          {TEXT_SIZES.map((size) => {
            const active = compose.fontSize === size.value;
            return (
              <Pressable
                key={size.label}
                onPress={() => setCompose({ ...compose, fontSize: size.value })}
                accessibilityRole="button"
                accessibilityLabel={size.label}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? styles.chipSelected : null]}
              >
                <Text style={styles.chipLabel}>{size.label}</Text>
              </Pressable>
            );
          })}
          {TEXT_ALIGNS.map((align) => {
            const active = compose.align === align.value;
            return (
              <Pressable
                key={align.value}
                onPress={() => setCompose({ ...compose, align: align.value })}
                accessibilityRole="button"
                accessibilityLabel={align.label}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? styles.chipSelected : null]}
              >
                <Text style={styles.chipLabel}>{align.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setCompose({ ...compose, background: !compose.background })}
            accessibilityRole="button"
            accessibilityLabel="Fundo"
            accessibilityState={{ selected: compose.background }}
            style={[styles.chip, compose.background ? styles.chipSelected : null]}
          >
            <Text style={styles.chipLabel}>Fundo</Text>
          </Pressable>
            </ScrollView>
          ) : null}
          {previewing || toolsHidden || compose || !selected ? null : (
            <View style={styles.selectionOverlay}>
              {selected.type === 'sticker' ? null : (
                <ActionLabel label="Editar" onPress={() => editElement(selected.id)} />
              )}
              {selected.type === 'link' ? (
                <ActionLabel
                  label="Abrir"
                  onPress={() => {
                    void openSelectedLink();
                  }}
                />
              ) : null}
              <ActionLabel label="Duplicar" onPress={duplicateSelected} />
              <ActionLabel label="Eliminar" onPress={deleteSelected} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.missing}>
          <Text style={styles.missingText}>Não há fotografia para editar.</Text>
        </View>
      )}

      <View
        pointerEvents={previewing || compose ? 'none' : 'auto'}
        style={[
          styles.toolbar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            opacity: previewing || compose ? 0 : 1,
          },
        ]}
      >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tools}
          >
            <ToolButton
              label="Links"
              icon={linkToolIcon}
              active={sheet?.kind === 'link'}
              onPress={startLink}
            />
            <ToolButton
              label="Música"
              icon={musicToolIcon}
              active={sheet?.kind === 'music'}
              onPress={startMusic}
            />
            <ToolButton
              label="Stickers"
              icon={stickerToolIcon}
              active={sheet?.kind === 'stickers'}
              onPress={startStickers}
            />
          </ScrollView>
          <Pressable
            onPress={saveDraft}
            disabled={!draft}
            accessibilityRole="button"
            accessibilityLabel="Guardar rascunho"
            style={styles.save}
          >
            <Text style={styles.saveLabel}>Guardar rascunho</Text>
          </Pressable>
          <Text style={styles.note}>
            {notice ?? 'O rascunho fica só em memória, nesta sessão. Nada é publicado.'}
          </Text>
        </View>
      {sheet ? (
        <StudioOverlay
          sheet={sheet}
          bottomInset={insets.bottom}
          onClose={closeSheet}
          onSaveLink={saveLink}
          onSaveMusic={saveMusic}
          onPickSticker={pickSticker}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}

function ToolButton({
  label,
  icon,
  onPress,
  active = false,
}: {
  label: string;
  icon: SymbolViewProps['name'];
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tool,
        active ? styles.toolActive : null,
        pressed ? styles.toolPressed : null,
      ]}
    >
      <SymbolView name={icon} size={22} tintColor={active ? '#2BB8A8' : '#F4F6F6'} />
      <Text style={[styles.toolLabel, active ? styles.toolLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ActionLabel({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.action}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function containRect(stageWidth: number, stageHeight: number, imageWidth: number, imageHeight: number) {
  if (stageWidth <= 0 || stageHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }
  const stageRatio = stageWidth / stageHeight;
  const imageRatio = imageWidth / imageHeight;
  if (imageRatio > stageRatio) {
    const width = stageWidth;
    const height = stageWidth / imageRatio;
    return { x: 0, y: (stageHeight - height) / 2, width, height };
  }
  const height = stageHeight;
  const width = stageHeight * imageRatio;
  return { x: (stageWidth - width) / 2, y: 0, width, height };
}

function createId() {
  return `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const backIcon: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
};

const confirmIcon: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
};

const linkToolIcon: SymbolViewProps['name'] = {
  ios: 'link',
  android: 'link',
  web: 'link',
};

const musicToolIcon: SymbolViewProps['name'] = {
  ios: 'music.note',
  android: 'music_note',
  web: 'music_note',
};

const stickerToolIcon: SymbolViewProps['name'] = {
  ios: 'face.smiling',
  android: 'mood',
  web: 'mood',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#F4F6F6',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textButtonLabel: {
    color: '#F4F6F6',
    fontSize: 15,
  },
  styleBar: {
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    paddingHorizontal: Spacing.three,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#F4F6F6',
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  chipLabel: {
    color: '#F4F6F6',
    fontSize: 13,
  },
  stage: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  stageDismiss: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  styleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    maxHeight: 52,
    overflow: 'hidden',
    zIndex: 2,
    backgroundColor: 'rgba(11,14,16,0.72)',
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
    backgroundColor: '#0B0E10',
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    zIndex: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#F4F6F6',
    fontSize: 14,
  },
  tools: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  tool: {
    minWidth: 84,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
  },
  toolActive: {
    backgroundColor: 'rgba(43,184,168,0.16)',
  },
  toolPressed: {
    opacity: 0.6,
  },
  toolLabel: {
    color: '#F4F6F6',
    fontSize: 12,
  },
  toolLabelActive: {
    color: '#2BB8A8',
  },
  save: {
    alignSelf: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  saveLabel: {
    color: '#F4F6F6',
    fontSize: 14,
  },
  note: {
    color: 'rgba(244,246,246,0.62)',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    fontSize: 12,
    lineHeight: 16,
  },
});
