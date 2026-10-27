import type { SymbolViewProps } from 'expo-symbols';

export type StudioStickerDef = {
  id: string;
  label: string;
  tint: string;
  symbol: SymbolViewProps['name'];
};

export const STUDIO_STICKERS: readonly StudioStickerDef[] = [
  { id: 'heart', label: 'Coração', tint: '#FF5C5C', symbol: { ios: 'heart.fill', android: 'favorite', web: 'favorite' } },
  { id: 'star', label: 'Estrela', tint: '#F5D76E', symbol: { ios: 'star.fill', android: 'star', web: 'star' } },
  { id: 'arrow', label: 'Seta', tint: '#7EE0D6', symbol: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' } },
  { id: 'bubble', label: 'Balão', tint: '#F4F6F6', symbol: { ios: 'bubble.left.fill', android: 'chat_bubble', web: 'chat_bubble' } },
  { id: 'spark', label: 'Brilho', tint: '#F5D76E', symbol: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } },
  { id: 'sun', label: 'Sol', tint: '#F5D76E', symbol: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' } },
  { id: 'moon', label: 'Lua', tint: '#D5D8DC', symbol: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' } },
  { id: 'pin', label: 'Local', tint: '#2BB8A8', symbol: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' } },
];

export function findStudioSticker(id: string): StudioStickerDef | null {
  return STUDIO_STICKERS.find((item) => item.id === id) ?? null;
}
