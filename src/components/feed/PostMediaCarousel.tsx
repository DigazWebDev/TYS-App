import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import type { PostMedia } from '@/types/post';

type PostMediaCarouselProps = {
  items: PostMedia[];
  onOpen?: (index: number) => void;
};

export function PostMediaCarousel({ items, onOpen }: PostMediaCarouselProps) {
  const tokens = useThemeTokens();
  const scrollRef = useRef<ScrollView>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const slides = [...items].sort((left, right) => left.position - right.position);
  const active = slides[index] ?? slides[0];
  const showCounter = slides.length > 1;
  const showDots = slides.length > 1 && slides.length <= 7;

  function goTo(nextIndex: number) {
    if (frame.width <= 0) {
      return;
    }
    scrollRef.current?.scrollTo({ x: nextIndex * frame.width, animated: true });
    setIndex(nextIndex);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (frame.width <= 0) {
      return;
    }
    const next = Math.round(event.nativeEvent.contentOffset.x / frame.width);
    setIndex(Math.min(Math.max(next, 0), slides.length - 1));
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.frame, { backgroundColor: tokens.background.elevated }]}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (
            nextWidth > 0 &&
            nextHeight > 0 &&
            (nextWidth !== frame.width || nextHeight !== frame.height)
          ) {
            setFrame({ width: nextWidth, height: nextHeight });
          }
        }}
      >
        {frame.width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            style={StyleSheet.absoluteFill}
          >
            {slides.map((item, slideIndex) => (
              <View key={item.id} style={{ width: frame.width, height: frame.height }}>
                <Slide
                  item={item}
                  active={item.id === active?.id}
                  onOpen={onOpen ? () => onOpen(slideIndex) : undefined}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}

        {showCounter ? (
          <View
            style={[styles.counter, { backgroundColor: tokens.background.surface }]}
            accessibilityLabel={`Elemento ${index + 1} de ${slides.length}`}
          >
            <Text variant="caption">
              {index + 1}/{slides.length}
            </Text>
          </View>
        ) : null}
      </View>

      {showDots ? (
        <View style={styles.dots}>
          {slides.map((item, dotIndex) => {
            const selected = dotIndex === index;
            return (
              <Pressable
                key={item.id}
                onPress={() => goTo(dotIndex)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Ir para o elemento ${dotIndex + 1}`}
                accessibilityState={{ selected }}
                style={[
                  styles.dot,
                  {
                    backgroundColor: selected
                      ? tokens.accent.teal.default
                      : tokens.border.strong,
                    opacity: selected ? 1 : 0.35,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Slide({
  item,
  active,
  onOpen,
}: {
  item: PostMedia;
  active: boolean;
  onOpen?: () => void;
}) {
  const openable = Boolean(onOpen) && !(item.mediaType === 'video' && active && item.url);
  let body: ReactNode;

  if (!item.url) {
    body = <UnavailableSlide />;
  } else if (item.mediaType === 'video') {
    body = active ? <ActiveVideo url={item.url} /> : <VideoPlaceholder />;
  } else {
    body = <ImageSlide url={item.url} />;
  }

  if (!openable || !onOpen) {
    return body;
  }

  return (
    <Pressable
      style={styles.slidePress}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={
        item.mediaType === 'video' ? 'Abrir vídeo' : 'Abrir fotografia'
      }
    >
      {body}
    </Pressable>
  );
}

function ImageSlide({ url }: { url: string }) {
  const tokens = useThemeTokens();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <View style={styles.slide}>
      {phase !== 'error' ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Fotografia da publicação"
          onLoad={() => setPhase('ready')}
          onError={() => setPhase('error')}
        />
      ) : null}
      {phase === 'loading' ? (
        <ActivityIndicator color={tokens.accent.teal.default} />
      ) : null}
      {phase === 'error' ? (
        <Text variant="caption" tone="secondary" style={styles.message}>
          Não foi possível mostrar este ficheiro.
        </Text>
      ) : null}
    </View>
  );
}

function ActiveVideo({ url }: { url: string }) {
  const tokens = useThemeTokens();
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setPhase('ready');
      }
      if (status === 'error') {
        setPhase('error');
      }
    });

    return () => {
      player.pause();
      subscription.remove();
    };
  }, [player]);

  return (
    <View style={styles.slide}>
      {phase !== 'error' ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
        />
      ) : (
        <Text variant="caption" tone="secondary" style={styles.message}>
          Não foi possível mostrar este ficheiro.
        </Text>
      )}
      {phase === 'loading' ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={tokens.accent.teal.default} />
        </View>
      ) : null}
    </View>
  );
}

function VideoPlaceholder() {
  const tokens = useThemeTokens();

  return (
    <View style={styles.slide}>
      <SymbolView name={playIcon} size={28} tintColor={tokens.text.secondary} />
    </View>
  );
}

function UnavailableSlide() {
  return (
    <View style={styles.slide}>
      <Text variant="caption" tone="secondary" style={styles.message}>
        Ficheiro indisponível
      </Text>
    </View>
  );
}

const playIcon: SymbolViewProps['name'] = {
  ios: 'play.fill',
  android: 'play_arrow',
  web: 'play_arrow',
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  frame: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slidePress: {
    flex: 1,
  },
  counter: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  message: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
