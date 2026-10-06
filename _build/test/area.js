// Area clienti nel browser (area/): accesso, testata col menu, orario a griglia, prenotazione dal PC,
// account condiviso con l'app (la prenotazione fatta dal PC compare nell'app), riquadro "Scarica l'app" col QR.
// Uso: node _build/server.js &  poi  node _build/test/area.js   (SHOT=cartella per gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
const stato = p => p.evaluate(() => JSON.parse(localStorage.getItem('cr-demo-1')));
(async () => {
  const b = await pw.chromium.launch();
  const errs = [];
  // --- PC
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  const lato = async (pg, nome) => { const w = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, nome + ': scroll laterale ' + w + 'px'); };
  await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  ok(await p.getAttribute('.header .accedi', 'href') === 'area/', 'sito: "Accedi" porta all\'area clienti');
  await p.click('.header .accedi'); await p.waitForTimeout(400);
  ok(/\/area\/(#benvenuto)?$/.test(p.url()), 'area: pagina di accesso');
  ok(await p.locator('#f-email').count() === 1 && await p.locator('input[type=password]').count() === 1, 'accesso con email e password');
  ok(await p.locator('.banner-app .qr-app svg').count() === 1, 'accesso: riquadro "Scarica l\'app" con QR');
  ok(await p.locator('meta[name=robots][content*=noindex]').count() === 1, 'area noindex');
  ok(await p.locator('link[rel=manifest]').count() === 0, 'area: non è installabile (è il sito)');
  await lato(p, 'area accesso');
  if (SHOT) await p.screenshot({ path: SHOT + '/a-accesso.png' });
  await p.fill('#f-email', 'chiara.bassi@esempio.it'); await p.fill('#f-pass', 'Respiro100'); await p.click('.accesso [type=submit]'); await p.waitForTimeout(400);
  ok(p.url().endsWith('#oggi'), 'entra → oggi');
  ok(await p.locator('.w-testa nav a').count() === 5, 'testata con 5 voci di menu');
  ok(await p.locator('.nav').count() === 0, 'nessuna barra in basso da telefono');
  ok(await p.evaluate(() => document.querySelector('main').getBoundingClientRect().width > 700), 'contenuto largo (non colonna da telefono)');
  ok(await p.locator('main .banner-app').count() === 0, 'oggi: niente riquadro dell\'app (chi è già dentro non va disturbato)');
  if (SHOT) await p.screenshot({ path: SHOT + '/a-oggi.png', fullPage: true });
  // orario a griglia
  await p.click('.w-testa nav a[href="#orario"]'); await p.waitForTimeout(300);
  ok(await p.locator('.w-sett .w-giorno').count() === 6, 'orario: 6 colonne (lun–sab)');
  ok(await p.isHidden('.giorni'), 'orario: niente barra dei giorni da telefono');
  const cols = await p.evaluate(() => getComputedStyle(document.querySelector('.w-sett')).gridTemplateColumns.split(' ').length);
  ok(cols === 6, 'orario: griglia a 6 colonne su PC (' + cols + ')');
  await lato(p, 'area orario');
  if (SHOT) await p.screenshot({ path: SHOT + '/a-orario.png', fullPage: true });
  // prenota dalla griglia (prima lezione libera della settimana, altrimenti la successiva)
  let id = null;
  for (let t = 0; t < 3 && !id; t++) {
    const libera = p.locator('.w-giorno .lez:not([disabled]):has(.posti b)').first();
    if (await libera.count()) { await libera.click(); await p.waitForTimeout(250); id = p.url().split('#lezione/')[1]; }
    else { await p.click('[data-d="7"]'); await p.waitForTimeout(200); }
  }
  ok(!!id, 'orario: trovata una lezione libera');
  ok(await p.getAttribute('.w-testa nav a[aria-current=page]', 'href') === '#orario', 'scheda lezione: menu su Orario');
  await p.click('[data-act=prenota]'); await p.waitForTimeout(300);
  ok((await stato(p)).pren.some(x => x.id === id), 'prenotata dal PC');
  // carnet: niente QR d'ingresso nel browser
  await p.goto(base + 'area/#carnet'); await p.waitForTimeout(250);
  ok(await p.locator('[data-act=qr]').count() === 0 && (await p.textContent('main')).includes('Il QR per entrare'), 'carnet: il QR è nell\'app');
  // stesso account nell'app
  const a = await c.newPage(); a.on('pageerror', e => errs.push(e.message));
  await a.goto(base + 'app/#prenotazioni'); await a.waitForTimeout(400);
  ok(a.url().endsWith('#prenotazioni'), 'app: già dentro (stesso account)');
  ok(await a.locator(`a[href="#lezione/${id}"]`).count() >= 1, 'app: compare la prenotazione fatta dal PC');
  ok(await a.locator('.nav').count() === 1 && await a.locator('.w-testa').count() === 0, 'app: barra in basso, nessuna testata da PC');
  // esci
  await p.goto(base + 'area/#profilo'); await p.waitForTimeout(250);
  ok(await p.locator('main .banner-app').count() === 1, 'profilo: riquadro "Scarica l\'app"');
  await p.click('.w-testa [data-act=esci]'); await p.waitForTimeout(300);
  ok(p.url().endsWith('#benvenuto'), 'esci → accesso');

  // --- area aperta dal telefono: niente scroll laterale, menu che scorre
  const t = await b.newContext({ ...pw.devices['iPhone 13'] });
  const q = await t.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto(base + 'area/#benvenuto'); await q.waitForTimeout(300);
  await lato(q, 'area telefono accesso');
  await q.fill('#f-email', 'chiara.bassi@esempio.it'); await q.fill('#f-pass', 'Respiro100'); await q.click('.accesso [type=submit]'); await q.waitForTimeout(300);
  for (const h of ['#oggi', '#orario', '#prenotazioni', '#carnet', '#profilo']) { await q.goto(base + 'area/' + h); await q.waitForTimeout(200); await lato(q, 'area telefono ' + h); }
  if (SHOT) await q.screenshot({ path: SHOT + '/a-tel-orario.png' });
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
