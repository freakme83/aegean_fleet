import fs from 'node:fs/promises';

const graph = JSON.parse(await fs.readFile(new URL('./navigation-graph.json', import.meta.url), 'utf8'));

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function buildAdjacency() {
  const adjacency = new Map(Object.keys(graph.nodes).map((id) => [id, []]));
  for (const [a, b] of graph.edges) {
    const distanceKm = haversineKm(graph.nodes[a], graph.nodes[b]);
    adjacency.get(a).push({ id: b, distanceKm });
    adjacency.get(b).push({ id: a, distanceKm });
  }
  return adjacency;
}

function shortestPath(start, goal) {
  const adjacency = buildAdjacency();
  const distance = new Map(Object.keys(graph.nodes).map((id) => [id, Infinity]));
  const previous = new Map();
  const unvisited = new Set(Object.keys(graph.nodes));
  distance.set(start, 0);

  while (unvisited.size > 0) {
    let current = null;
    for (const id of unvisited) {
      if (current === null || distance.get(id) < distance.get(current)) current = id;
    }
    if (current === null || distance.get(current) === Infinity) break;
    if (current === goal) break;
    unvisited.delete(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!unvisited.has(neighbor.id)) continue;
      const candidate = distance.get(current) + neighbor.distanceKm;
      if (candidate < distance.get(neighbor.id)) {
        distance.set(neighbor.id, candidate);
        previous.set(neighbor.id, current);
      }
    }
  }

  const path = [];
  let cursor = goal;
  while (cursor) {
    path.unshift(cursor);
    if (cursor === start) break;
    cursor = previous.get(cursor);
  }
  if (path[0] !== start) throw new Error(`No sea route from ${start} to ${goal}`);
  return { path, distanceKm: distance.get(goal) };
}

const { path, distanceKm } = shortestPath('ayvalik-terminal', 'mytilene-terminal');
const route = {
  version: 1,
  generatedAt: new Date().toISOString(),
  routes: {
    'ayvalik-mytilene': {
      id: 'ayvalik-mytilene',
      mode: 'sea',
      origin: 'ayvalik',
      destination: 'mytilene',
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMinutes: 55,
      source: 'navigation-graph',
      nodePath: path,
      waypoints: path.map((id) => graph.nodes[id])
    }
  }
};

const target = new URL('../data/routes.json', import.meta.url);
await fs.writeFile(target, `${JSON.stringify(route, null, 2)}\n`, 'utf8');
console.log(`Generated ${target.pathname}: ${path.join(' -> ')}`);
