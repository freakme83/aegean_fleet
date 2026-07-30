import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [sprite, game, styles] = await Promise.all([
  readFile(new URL('../assets/aegean-swift-80-topdown.png', import.meta.url)),
  readFile(new URL('../src/game.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

assert.equal(sprite.subarray(1, 4).toString(), 'PNG');
assert.equal(sprite.readUInt32BE(16), 256);
assert.equal(sprite.readUInt32BE(20), 256);
assert.equal(sprite[24], 8);
assert.equal(sprite[25], 6);

assert.match(game, /\['coastal60', 'swift80'\]\.includes\(v\.type\)/);
assert.match(styles, /aegean-swift-80-topdown\.png/);

console.log('vehicle-sprite tests passed');