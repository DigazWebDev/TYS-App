import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { router } from "expo-router";

export default function CreateScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				Criar
			</Text>

			<Pressable
				style={styles.button}
				onPress={() =>
					router.push("/create-story")
				}
			>
				<Text style={styles.buttonText}>
					📸 Criar Story
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		paddingTop: 60,
	},

	title: {
		fontSize: 30,
		fontWeight: "800",
		marginBottom: 30,
	},

	button: {
		height: 60,
		borderRadius: 16,
		backgroundColor: "#111",
		alignItems: "center",
		justifyContent: "center",
	},

	buttonText: {
		color: "#fff",
		fontSize: 17,
		fontWeight: "700",
	},
});
