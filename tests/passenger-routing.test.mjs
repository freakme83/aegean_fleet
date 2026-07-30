import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  allocateWeightedPassengers,
  enumerateSimplePaths,
  nextHopChoices,
  rankPassengerPaths,
  rebalancePassengerAllocations
} from '../src/passenger-routing.js';

const nodes = ['chios', 'cesme', 'mytilene', 'ayvalik', 'balikesir'];
const routeData = JSON.parse(await readFile(new URL('../data/routes.json', import.meta.url), 'utf8'));
const fares = { 'cesme-chios': 22, 'ayvalik-cesme': 32, 'chios-mytilene': 34, 'ayvalik-mytilene': 25, 'ayvalik-balikesir': 9 };
const key = (a, b) => [a, b].sort().join('-');
const route = (a, b) => routeData.routes[`${a}-${b}`] || routeData.routes[`${b}-${a}`];
const chiosMytilene = route('chios', 'mytilene');

assert.equal(chiosMytilene.distanceKm, 101.4);
assert.equal(chiosMytilene.durationMinutes, 135);
assert.equal(chiosMytilene.source, 'manual-route-editor');
assert.equal(chiosMytilene.waypoints.length, 10);
assert.deepEqual(chiosMytilene.waypoints[1], [38.449287, 26.18042]);
assert.deepEqual(chiosMytilene.waypoints.at(-2), [39.057584, 26.62674]);

const paths = enumerateSimplePaths('chios', 'balikesir', nodes, (a, b) => Boolean(route(a, b)));

assert.deepEqual(paths, [
  ['chios', 'cesme', 'ayvalik', 'balikesir'],
  ['chios', 'mytilene', 'ayvalik', 'balikesir']
]);

const clearMetrics = (a, b) => ({ durationMinutes: route(a, b).durationMinutes, fare: fares[key(a, b)], queue: 0, capacity: 80, covered: true });
const clearChoices = nextHopChoices(rankPassengerPaths(paths, clearMetrics, () => 100));
assert.equal(clearChoices.length, 2);
assert.equal(clearChoices[0].next, 'mytilene');
assert.ok(clearChoices.every(choice => choice.weight > 0.25));

const congestedMetrics = (a, b) => ({
  ...clearMetrics(a, b),
  queue: key(a, b) === 'chios-mytilene' ? 400 : 0
});
const congestedChoices = nextHopChoices(rankPassengerPaths(paths, congestedMetrics, () => 100));
assert.equal(congestedChoices[0].next, 'cesme');

const onlyMidilliCovered = (a, b) => ({
  ...clearMetrics(a, b),
  covered: !['cesme-chios', 'ayvalik-cesme'].includes(key(a, b))
});
const coverageChoices = nextHopChoices(rankPassengerPaths(paths, onlyMidilliCovered, () => 100));
assert.equal(coverageChoices[0].next, 'mytilene');
assert.ok(coverageChoices[0].weight > 0.95);

const allocation = allocateWeightedPassengers(1000, clearChoices);
assert.equal(Object.values(allocation.allocations).reduce((sum, count) => sum + count, 0), 1000);
assert.ok(allocation.allocations.mytilene > allocation.allocations.cesme);
assert.ok(allocation.allocations.cesme > 250);

const rebalanced = rebalancePassengerAllocations({ mytilene: 100, cesme: 0 }, [
  { next: 'mytilene', weight: 0.1 },
  { next: 'cesme', weight: 0.9 }
]);
assert.deepEqual(rebalanced, { allocations: { mytilene: 80, cesme: 20 }, moved: 20 });

console.log('passenger-routing tests passed');
