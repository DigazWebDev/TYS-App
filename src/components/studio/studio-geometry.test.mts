import assert from 'node:assert/strict';

import {
  elementContains,
  elementHitExtents,
  hitTestElements,
  nextAnchor,
  toLocalPoint,
  type HitItem,
} from './studio-geometry.ts';

function item(overrides: Partial<HitItem> = {}): HitItem {
  return {
    cx: 100,
    cy: 80,
    boxW: 40,
    boxH: 20,
    scale: 1,
    rotation: 0,
    z: 1,
    ...overrides,
  };
}

const extents = elementHitExtents(item());
assert.equal(extents.halfW, 56);
assert.equal(extents.halfH, 46);
assert.equal(elementContains(item(), 100, 80), true);
assert.equal(elementContains(item(), 150, 80), true);
assert.equal(elementContains(item(), 157, 80), false);
assert.equal(elementContains(item(), 100, 127), false);

const unmeasured = elementHitExtents(item({ boxW: 0, boxH: 0 }));
assert.equal(unmeasured.halfW, 96);
assert.equal(unmeasured.halfH, 64);
assert.equal(elementContains(item({ boxW: 0, boxH: 0 }), 190, 80), true);
assert.equal(elementContains(item({ boxW: 0, boxH: 0 }), 200, 80), false);

const scaled = elementHitExtents(item({ boxW: 80, boxH: 80, scale: 3 }));
assert.equal(scaled.halfW, 228);
assert.equal(scaled.halfH, 228);

const turned = item({ rotation: 90 });
assert.equal(elementContains(turned, 140, 80), true);
assert.equal(elementContains(turned, 150, 80), false);
assert.equal(elementContains(turned, 100, 30), true);

const identity = toLocalPoint(100, 50, 200, 100, 1, 0, 0);
assert.equal(identity.x, 100);
assert.equal(identity.y, 50);

const zoomed = toLocalPoint(110, 46, 200, 100, 2, 10, -4);
assert.equal(zoomed.x, 100);
assert.equal(zoomed.y, 50);

const shifted = toLocalPoint(100, 50, 200, 100, 2, 10, -4);
assert.equal(shifted.x, 95);
assert.equal(shifted.y, 52);

const photoLocal = toLocalPoint(180, 50, 200, 100, 2, 0, 0);
assert.equal(elementContains(item({ cx: 100, cy: 50 }), photoLocal.x, photoLocal.y), true);
assert.equal(elementContains(item({ cx: 100, cy: 50 }), 180, 50), false);

const low = item({ z: 1 });
const high = item({ z: 4 });
const outside = item({ cx: 400, cy: 400, z: 9 });
assert.equal(hitTestElements([low, outside, high], 100, 80), 2);
assert.equal(hitTestElements([outside], 100, 80), -1);

assert.equal(nextAnchor(true, false, 1), false);
assert.equal(nextAnchor(false, false, 1), true);
assert.equal(nextAnchor(false, true, 1), true);
assert.equal(nextAnchor(false, true, 2), false);
assert.equal(nextAnchor(false, false, 2), true);
assert.equal(nextAnchor(false, false, 0), false);

console.log('studio-geometry ok');
