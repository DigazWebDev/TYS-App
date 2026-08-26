import {
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function InboxScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				Inbox
			</Text>

			<Text style={styles.text}>
				As tuas mensagens vão aparecer aqui.
			</Text>
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
		marginBottom: 15,
	},

	text: {
		color: "#777",
	},
});
