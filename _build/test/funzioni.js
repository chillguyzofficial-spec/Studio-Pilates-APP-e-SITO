// Funzioni aggiunte il 2026-10-06 (secondo giro): popup "Scarica l'app", prima volta, regala una lezione
// (codice usato nell'area clienti), lezione privata, pannello dello studio con presenza via QR.
// Uso: node _build/server.js &  poi  node _build/test/funzioni.js   (SHOT=cartella per gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
const stato = p => p.evaluate(() => JSON.parse(localStorage.getItem('cr-demo-1')));
(async () => {
  const b = await pw.chromium.launch();
  const errs = [];
  // --- telefono: popup, prima volta, regalo
  const c = await b.newContext({ ...pw.devices['iPhone 13'] }), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForTimeout(300);
  ok(await p.isHidden('#pop-app'), 'popup: nascosto sull\'apertura');
  await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(300);
  ok(await p.isVisible('#pop-app'), 'popup: compare dopo l\'apertura');
  ok(await p.getAttribute('.pop-app__testo', 'href') === 'app/', 'popup: porta all\'app');
  ok(await p.evaluate(() => { const r = document.getElementById('pop-app').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), 'popup: dentro lo schermo, in basso a sinistra');
  if (SHOT) await p.screenshot({ path: SHOT + '/f-popup.png' });
  await p.click('.menu-btn'); await p.waitForTimeout(200);
  ok(await p.isHidden('#pop-app'), 'popup: sparisce con il menu aperto');
  await p.click('.menu-btn'); await p.waitForTimeout(200);
  await p.click('.pop-app__x'); await p.waitForTimeout(100);
  await p.reload(); await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(300);
  ok(await p.isHidden('#pop-app'), 'popup: chiuso non ricompare');
  ok(await p.locator('.passi3 li').count() === 3, 'home: la prima volta in 3 passi');
  await p.goto(base + 'prezzi.html'); await p.waitForTimeout(200);
  ok(await p.locator('.privata a[href="area/#privata"]').count() === 1, 'prezzi: lezione privata con link');
  // regalo
  await p.goto(base + 'regala.html'); await p.waitForTimeout(300);
  await p.click('[data-regalo="carnet5"]'); await p.fill('#rg-per', 'Giulia'); await p.fill('#rg-da', 'Marco'); await p.fill('#rg-dedica', 'Per ricominciare');
  await p.click('[data-crea-regalo]'); await p.waitForTimeout(400);
  const codice = (await p.textContent('.biglietto__codice')).trim();
  ok(/^CR-REGALO-\d{4}$/.test(codice), 'regalo: biglietto con codice (' + codice + ')');
  ok((await p.textContent('.biglietto__carta')).includes('Giulia') && (await p.textContent('.biglietto__carta')).includes('Carnet 5 ingressi'), 'regalo: biglietto con nome e regalo');
  if (SHOT) await p.locator('#biglietto').screenshot({ path: SHOT + '/f-biglietto.png' });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);
  const lato = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(lato <= 1, 'sito telefono: niente scroll laterale (' + lato + ')');

  // --- area: usa il codice regalo e prenota una privata (stesso dispositivo)
  await p.goto(base + 'area/#benvenuto'); await p.click('[data-act=entra]'); await p.waitForTimeout(200);
  const S0 = await stato(p);
  await p.goto(base + 'area/#carnet'); await p.waitForTimeout(200);
  await p.fill('#f-codice', codice); await p.click('[data-act=usaCodice]'); await p.waitForTimeout(300);
  const S1 = await stato(p);
  ok(S1.carnet.tot === S0.carnet.tot + 5, 'codice regalo: +5 ingressi nel carnet');
  await p.fill('#f-codice', codice); await p.click('[data-act=usaCodice]'); await p.waitForTimeout(300);
  ok((await stato(p)).carnet.tot === S1.carnet.tot, 'codice regalo: non si usa due volte');
  // privata
  await p.goto(base + 'area/#privata'); await p.waitForTimeout(200);
  await p.locator('[data-act=privataTipo]').first().click(); await p.waitForTimeout(150);
  await p.locator('[data-act=privataChi][data-k="davide"]').click(); await p.waitForTimeout(150);
  ok(await p.locator('[data-act=privataSlot]').count() > 0, 'privata: orari liberi con Davide');
  await p.locator('[data-act=privataSlot]').first().click(); await p.waitForTimeout(150);
  await p.click('[data-act=confermaPrivata]'); await p.waitForTimeout(300);
  const S2 = await stato(p);
  ok(S2.private.length === 1 && S2.private[0].chi === 'davide', 'privata: prenotata con Davide');
  ok(p.url().endsWith('#privata/fatto'), 'privata: schermata di conferma');
  await p.goto(base + 'area/#prenotazioni'); await p.waitForTimeout(200);
  ok((await p.textContent('main')).includes('Lezioni private'), 'prenotazioni: sezione lezioni private');
  // la privata non deve cadere su una lezione di gruppo
  const sovrap = await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('cr-demo-1')), D = window.CR_DATI; return S.private.some(x => { const [g, o] = x.id.slice(2).split('_'); const d = new Date(g + 'T12:00:00'); const m = +o.slice(0, 2) * 60 + +o.slice(2); return (D.SCHEMA[d.getDay()] || []).some(([h]) => { const mm = +h.slice(0, 2) * 60 + +h.slice(3); return Math.abs(mm - m) < 50; }); }); });
  ok(!sovrap, 'privata: mai sopra una lezione di gruppo');

  // --- pannello dello studio (PC)
  const qc = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await qc.newPage(); q.on('pageerror', e => errs.push(e.message));
  // stesso dispositivo dell'iscritta? no: nuovo contesto → serve una demo con Chiara prenotata oggi. Uso lo stato del telefono.
  const statoTel = JSON.stringify(await stato(p));
  await q.goto(base + 'studio/'); await q.evaluate(s => { localStorage.setItem('cr-demo-1', s); sessionStorage.clear(); }, statoTel); await q.reload(); await q.waitForTimeout(300);
  ok(await q.locator('[data-s=entra]').count() === 1, 'pannello: accesso staff');
  await q.click('[data-s=entra]'); await q.waitForTimeout(300);
  const oggi = new Date().getDay();
  if (oggi !== 0) {
    ok(await q.locator('.s-lez').count() >= 3, 'pannello: lezioni del giorno');
    ok(await q.locator('.s-letto').count() === 6, 'pannello: 6 lettini');
  }
  ok(await q.locator('.s-numeri div').count() === 5, 'pannello: riepilogo numeri');
  if (SHOT) await q.screenshot({ path: SHOT + '/f-pannello.png', fullPage: true });
  // il QR dell'app viene letto da jsQR (codice disegnato su canvas)
  const letto = await q.evaluate(async () => {
    const s = document.createElement('script'); s.src = '../assets/js/qrcode.min.js'; document.head.appendChild(s); await new Promise(r => s.onload = r);
    const qr = qrcode(0, 'M'); qr.addData(window.CR_MOTORE.codiceIngresso()); qr.make();
    const k = qr.getModuleCount(), cell = 8, m = 4, size = (k + m * 2) * cell, cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#000';
    for (let r = 0; r < k; r++) for (let cc = 0; cc < k; cc++) if (qr.isDark(r, cc)) x.fillRect((cc + m) * cell, (r + m) * cell, cell, cell);
    const res = jsQR(x.getImageData(0, 0, size, size).data, size, size);
    return res && res.data;
  });
  ok(letto && /^CR-DEMO-\d{4}$/.test(letto), 'lettore: jsQR legge il QR dell\'app (' + letto + ')');
  // presenza via QR (codice simulato, senza fotocamera)
  await q.click('[data-s=scan]'); await q.waitForTimeout(400);
  await q.click('[data-s=simula]'); await q.waitForTimeout(300);
  const esito = await q.textContent('.s-scan__esito');
  const haOggi = JSON.parse(statoTel).pren.some(x => x.id.startsWith(new Date().toISOString().slice(0, 10)) || (() => { const d = new Date(); const pd = v => String(v).padStart(2, '0'); return x.id.startsWith(`${d.getFullYear()}-${pd(d.getMonth() + 1)}-${pd(d.getDate())}`); })());
  if (haOggi) {
    ok(/presenza registrata/.test(esito), 'QR: presenza di Chiara registrata (' + esito.replace(/\s+/g, ' ').trim() + ')');
    const S3 = await stato(q);
    ok(S3.presenze.length === 1, 'QR: presenza salvata nell\'account');
    await q.click('[data-s=chiudiScan]'); await q.waitForTimeout(200);
    // nell'app di Chiara (stesso account sullo stesso dispositivo)
    const a = await qc.newPage(); await a.goto(base + 'app/#oggi'); await a.waitForTimeout(400);
    ok((await a.textContent('main')).includes('Presenza registrata'), 'app: mostra "Presenza registrata"');
    await a.close();
  } else {
    ok(/Nessuna lezione prenotata oggi/.test(esito), 'QR: nessuna lezione oggi → messaggio chiaro');
    await q.click('[data-s=chiudiScan]');
  }
  await q.click('[data-s=scan]'); await q.waitForTimeout(200);
  await q.fill('#s-codice', 'CR-DEMO-0000'); await q.click('[data-s=codice]'); await q.waitForTimeout(200);
  ok(/non riconosciuto/.test(await q.textContent('.s-scan__esito')), 'QR: codice sbagliato rifiutato');
  await q.click('[data-s=chiudiScan]');
  // presenza manuale di un altro iscritto
  const btn = q.locator('.s-letto:not(.tu) button[aria-pressed=false]').first();
  if (await btn.count()) { await btn.click(); await q.waitForTimeout(200); ok(await q.locator('.s-letto.presente').count() >= 1, 'pannello: presenza manuale'); }
  // pannello da telefono
  const t = await c.newPage(); t.on('pageerror', e => errs.push(e.message));
  await t.goto(base + 'studio/'); await t.waitForTimeout(300);
  if (await t.locator('[data-s=entra]').count()) await t.click('[data-s=entra]');
  await t.waitForTimeout(300);
  ok(await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, 'pannello da telefono: niente scroll laterale');
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
