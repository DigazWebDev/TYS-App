export type HitItem = {
  cx: number;
  cy: number;
  boxW: number;
  boxH: number;
  scale: number;
  rotation: number;
  z: number;
};

const MIN_HIT_PAD = 36;
const UNMEASURED_WIDTH = 120;
const UNMEASURED_HEIGHT = 56;

export function clampRange(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function toLocalPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  translateX: number,
  translateY: number,
) {
  'worklet';
  const safeScale = scale || 1;
  const centerX = width / 2;
  const centerY = height / 2;
  return {
    x: centerX + (x - centerX - translateX) / safeScale,
    y: centerY + (y - centerY - translateY) / safeScale,
  };
}

export function nextAnchor(claimed: boolean, locked: boolean, touchCount: number) {
  'worklet';
  if (claimed || touchCount < 1) {
    return false;
  }
  if (touchCount === 1) {
    return true;
  }
  return !locked;
}

export function elementHitExtents(item: HitItem) {
  'worklet';
  const width = item.boxW > 0 ? item.boxW : UNMEASURED_WIDTH;
  const height = item.boxH > 0 ? item.boxH : UNMEASURED_HEIGHT;
  const scale = item.scale > 0 ? item.scale : 1;
  const pad = Math.max(MIN_HIT_PAD, Math.min(width, height) * scale * 0.45);
  return {
    halfW: (width * scale) / 2 + pad,
    halfH: (height * scale) / 2 + pad,
  };
}

export function elementContains(item: HitItem, x: number, y: number) {
  'worklet';
  const dx = x - item.cx;
  const dy = y - item.cy;
  const rad = (-item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  const extents = elementHitExtents(item);
  return Math.abs(localX) <= extents.halfW && Math.abs(localY) <= extents.halfH;
}

export function hitTestElements(items: HitItem[], x: number, y: number) {
  'worklet';
  let found = -1;
  let bestZ = -1;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || !elementContains(item, x, y) || item.z < bestZ) {
      continue;
    }
    found = index;
    bestZ = item.z;
  }
  return found;
}
