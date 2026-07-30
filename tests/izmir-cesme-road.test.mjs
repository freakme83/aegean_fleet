import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RouteEngine } from '../src/route-engine.js';
import { vehicleTripMinutes } from '../src/vehicle-rules.js';

const ports = JSON.parse(await readFile(new URL('../data/ports.json', import.meta.url)));
const routeData = JSON.parse(await readFile(new URL('../data/routes.json', import.meta.url)));
const road = routeData.routes['izmir-cesme'];

assert.equal(road.mode, 'road');
assert.equal(road.distanceKm, 93.7);
assert.equal(road.durationMinutes, 115);
assert.equal(road.source, 'manual-road-route-editor');
assert.equal(road.waypoints.length, 31);
assert.deepEqual(road.waypoints[0], ports.izmir.terminal);
assert.deepEqual(road.waypoints[1], [38.286703, 27.144127]);
assert.deepEqual(road.waypoints[12], [38.318225, 26.796341]);
assert.deepEqual(road.waypoints.at(-2), [38.315532, 26.305733]);
assert.deepEqual(road.waypoints.at(-1), ports.cesme.terminal);

const engine = new RouteEngine({ nodes: ports, routeData });
const reverse = engine.getRoute({ mode: 'road', origin: 'cesme', destination: 'izmir' });
assert.deepEqual(reverse.waypoints[0], ports.cesme.terminal);
assert.deepEqual(reverse.waypoints.at(-1), ports.izmir.terminal);

const minibus = { mode: 'road', speed: 75 };
const coach = { mode: 'road', speed: 70 };
assert.equal(Math.round(vehicleTripMinutes(minibus, road)), 54);
assert.equal(Math.round(vehicleTripMinutes(coach, road)), 58);

for (const path of ['../src/game.js', '../src/idle-progress.js']) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  assert.match(source, /'cesme-izmir':\s*8/);
}

console.log('izmir-cesme road tests passed');
