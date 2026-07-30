import assert from 'node:assert/strict';
import { vehicleRangeLabel, vehicleWithinRange } from '../src/vehicle-rules.js';

const minibus = { mode: 'road' };
const ferry = { mode: 'sea', range: 180 };

assert.equal(vehicleWithinRange(minibus, 132.1), true);
assert.equal(vehicleWithinRange(minibus, 10_000), true);
assert.equal(vehicleWithinRange(ferry, 180), true);
assert.equal(vehicleWithinRange(ferry, 180.1), false);

assert.equal(vehicleRangeLabel(minibus), 'Menzil sınırı yok');
assert.equal(vehicleRangeLabel(ferry), 'Menzil 180 km');

console.log('vehicle-rules tests passed');
