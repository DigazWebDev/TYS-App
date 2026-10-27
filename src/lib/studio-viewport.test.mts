import assert from 'node:assert/strict';

import { nextPhotoViewport } from './studio-viewport.ts';

assert.equal(nextPhotoViewport(null, { width: 0, height: 800 }), null);
assert.deepEqual(nextPhotoViewport(null, { width: 390, height: 700 }), { width: 390, height: 700 });

const locked = { width: 390, height: 700 };
assert.equal(nextPhotoViewport(locked, { width: 390, height: 420 }), locked);
assert.equal(nextPhotoViewport(locked, { width: 390, height: 844 }), locked);
assert.equal(nextPhotoViewport(locked, { width: 390, height: 700 }), locked);

console.log('studio-viewport ok');
