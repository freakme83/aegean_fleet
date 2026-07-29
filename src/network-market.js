(() => {
  const SAVE_KEYS = ['aegean-fleet-fleet-v5', 'aegean-fleet-fleet-v4'];
  const LINE_ID = 'chios-mytilene';
  const originalFetch = window.fetch.bind(window);
  function readState() {
    for (const key of SAVE_KEYS) {
      try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }
  function lineOpen(state) { return Array.isArray(state?.openedLines) && state.openedLines.includes(LINE_ID); }
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0]?.url || args[0] || '');
    if (!url.includes('data/routes.json')) return response;
    const data = await response.clone().json();
    if (!lineOpen(readState())) delete data.routes?.[LINE_ID];
    return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: { 'Content-Type': 'application/json' } });
  };
})();