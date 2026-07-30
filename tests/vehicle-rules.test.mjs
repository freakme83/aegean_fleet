import assert from 'node:assert/strict';
import { vehicleRangeLabel, vehicleTripMinutes, vehicleWithinRange } from '../src/vehicle-rules.js';

const minibus = { mode: 'road' };
const ferry = { mode: 'sea', range: 180 };

assert.equal(vehicleWithinRange(minibus, 132.1), true);
assert.equal(vehicleWithinRange(minibus, 10_000), true);
assert.equal(vehicleWithinRange(ferry, 180), true);
assert.equal(vehicleWithinRange(ferry, 180.1), false);

assert.equal(vehicleRangeLabel(minibus), 'Menzil sınırı yok');
assert.equal(vehicleRangeLabel(ferry), 'Menzil 180 km');

const flight = { distanceKm: 359, durationMinutes: 70 };
const regional = { mode: 'air', speed: 430, airOverheadMinutes: 30 };
const jet = { mode: 'air', speed: 780, airOverheadMinutes: 35 };
assert.equal(Math.round(vehicleTripMinutes(regional, flight)), 80);
assert.equal(Math.round(vehicleTripMinutes(jet, flight)), 63);
assert.ok(vehicleTripMinutes(jet, flight) < vehicleTripMinutes(regional, flight));

console.log('vehicle-rules tests passed');
