const SAVE_KEY = 'aegean-fleet-fleet-v8';
const HIDDEN_AT_KEY = 'aegean-fleet-hidden-at-v1';
const SUMMARY_KEY = 'aegean-fleet-idle-summary-v1';
const MAX_REAL_SECONDS = 24 * 60 * 60;
const START_DATE = new Date(2020, 4, 1, 8).getTime();
const DOCK_TAX = 0.08;
const MAINT_EVERY = 500;
const MAINT_COST = 180;
const LOAD_COST_MAX = 0.18;
const TYPES = {
  coastal60: { capacity: 60, speed: 35, opKm: 6.5 },
  swift80: { capacity: 80, speed: 55, opKm: 9.5 }
};
const SUMMER_FARES = { 'ayvalik-mytilene': 25, 'ayvalik-cesme': 32, 'cesme-chios': 22, 'chios-mytilene': 34 };
const FARE_MULT = { summer: 1, shoulder: 0.92, low: 0.81, winter: 0.72 };

const [routeData, ports] = await Promise.all([
  fetch('./data/routes.json').then(response => response.json()),
  fetch('./data/ports.json').then(response => response.json())
]);

const routeKey = (a, b) => [a, b].sort().join('-');
const route = (a, b) => routeData.routes[`${a}-${b}`] || routeData.routes[`${b}-${a}`];
const unlocked = (state, id) => state.unlocked?.includes(id);
const lineLicensed = (state, a, b) => state.openedLines?.includes(routeKey(a, b));
const usableDirectRoute = (state, a, b) => Boolean(unlocked(state, a) && unlocked(state, b) && route(a, b) && lineLicensed(state, a, b));
const queueCount = (state, a, b) => state.w?.[a]?.[b] ?? 0;
const setQueue = (state, a, b, count) => { (state.w[a] ??= {})[b] = Math.max(0, Math.round(count)); };
const frac = (state, a, b) => state.fr?.[`${a}:${b}`] || 0;
const setFrac = (state, a, b, value) => { (state.fr ??= {})[`${a}:${b}`] = value; };

function gameDate(state) { return new Date(START_DATE + state.m * 60000); }
function seasonBand(date) { const month = date.getMonth() + 1; if ([6, 7, 8].includes(month)) return ['summer', 1.55]; if ([5, 9].includes(month)) return ['shoulder', 1.15]; if ([4, 10].includes(month)) return ['low', 0.58]; return ['winter', 0.22]; }
function timeBand(date) { const hour = date.getHours() + date.getMinutes() / 60; if (hour >= 7 && hour < 10) return 1.45; if (hour >= 16 && hour < 20) return 1.65; if (hour >= 23 || hour < 7) return 0.18; return 1; }
function distanceDemandFactor(distanceKm) { if (distanceKm <= 20) return 1.10; if (distanceKm <= 50) return 1.04; if (distanceKm <= 100) return 0.98; return 0.92; }
function fareFor(a, b, date) { const base = SUMMER_FARES[routeKey(a, b)] ?? Math.round(18 + route(a, b).distanceKm * 0.13); return Math.round(base * FARE_MULT[seasonBand(date)[0]]); }
function findTransferPath(state, origin, destination) {
  if (origin === destination) return [origin];
  if (usableDirectRoute(state, origin, destination)) return [origin, destination];
  const available = (state.unlocked || []).filter(id => ports[id]?.type === 'port');
  const paths = [[origin]], visited = new Set([origin]);
  while (paths.length) {
    const path = paths.shift(), current = path.at(-1);
    for (const next of available) {
      if (next === current || visited.has(next) || !usableDirectRoute(state, current, next)) continue;
      const nextPath = [...path, next];
      if (next === destination) return nextPath;
      visited.add(next); paths.push(nextPath);
    }
  }
  return null;
}
function nextHop(state, a, b) { return findTransferPath(state, a, b)?.[1] || null; }
function demandScore(state, a, b, date) { const path = findTransferPath(state, a, b); if (!path) return 0; const firstLeg = route(path[0], path[1]); return seasonBand(date)[1] * timeBand(date) * (ports[a].intensity || 0.6) * distanceDemandFactor(firstLeg.distanceKm); }
function generate(state, minutes) {
  const date = gameDate(state);
  for (const origin of state.unlocked || []) for (const destination of state.unlocked || []) {
    if (origin === destination || !findTransferPath(state, origin, destination)) continue;
    const total = frac(state, origin, destination) + minutes * 0.85 * demandScore(state, origin, destination, date);
    const created = Math.floor(total);
    if (created) setQueue(state, origin, destination, queueCount(state, origin, destination) + created);
    setFrac(state, origin, destination, total - created);
  }
}
function target(v) { return Math.ceil(TYPES[v.type].capacity * v.fullness / 100); }
function board(state, v) {
  if (v.st !== 'boarding' || !v.dst) return;
  let free = TYPES[v.type].capacity - v.pas;
  const candidates = (state.unlocked || []).filter(final => final !== v.loc && queueCount(state, v.loc, final) > 0 && nextHop(state, v.loc, final) === v.dst).sort((a, b) => Number(a !== v.dst) - Number(b !== v.dst));
  for (const final of candidates) {
    if (free <= 0) break;
    const count = Math.min(free, queueCount(state, v.loc, final));
    setQueue(state, v.loc, final, queueCount(state, v.loc, final) - count);
    (v.manifest ??= {})[final] = (v.manifest[final] || 0) + count;
    v.pas += count; free -= count;
  }
}
function depart(state, v, summary) {
  if (v.st !== 'boarding' || !v.dst || !v.pas || v.pas < target(v)) return false;
  const revenue = v.pas * fareFor(v.loc, v.dst, gameDate(state));
  state.cash += revenue; summary.revenue += revenue;
  v.lastRevenue = revenue; v.currentOp = 0; v.st = 'sailing'; v.p = 0;
  return true;
}
function arrive(state, v, summary) {
  const currentRoute = route(v.loc, v.dst);
  v.lastOp = v.currentOp; v.totalKm += currentRoute.distanceKm; v.kmMaint += currentRoute.distanceKm;
  summary.trips += 1; summary.passengers += v.pas;
  if (v.kmMaint >= MAINT_EVERY) {
    const count = Math.floor(v.kmMaint / MAINT_EVERY);
    const cost = count * MAINT_COST;
    state.cash -= cost; summary.costs += cost; summary.maintenance += count;
    v.kmMaint %= MAINT_EVERY;
  }
  const arrived = v.dst;
  for (const [final, count] of Object.entries(v.manifest || {})) if (final !== arrived && count > 0) setQueue(state, arrived, final, queueCount(state, arrived, final) + count);
  v.loc = arrived; v.p = 0; v.pas = 0; v.manifest = {}; v.currentOp = 0;
  if (v.autoTour && v.pair) { v.dst = v.pair[0] === v.loc ? v.pair[1] : v.pair[0]; v.st = 'boarding'; }
  else { v.dst = null; v.pair = null; v.st = 'idle'; }
}
function simulateMinute(state, summary) {
  state.m += 1; generate(state, 1);
  for (const v of state.vehicles || []) {
    if (!v.autoTour) continue;
    if (v.st === 'boarding') {
      state.cash -= DOCK_TAX; summary.costs += DOCK_TAX;
      board(state, v); depart(state, v, summary);
    } else if (v.st === 'sailing' && v.dst) {
      const currentRoute = route(v.loc, v.dst);
      if (!currentRoute) continue;
      const oldProgress = v.p;
      const tripMinutes = currentRoute.durationMinutes * 35 / TYPES[v.type].speed;
      v.p = Math.min(1, v.p + 1 / tripMinutes);
      const distance = (v.p - oldProgress) * currentRoute.distanceKm;
      const loadRatio = v.pas / TYPES[v.type].capacity;
      const cost = distance * TYPES[v.type].opKm * (1 + LOAD_COST_MAX * loadRatio);
      v.currentOp += cost; state.cash -= cost; summary.costs += cost;
      if (v.p >= 1) arrive(state, v, summary);
    }
  }
}
function formatDuration(seconds) { const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours} sa ${minutes} dk` : `${Math.max(1, minutes)} dk`; }
function formatMoney(value) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value); }

function applyOfflineProgress() {
  const raw = localStorage.getItem(SAVE_KEY);
  const hiddenAt = Number(localStorage.getItem(HIDDEN_AT_KEY));
  if (!raw || !hiddenAt) return false;
  const state = JSON.parse(raw);
  const elapsedRealSeconds = Math.min(MAX_REAL_SECONDS, Math.max(0, (Date.now() - hiddenAt) / 1000));
  const speed = Number(state.s || 0);
  if (elapsedRealSeconds < 5 || speed <= 0) return false;
  const gameMinutes = Math.floor(elapsedRealSeconds * speed);
  const summary = { elapsedRealSeconds, gameMinutes, trips: 0, passengers: 0, revenue: 0, costs: 0, maintenance: 0 };
  for (let minute = 0; minute < gameMinutes; minute++) simulateMinute(state, summary);
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
  return true;
}

const progressedOnLoad = applyOfflineProgress();
localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));

function showSummary() {
  const raw = sessionStorage.getItem(SUMMARY_KEY);
  if (!raw) return;
  sessionStorage.removeItem(SUMMARY_KEY);
  const summary = JSON.parse(raw), net = summary.revenue - summary.costs;
  const card = document.createElement('div');
  card.className = 'idle-summary';
  card.innerHTML = `<button aria-label="Kapat">×</button><strong>${formatDuration(summary.elapsedRealSeconds)} uzaktaydın</strong><span>${summary.trips} sefer · ${summary.passengers} yolcu</span><span>${formatMoney(summary.revenue)} gelir · ${formatMoney(summary.costs)} gider</span><b>Net ${formatMoney(net)}</b>`;
  card.querySelector('button').onclick = () => card.remove();
  document.body.appendChild(card);
  setTimeout(() => card.remove(), 12000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSummary, { once: true }); else showSummary();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
    return;
  }
  if (applyOfflineProgress()) location.reload();
  else localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
});
window.addEventListener('pagehide', () => localStorage.setItem(HIDDEN_AT_KEY, String(Date.now())));

export { progressedOnLoad };
