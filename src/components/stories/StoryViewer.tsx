import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components/ui';
import { STORY_PHOTO_DURATION_MS } from '@/constants/stories';
import { useAuthSession } from '@/hooks/use-auth-session';
import { publicLabel } from '@/lib/identity';
import { fetchStoryGroups, findStoryPosition, markStoryViewed, type StoryUserGroup } from '@/lib/stories';
import { formatRelativeTime } from '@/lib/time';

const PAGE_TURN_MS = 280;
const NAV_GAP_MS = 160;
const CHROME = '#FFFFFF';
const CHROME_MUTED = 'rgba(255,255,255,0.75)';

type StoryViewerProps = {
  storyId: string;
};

type ViewerStatus = 'loading' | 'ready' | 'error';

export function StoryViewer({ storyId }: StoryViewerProps) {
  const { session, isReady } = useAuthSession();
  const userId = session?.user.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [groups, setGroups] = useState<StoryUserGroup[]>([]);
  const [userIndex, setUserIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [holding, setHolding] = useState(false);
  const [generation, setGeneration] = useState(0);

  const [focused, setFocused] = useState(true);
  const progress = useSharedValue(0);
  const turn = useSharedValue(0);
  const pageWidth = useSharedValue(width);
  const held = useSharedValue(false);
  const pausedProgress = useSharedValue(false);
  const paused = holding || !focused;
  pausedProgress.value = paused;
  const positionStoryId = useRef(storyId);
  const lastNavAt = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    pageWidth.value = width;
  }, [pageWidth, width]);

  const snapshot = useRef({ groups, userIndex, storyIndex });
  snapshot.current = { groups, userIndex, storyIndex };

  const group = groups[userIndex];
  const story = group?.stories[storyIndex];

  useEffect(() => {
    if (story) {
      positionStoryId.current = story.id;
    }
  }, [story]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) {
        return;
      }

      let active = true;
      setFocused(true);
      void fetchStoryGroups(userId)
        .then((next) => {
          if (!active) {
            return;
          }
          const position = findStoryPosition(next, positionStoryId.current);
          setGroups(next);
          setUserIndex(position.userIndex);
          setStoryIndex(position.storyIndex);
          setStatus('ready');
        })
        .catch(() => {
          if (active) {
            setStatus('error');
          }
        });

      return () => {
        active = false;
        setFocused(false);
      };
    }, [isReady, userId])
  );

  const turnTo = useCallback(
    (direction: 1 | -1) => {
      cancelAnimation(turn);
      turn.value = direction;
      turn.value = withTiming(0, {
        duration: PAGE_TURN_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    [turn]
  );

  const clearTurn = useCallback(() => {
    cancelAnimation(turn);
    turn.value = 0;
  }, [turn]);

  const navigate = useCallback((action: () => void) => {
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GAP_MS) {
      return;
    }
    lastNavAt.current = now;
    action();
  }, []);

  const goNextStory = useCallback(() => {
    navigate(() => {
      const current = snapshot.current;
      const currentGroup = current.groups[current.userIndex];
      if (!currentGroup) {
        router.back();
        return;
      }
      if (current.storyIndex < currentGroup.stories.length - 1) {
        clearTurn();
        setStoryIndex(current.storyIndex + 1);
        return;
      }
      if (current.userIndex < current.groups.length - 1) {
        turnTo(1);
        setUserIndex(current.userIndex + 1);
        setStoryIndex(0);
        return;
      }
      router.back();
    });
  }, [clearTurn, navigate, turnTo]);

  const goPrevStory = useCallback(() => {
    navigate(() => {
      const current = snapshot.current;
      if (current.storyIndex > 0) {
        clearTurn();
        setStoryIndex(current.storyIndex - 1);
        return;
      }
      if (current.userIndex > 0) {
        const previous = current.groups[current.userIndex - 1];
        turnTo(-1);
        setUserIndex(current.userIndex - 1);
        setStoryIndex(Math.max(0, previous.stories.length - 1));
        return;
      }
      setGeneration((value) => value + 1);
    });
  }, [clearTurn, navigate, turnTo]);

  const goNextUser = useCallback(() => {
    navigate(() => {
      const current = snapshot.current;
      if (current.userIndex >= current.groups.length - 1) {
        router.back();
        return;
      }
      turnTo(1);
      setUserIndex(current.userIndex + 1);
      setStoryIndex(0);
    });
  }, [navigate, turnTo]);

  const goPrevUser = useCallback(() => {
    navigate(() => {
      const current = snapshot.current;
      if (current.userIndex <= 0) {
        return;
      }
      turnTo(-1);
      setUserIndex(current.userIndex - 1);
      setStoryIndex(0);
    });
  }, [navigate, turnTo]);

  const actions = useRef({
    tap: (_x: number) => {},
    pause: () => {},
    resume: () => {},
    nextUser: () => {},
    prevUser: () => {},
  });

  actions.current.tap = (x: number) => {
    if (x < widthRef.current * 0.5) {
      goPrevStory();
    } else {
      goNextStory();
    }
  };
  actions.current.pause = () => setHolding(true);
  actions.current.resume = () => setHolding(false);
  actions.current.nextUser = goNextUser;
  actions.current.prevUser = goPrevUser;

  const callTap = useCallback((x: number) => {
    actions.current.tap(x);
  }, []);
  const callPause = useCallback(() => {
    actions.current.pause();
  }, []);
  const callResume = useCallback(() => {
    actions.current.resume();
  }, []);
  const callNextUser = useCallback(() => {
    actions.current.nextUser();
  }, []);
  const callPrevUser = useCallback(() => {
    actions.current.prevUser();
  }, []);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-28, 28])
      .failOffsetY([-24, 24])
      .onEnd((event) => {
        const swiped = Math.abs(event.translationX) > 64 || Math.abs(event.velocityX) > 800;
        if (!swiped) {
          return;
        }
        if (event.translationX < 0) {
          runOnJS(callNextUser)();
        } else {
          runOnJS(callPrevUser)();
        }
      });

    const hold = Gesture.LongPress()
      .minDuration(260)
      .maxDistance(18)
      .onStart(() => {
        held.value = true;
        runOnJS(callPause)();
      })
      .onFinalize(() => {
        runOnJS(callResume)();
      });

    const tap = Gesture.Tap()
      .maxDuration(240)
      .maxDistance(18)
      .onBegin(() => {
        held.value = false;
      })
      .onEnd((event) => {
        if (held.value) {
          held.value = false;
          return;
        }
        runOnJS(callTap)(event.x);
      });

    return Gesture.Exclusive(pan, hold, tap);
  }, [callNextUser, callPause, callPrevUser, callResume, callTap, held]);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
  }, [story?.id, generation, progress]);

  useEffect(() => {
    if (!story || story.type === 'video') {
      return;
    }
    if (paused) {
      cancelAnimation(progress);
      return;
    }

    const remaining = Math.max(48, STORY_PHOTO_DURATION_MS * (1 - progress.value));
    progress.value = withTiming(
      1,
      { duration: remaining, easing: Easing.linear },
      (finished) => {
        if (finished && !pausedProgress.value) {
          runOnJS(goNextStory)();
        }
      }
    );

    return () => cancelAnimation(progress);
  }, [story?.id, story?.type, paused, generation, progress, pausedProgress, goNextStory]);

  useEffect(() => {
    if (!story || !userId || !group || group.userId === userId) {
      return;
    }
    void markStoryViewed(story.id, userId);
  }, [story?.id, userId, group?.userId]);

  useEffect(() => {
    const upcoming = [group?.stories[storyIndex + 1], groups[userIndex + 1]?.stories[0]];
    for (const item of upcoming) {
      if (item?.type === 'image') {
        void Image.prefetch(item.mediaUrl);
      }
    }
  }, [groups, group, userIndex, storyIndex]);

  const pageStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [
      { perspective: 1000 },
      { translateX: turn.value * pageWidth.value * 0.22 },
      { rotateY: `${turn.value * -10}deg` },
    ],
  }));

  if (status === 'loading' || !isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={CHROME} />
      </View>
    );
  }

  if (status === 'error' || !group || !story) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Não há stories para mostrar.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.emptyAction}>Fechar</Text>
        </Pressable>
      </View>
    );
  }

  const label = publicLabel(group.author);
  const isOwn = group.userId === userId;

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={pageStyle} collapsable={false}>
          {story.type === 'video' ? (
            <StoryVideo
              key={`${story.id}:${generation}`}
              uri={story.mediaUrl}
              paused={paused}
              progress={progress}
              onEnd={goNextStory}
            />
          ) : (
            <Image
              source={{ uri: story.mediaUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`Story de ${label}`}
            />
          )}
        </Animated.View>
      </GestureDetector>

      <View
        pointerEvents="box-none"
        style={[styles.chrome, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.bars}>
          {group.stories.map((item, index) => (
            <ProgressSegment
              key={item.id}
              mode={index < storyIndex ? 'done' : index === storyIndex ? 'current' : 'next'}
              progress={progress}
            />
          ))}
        </View>

        <View style={styles.header}>
          <Avatar name={label} uri={group.author.avatarUrl} size="sm" />
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>
              {label}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(story.createdAt)}</Text>
          </View>
          {isOwn ? (
            <Pressable
              onPress={() => router.push('/create-story')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Adicionar story"
              style={styles.iconButton}
            >
              <SymbolView name={plusIcon} size={16} tintColor={CHROME} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={styles.iconButton}
          >
            <SymbolView name={closeIcon} size={16} tintColor={CHROME} />
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

function ProgressSegment({
  mode,
  progress,
}: {
  mode: 'done' | 'current' | 'next';
  progress: SharedValue<number>;
}) {
  const fill = useAnimatedStyle(() => {
    const amount = mode === 'done' ? 1 : mode === 'current' ? progress.value : 0;
    return { width: `${amount * 100}%` };
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

function StoryVideo({
  uri,
  paused,
  progress,
  onEnd,
}: {
  uri: string;
  paused: boolean;
  progress: SharedValue<number>;
  onEnd: () => void;
}) {
  const player = useVideoPlayer(uri, (next) => {
    next.loop = false;
    next.timeUpdateEventInterval = 0.05;
  });
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    let active = true;
    const endSub = player.addListener('playToEnd', () => {
      if (active) {
        onEndRef.current();
      }
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) {
        progress.value = Math.min(1, currentTime / player.duration);
      }
    });
    return () => {
      active = false;
      endSub.remove();
      timeSub.remove();
    };
  }, [player, progress]);

  useEffect(() => {
    if (paused) {
      player.pause();
      return;
    }
    player.play();
  }, [paused, player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={StyleSheet.absoluteFill}
    />
  );
}

const plusIcon: SymbolViewProps['name'] = {
  ios: 'plus',
  android: 'add',
  web: 'add',
};

const closeIcon: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: CHROME,
    fontSize: 18,
    textAlign: 'center',
  },
  emptyAction: {
    color: CHROME,
    fontSize: 16,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  fill: {
    height: '100%',
    backgroundColor: CHROME,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: CHROME,
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    color: CHROME_MUTED,
    fontSize: 12,
    marginTop: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
