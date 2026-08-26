export type StoryType = "image" | "video";

export interface Story {
	id: string;
	userId: string;
	username: string;
	avatarUrl: string | null;

	mediaUrl: string;
	type: StoryType;

	createdAt: string;
	expiresAt: string;

	viewed: boolean;
}
