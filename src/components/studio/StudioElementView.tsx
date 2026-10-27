import { StyleSheet, Text as RNText } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { LinkMark, MusicMark, StickerMark } from '@/components/studio/StudioMarks';
import { Fonts } from '@/constants/theme';
import { isStudioText, type StudioElement } from '@/types/studio';

export type ElementBound = {
  id: string;
  cx: number;
  cy: number;
  boxW: number;
  boxH: number;
  scale: number;
  rotation: number;
  z: number;
};

type StudioElementViewProps = {
  element: StudioElement;
  photoWidth: number;
  photoHeight: number;
  bounds: SharedValue<ElementBound[]>;
  selected: boolean;
  onBox: (id: string, width: number, height: number) => void;
};

export function StudioElementView({
  element,
  photoWidth,
  photoHeight,
  bounds,
  selected,
  onBox,
}: StudioElementViewProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const item = bounds.value.find((entry) => entry.id === element.id);
    const centerX = item?.cx ?? element.x * photoWidth;
    const centerY = item?.cy ?? element.y * photoHeight;
    const boxW = item?.boxW ?? 0;
    const boxH = item?.boxH ?? 0;
    const scale = item?.scale ?? element.scale;
    const rotation = item?.rotation ?? element.rotation;
    return {
      transform: [
        { translateX: centerX - boxW / 2 },
        { translateY: centerY - boxH / 2 },
        { rotate: `${rotation}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      collapsable={false}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          onBox(element.id, width, height);
        }
      }}
      style={[
        styles.item,
        { zIndex: element.zIndex, maxWidth: Math.max(photoWidth * 0.82, 40) },
        selected ? styles.selected : null,
        isStudioText(element) && element.style.background ? styles.backed : null,
        animatedStyle,
      ]}
    >
      {isStudioText(element) ? (
        <RNText
          style={{
            color: element.style.color,
            fontSize: element.style.fontSize,
            textAlign: element.style.align,
            fontFamily: Fonts.sans,
            lineHeight: Math.round(element.style.fontSize * 1.25),
          }}
        >
          {element.content}
        </RNText>
      ) : null}
      {element.type === 'link' ? <LinkMark url={element.url} label={element.label} /> : null}
      {element.type === 'music' ? <MusicMark title={element.title} artist={element.artist} /> : null}
      {element.type === 'sticker' ? <StickerMark stickerId={element.stickerId} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
  },
  backed: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
  },
});
