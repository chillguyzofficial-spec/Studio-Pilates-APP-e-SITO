// Giro completo di sito e app su telefono (iPhone 13 emulato): errori JS, scroll laterale, flusso prenotazione,
// annullamento con rimborso, lista d'attesa con posto che si libera, QR, profilo, installa, prova gratuita.
// Uso: node _build/server.js &  poi  node _build/test/percorso.js   (SHOT=cartella per salvare gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
const stato = p => p.evaluate(() => JSON.parse(localStorage.getItem('cr-demo-1')));
(async () => {
  const b = await pw.chromium.launch();
  const c = await b.newContext({ ...pw.devices['iPhone 13'] });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const lato = async nome => { const w = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, nome + ': scroll laterale ' + w + 'px'); };
  const piccoli = async nome => {
    const t = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) && e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.textContent.trim().slice(0, 30)));
    ok(!t.length, nome + ': testo sotto 12px: ' + t.slice(0, 3).join(' | '));
  };
  const foto = async nome => { if (SHOT) await p.screenshot({ path: SHOT + '/' + nome + '.png' }); };
  const vai = async (h, nome) => { await p.goto(base + 'app/' + h); await p.waitForTimeout(250); await lato(nome); await piccoli(nome); await foto(nome); };

  // --- sito
  await p.goto(base); await p.waitForTimeout(400);
  await lato('sito'); await piccoli('sito');
  ok(await p.locator('meta[name=robots][content*=noindex]').count() === 1, 'sito noindex');
  ok(await p.evaluate(() => document.querySelector('h1').getBoundingClientRect().top < innerHeight), 'sito: titolo nel primo schermo');
  ok(await p.evaluate(() => document.querySelector('.apertura .btn').getBoundingClientRect().bottom <= innerHeight), 'sito: pulsante nel primo schermo');
  if (SHOT) await p.screenshot({ path: SHOT + '/sito-tel.png', fullPage: true });
  await p.locator('.striscia').scrollIntoViewIfNeeded(); await p.click('[data-dir="1"]'); await p.waitForTimeout(800);
  ok((await p.textContent('[data-conta]')).startsWith('2'), 'sito: striscia avanti → 2 / 4');

  // --- app: benvenuto ed entrata
  await p.goto(base + 'app/'); await p.evaluate(() => localStorage.clear());
  await vai('#benvenuto', '01-benvenuto');
  await p.click('[data-act=entra]'); await p.waitForTimeout(300);
  ok(p.url().endsWith('#oggi'), 'entra → oggi');
  await lato('oggi'); await piccoli('oggi'); await foto('02-oggi');
  const S0 = await stato(p);
  ok(S0.pren.length >= 1, 'demo: prenotazioni iniziali (' + S0.pren.length + ')');
  ok(S0.attesa.length === 1, 'demo: una lista d\'attesa iniziale');
  ok(S0.carnet.tot - S0.carnet.usati === 6, 'demo: 6 ingressi rimasti');

  // orario: trova una lezione libera e prenotala
  await p.click('.nav a[href="#orario"]'); await p.waitForTimeout(200);
  await lato('03-orario'); await piccoli('03-orario'); await foto('03-orario');
  let prenotata = null;
  for (let tent = 0; tent < 10 && !prenotata; tent++) {
    const libera = p.locator('.lez:not([disabled]):has(.posti b)').first();
    if (await libera.count()) { await libera.click(); await p.waitForTimeout(150); prenotata = p.url().split('#lezione/')[1]; break; }
    const giorni = p.locator('.giorno:not([disabled]):not(.sel)'); const k = await giorni.count();
    if (k) await giorni.nth(0).click(); else await p.click('[data-d="7"]');
    await p.waitForTimeout(150);
  }
  ok(!!prenotata, 'orario: trovata una lezione libera');
  await lato('04-lezione'); await piccoli('04-lezione'); await foto('04-lezione');
  await p.click('[data-act=prenota]'); await p.waitForTimeout(300);
  let S1 = await stato(p);
  ok(S1.pren.some(x => x.id === prenotata), 'prenotazione salvata');
  ok(S1.carnet.usati === S0.carnet.usati + 1, 'carnet scalato di 1');
  ok(await p.locator('.lettino.tuo').count() === 1, 'scheda: mostra il tuo lettino');
  const lontana = await p.evaluate(id => { const [g, o] = id.split('_'); return new Date(g + 'T' + o.slice(0, 2) + ':' + o.slice(2) + ':00') - Date.now() > 12 * 3600e3; }, prenotata);
  await p.click('[data-act=chiediAnnulla]'); await p.waitForTimeout(250); await foto('05b-annulla');
  ok(await p.locator('.foglio').count() === 1, 'annulla: finestra di conferma');
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden' && getComputedStyle(document.body).overflow !== 'hidden'), 'annulla: scroll bloccato solo su html');
  await p.click('.foglio [data-act=annulla]'); await p.waitForTimeout(300);
  S1 = await stato(p);
  ok(!S1.pren.some(x => x.id === prenotata), 'annullata');
  ok(S1.carnet.usati === S0.carnet.usati + (lontana ? 0 : 1), 'rimborso corretto (' + (lontana ? 'più' : 'meno') + ' di 12 ore)');
  ok(await p.locator('[data-act=prenota]').count() === 1, 'dopo annullamento torna prenotabile');

  await vai('#prenotazioni', '05-prenotazioni');

  // lista d'attesa: il posto si libera ~30 s dopo l'inizio della demo
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('cr-demo-1')).attesa.some(a => a.offerta), null, { timeout: 45000 }).catch(() => {});
  const S2 = await stato(p);
  const off = S2.attesa.find(a => a.offerta);
  ok(!!off, 'lista d\'attesa: si libera un posto');
  await vai('#avvisi', '07-avvisi');
  if (off) {
    await p.locator('[data-act=prendiPosto]').first().click(); await p.waitForTimeout(300);
    const S3 = await stato(p);
    ok(S3.pren.some(x => x.id === off.id && x.letto === off.offerta.letto), 'prendi il posto: prenotato col lettino liberato');
    ok(!S3.attesa.some(a => a.id === off.id), 'prendi il posto: uscita dalla lista');
  }

  // carnet, QR, mensile
  await vai('#carnet', '06-carnet');
  await p.click('[data-act=qr]'); await p.waitForTimeout(300);
  ok(await p.locator('.qr-box svg').count() === 1, 'QR disegnato'); await foto('06b-qr');
  await p.click('.qr-vista .chiudi');
  await p.click('[data-cosa=mensile]'); await p.click('[data-act=compraOk]'); await p.waitForTimeout(200);
  ok(!!(await stato(p)).mensile, 'mensile attivato');

  // profilo e installa
  await vai('#profilo', '08-profilo');
  await p.click('[data-act=modifica]'); await p.fill('#f-nome', 'Giulia Rossi'); await p.click('[data-act=salvaDati]'); await p.waitForTimeout(200);
  ok((await p.textContent('.utente .nome')).includes('Giulia'), 'profilo: nome modificato');
  await vai('#installa', '08b-installa');
  ok(await p.locator('.passo').count() === 4, 'installa: 4 passi iPhone');

  // prova gratuita in 3 tocchi
  await vai('#prova', '09a-prova');
  await p.locator('[data-act=provaLiv]').first().click(); await p.waitForTimeout(200); await lato('09b-prova'); await foto('09b-prova');
  const slot = p.locator('[data-act=provaSlot]');
  ok(await slot.count() > 0, 'prova: orari disponibili');
  if (await slot.count()) {
    await slot.first().click(); await p.waitForTimeout(200); await foto('09c-prova');
    await p.click('[data-act=confermaProva]'); await p.waitForTimeout(200);
    ok(p.url().endsWith('#prova/fatto'), 'prova confermata'); await lato('09d-prova'); await foto('09d-prova');
  }

  // ricomincia
  await p.goto(base + 'app/#profilo'); await p.waitForTimeout(200);
  await p.click('[data-act=chiediReset]'); await p.click('[data-act=reset]'); await p.waitForTimeout(300);
  ok(!(await stato(p)).mensile, 'ricomincia: demo azzerata');
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));

  // PC
  const pc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pc.goto(base); await pc.waitForTimeout(300);
  ok(await pc.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'PC sito: niente scroll laterale');
  if (SHOT) await pc.screenshot({ path: SHOT + '/sito-pc.png', fullPage: true });
  await pc.goto(base + 'app/#benvenuto'); await pc.waitForTimeout(300);
  ok(await pc.evaluate(() => document.querySelector('.app__col').getBoundingClientRect().width <= 480), 'PC app: colonna centrata');
  if (SHOT) await pc.screenshot({ path: SHOT + '/app-pc.png' });
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
