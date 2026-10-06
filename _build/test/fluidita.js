// Uso: node _build/test/fluidita.js (BASE=url per il sito online). Telefono simulato, CPU rallentata 4x: lavori lunghi all'apertura e mentre si scorre.
// misura la fluidità dello scorrimento: fotogrammi lenti e lavori lunghi, su telefono simulato con CPU rallentata
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const PAG = (process.env.PAG || ',lezioni.html,istruttori.html,prezzi.html,studio.html,orario.html').split(',');
(async () => {
  const b = await pw.chromium.launch();
  for (const pg of PAG) {
    const c = await b.newContext({ ...pw.devices['iPhone 13'] }); const p = await c.newPage();
    const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.addInitScript(() => {
      window.__lunghi = []; window.__frame = [];
      try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lunghi.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    });
    await p.goto(base + pg + (pg.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const caricamento = await p.evaluate(() => window.__lunghi.slice());
    await p.evaluate(() => { window.__lunghi = []; let t = performance.now(); const f = n => { window.__frame.push(n - t); t = n; if (window.__misura) requestAnimationFrame(f); }; window.__misura = true; requestAnimationFrame(f); });
    const alt = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < alt; y += 120) { await p.mouse.wheel(0, 120); await p.waitForTimeout(16); }
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { window.__misura = false; const f = window.__frame.slice(5); const s = [...f].sort((a, b) => a - b); return { n: f.length, lenti: f.filter(x => x > 50).length, p95: Math.round(s[Math.floor(s.length * .95)] || 0), max: Math.round(s[s.length - 1] || 0), lunghi: window.__lunghi.slice() }; });
    console.log(`${(pg || 'home').padEnd(16)} carico: lavori lunghi ${caricamento.length ? caricamento.join('/') + ' ms' : 'nessuno'} | scorrendo: ${r.n} fotogrammi, lenti(>50ms) ${r.lenti}, p95 ${r.p95} ms, max ${r.max} ms, lavori lunghi ${r.lunghi.length ? r.lunghi.join('/') + ' ms' : 'nessuno'}`);
    await c.close();
  }
  await b.close();
})();
