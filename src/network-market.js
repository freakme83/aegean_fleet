(() => {
  const SAVE_KEYS = ['aegean-fleet-fleet-v4', 'aegean-fleet-fleet-v3'];
  const LINE_ID = 'chios-mytilene';
  const LINE_COST = 30000;
  const originalFetch = window.fetch.bind(window);

  function readState() {
    for (const key of SAVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return { key, state: JSON.parse(raw) };
      } catch {}
    }
    return { key: SAVE_KEYS[0], state: null };
  }

  function lineOpen(state) {
    return Array.isArray(state?.openedLines) && state.openedLines.includes(LINE_ID);
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0]?.url || args[0] || '');
    if (!url.includes('data/routes.json')) return response;
    const data = await response.clone().json();
    const { state } = readState();
    if (!lineOpen(state)) delete data.routes?.[LINE_ID];
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  function routeExists(a, b, state) {
    const base = new Set(['ayvalik-mytilene', 'ayvalik-cesme', 'cesme-chios']);
    if (lineOpen(state)) base.add(LINE_ID);
    return base.has([a, b].sort().join('-'));
  }

  function nextHop(origin, destination, state) {
    if (origin === destination) return null;
    if (routeExists(origin, destination, state)) return destination;
    const ports = (state?.unlocked || []).filter(Boolean);
    const queue = [[origin]];
    const visited = new Set([origin]);
    while (queue.length) {
      const path = queue.shift();
      const current = path.at(-1);
      for (const next of ports) {
        if (next === current || visited.has(next) || !routeExists(current, next, state)) continue;
        const nextPath = [...path, next];
        if (next === destination) return nextPath[1];
        visited.add(next);
        queue.push(nextPath);
      }
    }
    return null;
  }

  function addBreakdowns() {
    const { state } = readState();
    if (!state?.w) return;
    const names = { ayvalik: 'Ayvalık', mytilene: 'Midilli', cesme: 'Çeşme', chios: 'Sakız' };
    for (const origin of state.unlocked || []) {
      const box = document.getElementById(`pv-${origin}`);
      if (!box) continue;
      box.querySelectorAll('.transfer-breakdown').forEach(node => node.remove());
      const directTargets = (state.unlocked || []).filter(next => next !== origin && routeExists(origin, next, state));
      const mainRows = [...box.querySelectorAll(':scope > div')].filter(row => row.textContent.includes('yönü için bekliyor'));
      directTargets.forEach((next, index) => {
        const parts = [];
        for (const final of state.unlocked || []) {
          if (final === origin || final === next) continue;
          const count = state.w?.[origin]?.[final] || 0;
          if (count > 0 && nextHop(origin, final, state) === next) parts.push(`${count} ${names[final] || final}`);
        }
        if (!parts.length || !mainRows[index]) return;
        const detail = document.createElement('div');
        detail.className = 'transfer-breakdown';
        detail.textContent = `${parts.join(', ')} yolcusu dahil`;
        mainRows[index].after(detail);
      });
    }
  }

  function renderLineMarket() {
    const market = document.getElementById('marketPanel');
    const cards = document.getElementById('marketCards');
    if (!market || !cards) return;
    let section = document.getElementById('lineMarket');
    if (!section) {
      section = document.createElement('div');
      section.id = 'lineMarket';
      cards.after(section);
    }
    const { key, state } = readState();
    const chiosOpen = state?.unlocked?.includes('chios');
    const opened = lineOpen(state);
    const cash = Number(state?.cash || 0);
    section.innerHTML = `<div class="line-market-title">Yeni hatlar</div><div class="market-card line-card"><h3>Sakız ↔ Midilli</h3><div class="market-meta">Doğrudan deniz hattı · Aktarmalı yolcular bu hat açılınca direkt sefere geçer.</div><button id="buyChiosMytilene" ${opened || !chiosOpen || cash < LINE_COST ? 'disabled' : ''}>${opened ? 'Hat açık' : !chiosOpen ? 'Önce Sakız hattını aç' : cash < LINE_COST ? `€${Math.ceil(LINE_COST - cash).toLocaleString('tr-TR')} daha gerekli` : '€30.000 karşılığında hattı aç'}</button></div>`;
    const button = document.getElementById('buyChiosMytilene');
    if (button && !button.disabled) button.onclick = () => {
      const latest = readState();
      if (!latest.state || latest.state.cash < LINE_COST || !latest.state.unlocked?.includes('chios')) return;
      latest.state.cash -= LINE_COST;
      latest.state.openedLines = [...new Set([...(latest.state.openedLines || []), LINE_ID])];
      localStorage.setItem(latest.key, JSON.stringify(latest.state));
      location.reload();
    };
  }

  const style = document.createElement('style');
  style.textContent = `.transfer-breakdown{margin:-1px 0 4px 0;color:#93a1aa;font-size:10px;font-style:italic}.line-market-title{margin:18px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8ea0ab;font-weight:800}.line-card{border:1px dashed #ccd8de}`;
  document.head.appendChild(style);

  setInterval(() => {
    addBreakdowns();
    if (!document.getElementById('marketPanel')?.hidden) renderLineMarket();
  }, 350);
})();