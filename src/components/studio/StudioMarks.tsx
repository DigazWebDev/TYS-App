import { StyleSheet, Text as RNText, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { findStudioSticker } from '@/components/studio/studio-stickers';
import { Fonts } from '@/constants/theme';
import { linkDisplayText } from '@/lib/studio-link';

const linkIcon: SymbolViewProps['name'] = {
  ios: 'link',
  android: 'link',
  web: 'link',
};

const musicIcon: SymbolViewProps['name'] = {
  ios: 'music.note',
  android: 'music_note',
  web: 'music_note',
};

export function LinkMark({ url, label }: { url: string; label: string }) {
  return (
    <View style={styles.link}>
      <SymbolView name={linkIcon} size={16} tintColor="#08332F" />
      <RNText numberOfLines={1} style={styles.linkText}>
        {linkDisplayText(url, label)}
      </RNText>
    </View>
  );
}

export function MusicMark({ title, artist }: { title: string; artist: string }) {
  const name = title.trim() || 'Áudio';
  const credit = artist.trim();
  return (
    <View style={styles.music}>
      <SymbolView name={musicIcon} size={18} tintColor="#2BB8A8" />
      <View style={styles.musicCopy}>
        <RNText numberOfLines={1} style={styles.musicTitle}>
          {name}
        </RNText>
        {credit ? (
          <RNText numberOfLines={1} style={styles.musicArtist}>
            {credit}
          </RNText>
        ) : null}
      </View>
      <View style={styles.bars} accessibilityLabel="Indicador de áudio">
        <View style={[styles.bar, { height: 8 }]} />
        <View style={[styles.bar, { height: 14 }]} />
        <View style={[styles.bar, { height: 10 }]} />
      </View>
    </View>
  );
}

export function StickerMark({ stickerId, size = 64 }: { stickerId: string; size?: number }) {
  const sticker = findStudioSticker(stickerId);
  if (!sticker) {
    return <RNText style={styles.missing}>Sticker</RNText>;
  }
  return <SymbolView name={sticker.symbol} size={size} tintColor={sticker.tint} />;
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 240,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F4F6F6',
  },
  linkText: {
    flexShrink: 1,
    color: '#08332F',
    fontSize: 15,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  music: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 260,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(11,14,16,0.88)',
  },
  musicCopy: {
    flexShrink: 1,
  },
  musicTitle: {
    color: '#F4F6F6',
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  musicArtist: {
    color: 'rgba(244,246,246,0.72)',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#2BB8A8',
  },
  missing: {
    color: '#F4F6F6',
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
});
