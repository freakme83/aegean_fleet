import assert from 'node:assert/strict';
import {
  abandonmentRatePerHour,
  abandonmentStep,
  openingRamp,
  queuePressure,
  trustAfterAbandonment,
  trustAfterService,
  trustAfterTime,
  trustDemandMultiplier
} from '../src/demand-balance.js';

assert.equal(openingRamp(0, 0), 0.3);
assert.equal(openingRamp(0, 1440), 0.55);
assert.equal(openingRamp(0, 2880), 0.8);
assert.equal(openingRamp(0, 4320), 1);

assert.equal(trustDemandMultiplier(100), 1);
assert.equal(trustDemandMultiplier(0), 0.55);
assert.equal(queuePressure(180, 60), 1);
assert.equal(queuePressure(240, 60), 0.5);
assert.equal(queuePressure(300, 60), 0);

assert.equal(abandonmentRatePerHour(299), 0);
assert.equal(abandonmentRatePerHour(300), 0.08);
assert.equal(abandonmentRatePerHour(600), 0.15);
assert.deepEqual(abandonmentStep(100, 300, 0, 60), { abandoned: 8, remainder: 0 });

assert.equal(trustAfterAbandonment(100, 25), 99);
assert.equal(trustAfterService(99, 100), 100);
assert.equal(trustAfterTime(98, 1440), 99);

console.log('demand-balance tests passed');
