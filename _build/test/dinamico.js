// Parti dinamiche del sito (2026-10-06): "Oggi in studio", "Quale lezione fa per te?", "Quale formula ti conviene?",
// e niente elementi che restano fermi o scorrono di lato (pagina istruttori, galleria dello studio, menu area).
// Uso: node _build/server.js &  poi  node _build/test/dinamico.js   (SHOT=cartella per gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
(async () => {
  const b = await pw.chromium.launch();
  const errs = [];
  for (const [nome, opt] of [['iPhone 13', pw.devices['iPhone 13']], ['PC', { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext(opt), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    // home: oggi in studio
    await p.goto(base); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
    const righe = p.locator('[data-oggi-studio] .oggi__riga');
    ok(await righe.count() >= 1, `${nome} home: "Oggi in studio" con le prossime lezioni (${await righe.count()})`);
    if (await righe.count()) {
      const href = await righe.first().getAttribute('href');
      ok(/^area\/#lezione\/\d{4}-\d\d-\d\d_\d{4}$/.test(href), `${nome} home: la riga porta alla lezione (${href})`);
      const t = await righe.first().locator('em').textContent();
      ok(/post[oi] liber|piena|in corso|la tua lezione/.test(t), `${nome} home: stato della lezione (${t})`);
    }
    ok(await p.evaluate(() => document.querySelector('.apertura .btn').getBoundingClientRect().bottom <= innerHeight), `${nome} home: pulsante della prova ancora nel primo schermo`);
    if (SHOT && nome === 'PC') await p.locator('[data-oggi-studio]').screenshot({ path: SHOT + '/d-oggi.png' });
    // lezioni: quiz a tocchi
    await p.goto(base + 'lezioni.html'); await p.waitForTimeout(400);
    await p.click('[data-trova] [data-v="mai"]'); await p.click('[data-trova] [data-v="schiena"]'); await p.click('[data-trova] [data-v="sera"]'); await p.waitForTimeout(200);
    const esito = await p.textContent('[data-trova] .trova__esito');
    ok(/Ti consigliamo\s*Reformer Base/.test(esito), `${nome} quiz: prima volta + schiena → Reformer Base`);
    ok(await p.locator('[data-trova] .oggi__riga').count() >= 1, `${nome} quiz: prossime lezioni con posti`);
    ok(await p.locator('[data-trova] a[href="area/#prova"]').count() === 1, `${nome} quiz: invito alla prova gratuita per chi non ha mai provato`);
    if (SHOT && nome === 'iPhone 13') await p.locator('[data-trova]').screenshot({ path: SHOT + '/d-quiz.png' });
    await p.click('[data-ricomincia]');
    await p.click('[data-trova] [data-v="spesso"]'); await p.click('[data-trova] [data-v="gravidanza"]'); await p.click('[data-trova] [data-v="qualsiasi"]'); await p.waitForTimeout(150);
    ok(/Prenatale/.test(await p.textContent('[data-trova] h3')), `${nome} quiz: gravidanza → Prenatale`);
    // prezzi: quale formula conviene
    await p.goto(base + 'prezzi.html'); await p.waitForTimeout(300);
    const e2 = await p.textContent('[data-conviene] [data-esito]');
    ok(/mensile/.test(e2) && /169 € al mese/.test(e2) && /225 €/.test(e2), `${nome} conviene: 2 volte (9 al mese) → mensile 169 € invece di 225 €`);
    await p.click('[data-volte="1"]'); await p.waitForTimeout(100);
    const e1 = await p.textContent('[data-conviene] [data-esito]');
    ok(/carnet 10/.test(e1) && /100 €/.test(e1), `${nome} conviene: 1 volta → carnet 10, 100 € al mese (${e1.trim().slice(0, 80)})`);
    await p.click('[data-volte="3"]'); await p.waitForTimeout(100);
    ok(/mensile/.test(await p.textContent('[data-conviene] [data-esito]')), `${nome} conviene: 3 volte → mensile`);
    ok(await p.getAttribute('[data-volte="3"]', 'aria-pressed') === 'true', `${nome} conviene: scelta evidenziata`);
    if (SHOT && nome === 'PC') await p.locator('[data-conviene]').screenshot({ path: SHOT + '/d-conviene.png' });
    // istruttori: nessun elemento fermo durante lo scorrimento
    await p.goto(base + 'istruttori.html'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => [...document.querySelectorAll('main *')].every(e => getComputedStyle(e).position !== 'sticky' && getComputedStyle(e).position !== 'fixed')), `${nome} istruttori: niente foto "attaccate"`);
    // studio: niente scorrimento laterale
    await p.goto(base + 'studio.html'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => [...document.querySelectorAll('main *')].every(e => !/(auto|scroll)/.test(getComputedStyle(e).overflowX))), `${nome} studio: niente scorrimento laterale`);
    for (const pg of ['', 'lezioni.html', 'prezzi.html']) { await p.goto(base + pg); await p.waitForTimeout(200); ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, `${nome} ${pg || 'home'}: niente scroll laterale`); }
    await c.close();
  }
  // area clienti da telefono: il menu va a capo, non scorre
  const t = await b.newContext({ ...pw.devices['iPhone 13'] }), q = await t.newPage();
  await q.goto(base + 'area/#benvenuto'); await q.click('[data-act=entra]'); await q.waitForTimeout(300);
  ok(await q.evaluate(() => !/(auto|scroll)/.test(getComputedStyle(document.querySelector('.w-testa nav')).overflowX)), 'area telefono: menu senza scorrimento laterale');
  ok(await q.evaluate(() => [...document.querySelectorAll('.w-testa nav a')].every(a => { const r = a.getBoundingClientRect(); return r.right <= innerWidth && r.left >= 0; })), 'area telefono: tutte le voci del menu visibili');
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
