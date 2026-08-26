import {
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

const { width, height } = Dimensions.get("window");

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

  const story = stories.find(
    (item) => item.id === id
  );

  if (!story) {
    return (
      <View style={styles.errorContainer}>
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
          backgroundColor: story.color,
        },
      ]}
    >
      {/* PROGRESSO */}

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={styles.progress} />
        </View>
      </View>

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.user}>
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>
              {story.username.charAt(0)}
            </Text>
          </View>

          <Text style={styles.username}>
            {story.username}
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

      {/* CONTEÚDO */}

      <View style={styles.content}>
        <Text style={styles.storyTitle}>
          STORY
        </Text>

        <Text style={styles.storyUsername}>
          {story.username}
        </Text>
      </View>

      {/* ESQUERDA */}

      <Pressable
        style={styles.leftZone}
        onPress={() => router.back()}
      />

      {/* DIREITA */}

      <Pressable
        style={styles.rightZone}
        onPress={() => router.back()}
      />

      {/* BOTTOM */}

      <View style={styles.bottom}>
        <Text style={styles.reply}>
          Enviar mensagem...
        </Text>

        <Text style={styles.like}>
          ♡
        </Text>
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
    left: 10,
    right: 10,
    zIndex: 20,
  },

  progressBackground: {
    height: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor:
      "rgba(255,255,255,0.35)",
  },

  progress: {
    width: "45%",
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
    backgroundColor: "rgba(255,255,255,0.3)",
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
    color: "rgba(255,255,255,0.75)",
    marginLeft: 7,
    fontSize: 12,
  },

  close: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "300",
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

  leftZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.35,
  },

  rightZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: width * 0.65,
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
    color: "#fff",
    paddingHorizontal: 18,
    paddingTop: 12,
    overflow: "hidden",
  },

  like: {
    color: "#fff",
    fontSize: 32,
    marginLeft: 15,
  },
});
