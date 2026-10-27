export type StudioTextAlign = 'left' | 'center' | 'right';

/** Visual style kept separate from the photograph so it can be edited later. */
export type StudioElementStyle = {
  color: string;
  fontSize: number;
  align: StudioTextAlign;
  background: boolean;
};

/** Shared placement. `x` and `y` are the center, as fractions of the visible photo. */
type StudioPlacement = {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type StudioTextElement = StudioPlacement & {
  type: 'text' | 'emoji';
  content: string;
  style: StudioElementStyle;
};

export type StudioLinkElement = StudioPlacement & {
  type: 'link';
  url: string;
  label: string;
};

/** Local audio kept only in the in-memory draft. Nothing is uploaded. */
export type StudioMusicElement = StudioPlacement & {
  type: 'music';
  uri: string;
  title: string;
  artist: string;
  fileName: string;
  mimeType: string | null;
};

export type StudioStickerElement = StudioPlacement & {
  type: 'sticker';
  stickerId: string;
};

export type StudioElement =
  | StudioTextElement
  | StudioLinkElement
  | StudioMusicElement
  | StudioStickerElement;

export type StudioFutureTool = 'link' | 'time-weather' | 'sticker' | 'music';

export function isStudioText(element: StudioElement): element is StudioTextElement {
  return element.type === 'text' || element.type === 'emoji';
}
