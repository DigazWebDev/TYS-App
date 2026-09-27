/**
 * Overlay placed on a Studio photograph.
 * Position and size are fractions of the photo, from 0 to 1.
 * Rotation is in degrees. Tools that fill these fields come later.
 */
export type StudioOverlay = {
  id: string;
  type: StudioOverlayType;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number;
} & StudioOverlayProps;

export type StudioOverlayType =
  | 'text'
  | 'link'
  | 'time-weather'
  | 'sticker'
  | 'emoji'
  | 'music';

type StudioOverlayProps =
  | { type: 'text'; text: string; color: string }
  | { type: 'link'; url: string; label: string }
  | { type: 'time-weather'; locationLabel: string | null }
  | { type: 'sticker'; stickerId: string }
  | { type: 'emoji'; emoji: string }
  | { type: 'music'; trackTitle: string; artist: string | null };
