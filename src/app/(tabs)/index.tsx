import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { router } from "expo-router";

const stories = [
	{ id: "1", username: "Ana", color: "#ff3040", seen: false },
	{ id: "2", username: "João", color: "#7c3aed", seen: false },
	{ id: "3", username: "Maria", color: "#0ea5e9", seen: true },
	{ id: "4", username: "Pedro", color: "#16a34a", seen: false },
	{ id: "5", username: "Sofia", color: "#f97316", seen: true },
];

export default function HomeScreen() {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.logo}>Stories</Text>
				<View style={styles.headerActions}>
					<Pressable style={styles.headerButton}>
						<Text style={styles.headerIcon}>♡</Text>
					</Pressable>
					<Pressable style={styles.headerButton}>
						<Text style={styles.headerIcon}>✈</Text>
					</Pressable>
				</View>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.storyList}
			>
				{stories.map((story) => (
					<Pressable
						key={story.id}
						style={styles.story}
						onPress={() => router.push(`/story/${story.id}`)}
					>
						<View style={[styles.storyRing, story.seen && styles.storyRingSeen]}>
							<View style={[styles.avatar, { backgroundColor: story.color }]}>
								<Text style={styles.avatarText}>{story.username.charAt(0)}</Text>
							</View>
						</View>
						<Text
							style={[styles.username, story.seen && styles.usernameSeen]}
							numberOfLines={1}
						>
							{story.username}
						</Text>
					</Pressable>
				))}
			</ScrollView>

			<View style={styles.divider} />
			<ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
				<Text style={styles.sectionTitle}>O teu feed</Text>
				<View style={styles.emptyFeed}>
					<Text style={styles.emptyIcon}>✨</Text>
					<Text style={styles.emptyTitle}>Tudo pronto</Text>
					<Text style={styles.emptyText}>
						Quando começares a seguir pessoas, o conteúdo delas aparecerá aqui.
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#fff", paddingTop: 55 },
	header: {
		height: 55,
		paddingHorizontal: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	logo: { fontSize: 27, fontWeight: "800", letterSpacing: -1 },
	headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
	headerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
	headerIcon: { fontSize: 23 },
	storyList: { paddingHorizontal: 18, paddingVertical: 18 },
	story: { width: 76, alignItems: "center", marginRight: 10 },
	storyRing: { width: 70, height: 70, borderRadius: 35, padding: 3, backgroundColor: "#ff3040" },
	storyRingSeen: { backgroundColor: "#d1d5db" },
	avatar: { flex: 1, borderRadius: 35, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
	avatarText: { color: "#fff", fontSize: 25, fontWeight: "800" },
	username: { marginTop: 7, fontSize: 12, color: "#111" },
	usernameSeen: { color: "#777" },
	divider: { height: 1, backgroundColor: "#eee" },
	feed: { flex: 1 },
	sectionTitle: { fontSize: 22, fontWeight: "800", paddingHorizontal: 20, paddingTop: 20 },
	emptyFeed: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, marginTop: 100 },
	emptyIcon: { fontSize: 40, marginBottom: 15 },
	emptyTitle: { fontSize: 20, fontWeight: "700" },
	emptyText: { textAlign: "center", color: "#777", lineHeight: 21, marginTop: 8 },
});
