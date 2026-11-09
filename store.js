/* Opslag voor Ons Huis.
   Met een ingevulde config.js praat dit met jullie Supabase-database (via de functies uit supabase.sql),
   altijd samen met de huiscode. Zonder config draait de app in proefmodus en blijft alles op dit apparaat. */
window.Store = (() => {
  const cfg = window.ONS_HUIS_CONFIG || {};
  const url = (cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = (cfg.supabaseAnonKey || '').trim();
  const remote = !!(url && key);
  const DEMO = 'onshuis-proef';
  let code = null;
  let since = null;

  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: key };
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; // oude 'anon'-sleutel
    let r;
    try {
      r = await fetch(url + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(args) });
    } catch (e) {
      const err = new Error('Geen verbinding met de database');
      err.code = 'offline';
      throw err;
    }
    const txt = await r.text();
    let j = null;
    try { j = txt ? JSON.parse(txt) : null; } catch (_) { /* geen json */ }
    if (!r.ok) {
      const msg = (j && (j.message || j.hint)) || ('Fout ' + r.status);
      const err = new Error(msg);
      err.code = /huiscode/i.test(msg) ? 'bad_code' : 'http';
      throw err;
    }
    return j;
  }

  /* ---- proefmodus: alles in localStorage ---- */
  function load() { try { return JSON.parse(localStorage.getItem(DEMO)) || {}; } catch (_) { return {}; } }
  function save(d) { try { localStorage.setItem(DEMO, JSON.stringify(d)); } catch (_) { /* vol of geblokkeerd */ } }
  let demoSent = false;

  return {
    remote,
    setCode(c) { code = c; since = null; },
    resetSince() { since = null; demoSent = false; },

    /* Haalt alles op dat sinds de vorige keer is veranderd. full=true betekent: complete lijst. */
    async changes() {
      if (!remote) {
        const full = !demoSent;
        demoSent = true;
        if (!full) return { rows: [], full: false };
        const rows = Object.entries(load())
          .filter(([k]) => !k.startsWith('fotobestand/'))
          .map(([k, data]) => { const i = k.indexOf('/'); return { collection: k.slice(0, i), id: k.slice(i + 1), data }; });
        return { rows, full: true };
      }
      const full = since === null;
      const rows = (await rpc('hh_changes', { p_code: code, p_since: since })) || [];
      for (const r of rows) if (!since || r.updated_at > since) since = r.updated_at;
      return { rows, full };
    },

    async set(c, id, data) {
      if (!remote) { const d = load(); d[c + '/' + id] = data; save(d); return; }
      return rpc('hh_set', { p_code: code, p_collection: c, p_id: id, p_data: data });
    },
    async merge(c, id, patch) {
      if (!remote) { const d = load(); d[c + '/' + id] = { ...(d[c + '/' + id] || {}), ...patch }; save(d); return; }
      return rpc('hh_merge', { p_code: code, p_collection: c, p_id: id, p_patch: patch });
    },
    async del(c, id) {
      if (!remote) { const d = load(); delete d[c + '/' + id]; save(d); return; }
      return rpc('hh_delete', { p_code: code, p_collection: c, p_id: id });
    },
    /* Meerdere schrijfacties in één keer: [{op:'set'|'merge', c, id, data}] */
    async batch(ops) {
      if (!remote) {
        const d = load();
        ops.forEach(o => { const k = o.c + '/' + o.id; d[k] = o.op === 'merge' ? { ...(d[k] || {}), ...o.data } : o.data; });
        save(d); return;
      }
      return rpc('hh_batch', { p_code: code, p_ops: ops });
    },
    async get(c, id) {
      if (!remote) return load()[c + '/' + id] || null;
      return rpc('hh_get', { p_code: code, p_collection: c, p_id: id });
    },
  };
})();
