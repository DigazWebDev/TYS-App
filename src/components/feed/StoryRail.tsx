import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { groupStoriesByAuthor, openingStoryId } from '@/lib/stories';
import type { ProfilePreview, StoryPreview } from '@/types/post';

import { StoryBubble } from './StoryBubble';

type StoryRailProps = {
  stories: StoryPreview[];
  currentUser: ProfilePreview;
};

export function StoryRail({ stories, currentUser }: StoryRailProps) {
  const groups = groupStoriesByAuthor(stories, currentUser.id);
  const own = groups.find((group) => group.userId === currentUser.id);
  const others = groups.filter((group) => group.userId !== currentUser.id);

  function openOwn() {
    if (!own || own.stories.length === 0) {
      router.push('/create-story');
      return;
    }

    router.push(`/story/${openingStoryId(own.stories)}`);
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <StoryBubble
          isOwn
          hasStory={Boolean(own && own.stories.length > 0)}
          profile={currentUser}
          onPress={openOwn}
        />
        {others.map((group) => (
          <StoryBubble
            key={group.userId}
            profile={group.author}
            viewed={group.stories.every((story) => story.viewed)}
            onPress={() => router.push(`/story/${openingStoryId(group.stories)}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
});
