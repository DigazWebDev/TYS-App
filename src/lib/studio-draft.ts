import type { StudioOverlay } from '@/types/studio';

export type StudioDraft = {
  uri: string;
  overlays: StudioOverlay[];
};

let current: StudioDraft | null = null;

/** Keeps the chosen photograph in memory. It is never uploaded. */
export function setStudioPhoto(uri: string) {
  current = {
    uri,
    overlays: [],
  };
}

export function getStudioDraft(): StudioDraft | null {
  return current;
}

export function clearStudioDraft() {
  current = null;
}
