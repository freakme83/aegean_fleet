import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RouteEngine } from '../src/route-engine.js';

const ports = JSON.parse(await readFile(new URL('../data/ports.json', import.meta.url)));
const routeData = JSON.parse(await readFile(new URL('../data/routes.json', import.meta.url)));
const route = routeData.routes['istanbul-izmir'];

assert.deepEqual(ports.istanbul.terminal, [41.275278, 28.751944]);
assert.deepEqual(ports.izmir.terminal, [38.289167, 27.155]);
assert.equal(ports.istanbul.type, 'airport');
assert.equal(ports.izmir.type, 'airport');
assert.equal(ports.istanbul.unlockCost, 80000);
assert.equal(ports.izmir.unlockCost, 50000);

assert.equal(route.mode, 'air');
assert.equal(route.distanceKm, 363.8);
assert.equal(route.durationMinutes, 70);
assert.equal(route.source, 'manual-air-route-editor');
assert.equal(route.waypoints.length, 15);
assert.deepEqual(route.waypoints[0], ports.istanbul.terminal);
assert.deepEqual(route.waypoints[1], [41.237415, 28.753452]);
assert.deepEqual(route.waypoints.at(-3), [38.478051, 27.119751]);
assert.deepEqual(route.waypoints.at(-2), [38.325296, 27.146358]);
assert.deepEqual(route.waypoints.at(-1), ports.izmir.terminal);

const engine = new RouteEngine({ nodes: ports, routeData });
const reverse = engine.getRoute({ mode: 'air', origin: 'izmir', destination: 'istanbul' });
assert.equal(reverse.distanceKm, 363.8);
assert.deepEqual(reverse.waypoints[0], ports.izmir.terminal);
assert.deepEqual(reverse.waypoints.at(-1), ports.istanbul.terminal);

const gameSource = await readFile(new URL('../src/game.js', import.meta.url), 'utf8');
const idleSource = await readFile(new URL('../src/idle-progress.js', import.meta.url), 'utf8');
for (const source of [gameSource, idleSource]) {
  assert.match(source, /regional40/);
  assert.match(source, /jet100/);
  assert.match(source, /'istanbul-izmir':\s*60/);
}

console.log('air-transport tests passed');
