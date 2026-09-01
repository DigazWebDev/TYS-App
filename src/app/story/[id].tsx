import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  useEffect,
  useRef,
  useState,
} from "react";

const { width, height } =
  Dimensions.get("window");

const STORY_DURATION = 5000;

const stories = [
  {
    id: "1",
    username: "Ana",
    color: "#ff3040",
  },
  {
    id: "2",
    username: "João",
    color: "#7c3aed",
  },
  {
    id: "3",
    username: "Maria",
    color: "#0ea5e9",
  },
  {
    id: "4",
    username: "Pedro",
    color: "#16a34a",
  },
  {
    id: "5",
    username: "Sofia",
    color: "#f97316",
  },
];

export default function StoryScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const initialIndex = stories.findIndex(
    (story) => story.id === id
  );

  const [currentIndex, setCurrentIndex] =
    useState(
      initialIndex >= 0
        ? initialIndex
        : 0
    );

  const [paused, setPaused] =
    useState(false);

  const progress = useRef(
    new Animated.Value(0)
  ).current;

  const currentStory =
    stories[currentIndex];

  useEffect(() => {
    progress.setValue(0);

    if (paused) {
      return;
    }

    const animation =
      Animated.timing(progress, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      });

    animation.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [currentIndex, paused]);

  function goNext() {
    if (
      currentIndex <
      stories.length - 1
    ) {
      setCurrentIndex(
        (index) => index + 1
      );
    } else {
      router.back();
    }
  }

  function goPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (index) => index - 1
      );
    } else {
      progress.setValue(0);
    }
  }

  function handlePress(
    event: any
  ) {
    const x =
      event.nativeEvent.locationX;

    if (x < width / 2) {
      goPrevious();
    } else {
      goNext();
    }
  }

  if (!currentStory) {
    return (
      <View
        style={styles.errorContainer}
      >
        <Text style={styles.error}>
          Story não encontrado.
        </Text>

        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            Voltar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            currentStory.color,
        },
      ]}
    >
      {/* PROGRESS BARS */}

      <View
        style={styles.progressContainer}
      >
        {stories.map(
          (story, index) => {
            const isCurrent =
              index === currentIndex;

            const isCompleted =
              index < currentIndex;

            return (
              <View
                key={story.id}
                style={
                  styles.progressBackground
                }
              >
                {isCompleted && (
                  <View
                    style={[
                      styles.progress,
                      {
                        width: "100%",
                      },
                    ]}
                  />
                )}

                {isCurrent && (
                  <Animated.View
                    style={[
                      styles.progress,
                      {
                        width:
                          progress.interpolate(
                            {
                              inputRange: [
                                0,
                                1,
                              ],
                              outputRange: [
                                "0%",
                                "100%",
                              ],
                            }
                          ),
                      },
                    ]}
                  />
                )}
              </View>
            );
          }
        )}
      </View>

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.user}>
          <View
            style={styles.smallAvatar}
          >
            <Text
              style={
                styles.smallAvatarText
              }
            >
              {currentStory.username.charAt(
                0
              )}
            </Text>
          </View>

          <Text style={styles.username}>
            {currentStory.username}
          </Text>

          <Text style={styles.time}>
            agora
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          hitSlop={15}
        >
          <Text style={styles.close}>
            ×
          </Text>
        </Pressable>
      </View>

      {/* STORY */}

      <Pressable
        style={styles.storyArea}
        onPress={handlePress}
        onPressIn={() =>
          setPaused(true)
        }
        onPressOut={() =>
          setPaused(false)
        }
      >
        <View style={styles.content}>
          <Text
            style={styles.storyTitle}
          >
            STORY
          </Text>

          <Text
            style={
              styles.storyUsername
            }
          >
            {currentStory.username}
          </Text>
        </View>
      </Pressable>

      {/* BOTTOM */}

      <View style={styles.bottom}>
        <View style={styles.reply}>
          <Text
            style={styles.replyText}
          >
            Enviar mensagem...
          </Text>
        </View>

        <Pressable
          style={styles.likeButton}
        >
          <Text style={styles.like}>
            ♡
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },

  errorContainer: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 20,
  },

  back: {
    color: "#fff",
    fontSize: 16,
  },

  progressContainer: {
    position: "absolute",
    top: 12,
    left: 8,
    right: 8,
    zIndex: 20,
    flexDirection: "row",
    gap: 4,
  },

  progressBackground: {
    flex: 1,
    height: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor:
      "rgba(255,255,255,0.35)",
  },

  progress: {
    height: "100%",
    backgroundColor: "#fff",
  },

  header: {
    position: "absolute",
    top: 30,
    left: 16,
    right: 16,
    zIndex: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  user: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  smallAvatarText: {
    color: "#fff",
    fontWeight: "800",
  },

  username: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 9,
  },

  time: {
    color:
      "rgba(255,255,255,0.75)",
    marginLeft: 7,
    fontSize: 12,
  },

  close: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "300",
  },

  storyArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  storyTitle: {
    color: "#fff",
    fontSize: 50,
    fontWeight: "900",
    letterSpacing: 3,
  },

  storyUsername: {
    color: "#fff",
    fontSize: 20,
    marginTop: 8,
  },

  bottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 35,
    zIndex: 20,

    flexDirection: "row",
    alignItems: "center",
  },

  reply: {
    flex: 1,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.7)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  replyText: {
    color: "#fff",
  },

  likeButton: {
    width: 50,
    alignItems: "center",
  },

  like: {
    color: "#fff",
    fontSize: 32,
  },
});