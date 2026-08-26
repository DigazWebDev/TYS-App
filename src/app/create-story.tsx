import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { router } from "expo-router";

export default function CreateStoryScreen() {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Pressable onPress={() => router.back()}>
					<Text style={styles.back}>‹</Text>
				</Pressable>

				<Text style={styles.title}>Criar Story</Text>

				<View style={{ width: 30 }} />
			</View>

			<View style={styles.content}>
				<View style={styles.cameraPlaceholder}>
					<Text style={styles.cameraIcon}>📷</Text>

					<Text style={styles.placeholderTitle}>Criar um Story</Text>

					<Text style={styles.placeholderText}>
						Aqui vamos adicionar a câmara,
						galeria, imagens e vídeos.
					</Text>
				</View>

				<Pressable style={styles.button}>
					<Text style={styles.buttonText}>Escolher da galeria</Text>
				</Pressable>

				<Pressable style={styles.secondaryButton}>
					<Text style={styles.secondaryText}>Abrir câmara</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},

	header: {
		height: 100,
		paddingTop: 45,
		paddingHorizontal: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},

	back: {
		fontSize: 38,
		fontWeight: "300",
	},

	title: {
		fontSize: 18,
		fontWeight: "800",
	},

	content: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
	},

	cameraPlaceholder: {
		height: 350,
		borderRadius: 24,
		backgroundColor: "#f4f4f5",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 40,
	},

	cameraIcon: {
		fontSize: 55,
	},

	placeholderTitle: {
		fontSize: 22,
		fontWeight: "800",
		marginTop: 15,
	},

	placeholderText: {
		textAlign: "center",
		color: "#777",
		lineHeight: 21,
		marginTop: 8,
	},

	button: {
		height: 54,
		borderRadius: 14,
		backgroundColor: "#111",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 25,
	},

	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},

	secondaryButton: {
		height: 54,
		borderRadius: 14,
		backgroundColor: "#eee",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 10,
	},

	secondaryText: {
		fontSize: 16,
		fontWeight: "700",
	},
});
