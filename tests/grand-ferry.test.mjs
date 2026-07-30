import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { vehicleTripMinutes, vehicleWithinRange } from '../src/vehicle-rules.js';

const game = await readFile(new URL('../src/game.js', import.meta.url), 'utf8');
const idle = await readFile(new URL('../src/idle-progress.js', import.meta.url), 'utf8');
const grand = {
  mode: 'sea',
  capacity: 120,
  speed: 77,
  range: 520,
  opKm: 16,
  terminalTax: 0.12,
  maintEvery: 700,
  maintCost: 650,
  fareMultiplier: 1.2
};

assert.equal(grand.speed, 55 * 1.4);
assert.equal(grand.range, 260 * 2);
assert.equal(vehicleWithinRange(grand, 520), true);
assert.equal(vehicleWithinRange(grand, 520.1), false);
assert.equal(Math.round(vehicleTripMinutes(grand, { durationMinutes: 205 })), 93);
assert.equal(Math.round(32 * grand.fareMultiplier), 38);

assert.match(game, /grand120: \{ name: 'Aegean Grand 120'/);
assert.match(game, /capacity: 120, speed: 77, range: 520, opKm: 16, price: 220000/);
assert.match(game, /maintEvery: 700, maintCost: 650, fareMultiplier: 1\.2/);
assert.match(game, /typeMultiplier = type\?\.fareMultiplier \|\| 1/);
assert.match(idle, /grand120:\{mode:'sea',capacity:120,speed:77,range:520,opKm:16/);
assert.match(idle, /typeMultiplier=type\?\.fareMultiplier\|\|1/);

const fullRevenue = grand.capacity * Math.round(32 * grand.fareMultiplier);
const loadedOperation = 123 * grand.opKm * 1.18;
const maintenanceReserve = 123 / grand.maintEvery * grand.maintCost;
assert.ok(fullRevenue - loadedOperation - maintenanceReserve > 1800);

console.log('grand ferry tests passed');
