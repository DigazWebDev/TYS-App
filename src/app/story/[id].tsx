import { useLocalSearchParams } from 'expo-router';

import { StoryViewer } from '@/components/stories/StoryViewer';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = Array.isArray(id) ? id[0] : id;

  if (!storyId) {
    return null;
  }

  return <StoryViewer storyId={storyId} />;
}
