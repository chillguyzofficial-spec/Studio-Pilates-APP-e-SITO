// Cento Respiri — pannello dello studio (demo): lezioni del giorno, chi è su quale lettino, lista d'attesa,
// presenze, lezioni private, lettore del QR d'ingresso. Usa lo stesso motore dell'app (window.CR_MOTORE):
// la presenza di Chiara segnata qui compare nella sua app.
(() => {
'use strict';
const M = window.CR_MOTORE, { TIPI, ISTR, PRIVATE } = window.CR_DATI;
const root = document.getElementById('studio');
const KEY = 'cr-studio-presenze'; // presenze degli altri iscritti (solo su questo dispositivo)
const NOMI = ['Giulia R.', 'Francesca M.', 'Sara L.', 'Laura B.', 'Elisa T.', 'Valentina C.', 'Anna P.', 'Martina G.', 'Paola F.', 'Silvia D.', 'Roberta N.', 'Noemi V.', 'Luca S.', 'Marco A.', 'Federica Z.', 'Ilaria Q.', 'Alessandra O.', 'Simona E.', 'Irene P.', 'Cristina U.', 'Monica H.', 'Beatrice K.', 'Teresa W.', 'Giorgio J.'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let giorno = M.oggi0(), scelta = null;
const presAltri = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
const salvaAltri = x => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) { /* niente */ } };
const nomeLetto = (id, n) => NOMI[M.hash(id + '#' + n) % NOMI.length];

function entrato() { try { return sessionStorage.getItem('cr-staff') === '1'; } catch (e) { return false; } }

// chi occupa i 6 lettini di una lezione: altri iscritti (nomi di fantasia), Chiara se ha prenotato, la prova gratuita
function lettini(l) {
  const st = M.stato(l.id), S = M.S, pa = presAltri()[l.id] || [];
  return Array.from({ length: M.POSTI }, (_, k) => {
    const n = k + 1;
    if (st.mia && st.mia.letto === n) return { n, nome: S.utente.nome, tu: true, presente: S.presenze.includes(l.id) };
    if (st.occ.has(n)) {
      const prova = S.prova && S.prova.id === l.id && n === [...st.occ].sort((a, b) => b - a)[0] && !M.altri(l.id).has(n);
      return { n, nome: prova ? 'Prova gratuita' : nomeLetto(l.id, n), prova, presente: pa.includes(n) };
    }
    return { n, libero: true };
  });
}
function riepilogo(lz) {
  let pres = 0, pren = 0, liberi = 0, attesa = 0;
  lz.forEach(l => { const ls = lettini(l); pren += ls.filter(x => !x.libero).length; liberi += ls.filter(x => x.libero).length; pres += ls.filter(x => x.presente).length; attesa += M.stato(l.id).pieno ? 1 + M.hash(l.id) % 3 : 0; });
  return { pres, pren, liberi, attesa };
}

function disegna() {
  if (!entrato()) {
    root.innerHTML = `<main class="s-accesso"><div class="s-marchio" aria-hidden="true">${window.CR_MARCHIO}</div><div class="eti">Pannello dello studio</div><h1>Buongiorno, Marta</h1>
      <p>Lezioni del giorno, lettini, lista d'attesa e presenze. Inquadri il QR dell'app di un'iscritta e la presenza si registra da sola.</p>
      <button class="btn" type="button" data-s="entra">Entra come staff (demo)</button>
      <p class="nota">Demo: nessuna password, si entra solo per questa sessione. Nomi e presenze sono di fantasia.</p>
      <a class="link" href="../">‹ Il sito</a></main>`;
    return;
  }
  M.ricarica();
  const lz = M.lezioniDel(giorno), ora = Date.now();
  if (!scelta || !lz.some(l => l.id === scelta)) scelta = (lz.find(l => l.inizio.getTime() + M.DURATA * 60e3 > ora) || lz[0] || {}).id || null;
  const r = riepilogo(lz), oggi = M.ymd(giorno) === M.ymd(M.oggi0());
  const l = scelta && M.lezione(scelta);
  const priv = M.S.private.filter(p => M.ymd(M.privataDa(p)) === M.ymd(giorno));
  root.innerHTML = `
  <header class="s-testa"><div class="in">
    <div class="s-logo">${window.CR_MARCHIO}<span>CENTO RESPIRI</span><small>Pannello studio</small></div>
    <div class="s-giorno"><button class="tondo" type="button" data-s="giorno" data-d="-1" aria-label="Giorno precedente">‹</button><b>${oggi ? 'Oggi, ' : ''}${M.fGiorno(giorno)}</b><button class="tondo" type="button" data-s="giorno" data-d="1" aria-label="Giorno successivo">›</button></div>
    <div class="s-dx"><button class="btn btn--piccolo" type="button" data-s="scan">Scansiona QR</button><button class="link" type="button" data-s="esci">Esci</button></div>
  </div></header>
  <main class="s-corpo">
    <div class="s-numeri">
      <div><b>${lz.length}</b><span>lezioni</span></div><div><b>${r.pren}</b><span>prenotati</span></div><div><b>${r.pres}</b><span>presenti</span></div><div><b>${r.liberi}</b><span>posti liberi</span></div><div><b>${r.attesa}</b><span>in lista d'attesa</span></div>
    </div>
    <div class="s-due">
      <section class="s-elenco" aria-label="Lezioni del giorno">
        ${lz.map(x => { const ls = lettini(x), occ = ls.filter(y => !y.libero).length, pres = ls.filter(y => y.presente).length, finita = x.inizio.getTime() + M.DURATA * 60e3 < ora, inCorso = x.inizio <= ora && !finita;
          return `<button type="button" class="s-lez${x.id === scelta ? ' sel' : ''}${finita ? ' finita' : ''}" data-s="scegli" data-id="${x.id}"><b>${x.ora}</b><span><strong>${TIPI[x.tipo].nome}</strong><small>${ISTR[x.chi].breve}${inCorso ? ' · in corso' : finita ? ' · conclusa' : ''}</small></span><em>${occ}/${M.POSTI}${pres ? ` · ${pres} ✓` : ''}</em></button>`; }).join('') || '<p class="vuoto">Domenica: studio chiuso.</p>'}
        ${priv.length ? `<h2 class="sezione">Lezioni private</h2>${priv.map(p => { const d = M.privataDa(p); return `<div class="s-priv"><b>${M.fOra(d)}</b><span><strong>${M.S.utente.nome}${p.tipo === 'coppia' ? ' + 1' : ''}</strong><small>${PRIVATE[p.tipo].nome} · ${ISTR[p.chi].breve}${p.regalo ? ' · regalo' : ''}</small></span></div>`; }).join('')}` : ''}
      </section>
      <section class="s-dettaglio" aria-live="polite">${l ? dettaglio(l) : '<p class="vuoto">Nessuna lezione.</p>'}</section>
    </div>
  </main>`;
}
function dettaglio(l) {
  const ls = lettini(l), st = M.stato(l.id), S = M.S;
  const attesa = st.pieno || st.attesa ? Array.from({ length: (st.attesa ? st.attesa.pos : 1 + M.hash(l.id) % 3) }, (_, k) => st.attesa && k === st.attesa.pos - 1 ? S.utente.nome : NOMI[M.hash(l.id + 'w' + k) % NOMI.length]) : [];
  return `<div class="s-dtesta"><div><div class="eti">${M.Maiusc(M.fGiorno(l.inizio))} · ${l.ora}</div><h2>${TIPI[l.tipo].nome}</h2><p>${ISTR[l.chi].nome} · ${M.DURATA} minuti</p></div>
    <div class="s-specchio">Specchio</div></div>
    <div class="s-lettini">${ls.map(x => x.libero ? `<div class="s-letto libero"><b>${x.n}</b><span>libero</span></div>`
      : `<div class="s-letto${x.presente ? ' presente' : ''}${x.tu ? ' tu' : ''}"><b>${x.n}</b><span>${esc(x.nome)}${x.tu ? ' <small>(app)</small>' : ''}</span>
         <button type="button" data-s="presenza" data-id="${l.id}" data-n="${x.n}" aria-pressed="${!!x.presente}">${x.presente ? '✓ Presente' : 'Segna presente'}</button></div>`).join('')}</div>
    ${attesa.length ? `<div class="s-attesa"><h3>Lista d'attesa</h3><ol>${attesa.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>` : ''}`;
}

function segnaPresente(id, n, forza) {
  const S = M.S, st = M.stato(id);
  if (st.mia && st.mia.letto === n) {
    const i = S.presenze.indexOf(id);
    if (i >= 0 && !forza) S.presenze.splice(i, 1);
    else if (i < 0) { S.presenze.push(id); }
    M.salva();
  } else {
    const pa = presAltri(), l = pa[id] || [];
    pa[id] = l.includes(n) && !forza ? l.filter(x => x !== n) : [...new Set([...l, n])];
    salvaAltri(pa);
  }
}

// ---------- lettore del QR d'ingresso ----------
let stream = null, giro = null;
function apriScan() {
  const v = document.createElement('div');
  v.className = 's-scan'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Lettore QR');
  v.innerHTML = `<div class="s-scan__box"><div class="s-scan__testa"><h2>Inquadra il QR dell'app</h2><button class="link" type="button" data-s="chiudiScan">Chiudi</button></div>
    <div class="s-scan__video"><video playsinline muted></video><div class="s-scan__mirino"></div><p class="s-scan__msg">Avvio della fotocamera…</p></div>
    <div class="s-scan__esito" aria-live="assertive"></div>
    <div class="s-scan__manuale"><label>Oppure scrivi il codice<input type="text" id="s-codice" placeholder="CR-DEMO-0000" autocomplete="off"></label><button class="btn btn--bordo btn--piccolo" type="button" data-s="codice">Controlla</button></div>
    <button class="link" type="button" data-s="simula">Prova col QR di Chiara (demo, senza fotocamera)</button></div>`;
  document.body.appendChild(v);
  document.documentElement.style.overflow = 'hidden';
  const video = v.querySelector('video'), msg = v.querySelector('.s-scan__msg');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'Fotocamera non disponibile su questo dispositivo: usa il codice qui sotto.'; return; }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(s => {
    stream = s; video.srcObject = s; video.play(); msg.textContent = '';
    const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
    const leggi = () => {
      if (!stream) return;
      if (video.readyState >= 2 && video.videoWidth) {
        c.width = video.videoWidth; c.height = video.videoHeight; ctx.drawImage(video, 0, 0);
        const r = window.jsQR && window.jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' });
        if (r && r.data) { riconosci(r.data); }
      }
      giro = requestAnimationFrame(leggi);
    };
    leggi();
  }).catch(() => { msg.textContent = 'Permesso per la fotocamera negato: usa il codice qui sotto.'; });
}
function chiudiScan() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  cancelAnimationFrame(giro);
  const v = document.querySelector('.s-scan'); if (v) v.remove();
  document.documentElement.style.overflow = '';
  disegna();
}
let ultimoCodice = '', ultimoT = 0;
function riconosci(testo) {
  const cod = String(testo).trim().toUpperCase(), now = Date.now();
  if (cod === ultimoCodice && now - ultimoT < 4000) return; // stesso codice inquadrato di continuo
  ultimoCodice = cod; ultimoT = now;
  M.ricarica();
  const S = M.S, esito = document.querySelector('.s-scan__esito');
  if (!esito) return;
  if (cod !== M.codiceIngresso()) { esito.innerHTML = `<div class="s-esito no"><b>Codice non riconosciuto</b><span>${esc(cod)}</span></div>`; return; }
  // la lezione di oggi più vicina all'ora attuale (da un'ora prima a fine lezione)
  const oggi = M.ymd(M.oggi0());
  const mie = S.pren.map(p => ({ p, l: M.lezione(p.id) })).filter(x => x.l && M.ymd(x.l.inizio) === oggi).sort((a, b) => Math.abs(a.l.inizio - now) - Math.abs(b.l.inizio - now));
  if (!mie.length) { esito.innerHTML = `<div class="s-esito no"><b>${esc(S.utente.nome)}</b><span>Nessuna lezione prenotata oggi. Proponi un posto libero.</span></div>`; return; }
  const { p, l } = mie[0];
  const gia = S.presenze.includes(l.id);
  segnaPresente(l.id, p.letto, true);
  if (!gia) M.aggiungiNotifica('studio', 'Presenza registrata', `${TIPI[l.tipo].nome} delle ${l.ora}, lettino ${p.letto}. Buona lezione!`), M.salva();
  if (navigator.vibrate) navigator.vibrate(60);
  esito.innerHTML = `<div class="s-esito si"><b>✓ ${esc(S.utente.nome)}</b><span>${TIPI[l.tipo].nome} delle ${l.ora} · lettino ${p.letto} · ${gia ? 'presenza già registrata' : 'presenza registrata'}</span></div>`;
  scelta = l.id; giorno = M.oggi0();
}

// ---------- tocchi ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  const a = b.dataset.s;
  if (a === 'entra') { try { sessionStorage.setItem('cr-staff', '1'); } catch (x) { /* niente */ } disegna(); }
  else if (a === 'esci') { try { sessionStorage.removeItem('cr-staff'); } catch (x) { /* niente */ } disegna(); }
  else if (a === 'giorno') { giorno = M.piuGiorni(giorno, +b.dataset.d); scelta = null; disegna(); }
  else if (a === 'scegli') { scelta = b.dataset.id; disegna(); if (innerWidth < 900) document.querySelector('.s-dettaglio').scrollIntoView({ block: 'start' }); }
  else if (a === 'presenza') { segnaPresente(b.dataset.id, +b.dataset.n, false); disegna(); }
  else if (a === 'scan') apriScan();
  else if (a === 'chiudiScan') chiudiScan();
  else if (a === 'codice') riconosci(document.getElementById('s-codice').value);
  else if (a === 'simula') riconosci(M.codiceIngresso());
});
addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.s-scan')) chiudiScan(); });
addEventListener('storage', () => { if (!document.querySelector('.s-scan')) { M.ricarica(); disegna(); } });
setInterval(() => { if (!document.querySelector('.s-scan')) disegna(); }, 60e3);
disegna();
})();
