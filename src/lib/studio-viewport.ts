export type StageSize = { width: number; height: number };

/**
 * The photo viewport is fixed after the first real measurement.
 * Later shrinks (keyboard, bars) and later growths (bars closing) must not reframe it.
 */
export function nextPhotoViewport(current: StageSize | null, measured: StageSize): StageSize | null {
  if (measured.width <= 1 || measured.height <= 1) {
    return current;
  }
  if (current) {
    return current;
  }
  return { width: measured.width, height: measured.height };
}
