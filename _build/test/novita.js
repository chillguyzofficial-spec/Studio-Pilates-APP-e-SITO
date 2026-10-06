// Prove delle funzioni aggiunte il 2026-10-06 (dopo il confronto con i migliori del 2026):
// orario nel sito con rimando alla lezione, progressi, lettino preferito, prenotazione fissa,
// calendario per ogni prenotazione, lista d'attesa automatica ("prendilo per me").
// Uso: node _build/server.js &  poi  node _build/test/novita.js   (SHOT=cartella per gli screenshot)
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
const SHOT = process.env.SHOT;
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
const stato = p => p.evaluate(() => JSON.parse(localStorage.getItem('cr-demo-1')));
(async () => {
  const b = await pw.chromium.launch();
  const c = await b.newContext({ ...pw.devices['iPhone 13'], acceptDownloads: true });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const lato = async nome => { const w = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, nome + ': scroll laterale ' + w + 'px'); };

  // --- sito: orario
  await p.goto(base); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p.goto(base + 'orario.html'); await p.waitForTimeout(400);
  await lato('sito orario');
  const oggi = new Date().getDay() || 1;
  ok(await p.getAttribute(`#og-${oggi}`, 'aria-selected') === 'true', 'orario: aperto sul giorno di oggi');
  ok(await p.locator('.orario__lista:not([hidden])').count() === 1, 'orario: una sola lista visibile');
  await p.click('#og-6'); await p.waitForTimeout(100);
  ok(!(await p.isHidden('#op-6')) && await p.isHidden(`#op-${oggi === 6 ? 1 : oggi}`) === (oggi !== 6), 'orario: il tocco su Sabato cambia giorno');
  const href = await p.getAttribute('#op-6 .orario__riga', 'href');
  ok(/^area\/#lezione\/\d{4}-\d\d-\d\d_\d{4}$/.test(href), 'orario: link alla lezione con data (' + href + ')');
  const giorno = new Date(href.split('/').pop().slice(0, 10) + 'T12:00:00').getDay();
  ok(giorno === 6, 'orario: la data del link è un sabato');
  if (SHOT) await p.locator('#orario').screenshot({ path: SHOT + '/n-orario.png' });
  // da non entrato: Benvenuto, poi "Entra" porta alla lezione scelta
  await p.click('#op-6 .orario__riga'); await p.waitForTimeout(400);
  ok(p.url().endsWith('#benvenuto'), 'lezione da non entrato → benvenuto');
  await p.click('[data-act=entra]'); await p.waitForTimeout(300);
  ok(p.url().endsWith(href.replace("area/", "")), 'dopo Entra → la lezione scelta nel sito');

  // --- progressi
  await p.goto(base + 'app/#oggi'); await p.waitForTimeout(300);
  ok(await p.locator('.progressi').count() === 1, 'home: scheda progressi');
  const tp = await p.textContent('.progressi');
  ok(/23 lezioni/.test(tp) && /settimane di fila/.test(tp) && /traguardo delle 25/.test(tp), 'progressi: 23 lezioni, settimane di fila, traguardo 25 (' + tp.replace(/\s+/g, ' ').trim().slice(0, 90) + ')');
  if (SHOT) await p.screenshot({ path: SHOT + '/n-oggi.png', fullPage: true });

  // --- lettino preferito
  await p.goto(base + 'app/#profilo'); await p.waitForTimeout(200);
  await p.selectOption('#f-letto', '6'); await p.waitForTimeout(200);
  ok((await stato(p)).prefs.letto === 6, 'profilo: lettino preferito salvato');
  // trova una lezione libera con il 6 libero
  await p.goto(base + 'app/#orario'); await p.waitForTimeout(200);
  let trovata = null;
  for (let t = 0; t < 14 && !trovata; t++) {
    const righe = p.locator('.lez:not([disabled]):has(.posti b)');
    for (let i = 0; i < await righe.count(); i++) {
      await righe.nth(i).click(); await p.waitForTimeout(120);
      if (await p.locator('.lettino[data-n="6"]').count()) { trovata = p.url().split('#lezione/')[1]; break; }
      await p.goBack(); await p.waitForTimeout(120);
    }
    if (trovata) break;
    const g = p.locator('.giorno:not([disabled]):not(.sel)');
    if (await g.count() > t % 6) await g.nth(t % 6).click(); else await p.click('[data-d="7"]');
    await p.waitForTimeout(120);
  }
  ok(!!trovata, 'trovata una lezione con il lettino 6 libero');
  if (trovata) {
    ok(await p.getAttribute('.lettino.scelto', 'data-n') === '6', 'il lettino preferito è già scelto');
    // --- prenotazione fissa
    await p.click('[data-act=fissa]'); await p.waitForTimeout(200);
    ok(await p.locator('.foglio .date-fisse div').count() >= 1, 'fissa: elenco delle date nella finestra');
    if (SHOT) await p.screenshot({ path: SHOT + '/n-fissa.png' });
    const prima = (await stato(p)).pren.length;
    await p.click('[data-act=fissaOk]'); await p.waitForTimeout(300);
    const S = await stato(p);
    ok(S.fisse.length === 1 && S.fisse[0].letto === 6, 'fissa: salvata col lettino 6');
    ok(S.pren.length > prima, 'fissa: prenotate le date libere (' + (S.pren.length - prima) + ')');
    ok(S.pren.some(x => x.id === trovata && x.letto === 6), 'fissa: la lezione aperta è prenotata sul 6');
    // calendario
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }).catch(() => null), p.click('[data-act=icsLezione]')]);
    ok(dl && /\.ics$/.test(dl.suggestedFilename()), 'calendario: scarica il file .ics');
    if (dl) { const t = require('fs').readFileSync(await dl.path(), 'utf8'); ok(/BEGIN:VEVENT[\s\S]*DTSTART:\d{8}T\d{6}[\s\S]*VALARM/.test(t), 'calendario: evento con data e promemoria'); }
    // annullo una data: non deve riprenotarsi da sola
    await p.click('[data-act=chiediAnnulla]'); await p.click('.foglio [data-act=annulla]'); await p.waitForTimeout(2500);
    ok(!(await stato(p)).pren.some(x => x.id === trovata), 'fissa: la data annullata non si riprenota');
    await p.goto(base + 'app/#prenotazioni'); await p.waitForTimeout(200);
    ok((await p.textContent('main')).includes('Prenotazioni fisse'), 'prenotazioni: sezione fisse');
    if (SHOT) await p.screenshot({ path: SHOT + '/n-prenotazioni.png', fullPage: true });
    await p.click('[data-act=togliFissa]'); await p.waitForTimeout(200);
    ok((await stato(p)).fisse.length === 0, 'fissa: tolta');
  }
  await lato('app');
  ok(!errs.length, 'errori JS: ' + errs.join(' | '));

  // --- lista d'attesa automatica (demo nuova: il posto si libera dopo ~30 s)
  const c2 = await b.newContext({ ...pw.devices['iPhone 13'] });
  const q = await c2.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto(base + 'app/#benvenuto'); await q.click('[data-act=entra]'); await q.waitForTimeout(200);
  await q.goto(base + 'app/#profilo'); await q.waitForTimeout(200);
  await q.click('input[data-k=auto]'); await q.waitForTimeout(100);
  const S0 = await stato(q);
  ok(S0.prefs.auto === true, 'auto: attivata dal profilo');
  const att = S0.attesa[0];
  await q.waitForFunction(id => JSON.parse(localStorage.getItem('cr-demo-1')).pren.some(x => x.id === id), att && att.id, { timeout: 45000 }).catch(() => {});
  const S1 = await stato(q);
  ok(att && S1.pren.some(x => x.id === att.id), 'auto: il posto liberato è stato prenotato da solo');
  ok(att && !S1.attesa.some(a => a.id === att.id), 'auto: uscita dalla lista');
  ok(S1.notifiche.some(x => x.titolo === 'Posto preso per te' && !x.letto), 'auto: avviso "Posto preso per te"');
  ok(!errs.length, 'errori JS (auto): ' + errs.join(' | '));
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
