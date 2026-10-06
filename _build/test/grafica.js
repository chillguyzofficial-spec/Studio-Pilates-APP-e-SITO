// Controlli grafici: nessuna foto tagliata (sito, app, area), menu da telefono, "Respira con noi",
// orario vivo, sezione evidenziata nel menu su PC.
// Uso: node _build/server.js &  poi  node _build/test/grafica.js   (SHOT=cartella per gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
// percentuale di foto nascosta da object-fit:cover (0 = foto intera)
const tagli = p => p.evaluate(() => [...document.images].filter(i => i.naturalWidth && i.getBoundingClientRect().width).map(i => {
  const b = i.getBoundingClientRect(), ri = i.naturalWidth / i.naturalHeight, rb = b.width / b.height;
  return [i.currentSrc.split('/').pop(), Math.round((1 - (ri > rb ? rb / ri : ri / rb)) * 100)];
}));
const scorri = async p => { for (let y = 0; y < 12000; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(40); } await p.evaluate(() => scrollTo(0, 0)); };
(async () => {
  const b = await pw.chromium.launch();
  const errs = [];
  for (const [nome, opt] of [['iPhone 13', pw.devices['iPhone 13']], ['iPhone SE', pw.devices['iPhone SE']], ['PC 1440', { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext(opt), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    const verifica = async (u, cosa) => { await p.goto(base + u); await p.waitForTimeout(300); await scorri(p); for (const [f, t] of await tagli(p)) ok(t <= 2, `${nome} ${cosa}: ${f} tagliata del ${t}%`); };
    for (const pg of ['', 'lezioni.html', 'istruttori.html', 'studio.html']) await verifica(pg, 'sito ' + (pg || 'home'));
    await p.goto(base + 'app/#benvenuto'); await p.evaluate(() => localStorage.clear());
    await verifica('app/#benvenuto', 'app benvenuto');
    await verifica('app/#prova', 'app prova');
    await p.goto(base + 'app/#benvenuto'); await p.click('[data-act=entra]'); await p.waitForTimeout(200);
    await verifica('app/#oggi', 'app oggi');
    const id = await p.evaluate(() => { const d = new Date(), S = window.CR_DATI.SCHEMA, pd = x => String(x).padStart(2, '0'); for (let i = 1; i < 8; i++) { const x = new Date(d); x.setDate(d.getDate() + i); const l = (S[x.getDay()] || [])[0]; if (l) return `${x.getFullYear()}-${pd(x.getMonth() + 1)}-${pd(x.getDate())}_${l[0].replace(':', '')}`; } });
    await verifica('app/#lezione/' + id, 'app lezione');
    await verifica('area/#oggi', 'area oggi');
    await c.close();
  }

  // menu da telefono
  const c = await b.newContext({ ...pw.devices['iPhone 13'] }), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(300);
  ok(await p.isVisible('.menu-btn'), 'telefono: pulsante Menu visibile');
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight / 2)); await p.waitForTimeout(200);
  await p.click('.menu-btn'); await p.waitForTimeout(200);
  ok(await p.isVisible('#menu-tel'), 'menu aperto a metà pagina');
  ok(await p.evaluate(() => document.querySelector('.header').getBoundingClientRect().top === 0), 'testata ancora in cima con il menu aperto');
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden' && getComputedStyle(document.body).overflow !== 'hidden'), 'menu: scroll bloccato solo su html');
  if (SHOT) await p.screenshot({ path: SHOT + '/g-menu.png' });
  await p.click('#menu-tel a[href="prezzi.html"]'); await p.waitForTimeout(600);
  ok(p.url().endsWith('prezzi.html') && await p.isHidden('#menu-tel'), 'menu: porta alla pagina Prezzi');
  ok(await p.getAttribute('#menu-tel a[href="prezzi.html"]', 'aria-current') === 'page', 'menu: pagina attiva evidenziata');
  await p.goto(base); await p.waitForTimeout(300);
  // respira con noi
  await p.locator('[data-battiti]').scrollIntoViewIfNeeded();
  await p.click('.battiti__btn'); await p.waitForTimeout(1300);
  const d1 = await p.textContent('.battiti__dida');
  ok(/Inspira · respiro 1 di 10 · [2-4]\/100/.test(d1), 'respira: parte e conta (' + d1 + ')');
  ok(await p.locator('.battiti__barre span.fatto').count() >= 2, 'respira: le barre si riempiono');
  await p.waitForTimeout(1700);
  ok(/Espira/.test(await p.textContent('.battiti__dida')), 'respira: dopo cinque battiti passa a Espira');
  if (SHOT) await p.locator('[data-battiti]').screenshot({ path: SHOT + '/g-respira.png' });
  await p.click('.battiti__btn'); await p.waitForTimeout(200);
  ok(await p.locator('.battiti__barre span.fatto').count() === 0 && (await p.textContent('.battiti__btn')).startsWith('Respira'), 'respira: Ferma rimette tutto com\'era');
  // orario vivo (con l'ora finta del giorno: lezioni di oggi prima e dopo)
  await p.goto(base + 'orario.html'); await p.waitForTimeout(300);
  const oggi = new Date().getDay();
  if (oggi !== 0) {
    const r = await p.evaluate(g => [...document.querySelectorAll(`.orario__riga[data-g="${g}"]`)].map(a => [a.dataset.ora, a.classList.contains('passata'), !!a.querySelector('.tra')]), oggi);
    const ora = new Date(), min = ora.getHours() * 60 + ora.getMinutes();
    const atteseP = r.filter(([o]) => { const [h, m] = o.split(':').map(Number); return h * 60 + m <= min; }).length;
    ok(r.filter(x => x[1]).length === atteseP, 'orario vivo: lezioni passate spente (' + atteseP + ')');
    ok(r.filter(x => x[2]).length === (atteseP < r.length ? 1 : 0), 'orario vivo: "tra N min" solo sulla prossima');
    const cols = await p.evaluate(g => getComputedStyle(document.querySelector(`.orario__riga[data-g="${g}"]`)).gridTemplateColumns.split(' ').length, oggi);
    ok(cols === 3, 'orario vivo: la riga resta a 3 colonne');
  }
  // PC: pagina attiva evidenziata nel menu
  const q = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await q.goto(base + 'prezzi.html'); await q.waitForTimeout(300);
  ok(await q.isHidden('.menu-btn'), 'PC: niente pulsante Menu');
  ok(await q.getAttribute('.header nav a[aria-current=page]', 'href') === 'prezzi.html', 'PC: menu evidenzia Prezzi');
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
