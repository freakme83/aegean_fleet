export class RouteEngine {
  constructor({ nodes, routeData }) {
    this.nodes = nodes;
    this.routeData = routeData;
  }

  static async load({ nodesUrl = './data/ports.json', routesUrl = './data/routes.json' } = {}) {
    const [nodesResponse, routesResponse] = await Promise.all([fetch(nodesUrl), fetch(routesUrl)]);
    if (!nodesResponse.ok) throw new Error(`Transport nodes could not be loaded: ${nodesResponse.status}`);
    if (!routesResponse.ok) throw new Error(`Routes could not be loaded: ${routesResponse.status}`);
    return new RouteEngine({ nodes: await nodesResponse.json(), routeData: await routesResponse.json() });
  }

  getNode(id) {
    const node = this.nodes[id];
    if (!node) throw new Error(`Unknown transport node: ${id}`);
    return node;
  }

  hasRoute({ mode, origin, destination }) {
    if (mode === 'air') return true;
    const routes = this.routeData.routes || {};
    return Boolean(routes[`${origin}-${destination}`]?.mode === mode || routes[`${destination}-${origin}`]?.mode === mode);
  }

  getRoute({ mode, origin, destination }) {
    const directId = `${origin}-${destination}`;
    const reverseId = `${destination}-${origin}`;
    const direct = this.routeData.routes[directId];
    if (direct && direct.mode === mode) return structuredClone(direct);
    const reverse = this.routeData.routes[reverseId];
    if (reverse && reverse.mode === mode) {
      return { ...structuredClone(reverse), id: directId, origin, destination, waypoints: [...reverse.waypoints].reverse(), nodePath: reverse.nodePath ? [...reverse.nodePath].reverse() : undefined };
    }
    if (mode === 'air') return this.createAirRoute(origin, destination);
    throw new Error(`No ${mode} route from ${origin} to ${destination}`);
  }

  createAirRoute(origin, destination, segments = 24) {
    const from = this.getNode(origin).terminal;
    const to = this.getNode(destination).terminal;
    const waypoints = [];
    for (let i = 0; i <= segments; i += 1) {
      const ratio = i / segments;
      waypoints.push([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]);
    }
    return { id: `${origin}-${destination}`, mode: 'air', origin, destination, source: 'generated-air-route', waypoints };
  }
}
