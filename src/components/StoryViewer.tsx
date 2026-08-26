import { useEffect, useRef, useState } from "react";
import {
	Dimensions,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface Story {
	id: string;
	username: string;
	avatarUrl: string | null;
	mediaUrl: string;
	type: "image" | "video";
}

interface Props {
	stories: Story[];
	initialIndex?: number;
	onClose: () => void;
}

export default function StoryViewer({
	stories,
	initialIndex = 0,
	onClose,
}: Props) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const [progress, setProgress] = useState(0);

	const timer = useRef<ReturnType<typeof setInterval> | null>(null);

	const story = stories[currentIndex];

	useEffect(() => {
		startProgress();

		return () => {
			if (timer.current) {
				clearInterval(timer.current);
			}
		};
	}, [currentIndex]);

	function startProgress() {
		if (timer.current) {
			clearInterval(timer.current);
		}

		setProgress(0);

		timer.current = setInterval(() => {
			setProgress((value) => {
				const next = value + 0.02;

				if (next >= 1) {
					nextStory();
					return 1;
				}

				return next;
			});
		}, 100);
	}

	function nextStory() {
		if (currentIndex < stories.length - 1) {
			setCurrentIndex((value) => value + 1);
		} else {
			onClose();
		}
	}

	function previousStory() {
		if (currentIndex > 0) {
			setCurrentIndex((value) => value - 1);
		}
	}

	return (
		<View style={styles.container}>
			<Image
				source={{ uri: story.mediaUrl }}
				style={styles.media}
				resizeMode="cover"
			/>

			<View style={styles.overlay}>
				<View style={styles.progressContainer}>
					{stories.map((item, index) => {
						const value =
							index < currentIndex
								? 1
								: index === currentIndex
									? progress
									: 0;

						return (
							<View key={item.id} style={styles.progressBackground}>
								<View
									style={[
										styles.progress,
										{ width: `${value * 100}%` },
									]}
								/>
							</View>
						);
					})}
				</View>

				<View style={styles.header}>
					<Text style={styles.username}>{story.username}</Text>

					<Pressable onPress={onClose}>
						<Text style={styles.close}>×</Text>
					</Pressable>
				</View>

				<Pressable style={styles.leftArea} onPress={previousStory} />

				<Pressable style={styles.rightArea} onPress={nextStory} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},

	media: {
		width,
		height,
	},

	overlay: {
		...StyleSheet.absoluteFillObject,
	},

	progressContainer: {
		flexDirection: "row",
		gap: 4,
		paddingHorizontal: 10,
		paddingTop: 12,
	},

	progressBackground: {
		flex: 1,
		height: 3,
		backgroundColor: "rgba(255,255,255,0.4)",
		borderRadius: 10,
		overflow: "hidden",
	},

	progress: {
		height: "100%",
		backgroundColor: "#fff",
	},

	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
	},

	username: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},

	close: {
		color: "#fff",
		fontSize: 36,
	},

	leftArea: {
		position: "absolute",
		left: 0,
		top: 80,
		bottom: 0,
		width: width * 0.35,
	},

	rightArea: {
		position: "absolute",
		right: 0,
		top: 80,
		bottom: 0,
		width: width * 0.65,
	},
});
