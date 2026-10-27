import type { StudioElement } from '@/types/studio';

export type StudioDraft = {
  uri: string;
  elements: StudioElement[];
};

let current: StudioDraft | null = null;

/** Keeps the chosen photograph in memory. It is never uploaded. */
export function setStudioPhoto(uri: string) {
  current = {
    uri,
    elements: [],
  };
}

export function getStudioDraft(): StudioDraft | null {
  return current;
}

export function replaceStudioElements(elements: StudioElement[]) {
  if (!current) {
    return;
  }
  current = {
    ...current,
    elements,
  };
}

export function clearStudioDraft() {
  current = null;
}
