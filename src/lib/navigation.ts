import { type Href, router } from 'expo-router';

export function openFollowers(userId: string) {
  router.push(`/user/${userId}/followers` as Href);
}

export function openFollowing(userId: string) {
  router.push(`/user/${userId}/following` as Href);
}

export function openProfile(userId: string, currentUserId?: string) {
  if (currentUserId && userId === currentUserId) {
    router.push('/(tabs)/profile');
    return;
  }

  router.push(`/user/${userId}` as Href);
}

export function openCreatePost() {
  router.push('/(tabs)/create');
}

export function openMessages() {
  router.push('/(tabs)/messages' as Href);
}

export function openDirectConversation(conversationId: string) {
  router.push(`/messages/${conversationId}` as Href);
}

export function openNewMessage() {
  router.push('/messages/new' as Href);
}

export function openEditProfile() {
  router.push('/edit-profile' as Href);
}

export function openSearch() {
  router.push('/(tabs)/search' as Href);
}
