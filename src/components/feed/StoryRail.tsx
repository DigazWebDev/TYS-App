import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Spacing } from '@/constants/theme';
import type { ProfilePreview, StoryPreview } from '@/types/post';

import { StoryBubble } from './StoryBubble';

type StoryRailProps = {
  stories: StoryPreview[];
  currentUser: ProfilePreview;
};

export function StoryRail({ stories, currentUser }: StoryRailProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <StoryBubble
          isOwn
          profile={currentUser}
          onPress={() => router.push('/create-story')}
        />
        {stories.map((story) => (
          <StoryBubble
            key={story.id}
            profile={story.author}
            viewed={story.viewed}
            onPress={() => router.push(`/story/${story.id}`)}
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
