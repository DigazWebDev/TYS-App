import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type KeyboardEvent,
  type TextInputProps,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LinkMark, MusicMark, StickerMark } from '@/components/studio/StudioMarks';
import { STUDIO_STICKERS } from '@/components/studio/studio-stickers';
import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { titleFromFileName, validateStudioUrl } from '@/lib/studio-link';

const checkIcon: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
};

const closeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

export type LinkSheetState = {
  kind: 'link';
  elementId: string | null;
  url: string;
  label: string;
};

export type MusicSheetState = {
  kind: 'music';
  elementId: string | null;
  uri: string;
  title: string;
  artist: string;
  fileName: string;
  mimeType: string | null;
};

export type StudioSheetState = LinkSheetState | MusicSheetState | { kind: 'stickers' };

type StudioOverlayProps = {
  sheet: StudioSheetState;
  bottomInset: number;
  onClose: () => void;
  onSaveLink: (value: { url: string; label: string }) => void;
  onSaveMusic: (value: {
    uri: string;
    title: string;
    artist: string;
    fileName: string;
    mimeType: string | null;
  }) => void;
  onPickSticker: (stickerId: string) => void;
};

const FIELD_CLEARANCE = 80;

export function StudioOverlay({
  sheet,
  bottomInset,
  onClose,
  onSaveLink,
  onSaveMusic,
  onPickSticker,
}: StudioOverlayProps) {
  const tokens = useThemeTokens();
  const lift = useSharedValue(0);
  const fieldLift = useSharedValue(0);
  const bottomPad = useSharedValue(Math.max(bottomInset, 12));
  const keyboardOpen = useRef(false);
  const keyboardTopRef = useRef(0);
  const extraRef = useRef(0);
  const focusedRef = useRef<View | null>(null);
  const ticketRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardTop, setKeyboardTop] = useState(0);

  const revealFocused = useCallback(() => {
    const node = focusedRef.current;
    const top = keyboardTopRef.current;
    if (!node || top <= 0) {
      return;
    }
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    node.measureInWindow((_x, y, _width, height) => {
      if (ticket !== ticketRef.current || height <= 0) {
        return;
      }
      const overflow = y + height + FIELD_CLEARANCE - top;
      const next = Math.max(0, extraRef.current + overflow);
      extraRef.current = next;
      fieldLift.value = withTiming(next, { duration: 180 });
    });
  }, [fieldLift]);

  const scheduleReveal = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(revealFocused, 320);
  }, [revealFocused]);

  function onFocusField(node: View | null) {
    focusedRef.current = node;
    scheduleReveal();
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const showName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showName, (event: KeyboardEvent) => {
      keyboardOpen.current = true;
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardTop(event.endCoordinates.screenY);
      const windowHeight = Dimensions.get('window').height;
      const overlap = Math.max(0, windowHeight - event.endCoordinates.screenY);
      lift.value = withTiming(overlap, { duration: 120 });
      bottomPad.value = withTiming(8, { duration: 120 });
      scheduleReveal();
    });
    const hide = Keyboard.addListener(hideName, () => {
      keyboardOpen.current = false;
      keyboardTopRef.current = 0;
      setKeyboardTop(0);
      extraRef.current = 0;
      ticketRef.current += 1;
      fieldLift.value = withTiming(0, { duration: 140 });
      lift.value = withTiming(0, { duration: 140 });
      bottomPad.value = withTiming(Math.max(bottomInset, 12), { duration: 140 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [bottomInset, bottomPad, fieldLift, lift, scheduleReveal]);

  const cardMotion = useAnimatedStyle(() => ({
    marginBottom: bottomPad.value,
    transform: [{ translateY: -(lift.value + fieldLift.value) }],
  }));

  const windowHeight = Dimensions.get('window').height;
  const bodyMaxHeight =
    keyboardTop > 0 ? Math.max(160, keyboardTop - 96) : Math.round(windowHeight * 0.58);

  function onScrim() {
    if (keyboardOpen.current) {
      Keyboard.dismiss();
    }
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.scrim}
        onPress={onScrim}
        accessibilityRole="button"
        accessibilityLabel="Fechar teclado"
      />
      <Animated.View
        entering={SlideInDown.duration(220)}
        exiting={SlideOutDown.duration(170)}
        style={styles.shell}
      >
        <Animated.View
          style={[
            styles.card,
            cardMotion,
            { backgroundColor: tokens.background.surface },
          ]}
        >
          {sheet.kind === 'link' ? (
            <LinkForm
              initial={sheet}
              tint={tokens.text.primary}
              muted={tokens.text.secondary}
              accent={tokens.accent.teal.default}
              field={tokens.background.elevated}
              bodyMaxHeight={bodyMaxHeight}
              onFocusField={onFocusField}
              onClose={onClose}
              onSave={onSaveLink}
            />
          ) : null}
          {sheet.kind === 'music' ? (
            <MusicForm
              initial={sheet}
              tint={tokens.text.primary}
              muted={tokens.text.secondary}
              accent={tokens.accent.teal.default}
              field={tokens.background.elevated}
              bodyMaxHeight={bodyMaxHeight}
              onFocusField={onFocusField}
              onClose={onClose}
              onSave={onSaveMusic}
            />
          ) : null}
          {sheet.kind === 'stickers' ? (
            <StickerGrid
              tint={tokens.text.primary}
              muted={tokens.text.secondary}
              onClose={onClose}
              onPick={onPickSticker}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function LinkForm({
  initial,
  tint,
  muted,
  accent,
  field,
  bodyMaxHeight,
  onFocusField,
  onClose,
  onSave,
}: {
  initial: LinkSheetState;
  tint: string;
  muted: string;
  accent: string;
  field: string;
  bodyMaxHeight: number;
  onFocusField: (node: View | null) => void;
  onClose: () => void;
  onSave: (value: { url: string; label: string }) => void;
}) {
  const [url, setUrl] = useState(initial.url);
  const [label, setLabel] = useState(initial.label);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const previewUrl = validateStudioUrl(url);

  function confirm() {
    const checked = validateStudioUrl(url);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    onSave({ url: checked.url, label: label.trim() });
  }

  function focusField(key: string, node: View | null) {
    onFocusField(node);
    const y = offsets.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }

  return (
    <View style={styles.form}>
      <SheetHeader
        title={initial.elementId ? 'Editar link' : 'Link'}
        tint={tint}
        onClose={onClose}
        onConfirm={confirm}
      />
      <FormScroll maxHeight={bodyMaxHeight} scrollRef={scrollRef}>
        {previewUrl.ok ? (
          <View style={styles.preview}>
            <LinkMark url={previewUrl.url} label={label} />
          </View>
        ) : null}
        <EditorField
          label="Endereço"
          value={url}
          onChangeText={(next) => {
            setUrl(next);
            setError(null);
          }}
          onClear={() => {
            setUrl('');
            setError(null);
          }}
          onBlockLayout={(y) => {
            offsets.current.url = y;
          }}
          onFocusField={(node) => focusField('url', node)}
          placeholder="https://exemplo.com"
          keyboardType="url"
          autoFocus={initial.elementId === null}
          error={error}
          tint={tint}
          muted={muted}
          accent={accent}
          field={field}
          accessibilityLabel="Endereço do link"
        />
        <EditorField
          label="Texto apresentado"
          value={label}
          onChangeText={setLabel}
          onClear={() => setLabel('')}
          onBlockLayout={(y) => {
            offsets.current.label = y;
          }}
          onFocusField={(node) => focusField('label', node)}
          placeholder="Opcional. Sem texto, mostra o domínio."
          maxLength={80}
          tint={tint}
          muted={muted}
          accent={accent}
          field={field}
          accessibilityLabel="Texto apresentado do link"
        />
      </FormScroll>
    </View>
  );
}

function MusicForm({
  initial,
  tint,
  muted,
  accent,
  field,
  bodyMaxHeight,
  onFocusField,
  onClose,
  onSave,
}: {
  initial: MusicSheetState;
  tint: string;
  muted: string;
  accent: string;
  field: string;
  bodyMaxHeight: number;
  onFocusField: (node: View | null) => void;
  onClose: () => void;
  onSave: StudioOverlayProps['onSaveMusic'];
}) {
  const titleRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [uri, setUri] = useState(initial.uri);
  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const [fileName, setFileName] = useState(initial.fileName);
  const [mimeType, setMimeType] = useState<string | null>(initial.mimeType);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  function focusField(key: string, node: View | null) {
    onFocusField(node);
    const y = offsets.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }

  async function pickAudio() {
    if (picking) {
      return;
    }
    setPicking(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset?.uri) {
        setError('Não foi possível ler o ficheiro.');
        return;
      }
      if (asset.mimeType && !asset.mimeType.startsWith('audio/')) {
        setError('Esse ficheiro não é áudio.');
        return;
      }
      setUri(asset.uri);
      setFileName(asset.name);
      setMimeType(asset.mimeType ?? null);
      setTitle((current) => (current.trim() ? current : titleFromFileName(asset.name)));
      requestAnimationFrame(() => titleRef.current?.focus());
    } catch {
      setError('Não foi possível abrir os ficheiros de áudio.');
    } finally {
      setPicking(false);
    }
  }

  function confirm() {
    if (!uri) {
      setError('Escolhe um ficheiro de áudio.');
      return;
    }
    const nextTitle = title.trim() || titleFromFileName(fileName);
    onSave({
      uri,
      title: nextTitle,
      artist: artist.trim(),
      fileName: fileName || nextTitle,
      mimeType,
    });
  }

  return (
    <View style={styles.form}>
      <SheetHeader
        title={initial.elementId ? 'Editar música' : 'Música'}
        tint={tint}
        onClose={onClose}
        onConfirm={confirm}
      />
      <FormScroll maxHeight={bodyMaxHeight} scrollRef={scrollRef}>
      <Pressable
        onPress={() => {
          void pickAudio();
        }}
        disabled={picking}
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Substituir áudio' : 'Escolher áudio'}
        style={[styles.pick, { backgroundColor: field }]}
      >
        <Text style={[styles.pickLabel, { color: accent }]}>
          {uri ? 'Substituir áudio' : 'Escolher áudio'}
        </Text>
        <Text numberOfLines={1} style={[styles.pickFile, { color: tint }]}>
          {fileName || 'Nenhum ficheiro escolhido'}
        </Text>
      </Pressable>
      <Text style={[styles.note, { color: muted }]}>
        A pré-escuta ainda não está disponível nesta versão. O ficheiro fica só neste rascunho.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.preview}>
        <MusicMark title={title || (fileName ? titleFromFileName(fileName) : 'Áudio')} artist={artist} />
      </View>
      <EditorField
        inputRef={titleRef}
        label="Título"
        value={title}
        onChangeText={setTitle}
        onClear={() => setTitle('')}
        onBlockLayout={(y) => {
          offsets.current.title = y;
        }}
        onFocusField={(node) => focusField('title', node)}
        placeholder="Título"
        maxLength={80}
        tint={tint}
        muted={muted}
        accent={accent}
        field={field}
        accessibilityLabel="Título da música"
      />
      <EditorField
        label="Artista"
        value={artist}
        onChangeText={setArtist}
        onClear={() => setArtist('')}
        onBlockLayout={(y) => {
          offsets.current.artist = y;
        }}
        onFocusField={(node) => focusField('artist', node)}
        placeholder="Opcional"
        maxLength={80}
        tint={tint}
        muted={muted}
        accent={accent}
        field={field}
        accessibilityLabel="Artista"
      />
      </FormScroll>
    </View>
  );
}

function StickerGrid({
  tint,
  muted,
  onClose,
  onPick,
}: {
  tint: string;
  muted: string;
  onClose: () => void;
  onPick: (stickerId: string) => void;
}) {
  return (
    <View style={styles.form}>
      <SheetHeader title="Stickers" tint={tint} onClose={onClose} />
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {STUDIO_STICKERS.map((sticker) => (
          <Pressable
            key={sticker.id}
            onPress={() => onPick(sticker.id)}
            accessibilityRole="button"
            accessibilityLabel={`Inserir ${sticker.label}`}
            style={({ pressed }) => [styles.cell, pressed ? styles.pressed : null]}
          >
            <StickerMark stickerId={sticker.id} size={42} />
            <Text style={[styles.cellLabel, { color: muted }]}>{sticker.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function EditorField({
  inputRef,
  label,
  value,
  onChangeText,
  onClear,
  onBlockLayout,
  onFocusField,
  placeholder,
  error,
  tint,
  muted,
  accent,
  field,
  accessibilityLabel,
  keyboardType = 'default',
  autoFocus = false,
  maxLength,
}: {
  inputRef?: Ref<TextInput>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onBlockLayout?: (y: number) => void;
  onFocusField?: (node: View | null) => void;
  placeholder: string;
  error?: string | null;
  tint: string;
  muted: string;
  accent: string;
  field: string;
  accessibilityLabel: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const blockRef = useRef<View>(null);
  return (
    <View
      ref={blockRef}
      collapsable={false}
      style={styles.fieldBlock}
      onLayout={(event) => onBlockLayout?.(event.nativeEvent.layout.y)}
    >
      <Text style={[styles.fieldLabel, { color: muted }]}>{label}</Text>
      <View style={styles.inputWrap} collapsable={false}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => onFocusField?.(blockRef.current)}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={muted}
          selectionColor={accent}
          maxLength={maxLength}
          contextMenuHidden={false}
          underlineColorAndroid="transparent"
          accessibilityLabel={accessibilityLabel}
          style={[
            styles.input,
            {
              color: tint,
              backgroundColor: field,
              paddingRight: value.length > 0 ? 48 : 14,
              borderColor: error ? '#C94B4B' : 'transparent',
            },
          ]}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Limpar ${label}`}
            style={styles.clear}
          >
            <SymbolView name={closeIcon} size={14} tintColor={muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function FormScroll({
  maxHeight,
  scrollRef,
  children,
}: {
  maxHeight: number;
  scrollRef: Ref<ScrollView | null>;
  children: ReactNode;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      style={{ maxHeight }}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
      removeClippedSubviews={false}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formBody}
    >
      {children}
    </ScrollView>
  );
}

function SheetHeader({
  title,
  tint,
  onClose,
  onConfirm,
}: {
  title: string;
  tint: string;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        hitSlop={6}
        style={styles.iconButton}
      >
        <SymbolView name={closeIcon} size={18} tintColor={tint} />
      </Pressable>
      <Text style={[styles.title, { color: tint }]}>{title}</Text>
      {onConfirm ? (
        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirmar"
          hitSlop={6}
          style={styles.iconButton}
        >
          <SymbolView name={checkIcon} size={22} tintColor={tint} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  shell: {
    zIndex: 2,
    elevation: 24,
  },
  card: {
    marginHorizontal: 10,
    borderRadius: 28,
    overflow: 'visible',
  },
  form: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  formBody: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    fontSize: 16,
  },
  clear: {
    position: 'absolute',
    right: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#C94B4B',
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  preview: {
    alignItems: 'flex-start',
  },
  pick: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  pickLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickFile: {
    fontSize: 13,
    marginTop: 2,
  },
  gridScroll: {
    maxHeight: 320,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two,
  },
  cell: {
    width: '23%',
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.6,
  },
  cellLabel: {
    fontSize: 12,
  },
});
