// Tutti gli schermi: scroll laterale, elementi che escono dallo schermo, testo sotto 12px, errori JS,
// su sito, area clienti e app (tutte le sezioni). Uso: node _build/server.js &  poi  node _build/test/schermi.js
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } return c; };
const SCHERMI = [
  ['iPhone SE', pw.devices['iPhone SE']], ['iPhone 13', pw.devices['iPhone 13']], ['iPhone 13 orizz.', pw.devices['iPhone 13 landscape']],
  ['Pixel 7', pw.devices['Pixel 7']], ['iPad vert.', pw.devices['iPad (gen 7)']], ['iPad orizz.', pw.devices['iPad (gen 7) landscape']],
  ['PC 1024', { viewport: { width: 1024, height: 700 } }], ['PC 1920', { viewport: { width: 1920, height: 1080 } }],
];
const PAGINE = ['', 'lezioni.html', 'orario.html', 'istruttori.html', 'prezzi.html', 'regala.html', 'studio.html', 'domande.html', 'area/#benvenuto', 'area/#oggi', 'area/#orario', 'area/#prenotazioni', 'area/#carnet', 'area/#profilo', 'app/#benvenuto', 'app/#oggi', 'app/#orario', 'app/#prenotazioni', 'app/#carnet', 'app/#profilo', 'app/#avvisi', 'app/#installa', 'app/#prova'];
(async () => {
  const b = await pw.chromium.launch();
  for (const [nome, opt] of SCHERMI) {
    const c = await b.newContext(opt), p = await c.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + 'app/#benvenuto'); await p.evaluate(() => { localStorage.clear(); });
    for (const u of PAGINE) {
      if (u === 'area/#oggi' || u === 'app/#oggi') { await p.goto(base + u.split('#')[0] + '#benvenuto'); await p.waitForTimeout(150); if (await p.locator('[data-accesso]').count()) { await p.fill('#f-email', 'chiara.bassi@esempio.it'); await p.fill('#f-pass', 'Respiro100'); await p.click('.accesso [type=submit]'); } }
      await p.goto(base + u); await p.waitForTimeout(250);
      for (let y = 0; y < 9000; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(25); }
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth, out = [];
        if (document.documentElement.scrollWidth > vw + 1) out.push('scroll laterale ' + document.documentElement.scrollWidth + '/' + vw);
        document.querySelectorAll('header a, header button, nav a, .btn, .pill, .lez, .lettino, .giorno, .tondo').forEach(el => {
          const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || el.closest('[hidden]')) return;
          if (el.closest('.w-testa nav, .striscia__track')) return; // menu che scorre / striscia di foto
          const r = el.getBoundingClientRect(); if (!r.width) return;
          if (r.right > vw + 1 || r.left < -1) out.push('fuori schermo: ' + (el.textContent || el.className).trim().slice(0, 25) + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
        });
        const piccoli = [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) && e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize) < 12);
        if (piccoli.length) out.push('testo <12px: ' + piccoli[0].textContent.trim().slice(0, 25));
        return out;
      });
      ok(!r.length, `${nome} ${u || 'sito'}: ${r.slice(0, 3).join(' · ')}`);
    }
    ok(!errs.length, nome + ' errori JS: ' + errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
