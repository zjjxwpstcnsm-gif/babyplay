import test from 'node:test';
import assert from 'node:assert/strict';
import { paintPersonMask } from '../src/personShadow.ts';

test('Person contour is opaque and background is transparent, including stale pixels', () => {
  const pixels = new Uint8ClampedArray(16).fill(255);
  assert.equal(paintPersonMask(new Float32Array([0, 1, .8, 0]), pixels), .5);
  assert.deepEqual([...pixels], [52,46,63,0, 52,46,63,255, 52,46,63,255, 52,46,63,0]);
  assert.equal(paintPersonMask(new Float32Array([0, 0, 0, 0]), pixels), 0);
  assert.ok([3,7,11,15].every(index => pixels[index] === 0));
});

test('Uncertain edge pixels are feathered and empty masks stay finite', () => {
  const pixels = new Uint8ClampedArray(12);
  paintPersonMask(new Float32Array([.2, .5, .9]), pixels);
  assert.equal(pixels[3], 0);
  assert.ok(pixels[7] > 0 && pixels[7] < 255);
  assert.equal(pixels[11], 255);
  assert.equal(paintPersonMask(new Float32Array(), new Uint8ClampedArray()), 0);
});
