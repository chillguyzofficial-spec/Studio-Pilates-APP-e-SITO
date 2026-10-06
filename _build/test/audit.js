// Audit completo (2026-10-06): navigazione e link di sito/area/app/pannello, data di oggi e cambio a mezzanotte,
// 400 operazioni casuali sulle prenotazioni con controlli di coerenza, regressioni dei difetti corretti, accesso.
// Uso: node _build/server.js &  poi  node _build/test/audit.js
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const base = process.env.BASE || 'http://localhost:8993/';
let n = 0, err = 0;
const ok = (c, m) => { n++; if (!c) { err++; console.log('ERR ' + m); } else if (process.env.V) console.log('OK  ' + m); return c; };
const SITO = ['', 'lezioni.html', 'orario.html', 'istruttori.html', 'prezzi.html', 'regala.html', 'studio.html', 'domande.html'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

(async () => {
  const b = await pw.chromium.launch();

  // ---------- 1) navigazione: pagine, risorse, link e ancore ----------
  for (const [nome, opt] of [['telefono', pw.devices['iPhone 13']], ['PC', { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext(opt), p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('JS ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
    p.on('requestfailed', r => { if (!/favicon/.test(r.url())) errs.push('fallita ' + r.url()); });
    p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
    const link = new Set();
    for (const pg of [...SITO, 'area/', 'app/', 'studio/']) {
      await p.goto(base + pg, { waitUntil: 'networkidle' });
      for (let y = 0; y < 14000; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(20); }
      const r = await p.evaluate(() => ({
        rotte: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src')),
        lato: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        link: [...document.querySelectorAll('a[href]')].map(a => a.href),
        h1: document.querySelectorAll('h1').length,
      }));
      ok(!r.rotte.length, `${nome} ${pg || 'home'}: immagini rotte ${r.rotte.join(', ')}`);
      ok(r.lato <= 1, `${nome} ${pg || 'home'}: scroll laterale ${r.lato}px`);
      if (SITO.includes(pg)) ok(r.h1 === 1, `${nome} ${pg || 'home'}: un solo titolo principale (${r.h1})`);
      r.link.filter(h => h.startsWith(base)).forEach(h => link.add(h));
      // menu da telefono su ogni pagina del sito
      if (nome === 'telefono' && SITO.includes(pg)) {
        await p.evaluate(() => scrollTo(0, 0)); await p.click('.menu-btn'); await p.waitForTimeout(150);
        ok(await p.isVisible('#menu-tel'), `telefono ${pg || 'home'}: il menu si apre`);
        await p.click('.menu-btn'); await p.waitForTimeout(100);
        ok(await p.isHidden('#menu-tel'), `telefono ${pg || 'home'}: il menu si chiude`);
      }
    }
    if (nome === 'PC') {
      // ogni link interno: la pagina esiste e l'ancora (#...) c'è davvero
      let controllati = 0;
      for (const h of link) {
        const [url, ancora] = h.split('#');
        if (/\/(app|area)\/$/.test(url) && ancora) continue; // rotte dell'app (#oggi, #lezione/...) controllate più sotto
        const res = await p.request.get(url); controllati++;
        ok(res.status() === 200, `link ${h} → HTTP ${res.status()}`);
        if (ancora && res.status() === 200) {
          const html = await res.text();
          ok(new RegExp(`id="${ancora}"`).test(html), `link ${h}: ancora #${ancora} inesistente`);
        }
      }
      ok(controllati > 20, `link interni controllati: ${controllati}`);
    }
    ok(!errs.length, `${nome}: errori e risorse mancanti: ${[...new Set(errs)].slice(0, 5).join(' | ')}`);
    await c.close();
  }

  // ---------- 2) data di oggi e cambio a mezzanotte ----------
  {
    const c = await b.newContext({ ...pw.devices['iPhone 13'] }), p = await c.newPage();
    await p.goto(base + 'app/#benvenuto'); await p.evaluate(() => localStorage.clear()); await p.goto(base + 'app/#benvenuto');
    await p.click('[data-act=entra]'); await p.waitForTimeout(300);
    const oggi = new Date(), atteso = `${GIORNI[oggi.getDay()]} ${oggi.getDate()} ${MESI[oggi.getMonth()]}`;
    ok((await p.textContent('main .sopra')).toLowerCase() === atteso, `app: data di oggi "${atteso}"`);
    await p.goto(base + 'app/#orario'); await p.waitForTimeout(200);
    const sel = await p.getAttribute('.giorno.sel', 'data-g'), og = await p.getAttribute('.giorno.oggi', 'data-g');
    const pd = x => String(x).padStart(2, '0'), ymd = d => `${d.getFullYear()}-${pd(d.getMonth() + 1)}-${pd(d.getDate())}`;
    const lun = new Date(oggi); lun.setDate(oggi.getDate() + 1);
    ok(sel === (oggi.getDay() === 0 ? ymd(lun) : ymd(oggi)), `app orario: aperto su oggi (${sel})`);
    if (oggi.getDay() !== 0) ok(og === ymd(oggi), 'app orario: pallino sul giorno di oggi');
    await c.close();
    // mezzanotte simulata: alle 23:59:50 di un mercoledì, poi l'orologio va avanti di 30 secondi
    const c2 = await b.newContext({ ...pw.devices['iPhone 13'] }), q = await c2.newPage();
    await q.clock.install({ time: new Date('2026-10-14T23:59:50') });
    await q.goto(base + 'app/#benvenuto'); await q.evaluate(() => localStorage.clear()); await q.goto(base + 'app/#benvenuto');
    await q.click('[data-act=entra]'); await q.waitForTimeout(200);
    await q.goto(base + 'app/#orario'); await q.waitForTimeout(200);
    ok(await q.getAttribute('.giorno.sel', 'data-g') === '2026-10-14', 'mezzanotte: prima, orario su mercoledì 14');
    await q.clock.runFor(30000); await q.waitForTimeout(300);
    ok(await q.getAttribute('.giorno.sel', 'data-g') === '2026-10-15', 'mezzanotte: dopo, l\'orario passa da solo a giovedì 15');
    ok(await q.locator('.giorno[data-g="2026-10-14"]').isDisabled(), 'mezzanotte: il giorno di ieri non è più toccabile');
    await q.goto(base + 'app/#oggi'); await q.waitForTimeout(200);
    ok((await q.textContent('main .sopra')).toLowerCase() === 'giovedì 15 ottobre', 'mezzanotte: la data in Oggi è giovedì 15 ottobre');
    // cambio dell'ora legale (domenica 25 ottobre 2026): il 14° giorno resta quello giusto
    await c2.close();
  }

  // ---------- 3) prenotazioni: 400 operazioni casuali con controlli di coerenza ----------
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await c.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + 'area/#benvenuto'); await p.evaluate(() => localStorage.clear()); await p.goto(base + 'area/#benvenuto');
    await p.click('[data-act=entra]'); await p.waitForTimeout(300);
    const problemi = await p.evaluate(() => {
      const M = window.CR_MOTORE, out = [];
      let seme = 7; const caso = k => (seme = (seme * 1103515245 + 12345) % 2147483648) % k;
      const lezioni = []; for (let i = -1; i <= 17; i++) M.lezioniDel(M.piuGiorni(M.oggi0(), i)).forEach(l => lezioni.push(l));
      for (let passo = 0; passo < 400; passo++) {
        const S = M.S, l = lezioni[caso(lezioni.length)], tipo = caso(10);
        const st = M.stato(l.id), prima = { usati: S.carnet.usati, n: S.pren.length };
        if (tipo < 5) {
          const libero = [1, 2, 3, 4, 5, 6].find(x => !st.occ.has(x) && !(st.mia && st.mia.letto === x));
          const motivo = M.puoiPrenotare(l);
          if (st.mia || st.pieno || !libero) continue;
          const fatto = M.prenota(l, libero);
          if (fatto && motivo) out.push(`passo ${passo}: prenotata nonostante "${motivo}" (${l.id})`);
          if (fatto && (l.inizio <= Date.now() || M.giorniDa(l.inizio) > M.FINESTRA)) out.push(`passo ${passo}: prenotata fuori finestra ${l.id}`);
          if (fatto && S.pren[S.pren.length - 1].con === 'carnet' && S.carnet.usati !== prima.usati + 1) out.push(`passo ${passo}: carnet non scalato`);
          if (fatto && S.pren[S.pren.length - 1].con === 'carnet' && M.giorniDa(M.daYmd(S.carnet.al)) < M.giorniDa(l.inizio)) out.push(`passo ${passo}: carnet scaduto il giorno della lezione ${l.id}`);
        } else if (tipo < 8) {
          const mia = S.pren[caso(Math.max(1, S.pren.length))];
          if (mia && M.lezione(mia.id).inizio > Date.now()) M.annulla(mia.id);
        } else if (tipo < 9) {
          if (st.pieno && !st.attesa && !M.puoiPrenotare(l)) M.inAttesa(l);
        } else {
          // ricarica o scadenza ravvicinata del carnet, a caso
          if (caso(2)) { S.carnet = { tot: 10, usati: 0, dal: M.ymd(M.oggi0()), al: M.ymd(M.piuGiorni(M.oggi0(), 2 + caso(20))) }; }
          else { S.carnet.usati = S.carnet.tot; }
          M.salva();
        }
        // controlli di coerenza dopo ogni operazione
        const ids = S.pren.map(x => x.id);
        if (new Set(ids).size !== ids.length) out.push(`passo ${passo}: prenotazione doppia`);
        const ord = S.pren.map(x => M.lezione(x.id).inizio.getTime()).sort((a, b) => a - b);
        for (let k = 1; k < ord.length; k++) if (ord[k] - ord[k - 1] < M.DURATA * 60e3) out.push(`passo ${passo}: due lezioni sovrapposte`);
        if (S.carnet.usati < 0 || S.carnet.usati > S.carnet.tot) out.push(`passo ${passo}: carnet incoerente ${S.carnet.usati}/${S.carnet.tot}`);
        if (S.attesa.some(a => ids.includes(a.id))) out.push(`passo ${passo}: in lista e prenotata insieme`);
        const pids = S.passate.map(x => x.id);
        if (new Set(pids).size !== pids.length) out.push(`passo ${passo}: storico con voci doppie`);
        for (const x of lezioni) {
          const s = M.stato(x.id);
          if (s.liberi < 0) out.push(`passo ${passo}: posti liberi negativi ${x.id}`);
          if (s.mia && s.occ.has(s.mia.letto)) out.push(`passo ${passo}: il tuo lettino risulta occupato da altri ${x.id}`);
          if (s.occ.size + (s.mia ? 1 : 0) > 6) out.push(`passo ${passo}: più di 6 persone ${x.id}`);
        }
        if (out.length > 8) break;
      }
      return out;
    });
    ok(!problemi.length, 'prenotazioni casuali: ' + problemi.slice(0, 6).join(' | '));
    ok(!errs.length, 'prenotazioni casuali, errori JS: ' + errs.join(' | '));
    await c.close();
  }

  // ---------- 4) regressioni dei difetti corretti ----------
  {
    const c = await b.newContext({ ...pw.devices['iPhone 13'] }), p = await c.newPage();
    await p.goto(base + 'app/#benvenuto'); await p.evaluate(() => localStorage.clear()); await p.goto(base + 'app/#benvenuto');
    await p.click('[data-act=entra]'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const M = window.CR_MOTORE, S = M.S, out = {};
      const trova = (dmin, dmax, filtro = () => true) => { for (let i = dmin; i <= dmax; i++) { const l = M.lezioniDel(M.piuGiorni(M.oggi0(), i)).find(x => x.inizio > Date.now() + 3600e3 && !M.stato(x.id).pieno && !M.stato(x.id).mia && filtro(x)); if (l) return l; } return null; };
      // 14° giorno: se l'orario lo mostra, si deve poter prenotare
      const l14 = M.lezioniDel(M.piuGiorni(M.oggi0(), M.FINESTRA))[0];
      out.giorno14 = !l14 || M.puoiPrenotare(l14) === '' || !/14 giorni/.test(M.puoiPrenotare(l14));
      const l15 = M.lezioniDel(M.piuGiorni(M.oggi0(), M.FINESTRA + 1)).concat(M.lezioniDel(M.piuGiorni(M.oggi0(), M.FINESTRA + 2)))[0];
      out.giorno15 = !l15 || /14 giorni/.test(M.puoiPrenotare(l15));
      // carnet che scade fra 2 giorni: niente lezioni dopo la scadenza
      S.mensile = null; S.carnet = { tot: 10, usati: 0, dal: M.ymd(M.oggi0()), al: M.ymd(M.piuGiorni(M.oggi0(), 2)) };
      const dopo = trova(4, 12);
      out.scadenza = !dopo || /scade/.test(M.puoiPrenotare(dopo));
      const entro = trova(0, 2);
      out.entroScadenza = !entro || M.puoiPrenotare(entro) === '';
      // mensile che scade fra 3 giorni, carnet finito: niente lezioni dopo
      S.carnet.usati = S.carnet.tot; S.mensile = { dal: M.ymd(M.oggi0()), al: M.ymd(M.piuGiorni(M.oggi0(), 3)) };
      const dopoM = trova(5, 12);
      out.mensile = !dopoM || /mensile scade/.test(M.puoiPrenotare(dopoM));
      // carnet finito: niente lista d'attesa
      S.mensile = null; S.carnet.usati = S.carnet.tot;
      let piena = null; for (let i = 0; i < 12 && !piena; i++) piena = M.lezioniDel(M.piuGiorni(M.oggi0(), i)).find(x => x.inizio > Date.now() + 3600e3 && M.stato(x.id).pieno && !M.stato(x.id).attesa);
      out.lista = !piena || M.puoiPrenotare(piena) === 'carnet';
      out.pienaId = piena && piena.id;
      M.salva();
      return out;
    });
    ok(r.giorno14, 'regressione: il 14° giorno si può prenotare');
    ok(r.giorno15, 'regressione: dal 15° giorno no');
    ok(r.scadenza && r.entroScadenza, 'regressione: carnet valido nel giorno della lezione, non solo oggi');
    ok(r.mensile, 'regressione: mensile valido nel giorno della lezione');
    ok(r.lista, 'regressione: col carnet finito niente lista d\'attesa');
    if (r.pienaId) {
      await p.goto(base + 'app/#lezione/' + r.pienaId); await p.waitForTimeout(250);
      ok(await p.locator('[data-act=lista]').count() === 0 && await p.locator('a[href="#carnet"]').count() >= 1, 'regressione: lezione piena col carnet finito → "Ricarica il carnet"');
    }
    // storico: annullo, riprenoto, riannullo → una sola voce e niente lezioni riprenotate
    const st = await p.evaluate(() => {
      const M = window.CR_MOTORE, S = M.S;
      S.carnet = { tot: 10, usati: 0, dal: M.ymd(M.oggi0()), al: M.ymd(M.piuGiorni(M.oggi0(), 60)) };
      let l = null; for (let i = 2; i < 10 && !l; i++) l = M.lezioniDel(M.piuGiorni(M.oggi0(), i)).find(x => !M.stato(x.id).pieno && !M.stato(x.id).mia);
      const letto = () => [1, 2, 3, 4, 5, 6].find(x => !M.stato(l.id).occ.has(x));
      M.prenota(l, letto()); M.annulla(l.id); M.prenota(l, letto()); M.annulla(l.id);
      const voci = S.passate.filter(x => x.id === l.id).length;
      M.prenota(l, letto());
      return { voci, dopoRiprenota: S.passate.filter(x => x.id === l.id).length };
    });
    ok(st.voci === 1, `regressione: annullata due volte → una sola voce (${st.voci})`);
    ok(st.dopoRiprenota === 0, 'regressione: riprenotata → sparisce da "annullate"');
    await c.close();
    // sito: chi non è mai entrato non vede "la tua lezione"
    const v = await b.newContext({ ...pw.devices['iPhone 13'] }), q = await v.newPage();
    await q.goto(base); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(500);
    ok(!/la tua lezione/.test(await q.textContent('body')), 'regressione: il visitatore non vede "la tua lezione"');
    await v.close();
  }

  // ---------- 5) accesso ----------
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await c.newPage();
    await p.goto(base + 'area/#benvenuto'); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.goto(base + 'area/#benvenuto'); await p.waitForTimeout(200);
    await p.fill('#f-email', ''); await p.click('[data-act=entra]'); await p.waitForTimeout(200);
    ok(p.url().endsWith('#benvenuto') && await p.getAttribute('#f-email', 'aria-invalid') === 'true', 'accesso: email vuota rifiutata');
    await p.fill('#f-email', 'giulia@'); await p.click('[data-act=entra]'); await p.waitForTimeout(200);
    ok(p.url().endsWith('#benvenuto'), 'accesso: email incompleta rifiutata');
    ok(await p.isVisible('#f-email-err') && /non sembra completa/.test(await p.textContent('#f-email-err')), 'accesso: messaggio chiaro sotto il campo');
    await p.fill('#f-email', 'giulia.r'); ok(await p.isHidden('#f-email-err'), 'accesso: il messaggio sparisce quando correggi');
    await p.fill('#f-email', 'giulia.rossi@esempio.it'); await p.press('#f-email', 'Enter'); await p.waitForTimeout(300);
    ok(p.url().endsWith('#oggi'), 'accesso: Invio fa entrare');
    await p.goto(base + 'area/#profilo'); await p.waitForTimeout(200);
    ok((await p.textContent('.utente .mail')).includes('giulia.rossi@esempio.it'), 'accesso: il profilo mostra l\'email usata');
    await p.click('.w-testa [data-act=esci]'); await p.waitForTimeout(200);
    ok(p.url().endsWith('#benvenuto'), 'accesso: Esci torna all\'accesso');
    await p.goto(base + 'area/#prenotazioni'); await p.waitForTimeout(200);
    ok(p.url().endsWith('#benvenuto'), 'accesso: da fuori le pagine riservate rimandano all\'accesso');
    await p.fill('#f-email', 'giulia.rossi@esempio.it'); await p.click('[data-act=entra]'); await p.waitForTimeout(300);
    ok(p.url().endsWith('#prenotazioni'), 'accesso: dopo l\'accesso torna alla pagina richiesta');
    // app da telefono: entra ed esci
    const t = await b.newContext({ ...pw.devices['iPhone 13'] }), q = await t.newPage();
    await q.goto(base + 'app/#benvenuto'); await q.evaluate(() => localStorage.clear()); await q.goto(base + 'app/#benvenuto'); await q.waitForTimeout(200);
    await q.click('[data-act=entra]'); await q.waitForTimeout(200);
    ok(q.url().endsWith('#oggi'), 'app: Entra porta a Oggi');
    await q.goto(base + 'app/#profilo'); await q.click('[data-act=esci]'); await q.waitForTimeout(200);
    ok(q.url().endsWith('#benvenuto'), 'app: Esci torna al benvenuto');
    await t.close(); await c.close();
  }
  await b.close();
  console.log(`${n - err}/${n} prove ok`);
  process.exitCode = err ? 1 : 0;
})();
