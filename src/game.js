import { RouteEngine } from './route-engine.js';

const engine = await RouteEngine.load();
const PORT_IDS = Object.values(engine.nodes).filter(node => node.type === 'port').map(node => node.id);
const TYPES = {
  coastal60: { name: 'Coastal Ferry 60', capacity: 60, speed: 35, range: 180, opKm: 6.5, price: 35000 },
  swift80: { name: 'HSC Aegean Swift 80', capacity: 80, speed: 55, range: 260, opKm: 9.5, price: 85000 }
};
const C = { base: 0.24, key: 'aegean-fleet-fleet-v2', old: 'aegean-fleet-fleet-v1', start: new Date(2020, 4, 1, 8), dockTax: 0.08, maintEvery: 500, maintCost: 180, startCash: 2000 };
const SUMMER_FARES = { 'ayvalik-mytilene': 25, 'ayvalik-cesme': 32, 'cesme-mytilene': 36 };
const SEASON_FARE_MULTIPLIERS = { summer: 1, shoulder: 0.92, low: 0.81, winter: 0.72 };
const ports = Object.fromEntries(PORT_IDS.map(id => [id, engine.getNode(id)]));
const q = id => document.getElementById(id);
const route = (a, b) => engine.getRoute({ mode: 'sea', origin: a, destination: b });
const routeKey = (a, b) => [a, b].sort().join('-');

function hasDirectRoute(a, b) {
  const routes = engine.routeData?.routes || {};
  return Boolean(routes[`${a}-${b}`] || routes[`${b}-${a}`]);
}
function seasonBand(date) {
  const month = date.getMonth() + 1;
  if ([6, 7, 8].includes(month)) return ['Yaz sezonu', 'summer', 1.35];
  if ([5, 9].includes(month)) return ['Ara sezon', 'shoulder', 1];
  if ([4, 10].includes(month)) return ['Sakin sezon', 'low', 0.45];
  return ['Kış sezonu', 'winter', 0.18];
}
function fareFor(a, b, date = now()) {
  const base = SUMMER_FARES[routeKey(a, b)] ?? Math.round(18 + route(a, b).distanceKm * 0.13);
  const [, seasonId] = seasonBand(date);
  return Math.round(base * SEASON_FARE_MULTIPLIERS[seasonId]);
}
function findTransferPath(origin, destination) {
  if (origin === destination) return [origin];
  if (hasDirectRoute(origin, destination)) return [origin, destination];
  const available = S.unlocked.filter(id => PORT_IDS.includes(id));
  const paths = [[origin]];
  const visited = new Set([origin]);
  while (paths.length) {
    const path = paths.shift();
    const current = path.at(-1);
    for (const next of available) {
      if (next === current || visited.has(next) || !hasDirectRoute(current, next)) continue;
      const nextPath = [...path, next];
      if (next === destination) return nextPath;
      visited.add(next);
      paths.push(nextPath);
    }
  }
  return null;
}
const nextHop = (origin, finalDestination) => findTransferPath(origin, finalDestination)?.[1] || null;
function newVehicle(id, type = 'coastal60', name = 'MV Ege') {
  return { id, type, name, loc: 'ayvalik', dst: null, pair: null, st: 'idle', pas: 0, manifest: {}, p: 0, fullness: 80, autoTour: false, plannedDst: '', lastRevenue: 0, lastOp: 0, currentOp: 0, kmMaint: 0, totalKm: 0 };
}
function fresh() {
  return {
    m: 0, s: 1, cash: C.startCash, unlocked: ['ayvalik', 'mytilene'], vehicles: [newVehicle('v1')], selected: 'v1',
    w: { ayvalik: { mytilene: 4, cesme: 0 }, mytilene: { ayvalik: 3, cesme: 0 }, cesme: { ayvalik: 0, mytilene: 0 } }, fr: {}, v: 2
  };
}
let S = fresh(), markers = {}, shipMarkers = {}, routeLine = L.polyline([], { color: '#315f78', weight: 3, opacity: 0.75, dashArray: '8 10' }), lf = performance.now(), ls = -1, tt;
const E = {
  date: q('date'), season: q('season'), time: q('time'), cash: q('cash'), fleetPanel: q('fleetPanel'), marketPanel: q('marketPanel'), vehicleSelect: q('vehicleSelect'), status: q('status'), routeBadge: q('routeBadge'), onb: q('onb'), capacity: q('capacity'), lastRevenue: q('lastRevenue'), operation: q('operation'), maint: q('maint'), destination: q('destination'), startTrip: q('startTrip'), unlock: q('unlockCesme'), fareText: q('fareText'), fullness: q('fullness'), fullnessText: q('fullnessText'), autoTour: q('autoTour'), progressLabel: q('progressLabel'), goal: q('goal'), fill: q('fill'), marketCards: q('marketCards'), toast: q('toast'), reset: q('reset'), rangeBadge: q('rangeBadge')
};
const map = L.map('map', { center: [39.0, 26.45], zoom: 9, minZoom: 7, maxZoom: 13, zoomControl: false, attributionControl: false });
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 13 }).addTo(map);
L.control.zoom({ position: 'bottomleft' }).addTo(map);
routeLine.addTo(map);
const vehicle = () => S.vehicles.find(v => v.id === S.selected) || S.vehicles[0];
const spec = v => TYPES[v.type];
const unlocked = id => S.unlocked.includes(id);
function money(value) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value); }
function toast(message) { E.toast.textContent = message; E.toast.classList.add('s'); clearTimeout(tt); tt = setTimeout(() => E.toast.classList.remove('s'), 3000); }
function now() { return new Date(C.start.getTime() + S.m * 60000); }
function timeBand(date) { const hour = date.getHours() + date.getMinutes() / 60; return hour >= 23 || hour < 7 ? ['Gece talebi', 0.15] : ['Gündüz talebi', 1]; }
function demandScore(origin, destination, date = now()) {
  const path = findTransferPath(origin, destination);
  if (!path) return 0;
  const totalDistance = path.slice(0, -1).reduce((sum, stop, index) => sum + route(stop, path[index + 1]).distanceKm, 0);
  return seasonBand(date)[2] * timeBand(date)[1] * (ports[origin].intensity || 0.6) * Math.max(0.55, Math.min(1.15, 70 / totalDistance));
}
function level(value) { return value >= 1.15 ? 'Çok yoğun' : value >= 0.8 ? 'Yoğun' : value >= 0.5 ? 'Normal' : value >= 0.25 ? 'Sakin' : 'Çok sakin'; }
function queueCount(a, finalDestination) { return S.w[a]?.[finalDestination] ?? 0; }
function setQueue(a, finalDestination, count) { (S.w[a] ??= {})[finalDestination] = Math.max(0, Math.round(count)); }
function frac(a, b) { return S.fr[`${a}:${b}`] || 0; }
function setFrac(a, b, value) { S.fr[`${a}:${b}`] = value; }
function target(v) { return Math.ceil(spec(v).capacity * v.fullness / 100); }
function pIcon(id, index) {
  const locked = !unlocked(id), side = index === 1 ? 'l' : 'r', name = ports[id].name;
  return L.divIcon({ className: '', html: `<div class="ps ${side} ${locked ? 'locked' : ''}"><div class="pd"></div><div class="pc"><div class="pt">${name}${locked ? ' · Kilitli' : ''}</div><div class="pv" id="pv-${id}"></div></div></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}
PORT_IDS.forEach((id, index) => markers[id] = L.marker(ports[id].terminal, { icon: pIcon(id, index), zIndexOffset: 400 }).addTo(map));
function shipIcon() { return L.divIcon({ className: '', html: '<div class="sc">⛴</div>', iconSize: [30, 30], iconAnchor: [15, 15] }); }
function addVehicleMarker(v) {
  const marker = L.marker(ports[v.loc].terminal, { icon: shipIcon(), zIndexOffset: 1000 }).addTo(map).bindTooltip(v.name, { permanent: true, direction: 'top', offset: [0, -16], className: 'sl' });
  marker.on('click', () => { S.selected = v.id; showView('fleet'); render(); });
  shipMarkers[v.id] = marker;
}
function rebuildShips() { Object.values(shipMarkers).forEach(marker => marker.remove()); shipMarkers = {}; S.vehicles.forEach(addVehicleMarker); }
function rebuildPortIcons() { PORT_IDS.forEach((id, index) => markers[id].setIcon(pIcon(id, index))); }
function generate(minutes) {
  const date = now();
  for (const origin of S.unlocked) for (const destination of S.unlocked) {
    if (origin === destination || !findTransferPath(origin, destination)) continue;
    const total = frac(origin, destination) + minutes * C.base * demandScore(origin, destination, date), created = Math.floor(total);
    if (created) setQueue(origin, destination, queueCount(origin, destination) + created);
    setFrac(origin, destination, total - created);
  }
}
function board(v) {
  if (v.st !== 'boarding' || !v.dst) return;
  let remaining = spec(v).capacity - v.pas;
  const candidates = S.unlocked.filter(finalDestination => finalDestination !== v.loc && queueCount(v.loc, finalDestination) > 0 && nextHop(v.loc, finalDestination) === v.dst).sort((a, b) => Number(a !== v.dst) - Number(b !== v.dst));
  for (const finalDestination of candidates) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, queueCount(v.loc, finalDestination));
    setQueue(v.loc, finalDestination, queueCount(v.loc, finalDestination) - amount);
    v.manifest[finalDestination] = (v.manifest[finalDestination] || 0) + amount;
    v.pas += amount;
    remaining -= amount;
  }
  if (v.pas >= target(v)) depart(v);
}
function depart(v) {
  if (v.st !== 'boarding' || !v.dst || !v.pas) return;
  v.lastRevenue = v.pas * fareFor(v.loc, v.dst);
  S.cash += v.lastRevenue;
  v.currentOp = 0; v.st = 'sailing'; v.p = 0;
  toast(`${ports[v.loc].name} çıkışı · ${v.pas} yolcu · ${money(v.lastRevenue)} gelir`);
}
function arrive(v) {
  const r = route(v.loc, v.dst);
  v.lastOp = v.currentOp; v.totalKm += r.distanceKm; v.kmMaint += r.distanceKm;
  if (v.kmMaint >= C.maintEvery) { S.cash -= C.maintCost; v.kmMaint %= C.maintEvery; toast(`${v.name}: bakım yapıldı · ${money(C.maintCost)}`); }
  const arrivedPort = v.dst;
  for (const [finalDestination, count] of Object.entries(v.manifest || {})) if (finalDestination !== arrivedPort && count > 0) setQueue(arrivedPort, finalDestination, queueCount(arrivedPort, finalDestination) + count);
  v.loc = arrivedPort; v.p = 0; v.pas = 0; v.manifest = {}; v.currentOp = 0;
  if (v.autoTour && v.pair) { v.dst = v.pair[0] === v.loc ? v.pair[1] : v.pair[0]; v.st = 'boarding'; board(v); }
  else { v.dst = null; v.pair = null; v.st = 'idle'; }
  refreshRouteLine();
}
function pos(v) {
  const points = route(v.loc, v.dst).waypoints;
  if (v.p <= 0) return points[0];
  if (v.p >= 1) return points.at(-1);
  const lengths = []; let total = 0;
  for (let i = 0; i < points.length - 1; i++) { const length = L.latLng(points[i]).distanceTo(points[i + 1]); lengths.push(length); total += length; }
  let targetDistance = total * v.p;
  for (let i = 0; i < lengths.length; i++) {
    if (targetDistance <= lengths[i]) { const ratio = targetDistance / lengths[i]; return [points[i][0] + (points[i + 1][0] - points[i][0]) * ratio, points[i][1] + (points[i + 1][1] - points[i][1]) * ratio]; }
    targetDistance -= lengths[i];
  }
  return points.at(-1);
}
function step(gameMinutes) {
  if (!gameMinutes) return;
  S.m += gameMinutes; generate(gameMinutes);
  for (const v of S.vehicles) {
    if (v.st === 'boarding') { S.cash -= gameMinutes * C.dockTax; board(v); }
    else if (v.st === 'sailing') {
      const r = route(v.loc, v.dst), oldProgress = v.p, tripMinutes = r.durationMinutes * 35 / spec(v).speed;
      v.p = Math.min(1, v.p + gameMinutes / tripMinutes);
      const distance = (v.p - oldProgress) * r.distanceKm, cost = distance * spec(v).opKm;
      v.currentOp += cost; S.cash -= cost;
      if (v.p >= 1) arrive(v);
    }
  }
  const minute = Math.floor(S.m);
  if (minute !== ls && minute % 5 === 0) { save(); ls = minute; }
}
function refreshRouteLine() { const v = vehicle(); routeLine.setLatLngs(v.dst ? route(v.loc, v.dst).waypoints : []); }
function destinationOptions() {
  const v = vehicle(), options = ['<option value="">Varış limanı seç</option>'];
  for (const id of S.unlocked) {
    if (id === v.loc || !hasDirectRoute(v.loc, id)) continue;
    const r = route(v.loc, id);
    if (r.distanceKm <= spec(v).range) options.push(`<option value="${id}">${ports[v.loc].name} → ${ports[id].name} · ${r.distanceKm.toFixed(0)} km · ${money(fareFor(v.loc, id))}</option>`);
  }
  E.destination.innerHTML = options.join(''); E.destination.value = v.plannedDst || ''; E.destination.disabled = v.st !== 'idle'; E.startTrip.disabled = v.st !== 'idle' || !v.plannedDst;
}
function startManualTrip() {
  const v = vehicle(), destination = v.plannedDst;
  if (v.st !== 'idle' || !destination) return;
  v.dst = destination; v.pair = v.autoTour ? [v.loc, destination] : null; v.st = 'boarding'; v.pas = 0; v.manifest = {}; v.plannedDst = '';
  refreshRouteLine(); board(v); render(); save(); toast(`${v.name}: ${ports[v.loc].name} → ${ports[destination].name} seferi hazır`);
}
function updatePortHover() {
  for (const id of PORT_IDS) {
    const element = document.getElementById(`pv-${id}`);
    if (!element) continue;
    if (!unlocked(id)) { element.innerHTML = 'Açılış maliyeti: <strong>€20.000</strong>'; continue; }
    const rows = [];
    for (const destination of S.unlocked) {
      if (destination === id) continue;
      const path = findTransferPath(id, destination);
      if (!path) continue;
      const transferLabel = path.length > 2 ? ` · aktarma: ${path.slice(1, -1).map(p => ports[p].name).join(', ')}` : '';
      rows.push(`<div><strong>${queueCount(id, destination)}</strong> yolcu ${ports[destination].name} için bekliyor${transferLabel}.</div>`);
    }
    const scores = S.unlocked.filter(x => x !== id).map(x => demandScore(id, x)).filter(Boolean);
    rows.push(`<div class="pp">Talep: ${level(scores.length ? Math.max(...scores) : 0)}</div>`);
    for (const ship of S.vehicles) if (ship.loc === id && ship.st !== 'sailing') rows.push(`<div class="pg v">${ship.name} bu limanda</div>`);
    element.innerHTML = rows.join('');
  }
}
function renderMarket() {
  E.marketCards.innerHTML = Object.entries(TYPES).map(([id, type]) => {
    const canBuy = S.cash >= type.price;
    return `<div class="market-card"><h3>${type.name}</h3><div class="market-meta">Kapasite: ${type.capacity} · Hız: ${type.speed} km/sa · Menzil: ${type.range} km · Operasyon: €${type.opKm.toFixed(2)}/km</div><button data-buy="${id}" ${canBuy ? '' : 'disabled'}>${canBuy ? `${money(type.price)} karşılığında satın al` : `${money(type.price - S.cash)} daha gerekli`}</button></div>`;
  }).join('');
  document.querySelectorAll('[data-buy]').forEach(button => button.onclick = () => buyShip(button.dataset.buy));
}
function buyShip(typeId) {
  const type = TYPES[typeId];
  if (S.cash < type.price) return;
  S.cash -= type.price;
  const number = S.vehicles.length + 1, id = `v${number}`;
  S.vehicles.push(newVehicle(id, typeId, typeId === 'swift80' ? 'MV Hızır' : `MV Ege ${number}`));
  S.selected = id; rebuildShips(); showView('fleet'); render(); save(); toast(`${S.vehicles.at(-1).name} filoya katıldı.`);
}
function showView(view) {
  E.fleetPanel.hidden = view !== 'fleet'; E.marketPanel.hidden = view !== 'market';
  document.querySelectorAll('.navtab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'market') renderMarket();
}
function render() {
  const v = vehicle(), type = spec(v), date = now(), [seasonName] = seasonBand(date), [timeName] = timeBand(date), percentage = Math.round(v.pas / type.capacity * 100);
  E.date.textContent = `${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)} · ${new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(date)}`;
  E.season.textContent = seasonName; E.time.textContent = timeName; E.cash.textContent = money(S.cash);
  E.vehicleSelect.innerHTML = S.vehicles.map(item => `<option value="${item.id}" ${item.id === v.id ? 'selected' : ''}>${item.name}</option>`).join('');
  E.status.textContent = v.st === 'idle' ? `${ports[v.loc].name}'ta bekliyor · yolcu almıyor` : v.st === 'boarding' ? `${ports[v.loc].name}'ta yolcu alıyor · vergi işliyor` : `${ports[v.dst].name}'e seyrediyor`;
  E.routeBadge.textContent = v.pair ? `${ports[v.pair[0]].name} ↔ ${ports[v.pair[1]].name}` : v.dst ? `${ports[v.loc].name} → ${ports[v.dst].name}` : 'Sefer yok';
  E.onb.textContent = v.pas; E.capacity.textContent = type.capacity; E.lastRevenue.textContent = money(v.lastRevenue); E.operation.textContent = money(v.st === 'sailing' ? v.currentOp : v.lastOp); E.maint.textContent = `${Math.floor(v.kmMaint)}/${C.maintEvery}`;
  E.fareText.textContent = v.dst ? money(fareFor(v.loc, v.dst, date)) : v.plannedDst ? money(fareFor(v.loc, v.plannedDst, date)) : 'Hat seçilmedi';
  E.fullness.value = v.fullness; E.fullnessText.textContent = `%${v.fullness}`; E.autoTour.checked = v.autoTour; E.rangeBadge.textContent = `Menzil ${type.range} km`; E.goal.textContent = `Hedef: ${target(v)} yolcu`; E.progressLabel.textContent = `Kalkış hedefi: %${percentage}`; E.fill.style.width = `${Math.min(100, percentage)}%`;
  for (const ship of S.vehicles) shipMarkers[ship.id].setLatLng(ship.st === 'sailing' ? pos(ship) : ports[ship.loc].terminal);
  destinationOptions(); E.unlock.hidden = unlocked('cesme'); E.unlock.disabled = S.cash < 20000 || v.st !== 'idle'; E.unlock.textContent = S.cash >= 20000 ? 'Çeşme Limanı’nı aç · €20.000' : `Çeşme için ${money(Math.max(0, 20000 - S.cash))} daha gerekli`;
  updatePortHover(); document.querySelectorAll('[data-s]').forEach(button => button.classList.toggle('a', Number(button.dataset.s) === S.s)); renderMarket();
}
E.destination.onchange = () => { const v = vehicle(); v.plannedDst = E.destination.value; E.startTrip.disabled = !v.plannedDst; render(); save(); };
E.startTrip.onclick = startManualTrip;
E.vehicleSelect.onchange = () => { S.selected = E.vehicleSelect.value; refreshRouteLine(); render(); save(); };
E.autoTour.onchange = () => { const v = vehicle(); v.autoTour = E.autoTour.checked; if (v.st === 'boarding' && v.dst) v.pair = v.autoTour ? [v.loc, v.dst] : null; render(); save(); };
E.unlock.onclick = () => { const v = vehicle(); if (S.cash < 20000 || v.st !== 'idle') return; S.cash -= 20000; S.unlocked.push('cesme'); rebuildPortIcons(); render(); save(); toast('Çeşme Limanı açıldı.'); };
E.fullness.oninput = () => { const v = vehicle(); v.fullness = Number(E.fullness.value); if (v.st === 'boarding') board(v); render(); save(); };
document.querySelectorAll('[data-s]').forEach(button => button.onclick = () => { S.s = Number(button.dataset.s); render(); save(); });
document.querySelectorAll('.navtab').forEach(button => button.onclick = () => showView(button.dataset.view));
E.reset.onclick = () => { localStorage.removeItem(C.key); localStorage.removeItem(C.old); S = fresh(); rebuildShips(); refreshRouteLine(); rebuildPortIcons(); showView('fleet'); render(); save(); toast('Oyun sıfırlandı.'); };
function save() { localStorage.setItem(C.key, JSON.stringify(S)); }
function migrateVehicle(v) { const migrated = { ...newVehicle(v.id, v.type, v.name), ...v, manifest: v.manifest || {} }; delete migrated.price; return migrated; }
function load() {
  try {
    const raw = localStorage.getItem(C.key) || localStorage.getItem(C.old);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    S = { ...fresh(), ...parsed };
    S.vehicles = (parsed.vehicles || fresh().vehicles).map(migrateVehicle);
    S.v = 2;
  } catch { S = fresh(); }
}
load(); rebuildShips(); refreshRouteLine(); rebuildPortIcons(); showView('fleet'); render();
function loop(timestamp) { const dt = Math.min(0.25, (timestamp - lf) / 1000); lf = timestamp; if (S.s > 0) step(dt * S.s); render(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
