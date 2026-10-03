import test from 'node:test';
import assert from 'node:assert/strict';
import { characters, characterForKey, makeRound } from '../src/learning.ts';
import { shadowFromFace } from '../src/shadowMath.ts';

test('Every learning round has one correct choice and avoids immediate repeats', () => {
  for (const lesson of Object.keys(characters)) {
    let previous;
    for (let i = 0; i < 100; i++) {
      const round = makeRound(lesson, previous);
      assert.notEqual(round.character, previous);
      assert.equal(round.choices.length, 3);
      assert.equal(new Set(round.choices).size, 3);
      assert.ok(round.choices.includes(round.character));
      assert.ok(round.choices.every(char => characters[lesson].includes(char)));
      previous = round.character;
    }
  }
});
test('Keyboard uses actual digits, case-insensitive letters and numbered Hanzi choices', () => {
  const round = { character: '山', choices: ['人', '山', '水'] };
  assert.equal(characterForKey('hanzi', round, '2'), '山');
  assert.equal(characterForKey('hanzi', round, '山'), '山');
  assert.equal(characterForKey('hanzi', round, '4'), undefined);
  assert.equal(characterForKey('letters', round, 'a'), 'A');
  assert.equal(characterForKey('letters', round, 'Enter'), undefined);
  assert.equal(characterForKey('numbers', round, '8'), '8');
  assert.equal(characterForKey('numbers', round, 'a'), undefined);
});
test('Face size maps monotonically to bounded shadow scale, independent of video resolution', () => {
  const face = { originX: 240, originY: 100, width: 140, height: 140 };
  const normal = shadowFromFace(face, 640, 140 / 640);
  const near = shadowFromFace({ ...face, width: 220 }, 640, 140 / 640);
  const far = shadowFromFace({ ...face, width: 80 }, 640, 140 / 640);
  assert.equal(normal.scale, 1);
  assert.ok(near.scale > normal.scale && far.scale < normal.scale);
  assert.equal(shadowFromFace({ ...face, width: 10000 }, 640, .22).scale, 1.7);
  assert.equal(shadowFromFace({ ...face, width: 1 }, 640, .22).scale, .45);
  assert.equal(shadowFromFace({ ...face, originX: 480, width: 280 }, 1280, 280 / 1280).scale, normal.scale);
  assert.ok(shadowFromFace({ ...face, originX: 0 }, 640, .22).x > 0);
  assert.ok(shadowFromFace({ ...face, originX: 500 }, 640, .22).x < 0);
});
