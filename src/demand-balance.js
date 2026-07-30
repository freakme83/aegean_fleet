export const DEMAND_BALANCE = Object.freeze({
  abandonmentCost: 0.5,
  abandonmentStartMinutes: 300,
  transferStartingAgeMinutes: 120,
  minimumDirectPassengersPerMinute: 0.1,
  transferDemandShare: 0.3,
  uncoveredTransferFactor: 0.35,
  softQueueLoads: 3,
  hardQueueLoads: 5
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function openingRamp(openedAtMinute, currentMinute) {
  if (!Number.isFinite(openedAtMinute)) return 1;
  const age = Math.max(0, currentMinute - openedAtMinute);
  if (age < 1440) return 0.3;
  if (age < 2880) return 0.55;
  if (age < 4320) return 0.8;
  return 1;
}

export function trustDemandMultiplier(trust) {
  return 0.55 + 0.45 * clamp(Number.isFinite(trust) ? trust : 100, 0, 100) / 100;
}

export function queuePressure(queue, vehicleCapacity) {
  const capacity = Math.max(1, vehicleCapacity);
  const softLimit = capacity * DEMAND_BALANCE.softQueueLoads;
  const hardLimit = capacity * DEMAND_BALANCE.hardQueueLoads;
  if (queue <= softLimit) return 1;
  if (queue >= hardLimit) return 0;
  return 1 - (queue - softLimit) / (hardLimit - softLimit);
}

export function abandonmentRatePerHour(ageMinutes) {
  if (ageMinutes < DEMAND_BALANCE.abandonmentStartMinutes) return 0;
  const overdueHours = (ageMinutes - DEMAND_BALANCE.abandonmentStartMinutes) / 60;
  return Math.min(0.15, 0.08 + overdueHours * 0.02);
}

export function abandonmentStep(queue, ageMinutes, remainder, minutes) {
  if (queue <= 0 || minutes <= 0) return { abandoned: 0, remainder: 0 };
  const raw = Math.max(0, remainder || 0) + queue * abandonmentRatePerHour(ageMinutes) * minutes / 60;
  const abandoned = Math.min(queue, Math.floor(raw));
  return { abandoned, remainder: abandoned === queue ? 0 : raw - abandoned };
}

export function trustAfterAbandonment(trust, abandoned) {
  return clamp((Number.isFinite(trust) ? trust : 100) - abandoned / 25, 0, 100);
}

export function trustAfterService(trust, transported) {
  return clamp((Number.isFinite(trust) ? trust : 100) + transported / 100, 0, 100);
}

export function trustAfterTime(trust, minutes) {
  return clamp((Number.isFinite(trust) ? trust : 100) + Math.max(0, minutes) / 1440, 0, 100);
}
