import {
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

interface Props {
	username: string;
	avatarUrl: string | null;
	hasStory: boolean;
	viewed: boolean;
	onPress: () => void;
}

export default function StoryAvatar({
	username,
	avatarUrl,
	hasStory,
	viewed,
	onPress,
}: Props) {
	return (
		<Pressable
			style={styles.container}
			onPress={onPress}
		>
			<View
				style={[
					styles.ring,
					hasStory && !viewed
						? styles.unviewed
						: styles.viewed,
				]}
			>
				{avatarUrl ? (
					<Image
						source={{ uri: avatarUrl }}
						style={styles.avatar}
					/>
				) : (
					<View style={styles.placeholder}>
						<Text style={styles.placeholderText}>
							{username.charAt(0).toUpperCase()}
						</Text>
					</View>
				)}
			</View>

			<Text
				style={styles.username}
				numberOfLines={1}
			>
				{username}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 78,
		alignItems: "center",
		marginRight: 12,
	},

	ring: {
		width: 68,
		height: 68,
		borderRadius: 34,
		padding: 3,
	},

	unviewed: {
		borderWidth: 3,
		borderColor: "#ff3040",
	},

	viewed: {
		borderWidth: 2,
		borderColor: "#999",
	},

	avatar: {
		width: "100%",
		height: "100%",
		borderRadius: 34,
	},

	placeholder: {
		width: "100%",
		height: "100%",
		borderRadius: 34,
		backgroundColor: "#444",
		alignItems: "center",
		justifyContent: "center",
	},

	placeholderText: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "bold",
	},

	username: {
		marginTop: 5,
		fontSize: 12,
	},
});
