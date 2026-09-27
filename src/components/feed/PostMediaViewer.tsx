import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { setStatusBarStyle } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useThemeName } from '@/hooks/use-theme';
import type { PostMedia } from '@/types/post';

const CANVAS = '#000000';
const CHROME = '#F4F6F6';
const CHROME_MUTED = 'rgba(244,246,246,0.72)';

type PostMediaViewerProps = {
  items: PostMedia[];
  initialIndex: number;
  onClose: () => void;
};

export function PostMediaViewer({
  items,
  initialIndex,
  onClose,
}: PostMediaViewerProps) {
  const themeName = useThemeName();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const slides = useMemo(
    () => [...items].sort((left, right) => left.position - right.position),
    [items],
  );
  const start = Math.min(
    Math.max(initialIndex, 0),
    Math.max(slides.length - 1, 0),
  );
  const scrollRef = useRef<ScrollView>(null);
  const initialOffset = useRef({ x: start * width, y: 0 });
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setStatusBarStyle('light');
    return () => {
      setStatusBarStyle(themeName === 'dark' ? 'light' : 'dark');
    };
  }, [themeName]);

  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: indexRef.current * width,
      animated: false,
    });
  }, [width]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width <= 0) {
      return;
    }
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(next, 0), slides.length - 1);
    if (clamped !== indexRef.current) {
      setZoomed(false);
      setIndex(clamped);
    }
  }

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentOffset={initialOffset.current}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          style={styles.pager}
        >
          {slides.map((item, slideIndex) => (
            <View key={item.id} style={{ width, height }}>
              <ViewerSlide
                item={item}
                active={slideIndex === index}
                onZoomedChange={setZoomed}
              />
            </View>
          ))}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[styles.chrome, { paddingTop: insets.top + 8 }]}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={styles.close}
          >
            <SymbolView name={closeIcon} size={18} tintColor={CHROME} />
          </Pressable>
          {slides.length > 1 ? (
            <Text
              variant="caption"
              style={styles.counter}
              accessibilityLabel={`Elemento ${index + 1} de ${slides.length}`}
            >
              {index + 1}/{slides.length}
            </Text>
          ) : (
            <View style={styles.close} />
          )}
          <View style={styles.close} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ViewerSlide({
  item,
  active,
  onZoomedChange,
}: {
  item: PostMedia;
  active: boolean;
  onZoomedChange: (zoomed: boolean) => void;
}) {
  if (!item.url) {
    return <Message text="Ficheiro indisponível" />;
  }

  if (item.mediaType === 'video') {
    return active ? <ViewerVideo url={item.url} /> : <View style={styles.page} />;
  }

  return (
    <ViewerPhoto
      url={item.url}
      active={active}
      onZoomedChange={onZoomedChange}
    />
  );
}

function ViewerPhoto({
  url,
  active,
  onZoomedChange,
}: {
  url: string;
  active: boolean;
  onZoomedChange: (zoomed: boolean) => void;
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const zoomed = useSharedValue(false);
  const onZoomedChangeRef = useRef(onZoomedChange);
  onZoomedChangeRef.current = onZoomedChange;

  const notify = useCallback((next: boolean) => {
    onZoomedChangeRef.current(next);
  }, []);

  useEffect(() => {
    if (active) {
      return;
    }
    scale.value = 1;
    savedScale.value = 1;
    zoomed.value = false;
    notify(false);
  }, [active, notify, savedScale, scale, zoomed]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          const next = Math.min(4, Math.max(1, savedScale.value * event.scale));
          scale.value = next;
          const isZoomed = next > 1.02;
          if (isZoomed !== zoomed.value) {
            zoomed.value = isZoomed;
            runOnJS(notify)(isZoomed);
          }
        })
        .onEnd(() => {
          if (scale.value <= 1.02) {
            scale.value = withTiming(1);
            savedScale.value = 1;
            zoomed.value = false;
            runOnJS(notify)(false);
            return;
          }
          savedScale.value = scale.value;
        }),
    [notify, savedScale, scale, zoomed],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (phase === 'error') {
    return <Message text="Não foi possível mostrar este ficheiro." />;
  }

  return (
    <View style={styles.page}>
      <GestureDetector gesture={pinch}>
        <Animated.View style={[styles.media, animatedStyle]}>
          <Image
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel="Fotografia da publicação"
            onLoad={() => setPhase('ready')}
            onError={() => setPhase('error')}
          />
        </Animated.View>
      </GestureDetector>
      {phase === 'loading' ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={CHROME} />
        </View>
      ) : null}
    </View>
  );
}

function ViewerVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        setFailed(true);
      }
    });

    return () => {
      player.pause();
      subscription.remove();
    };
  }, [player]);

  if (failed) {
    return <Message text="Não foi possível mostrar este ficheiro." />;
  }

  return (
    <View style={styles.page}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.page}>
      <Text variant="caption" style={styles.message}>
        {text}
      </Text>
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
    backgroundColor: CANVAS,
  },
  pager: {
    flex: 1,
    backgroundColor: CANVAS,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CANVAS,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    color: CHROME,
  },
  message: {
    color: CHROME_MUTED,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
