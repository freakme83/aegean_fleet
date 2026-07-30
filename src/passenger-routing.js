export const PASSENGER_ROUTING = Object.freeze({
  maxLegs: 3,
  transferPenaltyMinutes: 35,
  uncoveredPenaltyMinutes: 240,
  waitMinutesPerVehicleLoad: 45,
  maxWaitPenaltyMinutes: 240,
  fareMinuteWeight: 1.25,
  trustMinuteWeight: 0.8,
  choiceTemperatureMinutes: 90
});

export function enumerateSimplePaths(origin, destination, nodes, isConnected, maxLegs = PASSENGER_ROUTING.maxLegs) {
  if (origin === destination) return [[origin]];
  const paths = [];
  const visit = path => {
    const current = path.at(-1);
    if (path.length - 1 >= maxLegs) return;
    for (const next of nodes) {
      if (next === current || path.includes(next) || !isConnected(current, next)) continue;
      const candidate = [...path, next];
      if (next === destination) paths.push(candidate);
      else visit(candidate);
    }
  };
  visit([origin]);
  return paths;
}

export function scorePassengerPath(path, legMetrics, trustAt = () => 100) {
  let score = Math.max(0, path.length - 2) * PASSENGER_ROUTING.transferPenaltyMinutes;
  for (let index = 0; index < path.length - 1; index++) {
    const metrics = legMetrics(path[index], path[index + 1]);
    const capacity = Math.max(1, metrics.capacity || 0);
    const waitPenalty = Math.min(
      PASSENGER_ROUTING.maxWaitPenaltyMinutes,
      Math.max(0, metrics.queue || 0) / capacity * PASSENGER_ROUTING.waitMinutesPerVehicleLoad
    );
    score += Math.max(0, metrics.durationMinutes || 0);
    score += Math.max(0, metrics.fare || 0) * PASSENGER_ROUTING.fareMinuteWeight;
    score += waitPenalty;
    if (!metrics.covered) score += PASSENGER_ROUTING.uncoveredPenaltyMinutes;
  }
  for (const transfer of path.slice(1, -1)) {
    score += Math.max(0, 100 - trustAt(transfer)) * PASSENGER_ROUTING.trustMinuteWeight;
  }
  return score;
}

export function rankPassengerPaths(paths, legMetrics, trustAt) {
  if (!paths.length) return [];
  const scored = paths.map(path => ({ path, score: scorePassengerPath(path, legMetrics, trustAt) }));
  const best = Math.min(...scored.map(item => item.score));
  const utilities = scored.map(item => Math.exp(-(item.score - best) / PASSENGER_ROUTING.choiceTemperatureMinutes));
  const total = utilities.reduce((sum, value) => sum + value, 0) || 1;
  return scored
    .map((item, index) => ({ ...item, weight: utilities[index] / total }))
    .sort((a, b) => b.weight - a.weight);
}

export function nextHopChoices(rankedPaths) {
  const byNextHop = new Map();
  for (const item of rankedPaths) {
    const next = item.path[1];
    if (!next) continue;
    const current = byNextHop.get(next) || { next, weight: 0, bestScore: Infinity };
    current.weight += item.weight;
    current.bestScore = Math.min(current.bestScore, item.score);
    byNextHop.set(next, current);
  }
  return [...byNextHop.values()].sort((a, b) => b.weight - a.weight);
}

export function allocateWeightedPassengers(count, choices, cursor = 0) {
  const allocations = Object.fromEntries(choices.map(choice => [choice.next, 0]));
  if (count <= 0 || !choices.length) return { allocations, cursor };
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0) || 1;
  let position = Number.isFinite(cursor) ? cursor % 1 : 0;
  for (let passenger = 0; passenger < count; passenger++) {
    position = (position + 0.618033988749895) % 1;
    let threshold = position * totalWeight;
    let selected = choices.at(-1);
    for (const choice of choices) {
      threshold -= choice.weight;
      if (threshold <= 0) { selected = choice; break; }
    }
    allocations[selected.next]++;
  }
  return { allocations, cursor: position };
}

export function rebalancePassengerAllocations(current, choices, maxMoveShare = 0.2) {
  const total = Object.values(current).reduce((sum, count) => sum + count, 0);
  if (!total || choices.length < 2) return { allocations: { ...current }, moved: 0 };
  const target = allocateWeightedPassengers(total, choices).allocations;
  const allocations = { ...current };
  for (const choice of choices) allocations[choice.next] ||= 0;
  const donors = Object.keys(allocations).filter(next => allocations[next] > (target[next] || 0));
  const receivers = Object.keys(target).filter(next => allocations[next] < target[next]);
  let budget = Math.max(1, Math.floor(total * maxMoveShare)), moved = 0;
  for (const donor of donors) {
    for (const receiver of receivers) {
      const count = Math.min(budget, allocations[donor] - (target[donor] || 0), target[receiver] - allocations[receiver]);
      if (count <= 0) continue;
      allocations[donor] -= count;
      allocations[receiver] += count;
      budget -= count;
      moved += count;
      if (!budget) return { allocations, moved };
    }
  }
  return { allocations, moved };
}
