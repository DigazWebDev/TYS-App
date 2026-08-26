import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function ProfileScreen() {
	return (
		<View style={styles.container}>
			<View style={styles.avatar}>
				<Text style={styles.avatarText}>
					D
				</Text>
			</View>

			<Text style={styles.username}>
				@digaz
			</Text>

			<Text style={styles.bio}>
				O meu perfil
			</Text>

			<View style={styles.stats}>
				<View>
					<Text style={styles.number}>
						0
					</Text>

					<Text style={styles.label}>
						Stories
					</Text>
				</View>

				<View>
					<Text style={styles.number}>
						0
					</Text>

					<Text style={styles.label}>
						Seguidores
					</Text>
				</View>

				<View>
					<Text style={styles.number}>
						0
					</Text>

					<Text style={styles.label}>
						A seguir
					</Text>
				</View>
			</View>

			<Pressable style={styles.button}>
				<Text style={styles.buttonText}>
					Editar perfil
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		paddingTop: 70,
		paddingHorizontal: 20,
	},

	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: "#111",
		alignItems: "center",
		justifyContent: "center",
	},

	avatarText: {
		color: "#fff",
		fontSize: 40,
		fontWeight: "800",
	},

	username: {
		fontSize: 22,
		fontWeight: "700",
		marginTop: 15,
	},

	bio: {
		color: "#777",
		marginTop: 5,
	},

	stats: {
		flexDirection: "row",
		gap: 45,
		marginTop: 30,
	},

	number: {
		textAlign: "center",
		fontSize: 20,
		fontWeight: "800",
	},

	label: {
		marginTop: 4,
		color: "#777",
	},

	button: {
		marginTop: 30,
		width: "100%",
		height: 48,
		borderRadius: 12,
		backgroundColor: "#eee",
		alignItems: "center",
		justifyContent: "center",
	},

	buttonText: {
		fontWeight: "700",
	},
});
