// Cento Respiri — app iscritti (demo). Tutto avviene sul telefono: nessun server, nessun dato inviato.
// Lo stato della demo è in localStorage ('cr-demo-1'); "Ricomincia la demo" nel Profilo lo azzera.
(() => {
'use strict';
const KEY = 'cr-demo-1';
const app = document.getElementById('app');
const FOTO = window.CR_FOTO || {};
const MARCHIO = window.CR_MARCHIO || '';
// stesso motore, due esperienze: l'app da telefono (app/) e l'area clienti nel browser (area/, body.web).
// Condividono l'account (lo stesso stato salvato): una prenotazione fatta dal PC compare nell'app.
const WEB = document.body.classList.contains('web');

// ---------- date ----------
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const piuGiorni = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const GBREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const Maiusc = s => s.charAt(0).toUpperCase() + s.slice(1);
const fGiorno = d => `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
const fData = d => `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
const fOra = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const oggi0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
function quando(d) { // "Oggi", "Domani", "Giovedì 8 ottobre"
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - oggi0()) / 864e5);
  return diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : diff === -1 ? 'Ieri' : Maiusc(fGiorno(d));
}

// ---------- lo studio ----------
// istruttori, tipi di lezione e orario settimanale: app/dati.js (condiviso col sito)
const { ISTR, TIPI, SCHEMA } = window.CR_DATI;
const POSTI = 6, DURATA = 50, FINESTRA = 14; // giorni prenotabili in anticipo
const ORE12 = 12 * 3600e3, SCADENZA_POSTO = 45 * 60e3;

function lezioniDel(d) {
  const g = ymd(d);
  return (SCHEMA[d.getDay()] || []).map(([ora, tipo, chi]) => {
    const [h, m] = ora.split(':').map(Number);
    const inizio = new Date(d); inizio.setHours(h, m, 0, 0);
    return { id: g + '_' + ora.replace(':', ''), inizio, ora, tipo, chi };
  });
}
function lezione(id) {
  const [g, o] = id.split('_');
  const d = daYmd(g);
  return lezioniDel(d).find(l => l.ora === o.slice(0, 2) + ':' + o.slice(2)) || null;
}
// posti occupati da "altri iscritti": sempre gli stessi per una lezione (numero pseudo-casuale fisso)
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function altri(id) {
  let s = hash(id);
  const n = [1, 2, 3, 4, 5, 6, 6, 4, 5, 3][s % 10];
  const letti = [1, 2, 3, 4, 5, 6];
  for (let i = 5; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); [letti[i], letti[j]] = [letti[j], letti[i]]; }
  return new Set(letti.slice(0, n));
}
function stato(id) {
  const occ = altri(id);
  (S.liberati[id] || []).forEach(n => occ.delete(n));
  const mia = S.pren.find(p => p.id === id) || null;
  if (mia) occ.delete(mia.letto);
  if (S.prova && S.prova.id === id && !mia) { // la prova occupa un lettino, assegnato all'arrivo
    for (let n = 1; n <= POSTI; n++) if (!occ.has(n)) { occ.add(n); break; }
  }
  const liberi = POSTI - occ.size - (mia ? 1 : 0);
  return { occ, mia, liberi, pieno: liberi <= 0 && !mia, attesa: S.attesa.find(a => a.id === id) || null };
}

// ---------- stato della demo ----------
let S;
function salva() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* demo senza memoria: va bene lo stesso */ } }
function carica() { try { const x = JSON.parse(localStorage.getItem(KEY)); if (x && x.v === 1) return x; } catch (e) { /* niente */ } return null; }
function nuovaDemo() {
  const ora = Date.now(), oggi = oggi0();
  const prossime = []; // lezioni future nei prossimi 10 giorni
  for (let i = 0; i < 10; i++) lezioniDel(piuGiorni(oggi, i)).forEach(l => { if (l.inizio - ora > 3600e3) prossime.push(l); });
  const pren = [], usati = new Set();
  const int1 = prossime.find(l => l.tipo === 'intermedio');
  if (int1) { pren.push({ id: int1.id, letto: 4, con: 'carnet', il: ora - 864e5 }); usati.add(ymd(int1.inizio)); }
  const int2 = prossime.find(l => l.tipo === 'intermedio' && !usati.has(ymd(l.inizio)) && l.inizio - int1.inizio > 864e5);
  if (int2) pren.push({ id: int2.id, letto: 2, con: 'carnet', il: ora - 864e5 });
  const attesa = [];
  const piena = prossime.find(l => l.inizio - ora > 3 * 3600e3 && !pren.some(p => p.id === l.id) && altri(l.id).size === POSTI && ['base', 'tower'].includes(l.tipo));
  if (piena) attesa.push({ id: piena.id, pos: 2, il: ora - 864e5, liberaAlle: ora + 30e3 });
  // storico: due lezioni fatte e una annullata nei giorni scorsi
  const passate = [];
  for (let i = 1, fatte = 0; i < 20 && passate.length < 3; i++) {
    const l = lezioniDel(piuGiorni(oggi, -i)).find(x => (fatte < 2 ? ['intermedio', 'tower'] : ['base']).includes(x.tipo));
    if (l) { passate.push({ id: l.id, stato: fatte < 2 ? 'fatta' : 'annullata' }); fatte++; }
  }
  const ieri = ora - 864e5;
  const notifiche = [];
  if (pren[1]) notifiche.push({ n: 1, tipo: 'conferma', titolo: 'Prenotazione confermata', testo: `${Maiusc(fGiorno(lezione(pren[1].id).inizio))}, ${lezione(pren[1].id).ora} · lettino ${pren[1].letto}`, t: ieri + 3600e3, letto: true });
  if (attesa[0]) notifiche.push({ n: 2, tipo: 'attesa', titolo: 'Sei in lista d\'attesa', testo: `${Maiusc(fGiorno(lezione(attesa[0].id).inizio))}, ${lezione(attesa[0].id).ora} · posizione 2`, t: ieri, letto: true });
  return {
    v: 1, entrato: false, n: 3,
    utente: { nome: 'Chiara Bassi', email: 'chiara.bassi@esempio.it', tel: '+39 333 000 0000', livello: 'Intermedio' },
    carnet: { tot: 10, usati: 4, dal: ymd(piuGiorni(oggi, -34)), al: ymd(piuGiorni(oggi, 55)) },
    mensile: null,
    pren, attesa, passate, liberati: {}, notifiche, ricordati: [],
    prefs: { posto: true, promemoria: true, novita: false, auto: false, letto: null },
    certificato: null, prova: null,
    base: { fatte: 21, settimane: 4, mese: 2 }, // storico prima della demo: iscritta da maggio
    fisse: [], saltate: [],
    private: [], crediti: { privata: 0 }, presenze: [],
  };
}
// completa una demo salvata con una versione precedente dell'app
function completa(x) {
  x.prefs = Object.assign({ posto: true, promemoria: true, novita: false, auto: false, letto: null }, x.prefs);
  x.base = x.base || { fatte: 21, settimane: 4, mese: 2 };
  x.fisse = x.fisse || []; x.saltate = x.saltate || [];
  x.private = x.private || []; x.crediti = x.crediti || { privata: 0 }; x.presenze = x.presenze || [];
  return x;
}
S = completa(carica() || nuovaDemo());

// lezioni private: id "p_AAAA-MM-GG_HHMM_istruttore"
const { PRIVATE, SLOT_PRIVATE, REGALI } = window.CR_DATI;
function privataDa(p) { const [g, o] = p.id.slice(2).split('_'); const d = daYmd(g); d.setHours(+o.slice(0, 2), +o.slice(2), 0, 0); return d; }
function slotPrivate(chi) { // prossimi giorni: orari in cui la sala è libera e l'istruttore pure
  const ora = Date.now(), out = [];
  for (let i = 0; i < 9 && out.length < 12; i++) {
    const d = piuGiorni(oggi0(), i), g = ymd(d);
    (SLOT_PRIVATE[d.getDay()] || []).forEach(o => {
      if (out.length >= 12) return;
      const inizio = new Date(d); inizio.setHours(+o.slice(0, 2), +o.slice(3), 0, 0);
      if (inizio - ora < 2 * 3600e3) return;
      const liberi = Object.keys(ISTR).filter(k => (!chi || k === chi) && hash(g + o + k) % 3 !== 0 && !S.private.some(p => p.id === `p_${g}_${o.replace(':', '')}_${k}`));
      if (liberi.length) out.push({ g, o, inizio, chi: liberi[0] });
    });
  }
  return out;
}

// carnet / mensile
const mensileAttivo = () => S.mensile && daYmd(S.mensile.al) >= oggi0();
const rimasti = () => Math.max(0, S.carnet.tot - S.carnet.usati);
const carnetValido = () => rimasti() > 0 && daYmd(S.carnet.al) >= oggi0();

// progressi: lezioni fatte, settimane di fila, prossimo traguardo (chi vede i progressi continua di più)
const TRAGUARDI = [10, 25, 50, 100, 150, 200, 300];
const lunedi = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
function progressi() {
  const fatte = S.passate.filter(x => x.stato === 'fatta').map(x => lezione(x.id)).filter(Boolean);
  const tot = S.base.fatte + fatte.length, ora = new Date();
  const mese = S.base.mese + fatte.filter(l => l.inizio.getMonth() === ora.getMonth() && l.inizio.getFullYear() === ora.getFullYear()).length;
  const sett = new Set(fatte.map(l => lunedi(l.inizio)));
  let fila = S.base.settimane, w = lunedi(ora);
  if (!sett.has(w)) w = lunedi(piuGiorni(new Date(w), -7));
  while (sett.has(w)) { fila++; w = lunedi(piuGiorni(new Date(w), -7)); }
  const prossimo = TRAGUARDI.find(t => t > tot) || tot + 100;
  const prec = [...TRAGUARDI].reverse().find(t => t <= tot) || 0;
  return { tot, mese, fila, prossimo, prec };
}
// quadrante a cento tacche (come il marchio) che si riempie verso il prossimo traguardo
function anello(pct) {
  let s = '';
  const piene = Math.round(pct * 100);
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2 - Math.PI / 2, long = i % 10 === 0, r1 = long ? 33 : 39, f = n => +n.toFixed(2);
    s += `<line x1="${f(50 + r1 * Math.cos(a))}" y1="${f(50 + r1 * Math.sin(a))}" x2="${f(50 + 47 * Math.cos(a))}" y2="${f(50 + 47 * Math.sin(a))}" stroke="${i < piene ? '#6A2C2E' : '#DCD1BF'}" stroke-width="${long ? 2.4 : 1.4}"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true" stroke-linecap="round">${s}</svg>`;
}

// lettino: il preferito se è libero, altrimenti il primo libero
function scegliLetto(st, pref) {
  if (pref && !st.occ.has(pref)) return pref;
  return [1, 2, 3, 4, 5, 6].find(n => !st.occ.has(n)) || null;
}
// prenotazione fissa: corrisponde a una lezione dell'orario settimanale?
const fissaDi = l => S.fisse.find(f => f.g === l.inizio.getDay() && f.ora === l.ora && f.tipo === l.tipo) || null;

// ---------- utilità interfaccia ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function fx(id, cls) {
  const f = FOTO[id];
  if (!f) return `<div class="fx ${cls}"></div>`;
  if (f.ph) return `<div class="fx ${cls}"><div class="ph"><span>${esc(f.ph)}</span></div></div>`;
  return `<div class="fx ${cls}"><img src="${f.src}" srcset="${f.srcset}" sizes="(max-width:480px) 100vw, 448px" alt="" decoding="async"></div>`;
}
const fotoLezione = tipo => FOTO['app-lezione-' + tipo] ? 'app-lezione-' + tipo : 'app-lezione-base';
const tacche = (on, grandi) => `<div class="tacche${grandi ? ' tacche--grandi' : ''}" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i${i >= 10 - on ? ' class="on"' : ''}></i>`).join('')}</div>`;
const livello = t => t.liv ? `<span>${[1, 2, 3].map(i => `<i${i <= t.liv ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
const nonLetti = () => S.notifiche.filter(n => !n.letto).length;

const SEZIONI = [['oggi', 'Oggi'], ['orario', 'Orario'], ['prenotazioni', 'Prenotazioni'], ['carnet', 'Carnet'], ['profilo', 'Profilo']];
function nav(attiva) {
  if (WEB) return ''; // nel browser il menu è nella testata
  return `<nav class="nav" aria-label="Sezioni">${SEZIONI.map(([k, t]) => `<a href="#${k}"${k === attiva ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}
// testata dell'area clienti nel browser: logo, menu, avvisi, esci
function testata(attiva) {
  const nl = nonLetti();
  return `<header class="w-testa"><div class="in">
    <a class="w-logo" href="../" aria-label="Cento Respiri, il sito">${MARCHIO}<span>CENTO RESPIRI</span><small>Area clienti</small></a>
    <nav aria-label="Sezioni">${SEZIONI.map(([k, t]) => `<a href="#${k}"${k === attiva ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div class="w-dx"><a class="pill" href="#avvisi">${nl ? '<span class="pallino"></span>' : ''}Avvisi${nl ? ' ' + nl : ''}</a><button class="link" type="button" data-act="esci">Esci</button></div>
  </div></header>`;
}
// QR in SVG (qrcode-generator, in locale)
function qrSvg(testo) {
  try { const q = window.qrcode(0, 'M'); q.addData(testo); q.make(); return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }); } catch (e) { return ''; }
}
// riquadro "scarica l'app": dal PC si inquadra il codice col telefono e si apre l'app
function bannerApp() {
  const url = new URL('../app/', location.href).href;
  return `<div class="scheda banner-app">
    <div class="qr-app" aria-hidden="true">${qrSvg(url)}</div>
    <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
      <div class="eti">Scarica l'app</div>
      <div class="t18b">Prenoti con un tocco, dal telefono</div>
      <div class="t16">Avviso quando si libera un posto, QR per entrare in studio, funziona anche senza rete. Inquadra il codice col telefono e aggiungila alla schermata Home.</div>
      <div class="azioni" style="justify-content:flex-start;gap:0 16px"><a class="link" href="../app/" style="padding:0">Apri l'app</a><a class="link" href="../app/#installa" style="padding:0">Come si installa</a></div>
    </div>
  </div>`;
}
let toastT;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800);
}
// finestra dal basso (blocco dello scroll solo su <html>)
let foglioAperto = null;
function apriFoglio(html, etichetta) {
  chiudiFoglio();
  const v = document.createElement('div');
  v.className = 'velo';
  v.innerHTML = `<div class="foglio" role="dialog" aria-modal="true" aria-label="${esc(etichetta)}" tabindex="-1">${html}</div>`;
  v.addEventListener('click', e => { if (e.target === v) chiudiFoglio(); });
  document.body.appendChild(v);
  document.documentElement.style.overflow = 'hidden';
  foglioAperto = { v, prima: document.activeElement };
  v.querySelector('.foglio').focus();
}
function chiudiFoglio() {
  if (!foglioAperto) return;
  foglioAperto.v.remove();
  document.documentElement.style.overflow = '';
  const p = foglioAperto.prima; foglioAperto = null;
  if (p && p.isConnected) p.focus({ preventScroll: true });
}
addEventListener('keydown', e => { if (e.key === 'Escape') { chiudiFoglio(); chiudiQR(); } });

// notifica di sistema (solo se permessa; su iPhone funziona con l'app aggiunta alla schermata Home)
function notificaSistema(titolo, testo, url) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(r => r.showNotification(titolo, { body: testo, icon: '../assets/icone/icona-192.png', badge: '../assets/icone/icona-192.png', data: { url }, tag: url }));
  } catch (e) { /* niente */ }
}
function aggiungiNotifica(tipo, titolo, testo, extra = {}) {
  S.n = (S.n || 0) + 1;
  S.notifiche.unshift({ n: S.n, tipo, titolo, testo, t: Date.now(), letto: false, ...extra });
  S.notifiche = S.notifiche.slice(0, 30);
}

// ---------- regole ----------
function puoiPrenotare(l) {
  const ora = Date.now();
  if (l.inizio <= ora) return 'La lezione è già iniziata.';
  if (l.inizio - oggi0() > FINESTRA * 864e5) return 'Si prenota al massimo 14 giorni prima.';
  if (S.pren.some(p => p.id !== l.id && lezione(p.id) && Math.abs(lezione(p.id).inizio - l.inizio) < DURATA * 60e3)) return 'Hai già una lezione a quest\'ora.';
  if (!mensileAttivo() && !carnetValido()) return 'carnet';
  return '';
}
// auto: titolo dell'avviso quando prenota l'app da sola (prenotazione fissa, posto preso per te)
function prenota(l, letto, auto = '') {
  const motivo = puoiPrenotare(l);
  if (motivo) { if (!auto) toast(motivo === 'carnet' ? 'Il carnet è finito: ricaricalo dalla sezione Carnet.' : motivo); return false; }
  const con = mensileAttivo() ? 'mensile' : 'carnet';
  if (con === 'carnet') S.carnet.usati++;
  S.pren.push({ id: l.id, letto, con, il: Date.now() });
  S.attesa = S.attesa.filter(a => a.id !== l.id);
  if (S.liberati[l.id]) S.liberati[l.id] = S.liberati[l.id].filter(n => n !== letto);
  aggiungiNotifica('conferma', auto || 'Prenotazione confermata', `${Maiusc(fGiorno(l.inizio))}, ${l.ora} · ${TIPI[l.tipo].nome} · lettino ${letto}`, { letto: !auto, id: l.id });
  salva();
  return true;
}
function annulla(id) {
  const p = S.pren.find(x => x.id === id), l = lezione(id);
  if (!p || !l) return;
  if (fissaDi(l) && !S.saltate.includes(id)) S.saltate.push(id); // una data saltata non si riprenota da sola
  const rimborso = l.inizio - Date.now() >= ORE12;
  if (p.con === 'carnet' && rimborso) S.carnet.usati = Math.max(0, S.carnet.usati - 1);
  S.pren = S.pren.filter(x => x.id !== id);
  (S.liberati[id] = S.liberati[id] || []).push(p.letto);
  S.passate.unshift({ id, stato: 'annullata' });
  salva();
  toast(p.con === 'mensile' ? 'Prenotazione annullata.' : rimborso ? 'Annullata: l\'ingresso è tornato nel carnet.' : 'Annullata: mancavano meno di 12 ore, l\'ingresso è stato scalato.');
}
function inAttesa(l) {
  if (S.attesa.some(a => a.id === l.id)) return;
  const pos = 1 + (hash(l.id) % 3);
  // demo: dopo una ventina di secondi "si libera un posto", come succede quando qualcuno annulla
  S.attesa.push({ id: l.id, pos, il: Date.now(), liberaAlle: Date.now() + 20e3 });
  aggiungiNotifica('attesa', 'Sei in lista d\'attesa', `${Maiusc(fGiorno(l.inizio))}, ${l.ora} · posizione ${pos}`, { letto: true });
  salva();
}
// un posto offerto e rifiutato (o scaduto) va al prossimo in lista: non resta libero
function passaAlProssimo(a) { if (S.liberati[a.id]) S.liberati[a.id] = S.liberati[a.id].filter(n => n !== a.offerta.letto); }
// controlla ogni pochi secondi: posti che si liberano, offerte scadute, promemoria 2 ore prima
function controlla() {
  if (!S.entrato) return;
  const ora = Date.now();
  let cambiato = false;
  S.attesa.forEach(a => {
    const l = lezione(a.id);
    if (!l || l.inizio <= ora) return;
    if (!a.offerta && a.liberaAlle && ora >= a.liberaAlle) {
      const st = stato(a.id);
      const letto = [...st.occ][hash(a.id + 'x') % st.occ.size] || 1;
      (S.liberati[a.id] = S.liberati[a.id] || []).push(letto);
      a.offerta = { letto, scade: ora + SCADENZA_POSTO };
      cambiato = true;
      // "prendilo per me": il posto si prenota da solo, senza dover rispondere
      if (S.prefs.auto && prenota(l, letto, 'Posto preso per te')) {
        const t = `Posto preso per te: ${quando(l.inizio).toLowerCase()} ${l.ora}`, x = `${TIPI[l.tipo].nome} con ${ISTR[l.chi].nome}, lettino ${letto}. Se non puoi più venire, annulla dall'app.`;
        notificaSistema(t, x, '#lezione/' + l.id);
        toast(t + '.');
        return;
      }
      const scade = new Date(a.offerta.scade);
      const titolo = `Si è liberato un posto ${quando(l.inizio).toLowerCase()} ${l.ora}`;
      const testo = `${TIPI[l.tipo].nome} con ${ISTR[l.chi].nome}. È tuo se lo confermi entro le ${fOra(scade)}.`;
      aggiungiNotifica('posto', titolo, testo, { id: a.id, letto: false, lettino: letto, scade: a.offerta.scade });
      if (S.prefs.posto) notificaSistema(titolo, testo, '#avvisi');
      if (S.prefs.posto) toast('Si è liberato un posto: guarda negli Avvisi.');
      cambiato = true;
    }
    if (a.offerta && ora > a.offerta.scade) { a.scaduta = true; cambiato = true; }
  });
  const scadute = S.attesa.filter(a => a.scaduta || (lezione(a.id) && lezione(a.id).inizio <= ora));
  if (scadute.length) { scadute.forEach(a => { if (a.offerta) passaAlProssimo(a); }); S.attesa = S.attesa.filter(a => !scadute.includes(a)); cambiato = true; }
  S.pren.forEach(p => {
    const l = lezione(p.id);
    if (!l || S.ricordati.includes(p.id)) return;
    const manca = l.inizio - ora;
    if (manca > 0 && manca <= 2 * 3600e3) {
      S.ricordati.push(p.id);
      if (!S.prefs.promemoria) return;
      const titolo = `Alle ${l.ora} ${TIPI[l.tipo].nome}`;
      const testo = `Con ${ISTR[l.chi].breve}, lettino ${p.letto}. Ricordati le calze antiscivolo.`;
      aggiungiNotifica('promemoria', titolo, testo, { id: p.id });
      notificaSistema(titolo, testo, '#lezione/' + p.id);
      cambiato = true;
    }
  });
  // le prenotazioni concluse passano nello storico
  const finite = S.pren.filter(p => { const l = lezione(p.id); return !l || l.inizio.getTime() + DURATA * 60e3 < ora; });
  if (finite.length) { finite.forEach(p => S.passate.unshift({ id: p.id, stato: 'fatta' })); S.pren = S.pren.filter(p => !finite.includes(p)); cambiato = true; }
  if (prenotaFisse()) cambiato = true;
  // traguardi raggiunti (10, 25, 50, 100 lezioni…): un avviso, una volta sola
  const pr = progressi();
  if (!S.traguardi) S.traguardi = TRAGUARDI.filter(t => t <= pr.tot);
  TRAGUARDI.filter(t => t <= pr.tot && !S.traguardi.includes(t)).forEach(t => {
    S.traguardi.push(t);
    aggiungiNotifica('traguardo', t === 100 ? 'Cento lezioni. Cento respiri.' : `Traguardo: ${t} lezioni`, 'Grazie della costanza. Alla prossima lezione te lo diciamo anche di persona.');
    cambiato = true;
  });
  if (cambiato) { salva(); if (!foglioAperto) disegna(false); }
}
// prenotazioni fisse: appena una data entra nella finestra dei 14 giorni la prenota (o mette in lista d'attesa)
function prenotaFisse() {
  if (!S.fisse.length) return false;
  const ora = Date.now();
  let fatto = false;
  for (let i = 0; i <= FINESTRA; i++) {
    lezioniDel(piuGiorni(oggi0(), i)).forEach(l => {
      const f = fissaDi(l);
      if (!f || l.inizio - ora < 3600e3 || S.saltate.includes(l.id) || S.pren.some(p => p.id === l.id) || S.attesa.some(a => a.id === l.id)) return;
      const st = stato(l.id);
      if (st.pieno) { inAttesa(l); fatto = true; return; }
      const motivo = puoiPrenotare(l);
      if (motivo) {
        S.saltate.push(l.id);
        if (motivo === 'carnet') aggiungiNotifica('studio', 'Prenotazione fissa non fatta', `${Maiusc(fGiorno(l.inizio))}, ${l.ora}: il carnet è finito. Ricaricalo dalla sezione Carnet.`);
        fatto = true; return;
      }
      fatto = prenota(l, scegliLetto(st, f.letto), 'Prenotazione fissa') || fatto;
    });
  }
  return fatto;
}

// ---------- schermate ----------
const V = {};
let sel = { giorno: null, letto: {}, prova: {} };

// accesso dal browser: email (nella versione vera arriva un link, niente password) + promozione dell'app
function benvenutoWeb() {
  const prova = S.prova && lezione(S.prova.id) && lezione(S.prova.id).inizio > Date.now() ? lezione(S.prova.id) : null;
  return `
<main class="vista" tabindex="-1">
  <div class="w-login">
    <div class="w-login__marchio" aria-hidden="true">${MARCHIO}</div>
    <div class="w-login__form">
      <a class="indietro" href="../" style="margin:0 0 8px">‹ Il sito</a>
      <div class="eti">Area clienti</div>
      <h1 class="h1">Bentornata in studio</h1>
      <p class="t16" style="margin:0">Prenota le lezioni, gestisci carnet e lista d'attesa dal computer.</p>
      <label class="campo">Email<input type="email" id="f-email" value="chiara.bassi@esempio.it" autocomplete="email"></label>
      <button class="btn" type="button" data-act="entra">Entra</button>
      <p class="t16 grigio" style="margin:0">Niente password: nella versione vera ti mandiamo un link via email. Demo: entri come Chiara, iscritta di prova, e non viene inviato nulla.</p>
      ${prova ? `<a class="voce" href="#prova/fatto">La tua prova: ${quando(prova.inizio).toLowerCase()} alle ${prova.ora}<span>›</span></a>` : '<a class="link" href="#prova" style="justify-content:flex-start;padding:0">Prima volta? Prenota la prova gratuita</a>'}
      ${bannerApp()}
    </div>
  </div>
</main>`;
}
V.benvenuto = () => WEB ? benvenutoWeb() : `
<main class="vista" tabindex="-1">
  ${fx('app-benvenuto', 'fx--benvenuto')}
  <div class="marchio-riga" style="padding:12px 8px 0">${MARCHIO}<div><div class="marchio-nome">CENTO RESPIRI</div><div class="sopra" style="margin-top:6px">Pilates reformer · Torino</div></div></div>
  <h1 class="frase" style="padding:0 8px">Sei lettini, cinquanta minuti, cento respiri per cominciare.</h1>
  ${S.prova && lezione(S.prova.id) && lezione(S.prova.id).inizio > Date.now() ? `<a class="voce" href="#prova/fatto">La tua prova: ${quando(lezione(S.prova.id).inizio).toLowerCase()} alle ${lezione(S.prova.id).ora}<span>›</span></a>` : ''}
  <div class="giu">
    <button class="btn" type="button" data-act="entra">Entra</button>
    <a class="link" href="#prova">Prima volta? Prenota la prova gratuita</a>
    <p class="demo-nota" style="margin:0">Demo: entri come Chiara, iscritta di prova. Nessun dato reale.</p>
    <a class="link" href="../">‹ Torna al sito</a>
  </div>
</main>`;

V.oggi = () => {
  const ora = Date.now();
  const prossime = S.pren.map(p => ({ p, l: lezione(p.id) })).filter(x => x.l && x.l.inizio.getTime() + DURATA * 60e3 > ora).sort((a, b) => a.l.inizio - b.l.inizio);
  const pr = prossime[0];
  const nl = nonLetti();
  const att = S.attesa.map(a => ({ a, l: lezione(a.id) })).filter(x => x.l);
  return `
<main class="vista" tabindex="-1">
  <div class="riga-titolo">
    <div style="display:flex;flex-direction:column;gap:4px"><div class="sopra">${Maiusc(fGiorno(new Date()))}</div><h1 class="h1">Ciao, ${esc(S.utente.nome.split(' ')[0])}</h1></div>
    ${WEB ? '' : `<a class="pill" href="#avvisi">${nl ? '<span class="pallino"></span>' : ''}Avvisi${nl ? ' ' + nl : ''}</a>`}
  </div>
  <div class="scheda scheda--foto">
    ${fx('app-home', 'fx--home')}
    ${pr ? `<a class="dentro" href="#lezione/${pr.l.id}" style="color:inherit;text-decoration:none">
      <div class="eti">Prossima lezione · ${quando(pr.l.inizio).toLowerCase()}</div>
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><div class="ora-grande">${pr.l.ora}</div><div class="t16">${fGiorno(pr.l.inizio)}</div></div>
      <div class="t18b">${TIPI[pr.l.tipo].nome} · ${DURATA} min</div>
      ${S.presenze.includes(pr.l.id) ? '<div class="riquadro" style="padding:8px 14px"><b>✓ Presenza registrata in studio.</b> Buona lezione!</div>' : ''}
      <div class="dati2"><div><div class="sopra">Istrutt${ISTR[pr.l.chi].f === 'o' ? 'ore' : 'rice'}</div><b>${ISTR[pr.l.chi].nome}</b></div><div style="text-align:right"><div class="sopra">Lettino</div><div class="serif">n° ${pr.p.letto}</div></div></div>
    </a>` : `<div class="dentro"><div class="eti">Nessuna lezione prenotata</div><div class="t16">Scegli giorno e ora nell'orario: ci vogliono due tocchi.</div></div>`}
  </div>
  ${S.private.filter(p => privataDa(p) > Date.now()).sort((a, b) => privataDa(a) - privataDa(b)).slice(0, 1).map(p => { const dt = privataDa(p); return `<a class="voce" href="#prenotazioni" style="font-weight:500"><div>Lezione privata · ${quando(dt).toLowerCase()} ${fOra(dt)}<div class="t16" style="font-weight:400">${PRIVATE[p.tipo].nome} con ${ISTR[p.chi].nome}</div></div><span>›</span></a>`; }).join('')}
  ${att.map(({ a, l }) => `<a class="voce" href="#lezione/${l.id}" style="font-weight:500"><div>${a.offerta ? '<b>Posto libero da confermare</b>' : `In lista d'attesa · ${a.pos}ª posizione`}<div class="t16" style="font-weight:400">${quando(l.inizio)} ${l.ora} · ${TIPI[l.tipo].nome}</div></div><span>›</span></a>`).join('')}
  ${cartaCarnet(false)}
  ${cartaProgressi()}
  ${WEB ? bannerApp() : ''}
  <div class="giu"><a class="btn" href="#orario">Prenota una lezione</a></div>
</main>${nav('oggi')}`;
};

function cartaProgressi() {
  const p = progressi(), manca = p.prossimo - p.tot;
  return `<div class="scheda progressi">
    <div class="anello">${anello((p.tot - p.prec) / (p.prossimo - p.prec))}<b>${p.tot}</b></div>
    <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
      <div class="eti">I tuoi progressi</div>
      <div class="t17b">${p.tot} lezioni · ${p.fila} ${p.fila === 1 ? 'settimana' : 'settimane'} di fila</div>
      <div class="t16">Questo mese ${p.mese}. ${p.prossimo === 100 ? 'Alla centesima' : `Al traguardo delle ${p.prossimo}`} ne manc${manca === 1 ? 'a' : 'ano'} ${manca}.</div>
    </div>
  </div>`;
}
function cartaCarnet(grande) {
  if (mensileAttivo()) {
    return `<div class="scheda${grande ? ' scheda--grande' : ''}"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="t17b">Mensile illimitato</div><div class="serif" style="font-size:22px">attivo</div></div><div class="t16">Tutte le lezioni fino al ${fData(daYmd(S.mensile.al))}.${rimasti() ? ` Il carnet (${rimasti()} ingressi) resta in pausa.` : ''}</div></div>`;
  }
  const r = rimasti();
  if (!grande) return `<a class="scheda carnet-mini" href="#carnet" style="color:inherit;text-decoration:none"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="t17b">Ingressi rimasti</div><div class="serif" style="font-size:26px">${r} <span class="grigio" style="font-family:var(--sans);font-size:16px">di ${S.carnet.tot}</span></div></div>${tacche(r)}<div class="t16 grigio">Carnet valido fino al ${fData(daYmd(S.carnet.al))}</div></a>`;
  return `<div class="scheda scheda--grande" style="gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="eti">${r ? 'Attivo' : 'Esaurito'}</span><span class="t16 grigio">acquistato il ${fData(daYmd(S.carnet.dal))}</span></div>
    <div style="font-size:20px;font-weight:600">Carnet ${S.carnet.tot} ingressi</div>
    <div style="display:flex;align-items:baseline;gap:12px"><span class="numerone">${r}</span><span style="font-size:18px;color:var(--testo-2)">ingress${r === 1 ? 'o rimasto' : 'i rimasti'}</span></div>
    ${tacche(r, true)}
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap" class="t16 grigio"><span>${S.carnet.usati} usati</span><span>scade il ${fData(daYmd(S.carnet.al))}</span></div>
  </div>`;
}

V.orario = () => {
  const oggi = oggi0();
  if (!sel.giorno) sel.giorno = ymd(oggi.getDay() === 0 ? piuGiorni(oggi, 1) : oggi);
  const g = daYmd(sel.giorno);
  const lun = piuGiorni(g, -((g.getDay() + 6) % 7));
  const dom = piuGiorni(lun, 6);
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(lun, i));
  const lunOggi = piuGiorni(oggi, -((oggi.getDay() + 6) % 7));
  const settPrima = lun > lunOggi, settDopo = piuGiorni(lun, 7) <= piuGiorni(oggi, FINESTRA);
  const lez = lezioniDel(g);
  const ora = Date.now();
  const mese = lun.getMonth() === dom.getMonth() ? `${lun.getDate()} – ${dom.getDate()} ${MESI[dom.getMonth()]}` : `${lun.getDate()} ${MESI[lun.getMonth()]} – ${dom.getDate()} ${MESI[dom.getMonth()]}`;
  return `
<main class="vista" tabindex="-1">
  <div class="settimana">
    <div style="display:flex;flex-direction:column;gap:4px"><div class="sopra">Settimana ${mese}</div><h1 class="h1">Orario</h1></div>
    <div class="frecce"><button class="tondo" type="button" data-act="settimana" data-d="-7" aria-label="Settimana precedente"${settPrima ? '' : ' disabled'}>‹</button><button class="tondo" type="button" data-act="settimana" data-d="7" aria-label="Settimana successiva"${settDopo ? '' : ' disabled'}>›</button></div>
  </div>
  <div class="giorni" role="tablist" aria-label="Giorni"${WEB ? ' hidden' : ''}>
    ${giorni.map(d => {
      const k = ymd(d), passato = d < oggi, chiuso = d.getDay() === 0, oltre = d - oggi > FINESTRA * 864e5;
      return `<button type="button" class="giorno${k === sel.giorno ? ' sel' : ''}${k === ymd(oggi) ? ' oggi' : ''}" role="tab" aria-selected="${k === sel.giorno}" aria-label="${fGiorno(d)}${chiuso ? ', chiuso' : ''}" data-act="giorno" data-g="${k}"${passato || chiuso || oltre ? ' disabled' : ''}><small>${GBREVI[d.getDay()]}</small><b>${d.getDate()}</b><i></i></button>`;
    }).join('')}
  </div>
  ${WEB ? `<div class="w-sett">${giorni.slice(0, 6).map(d => {
      const passato = d < oggi, oltre = d - oggi > FINESTRA * 864e5, lz = lezioniDel(d);
      return `<section class="w-giorno${ymd(d) === ymd(oggi) ? ' oggi' : ''}${passato ? ' passato' : ''}" aria-label="${fGiorno(d)}"><h2>${GBREVI[d.getDay()]} <b>${d.getDate()}</b></h2>${oltre ? '<p class="vuoto">Si prenota 14 giorni prima.</p>' : lz.map(rigaLezione).join('')}</section>`;
    }).join('')}</div><p class="t16 grigio" style="margin:0">Domenica chiuso. Annulli gratis fino a 12 ore prima.</p>` : `
  <div class="t16" style="padding:0 8px">${Maiusc(fGiorno(g))} · ${lez.length ? lez.length + ' lezioni' : 'studio chiuso'}</div>
  <div class="lezioni">
    ${lez.map(rigaLezione).join('') || '<p class="vuoto">La domenica lo studio è chiuso.</p>'}
  </div>`}
</main>${nav('orario')}`;
};
// una lezione nell'orario: ora, tipo, istruttore e stato (posti liberi, piena, prenotata, in lista)
function rigaLezione(l) {
  const st = stato(l.id), ora = Date.now(), finita = l.inizio <= ora;
  let dx;
  if (finita) dx = `<div class="posti"><span>${l.inizio.getTime() + DURATA * 60e3 < ora ? 'conclusa' : 'iniziata'}</span></div>`;
  else if (st.mia) dx = `<div class="badge badge--pieno"><small>Prenotata</small><b>lettino ${st.mia.letto}</b></div>`;
  else if (st.attesa) dx = `<div class="badge"><small>In lista</small><b>${st.attesa.offerta ? 'posto libero!' : st.attesa.pos + 'ª'}</b></div>`;
  else if (st.pieno) dx = `<div class="badge"><small>Pieno</small><b>Lista d'attesa</b></div>`;
  else dx = `<div class="posti"><b>${st.liberi} su ${POSTI}</b><span>post${st.liberi === 1 ? 'o libero' : 'i liberi'}</span></div>`;
  return `<button type="button" class="lez${st.mia ? ' mia' : ''}" data-go="#lezione/${l.id}"${finita ? ' disabled' : ''}><div class="ora">${l.ora}<small>${DURATA} min</small></div><div class="cosa"><b>${TIPI[l.tipo].nome}</b><span>${ISTR[l.chi].nome}</span></div>${dx}</button>`;
}

V.lezione = id => {
  const l = lezione(id);
  if (!l) return V.nontrovata();
  const t = TIPI[l.tipo], st = stato(id), ora = Date.now();
  const limite = new Date(l.inizio - ORE12);
  const regola = l.inizio - ora >= ORE12 ? `Annulli gratis fino a 12 ore prima, cioè entro ${quando(limite).toLowerCase()} alle ${fOra(limite)}.` : 'Mancano meno di 12 ore: se annulli, l\'ingresso viene comunque scalato.';
  const fis = fissaDi(l), gNome = GIORNI[l.inizio.getDay()];
  const rigaFissa = fis ? `<a class="link" href="#prenotazioni">Prenotazione fissa ogni ${gNome} · gestisci</a>` : `<button class="link" type="button" data-act="fissa" data-id="${id}">Prenota ogni ${gNome} alle ${l.ora}</button>`;
  const avvisoLista = S.prefs.auto ? 'Hai attivo «prendilo per me»: se si libera un posto lo prenotiamo noi e ti avvisiamo.' : 'Se si libera un posto ti avvisiamo: hai 45 minuti per confermarlo.';
  let corpo;
  if (l.inizio <= ora) corpo = `<div class="riquadro">Questa lezione è già iniziata.</div>`;
  else if (st.mia) corpo = `
    <div class="sopra" style="padding:0">Il tuo lettino</div>
    ${letti(st, null)}
    <div class="riquadro">${regola}</div>
    <div class="giu"><button class="btn btn--bordo" type="button" data-act="chiediAnnulla" data-id="${id}">Annulla la prenotazione</button>
    <div class="azioni"><button class="link" type="button" data-act="icsLezione" data-id="${id}">Aggiungi al calendario</button>${rigaFissa}</div></div>`;
  else if (st.attesa && st.attesa.offerta) corpo = `
    <div class="riquadro"><b>Si è liberato il lettino ${st.attesa.offerta.letto}.</b> È tuo se lo confermi entro le ${fOra(new Date(st.attesa.offerta.scade))}.</div>
    <div class="giu"><button class="btn" type="button" data-act="prendiPosto" data-id="${id}">Prendi il posto</button><button class="btn btn--bordo" type="button" data-act="esciLista" data-id="${id}">No, grazie</button></div>`;
  else if (st.attesa) corpo = `
    <div class="scheda" style="flex-direction:row;align-items:center;justify-content:space-between"><div class="t16">Sei in lista d'attesa. ${avvisoLista}</div><div class="pos"><b>${st.attesa.pos}ª</b><small>in lista</small></div></div>
    <div class="giu"><button class="btn btn--bordo" type="button" data-act="esciLista" data-id="${id}">Esci dalla lista</button><div class="azioni">${rigaFissa}</div></div>`;
  else if (st.pieno) corpo = `
    <div class="riquadro">La lezione è piena. Mettiti in lista d'attesa. ${avvisoLista}</div>
    <div class="giu"><button class="btn" type="button" data-act="lista" data-id="${id}">Mettiti in lista d'attesa</button><div class="azioni">${rigaFissa}</div></div>`;
  else {
    const motivo = puoiPrenotare(l);
    if (!sel.letto[id] || st.occ.has(sel.letto[id])) sel.letto[id] = scegliLetto(st, S.prefs.letto);
    corpo = `
    <div style="display:flex;justify-content:space-between;gap:8px" class="sopra"><span>Scegli il lettino · ${st.liberi} liber${st.liberi === 1 ? 'o' : 'i'}</span><span>Specchio: 1 · 2 · 3</span></div>
    ${letti(st, id)}
    <div class="riquadro">${motivo && motivo !== 'carnet' ? motivo : motivo === 'carnet' ? 'Il carnet è finito o scaduto: ricaricalo per prenotare.' : regola}</div>
    <div class="giu">${motivo === 'carnet' ? '<a class="btn" href="#carnet">Ricarica il carnet</a>' : `<button class="btn" type="button" data-act="prenota" data-id="${id}"${motivo ? ' disabled' : ''}>Prenota il lettino ${sel.letto[id]}</button>`}
    ${motivo ? '' : `<div class="azioni">${rigaFissa}</div>`}</div>`;
  }
  const i = ISTR[l.chi];
  return `
<main class="vista" tabindex="-1">
  <button class="indietro" type="button" data-act="indietro">‹ Indietro</button>
  ${fx(fotoLezione(l.tipo), 'fx--lezione')}
  <div style="display:flex;flex-direction:column;gap:6px;padding:0 8px">
    <div class="sopra">${Maiusc(fGiorno(l.inizio))} · ${l.ora} – ${fOra(new Date(l.inizio.getTime() + DURATA * 60e3))}</div>
    <h1 class="h1" style="font-size:30px">${t.nome}</h1>
    <div class="livello">${livello(t)}${t.livTxt}</div>
  </div>
  <p class="t16" style="margin:0;padding:0 8px">${t.desc}</p>
  <div class="istruttore" style="padding:0 8px"><div class="avatar" aria-hidden="true">${i.iniz}</div><div style="display:flex;flex-direction:column"><b style="font-size:16px">${i.nome}</b><span class="t16 grigio">${i.bio}</span></div></div>
  ${corpo}
</main>`;
};
function letti(st, id) {
  return `<div class="lettini" role="group" aria-label="Lettini">${[1, 2, 3, 4, 5, 6].map(n => {
    if (st.mia) return n === st.mia.letto ? `<button type="button" class="lettino tuo" disabled><b>${n}</b>tuo</button>` : `<button type="button" class="lettino" disabled><b>${n}</b>${st.occ.has(n) ? 'occupato' : 'libero'}</button>`;
    if (st.occ.has(n)) return `<button type="button" class="lettino" disabled aria-label="Lettino ${n} occupato"><b>${n}</b>occupato</button>`;
    const s = sel.letto[id] === n;
    return `<button type="button" class="lettino${s ? ' scelto' : ''}" data-act="letto" data-id="${id}" data-n="${n}" aria-pressed="${s}"><b>${n}</b>${s ? 'scelto' : n === S.prefs.letto ? 'preferito' : 'libero'}</button>`;
  }).join('')}</div>`;
}

V.prenotazioni = () => {
  const ora = Date.now();
  const prossime = S.pren.map(p => ({ p, l: lezione(p.id) })).filter(x => x.l).sort((a, b) => a.l.inizio - b.l.inizio);
  const att = S.attesa.map(a => ({ a, l: lezione(a.id) })).filter(x => x.l).sort((a, b) => a.l.inizio - b.l.inizio);
  const pass = S.passate.map(x => ({ x, l: lezione(x.id) })).filter(y => y.l && y.l.inizio < ora + 30 * 864e5).slice(0, 6);
  return `
<main class="vista" tabindex="-1">
  <div class="titolo"><h1>Prenotazioni</h1></div>
  <div class="sezione" style="padding-top:0">Prossime</div>
  ${prossime.map(({ p, l }) => `<div class="pren">
    <a href="#lezione/${l.id}" style="color:inherit;text-decoration:none;display:flex;flex-direction:column;gap:2px;min-width:0"><span class="quando">${quando(l.inizio)} · ${l.ora}</span><b style="font-size:16px">${TIPI[l.tipo].nome}</b><span class="t16 grigio">${ISTR[l.chi].nome} · lettino ${p.letto}</span></a>
    ${l.inizio > ora ? `<button class="pill" type="button" data-act="chiediAnnulla" data-id="${l.id}">Annulla</button>` : '<span class="t16 grigio">in corso</span>'}
  </div>`).join('') || '<p class="vuoto">Nessuna lezione prenotata. <a href="#orario">Apri l\'orario</a></p>'}
  ${att.length ? `<div class="sezione">In lista d'attesa</div>` + att.map(({ a, l }) => `<div class="pren">
    <a href="#lezione/${l.id}" style="color:inherit;text-decoration:none;display:flex;flex-direction:column;gap:2px;min-width:0"><span class="quando grigio">${quando(l.inizio)} · ${l.ora}</span><b style="font-size:16px">${TIPI[l.tipo].nome}</b><span class="t16 grigio">${a.offerta ? 'Posto libero: confermalo' : 'Ti avvisiamo se si libera un posto'}</span></a>
    <div class="pos"><b>${a.offerta ? '!' : a.pos + 'ª'}</b><small>${a.offerta ? 'libero' : 'in lista'}</small></div>
  </div><button class="link" type="button" data-act="esciLista" data-id="${l.id}" style="justify-content:flex-end;margin-top:-6px">Esci dalla lista</button>`).join('') : ''}
  ${S.private.filter(p => privataDa(p) > Date.now() - 50 * 60e3).length ? `<div class="sezione">Lezioni private</div>` + S.private.filter(p => privataDa(p) > Date.now() - 50 * 60e3).sort((a, b) => privataDa(a) - privataDa(b)).map(p => { const dt = privataDa(p); return `<div class="pren">
    <div><span class="quando">${quando(dt)} · ${fOra(dt)}</span><b style="font-size:16px">${PRIVATE[p.tipo].nome}</b><span class="t16 grigio">${ISTR[p.chi].nome}${p.regalo ? ' · regalo' : ''}</span></div>
    ${dt > Date.now() ? `<button class="pill" type="button" data-act="chiediAnnullaPrivata" data-id="${p.id}">Annulla</button>` : '<span class="t16 grigio">in corso</span>'}
  </div>`; }).join('') : ''}
  ${S.fisse.length ? `<div class="sezione">Prenotazioni fisse</div>` + S.fisse.map((f, k) => `<div class="pren">
    <div><span class="quando">Ogni ${GIORNI[f.g]} · ${f.ora}</span><b style="font-size:16px">${TIPI[f.tipo].nome}</b><span class="t16 grigio">${ISTR[f.chi].nome}${f.letto ? ' · lettino ' + f.letto + ' se libero' : ''}</span></div>
    <button class="pill" type="button" data-act="togliFissa" data-k="${k}">Togli</button>
  </div>`).join('') : ''}
  <div class="sezione">Passate</div>
  ${pass.length ? `<div class="elenco">${pass.map(({ x, l }) => `<div><span>${GBREVI[l.inizio.getDay()]} ${l.inizio.getDate()} ${MESI[l.inizio.getMonth()].slice(0, 3)} · ${TIPI[l.tipo].nome}</span><span class="grigio">${x.stato}</span></div>`).join('')}</div>` : '<p class="vuoto">Ancora nessuna.</p>'}
</main>${nav('prenotazioni')}`;
};

V.carnet = () => `
<main class="vista" tabindex="-1">
  <div class="titolo"><h1>Abbonamento</h1></div>
  ${mensileAttivo() ? cartaCarnet(true) + (rimasti() ? `<div class="scheda"><div class="t17b">Carnet in pausa</div><div class="t16">${rimasti()} ingressi, validi fino al ${fData(daYmd(S.carnet.al))}.</div></div>` : '') : cartaCarnet(true)}
  ${WEB ? '<div class="riquadro">Il QR per entrare in studio è nell\'app: la apri dal telefono e lo mostri al lettore.</div>' : '<button class="btn" type="button" data-act="qr">Mostra QR d\'ingresso</button>'}
  ${!mensileAttivo() && !carnetValido() ? `<div class="scheda"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span class="t18b">Carnet 10 ingressi</span><span class="serif" style="font-size:24px">250 €</span></div><div class="t16">25 € a lezione, valido 4 mesi.</div><button class="btn btn--piccolo" type="button" data-act="compra" data-cosa="carnet">Ricarica il carnet</button></div>` : ''}
  ${mensileAttivo() ? '' : `<div class="scheda">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span class="t18b">Mensile illimitato</span><span class="serif" style="font-size:24px">169 € <span class="grigio" style="font-family:var(--sans);font-size:16px">/ mese</span></span></div>
    <div class="t16">Tutte le lezioni, prenotazione fino a 14 giorni prima. Conviene da 7 lezioni al mese.</div>
    <button class="btn btn--bordo btn--piccolo" type="button" data-act="compra" data-cosa="mensile" style="margin-top:6px">Passa al mensile</button>
  </div>`}
  ${S.crediti.privata ? `<div class="scheda"><div class="t17b">Lezioni private in regalo: ${S.crediti.privata}</div><a class="link" href="#privata" style="justify-content:flex-start;padding:0">Prenota una privata ›</a></div>` : ''}
  <div class="scheda">
    <label class="campo">Hai un codice regalo?<input type="text" id="f-codice" placeholder="CR-REGALO-0000" autocomplete="off" autocapitalize="characters"></label>
    <button class="btn btn--bordo btn--piccolo" type="button" data-act="usaCodice">Usa il codice</button>
  </div>
  <a class="voce" href="#privata">Lezione privata o in coppia<span>›</span></a>
  <p class="demo-nota" style="margin:auto 0 0">Demo: nessun pagamento reale.</p>
</main>${nav('carnet')}`;

V.avvisi = () => {
  const gruppi = {};
  S.notifiche.forEach(n => { const k = quando(new Date(n.t)); (gruppi[k] = gruppi[k] || []).push(n); });
  const ora = Date.now();
  const html = Object.entries(gruppi).map(([k, ns]) => `<div class="sezione">${k}</div>` + ns.map(n => {
    const a = n.tipo === 'posto' ? S.attesa.find(x => x.id === n.id && x.offerta) : null;
    const viva = a && ora < n.scade;
    const etich = { posto: 'Posto libero', promemoria: 'Promemoria · 2 ore prima', conferma: 'Prenotazione', attesa: 'Lista d\'attesa', studio: 'Dallo studio', traguardo: 'Traguardo' }[n.tipo] || 'Avviso';
    return `<div class="avviso${n.letto ? ' letto' : ''}">
      <div class="testa"><span class="tipo"><span class="pallino"></span>${etich}</span><span class="t16 grigio">${fOra(new Date(n.t))}</span></div>
      <div class="t18b">${esc(n.titolo)}</div>
      <div class="t16">${esc(n.testo)}</div>
      ${viva ? `<div class="due"><button class="btn btn--piccolo" type="button" data-act="prendiPosto" data-id="${n.id}">Prendi il posto</button><button class="btn btn--bordo btn--piccolo" type="button" data-act="esciLista" data-id="${n.id}">No, grazie</button></div>` : n.tipo === 'posto' ? `<div class="t16 grigio">${S.pren.some(p => p.id === n.id) ? 'Posto preso.' : 'Offerta chiusa.'}</div>` : ''}
    </div>`;
  }).join('')).join('');
  return `
<main class="vista" tabindex="-1">
  <button class="indietro" type="button" data-act="indietro">‹ Indietro</button>
  <div class="titolo"><h1>Notifiche</h1></div>
  ${html || '<p class="vuoto">Nessuna notifica.</p>'}
</main>`;
};

V.profilo = () => {
  const permesso = 'Notification' in window ? Notification.permission : 'non-supportato';
  const installata = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const iniz = S.utente.nome.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const interr = (k, t) => `<div><span>${t}</span><label class="interr"><input type="checkbox" data-act="pref" data-k="${k}"${S.prefs[k] ? ' checked' : ''} aria-label="${t}"><span></span></label></div>`;
  return `
<main class="vista" tabindex="-1">
  <div class="utente"><div class="avatar" aria-hidden="true">${esc(iniz)}</div><div><h1 class="nome" style="margin:0;font-weight:400">${esc(S.utente.nome)}</h1><span class="mail">${esc(S.utente.email)}</span></div><button class="link" type="button" data-act="modifica">Modifica</button></div>
  <div class="elenco"><div><span class="grigio">Telefono</span><span>${esc(S.utente.tel)}</span></div><div><span class="grigio">Livello</span><span>${esc(S.utente.livello)}</span></div>
    <div class="campo-riga"><label class="grigio" for="f-letto">Lettino preferito</label><select id="f-letto" data-act="lettoPref"><option value="">nessuno</option>${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${S.prefs.letto === n ? ' selected' : ''}>${n}${n <= 3 ? ' · vicino allo specchio' : ''}</option>`).join('')}</select></div></div>
  <div class="scheda" style="border-radius:20px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span class="t17b" style="font-size:16px">Certificato medico</span><span class="sopra">facoltativo</span></div>
    <div class="t16">Non serve per frequentare. Se lo carichi, lo vede solo lo staff.</div>
    ${S.certificato ? `<div class="riquadro" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="overflow-wrap:anywhere">${esc(S.certificato)}</span><button class="link" type="button" data-act="togliCert">Rimuovi</button></div>` : `<label class="carica">Carica PDF o foto<input type="file" accept="application/pdf,image/*" data-act="cert"></label>`}
  </div>
  <div class="elenco">
    <div class="sezione" style="padding:10px 0 0;border:0;min-height:0">Notifiche</div>
    ${interr('posto', 'Posto liberato in lista')}
    ${interr('promemoria', 'Promemoria 2 ore prima')}
    ${interr('auto', 'Lista d\'attesa: se si libera, prendilo per me')}
    ${interr('novita', 'Novità dello studio')}
    <div><span class="t16">${permesso === 'granted' ? 'Avvisi sul telefono attivi.' : permesso === 'denied' ? 'Avvisi sul telefono bloccati dalle impostazioni del browser.' : permesso === 'non-supportato' ? (installata ? 'Questo browser non mostra avvisi.' : 'Su iPhone gli avvisi arrivano con l\'app installata.') : 'Avvisi anche ad app chiusa.'}</span>${permesso === 'default' ? '<button class="pill" type="button" data-act="permesso">Attiva</button>' : ''}</div>
  </div>
  ${WEB ? bannerApp() : `<a class="voce" href="#installa">${installata ? 'App installata sulla schermata Home' : 'Installa l\'app sulla schermata Home'}<span>›</span></a>`}
  <a class="voce" href="../">Il sito dello studio<span>›</span></a>
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap"><button class="link" type="button" data-act="esci">Esci</button><button class="link" type="button" data-act="chiediReset">Ricomincia la demo</button></div>
</main>${nav('profilo')}`;
};

let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (/installa/.test(location.hash)) disegna(false); });
let schedaInst = /android/i.test(navigator.userAgent) ? 'android' : 'iphone';
V.installa = () => {
  const installata = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const tel = parti => `<div class="tel" aria-hidden="true">${parti}</div>`;
  const passi = schedaInst === 'iphone' ? [
    [tel('<i class="b" style="left:6px;right:6px;top:8px;height:10px;border-radius:5px"></i><i style="left:8px;right:8px;top:28px;height:4px"></i><i style="left:8px;right:20px;top:38px;height:4px"></i>'), 'Apri questa pagina con <b>Safari</b>'],
    [tel('<i style="left:0;right:0;bottom:0;height:18px;border-radius:0;background:transparent;border-top:1px solid var(--riga)"></i><i class="b" style="left:25px;bottom:4px;width:12px;height:12px"></i>'), 'Tocca il tasto <b>Condividi</b>, il quadrato con la freccia in alto'],
    [tel('<i style="left:5px;right:5px;bottom:5px;height:56px;border-radius:8px;background:var(--carta);border:1px solid var(--riga)"></i><i style="left:9px;right:9px;bottom:40px;height:6px"></i><i class="b" style="left:9px;right:9px;bottom:26px;height:8px"></i><i style="left:9px;right:9px;bottom:14px;height:6px"></i>'), 'Scorri e scegli <b>Aggiungi alla schermata Home</b>'],
    [tel('<i style="left:7px;top:12px;width:12px;height:12px"></i><i style="left:25px;top:12px;width:12px;height:12px"></i><i style="left:43px;top:12px;width:12px;height:12px"></i><i style="left:7px;top:30px;width:12px;height:12px"></i><i class="b" style="left:25px;top:30px;width:12px;height:12px"></i>'), 'Tocca <b>Aggiungi</b>: l\'icona Barolo compare sulla Home'],
  ] : [
    [tel('<i class="b" style="left:6px;right:6px;top:8px;height:10px;border-radius:5px"></i><i style="left:8px;right:8px;top:28px;height:4px"></i>'), 'Apri questa pagina con <b>Chrome</b>'],
    [tel('<i class="b" style="right:6px;top:6px;width:6px;height:16px"></i><i style="left:8px;right:16px;top:28px;height:4px"></i>'), 'Tocca il menu <b>⋮</b> in alto a destra'],
    [tel('<i style="left:5px;right:5px;top:22px;height:56px;border-radius:8px;background:var(--carta);border:1px solid var(--riga)"></i><i class="b" style="left:9px;right:9px;top:40px;height:8px"></i>'), 'Scegli <b>Installa app</b> (o "Aggiungi a schermata Home") e conferma'],
  ];
  return `
<main class="vista" tabindex="-1">
  <button class="indietro" type="button" data-act="indietro">‹ Indietro</button>
  <div class="titolo"><h1>Installa l'app</h1><div class="t16">Cento Respiri si aprirà dalla schermata Home, come un'app, e funziona anche senza rete.</div></div>
  ${installata ? '<div class="riquadro">È già installata: la stai usando dalla schermata Home.</div>' : ''}
  ${installEvt && !installata ? '<button class="btn" type="button" data-act="installaOra">Installa ora</button>' : ''}
  <div class="schede2" role="tablist"><button type="button" role="tab" aria-selected="${schedaInst === 'iphone'}" data-act="schedaInst" data-k="iphone">iPhone</button><button type="button" role="tab" aria-selected="${schedaInst === 'android'}" data-act="schedaInst" data-k="android">Android</button></div>
  ${passi.map(([t, testo], i) => `<div class="passo">${t}<div><span class="n">${i + 1}</span><span>${testo}</span></div></div>`).join('')}
  <p class="t16 grigio" style="margin:0;padding:0 8px">${schedaInst === 'iphone' ? 'Su iPhone gli avvisi (posto libero, promemoria) arrivano solo con l\'app aggiunta alla schermata Home.' : 'Su molti telefoni Android Chrome propone l\'installazione da solo, con un avviso in basso.'}</p>
</main>`;
};

// prova gratuita in 3 tocchi: livello → giorno → conferma
const LIVPROVA = [['mai', 'Mai, è la prima volta', 'base'], ['qualche', 'Qualche volta', 'base'], ['regolare', 'Sì, con regolarità', 'intermedio'], ['gravidanza', 'Sono in gravidanza', 'prenatale']];
function slotProva(tipo) {
  const ora = Date.now(), out = [];
  for (let i = 0; i < 8 && out.length < 6; i++) lezioniDel(piuGiorni(oggi0(), i)).forEach(l => { if (out.length < 6 && l.tipo === tipo && l.inizio - ora > 2 * 3600e3 && stato(l.id).liberi > 0 && !S.pren.some(p => p.id === l.id)) out.push(l); });
  return out;
}
V.prova = passo => {
  const testa = (n, indietro) => `<div class="passi" style="padding:0 8px"><button class="indietro" type="button" data-act="${indietro}" style="margin:0;padding:0">‹ Indietro</button><span>${n} di 3</span></div><div class="barra-passi">${[1, 2, 3].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</div>`;
  if (passo === 'fatto' && S.prova && lezione(S.prova.id)) {
    const l = lezione(S.prova.id);
    return `
<main class="vista" tabindex="-1">
  <div class="titolo" style="padding-top:8px"><div class="eti">Prova prenotata</div><h1>Ti aspettiamo</h1></div>
  ${schedaProva(l)}
  <div class="t16" style="padding:0 8px">Via delle Filande 7, San Salvario. Arriva 10 minuti prima: l'istruttore ti mostra il lettino. Calze antiscivolo: se non le hai, te le diamo noi.</div>
  <div class="giu">
    <button class="btn" type="button" data-act="ics">Aggiungi al calendario</button>
    <button class="btn btn--bordo" type="button" data-act="annullaProva">Annulla la prova</button>
    <a class="link" href="#benvenuto">Torna all'inizio</a>
  </div>
</main>`;
  }
  if (passo === '2' && sel.prova.tipo) {
    const slot = slotProva(sel.prova.tipo);
    return `
<main class="vista" tabindex="-1">
  ${testa(2, 'provaIndietro')}
  <div class="titolo" style="padding-top:8px"><h1 style="font-size:30px">Quando vieni?</h1><div class="t16">Prove di ${TIPI[sel.prova.tipo].nome} nei prossimi 7 giorni.</div></div>
  ${slot.map(l => `<button class="scelta" type="button" data-act="provaSlot" data-id="${l.id}"><div><b>${quando(l.inizio)}${quando(l.inizio).length < 8 ? ' · ' + fGiorno(l.inizio).replace(/^\S+ /, '') : ''}</b><span>${ISTR[l.chi].nome}</span></div><div class="dx"><b>${l.ora}</b><span>${stato(l.id).liberi} post${stato(l.id).liberi === 1 ? 'o libero' : 'i liberi'}</span></div></button>`).join('') || '<p class="vuoto">Nessun posto libero nei prossimi giorni: scrivici e ti troviamo un orario.</p>'}
</main>`;
  }
  if (passo === '3' && sel.prova.id && lezione(sel.prova.id)) {
    const l = lezione(sel.prova.id);
    return `
<main class="vista" tabindex="-1">
  ${testa(3, 'provaIndietro')}
  <div class="titolo" style="padding-top:8px"><h1 style="font-size:30px">Confermi la prova?</h1></div>
  ${schedaProva(l)}
  <div class="t16" style="padding:0 8px">Arriva 10 minuti prima. Servono calze antiscivolo: se non le hai, te le diamo noi.</div>
  <div class="giu"><button class="btn" type="button" data-act="confermaProva">Conferma la prova</button><p class="demo-nota" style="margin:0">Demo: nessun dato viene inviato.</p></div>
</main>`;
  }
  sel.prova = {};
  return `
<main class="vista" tabindex="-1">
  ${testa(1, 'indietro')}
  ${fx('app-prova', 'fx--prova')}
  <div class="titolo"><h1 style="font-size:30px">Hai già usato il reformer?</h1><div class="t16">La prima lezione è gratuita.</div></div>
  ${LIVPROVA.map(([k, t, tipo]) => `<button class="scelta" type="button" data-act="provaLiv" data-tipo="${tipo}"><div><b>${t}</b><span>${TIPI[tipo].nome}</span></div><span class="fr" aria-hidden="true">›</span></button>`).join('')}
</main>`;
};
function schedaProva(l) {
  return `<div class="scheda scheda--grande" style="gap:14px">
    <div class="eti">Prova gratuita</div>
    <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="serif" style="font-size:64px;line-height:.9">${l.ora}</span><span class="t16">${fGiorno(l.inizio)}</span></div>
    <div class="t18b">${TIPI[l.tipo].nome} · ${DURATA} min</div>
    <div class="elenco" style="padding:0;border-top:1px solid var(--sabbia);border-radius:0"><div><span class="grigio">Istrutt${ISTR[l.chi].f === 'o' ? 'ore' : 'rice'}</span><span>${ISTR[l.chi].nome}</span></div><div><span class="grigio">Lettino</span><span>assegnato all'arrivo</span></div><div><span class="grigio">Costo</span><span>0 €</span></div></div>
  </div>`;
}
// lezione privata in 3 tocchi: da sola o in coppia → istruttore → giorno e ora, poi conferma
V.privata = passo => {
  const testa = n => `<div class="passi" style="padding:0 8px"><button class="indietro" type="button" data-act="indietro" style="margin:0;padding:0">‹ Indietro</button><span>${n} di 3</span></div><div class="barra-passi">${[1, 2, 3].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</div>`;
  const pv = sel.privata || (sel.privata = {});
  if (passo === 'fatto') {
    const p = S.private[S.private.length - 1]; if (!p) return V.nontrovata();
    const d = privataDa(p);
    return `<main class="vista" tabindex="-1"><div class="titolo" style="padding-top:8px"><div class="eti">Lezione privata prenotata</div><h1>Ci vediamo ${quando(d).toLowerCase()}</h1></div>
      <div class="scheda scheda--grande"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="serif" style="font-size:64px;line-height:.9">${fOra(d)}</span><span class="t16">${fGiorno(d)}</span></div>
      <div class="t18b">${PRIVATE[p.tipo].nome} · 50 min</div>
      <div class="elenco" style="padding:0;border-radius:0;border-top:1px solid var(--sabbia)"><div><span class="grigio">Con</span><span>${ISTR[p.chi].nome}</span></div><div><span class="grigio">Costo</span><span>${p.regalo ? 'regalo usato' : PRIVATE[p.tipo].prezzo + ' €, in studio'}</span></div></div></div>
      <div class="giu"><a class="btn" href="#prenotazioni">Vai alle prenotazioni</a><a class="link" href="#oggi">Torna a Oggi</a></div></main>`;
  }
  if (passo === '3' && pv.slot) {
    const s = pv.slot, credito = S.crediti.privata > 0 && pv.tipo === 'sola';
    return `<main class="vista" tabindex="-1">${testa(3)}
      <div class="titolo" style="padding-top:8px"><h1 style="font-size:30px">Confermi la privata?</h1></div>
      <div class="scheda scheda--grande" style="gap:14px"><div class="eti">${PRIVATE[pv.tipo].nome}</div>
        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="serif" style="font-size:64px;line-height:.9">${s.o}</span><span class="t16">${fGiorno(s.inizio)}</span></div>
        <div class="elenco" style="padding:0;border-radius:0;border-top:1px solid var(--sabbia)"><div><span class="grigio">Con</span><span>${ISTR[s.chi].nome}</span></div><div><span class="grigio">Durata</span><span>50 minuti</span></div><div><span class="grigio">Costo</span><span>${credito ? 'lezione in regalo' : PRIVATE[pv.tipo].prezzo + ' €, si paga in studio'}</span></div></div></div>
      <div class="giu"><button class="btn" type="button" data-act="confermaPrivata">Conferma</button><p class="demo-nota" style="margin:0">Demo: nessun pagamento reale.</p></div></main>`;
  }
  if (passo === '2' && pv.tipo) {
    return `<main class="vista" tabindex="-1">${testa(2)}
      <div class="titolo" style="padding-top:8px"><h1 style="font-size:30px">Con chi?</h1><div class="t16">Scegli l'istruttore o lascia fare a noi.</div></div>
      ${Object.entries(ISTR).map(([k, i]) => `<button class="scelta" type="button" data-act="privataChi" data-k="${k}"><div><b>${i.nome}</b><span>${i.bio}</span></div><span class="fr" aria-hidden="true">›</span></button>`).join('')}
      <button class="scelta" type="button" data-act="privataChi" data-k=""><div><b>Il primo libero</b><span>Ti mostriamo tutti gli orari</span></div><span class="fr" aria-hidden="true">›</span></button>
</main>`;
  }
  if (passo === '2b' && pv.tipo) {
    const slot = slotPrivate(pv.chi);
    return `<main class="vista" tabindex="-1">${testa(3)}
      <div class="titolo" style="padding-top:8px"><h1 style="font-size:30px">Quando?</h1><div class="t16">Orari liberi nei prossimi giorni${pv.chi ? ' con ' + ISTR[pv.chi].breve : ''}.</div></div>
      ${slot.map((s, k) => `<button class="scelta" type="button" data-act="privataSlot" data-k="${k}"><div><b>${quando(s.inizio)}${quando(s.inizio).length < 8 ? ' · ' + s.inizio.getDate() + ' ' + MESI[s.inizio.getMonth()] : ''}</b><span>${ISTR[s.chi].nome}</span></div><div class="dx"><b>${s.o}</b><span>50 min</span></div></button>`).join('') || '<p class="vuoto">Nessun orario libero nei prossimi giorni.</p>'}</main>`;
  }
  sel.privata = {};
  return `<main class="vista" tabindex="-1">${testa(1)}
    <div class="titolo" style="padding-top:8px"><div class="eti">Lezione privata</div><h1 style="font-size:30px">Da sola o in coppia?</h1><div class="t16">Un istruttore solo per te, 50 minuti, programma su misura.${S.crediti.privata ? ` Hai ${S.crediti.privata} lezion${S.crediti.privata === 1 ? 'e privata' : 'i private'} in regalo.` : ''}</div></div>
    ${Object.entries(PRIVATE).map(([k, p]) => `<button class="scelta" type="button" data-act="privataTipo" data-k="${k}"><div><b>${p.breve}</b><span>${esc(p.testo)}</span></div><div class="dx"><b>${p.prezzo} €</b><span>${k === 'coppia' ? '45 € a testa' : '50 min'}</span></div></button>`).join('')}
  </main>`;
};
V.nontrovata = () => `<main class="vista" tabindex="-1"><div class="titolo"><h1>Pagina non trovata</h1></div><a class="btn" href="#oggi">Torna a Oggi</a></main>`;

// ---------- navigazione ----------
const PROTETTE = ['oggi', 'orario', 'lezione', 'prenotazioni', 'carnet', 'avvisi', 'profilo', 'privata'];
let ultima = '';
function disegna(nuova = true) {
  if (!app) return; // pagina senza schermate dell'app (pannello dello studio)
  const [nome, arg] = (location.hash.slice(1) || (S.entrato ? 'oggi' : 'benvenuto')).split('/');
  if (PROTETTE.includes(nome) && !S.entrato) { // ricorda dove voleva andare (es. una lezione toccata nel sito)
    try { sessionStorage.setItem('cr-dopo', location.hash); } catch (e) { /* niente */ }
    location.replace('#benvenuto'); return;
  }
  if (nome === 'benvenuto' && S.entrato) { location.replace('#oggi'); return; }
  const f = V[nome];
  const y = scrollY;
  const conTestata = WEB && S.entrato && [...PROTETTE, 'installa'].includes(nome);
  app.innerHTML = (conTestata ? testata(nome === 'lezione' ? 'orario' : nome) : '') + (f ? f(arg) : V.nontrovata());
  const m0 = app.querySelector('main'); if (m0) m0.dataset.v = nome;
  document.title = (WEB ? 'Area clienti · ' : '') + 'Cento Respiri' + (nome !== 'benvenuto' ? ' · ' + Maiusc(nome) : '');
  if (nuova) { scrollTo(0, 0); const m = app.querySelector('main'); if (m && ultima) m.focus({ preventScroll: true }); }
  else scrollTo(0, y);
  if (nome === 'avvisi' && S.notifiche.some(n => !n.letto && n.tipo !== 'posto')) { S.notifiche.forEach(n => { if (n.tipo !== 'posto') n.letto = true; }); salva(); }
  ultima = location.hash;
}
addEventListener('hashchange', () => { chiudiFoglio(); chiudiQR(); disegna(true); });

// ---------- azioni ----------
const A = {
  entra() {
    S.entrato = true; salva();
    let dopo = null; try { dopo = sessionStorage.getItem('cr-dopo'); sessionStorage.removeItem('cr-dopo'); } catch (e) { /* niente */ }
    location.hash = dopo && dopo !== '#benvenuto' ? dopo : '#oggi';
  },
  esci() { S.entrato = false; salva(); location.hash = '#benvenuto'; },
  indietro() { if (history.length > 1 && ultima) history.back(); else location.hash = S.entrato ? '#oggi' : '#benvenuto'; },
  settimana(d) { sel.giorno = ymd(piuGiorni(daYmd(sel.giorno), +d.d)); const o = oggi0(); if (daYmd(sel.giorno) < o) sel.giorno = ymd(o); while (daYmd(sel.giorno).getDay() === 0) sel.giorno = ymd(piuGiorni(daYmd(sel.giorno), 1)); disegna(false); },
  giorno(d) { sel.giorno = d.g; disegna(false); },
  letto(d) { sel.letto[d.id] = +d.n; disegna(false); },
  prenota(d) { const l = lezione(d.id); if (l && prenota(l, sel.letto[d.id])) { toast(`Prenotato: ${quando(l.inizio).toLowerCase()} alle ${l.ora}, lettino ${sel.letto[d.id]}.`); disegna(false); } },
  chiediAnnulla(d) {
    const l = lezione(d.id), p = S.pren.find(x => x.id === d.id); if (!l || !p) return;
    const rimborso = l.inizio - Date.now() >= ORE12;
    apriFoglio(`<div class="sopra">Annulla prenotazione</div><h2>${Maiusc(fGiorno(l.inizio))}, ${l.ora}</h2><div class="t16">${TIPI[l.tipo].nome} con ${ISTR[l.chi].nome}, lettino ${p.letto}.</div><div class="riquadro">${p.con === 'mensile' ? 'Con il mensile puoi annullare senza costi.' : rimborso ? 'Mancano più di 12 ore: l\'ingresso torna nel tuo carnet.' : 'Mancano meno di 12 ore: l\'ingresso verrà scalato.'}</div><div class="giu"><button class="btn" type="button" data-act="annulla" data-id="${d.id}">Sì, annulla</button><button class="btn btn--bordo" type="button" data-act="chiudi">Tieni la prenotazione</button></div>`, 'Annulla prenotazione');
  },
  annulla(d) { annulla(d.id); chiudiFoglio(); disegna(false); },
  chiudi() { chiudiFoglio(); },
  lista(d) {
    const l = lezione(d.id); if (!l) return;
    inAttesa(l);
    const a = S.attesa.find(x => x.id === d.id);
    toast(`Sei ${a.pos}ª in lista d'attesa.` + (S.prefs.posto ? ' Ti avvisiamo se si libera un posto.' : ''));
    disegna(false);
    if ('Notification' in window && Notification.permission === 'default' && S.prefs.posto) chiediPermesso(true);
  },
  esciLista(d) {
    const a = S.attesa.find(x => x.id === d.id);
    if (a && a.offerta) passaAlProssimo(a);
    const l = lezione(d.id);
    if (l && fissaDi(l) && !S.saltate.includes(d.id)) S.saltate.push(d.id); // non rimettersi in lista da sola
    S.attesa = S.attesa.filter(x => x.id !== d.id); salva();
    toast(a && a.offerta ? 'Va bene: il posto passa al prossimo in lista.' : 'Sei uscita dalla lista d\'attesa.'); disegna(false);
  },
  prendiPosto(d) {
    const a = S.attesa.find(x => x.id === d.id), l = lezione(d.id);
    if (!a || !a.offerta || !l || Date.now() > a.offerta.scade) { toast('Offerta scaduta.'); disegna(false); return; }
    if (prenota(l, a.offerta.letto)) { S.notifiche.forEach(n => { if (n.tipo === 'posto' && n.id === d.id) n.letto = true; }); salva(); toast(`Il posto è tuo: lettino ${a.offerta.letto}.`); location.hash = '#lezione/' + d.id; }
  },
  qr() { apriQR(); },
  compra(d) {
    const m = d.cosa === 'mensile';
    apriFoglio(`<div class="sopra">${m ? 'Cambia abbonamento' : 'Ricarica'}</div><h2>${m ? 'Mensile illimitato' : 'Carnet 10 ingressi'}</h2><div class="t16">${m ? '169 € al mese, tutte le lezioni. Si rinnova ogni mese, disdici quando vuoi.' + (rimasti() ? ` I tuoi ${rimasti()} ingressi del carnet restano in pausa.` : '') : '250 €, 25 € a lezione, valido 4 mesi.'}</div><div class="riquadro">Questa è una demo: nessun pagamento, nessun dato richiesto.</div><div class="giu"><button class="btn" type="button" data-act="compraOk" data-cosa="${d.cosa}">Conferma (demo)</button><button class="btn btn--bordo" type="button" data-act="chiudi">Annulla</button></div>`, 'Acquisto');
  },
  compraOk(d) {
    const o = oggi0();
    if (d.cosa === 'mensile') S.mensile = { dal: ymd(o), al: ymd(piuGiorni(o, 30)) };
    else S.carnet = { tot: 10, usati: 0, dal: ymd(o), al: ymd(piuGiorni(o, 120)) };
    salva(); chiudiFoglio(); toast(d.cosa === 'mensile' ? 'Mensile attivo.' : 'Carnet ricaricato: 10 ingressi.'); disegna(false);
  },
  pref(d, el) { S.prefs[d.k] = el.checked; salva(); if (el.checked && d.k !== 'novita' && 'Notification' in window && Notification.permission === 'default') chiediPermesso(false); },
  permesso() { chiediPermesso(false); },
  modifica() {
    apriFoglio(`<h2>I tuoi dati</h2>
      <label class="campo">Nome e cognome<input type="text" id="f-nome" value="${esc(S.utente.nome)}" autocomplete="name"></label>
      <label class="campo">Telefono<input type="tel" id="f-tel" value="${esc(S.utente.tel)}" autocomplete="tel"></label>
      <label class="campo">Livello<select id="f-liv">${['Base', 'Intermedio', 'Avanzato'].map(x => `<option${x === S.utente.livello ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <p class="t16 grigio" style="margin:0">Demo: i dati restano solo su questo telefono.</p>
      <div class="giu"><button class="btn" type="button" data-act="salvaDati">Salva</button><button class="btn btn--bordo" type="button" data-act="chiudi">Annulla</button></div>`, 'Modifica dati');
  },
  salvaDati() {
    const nome = document.getElementById('f-nome').value.trim(), tel = document.getElementById('f-tel').value.trim();
    if (nome) S.utente.nome = nome.slice(0, 60);
    if (tel) S.utente.tel = tel.slice(0, 30);
    S.utente.livello = document.getElementById('f-liv').value;
    salva(); chiudiFoglio(); disegna(false); toast('Dati salvati.');
  },
  cert(d, el) { const f = el.files && el.files[0]; if (!f) return; S.certificato = f.name.slice(0, 80); salva(); disegna(false); toast('Certificato caricato (demo: il file non lascia il telefono).'); },
  togliCert() { S.certificato = null; salva(); disegna(false); },
  chiediReset() { apriFoglio(`<h2>Ricominciare la demo?</h2><div class="t16">Prenotazioni, carnet e avvisi tornano come all'inizio.</div><div class="giu"><button class="btn" type="button" data-act="reset">Sì, ricomincia</button><button class="btn btn--bordo" type="button" data-act="chiudi">Annulla</button></div>`, 'Ricomincia'); },
  reset() { S = nuovaDemo(); S.entrato = true; salva(); chiudiFoglio(); sel = { giorno: null, letto: {}, prova: {} }; location.hash = '#oggi'; disegna(true); toast('Demo ricominciata.'); },
  schedaInst(d) { schedaInst = d.k; disegna(false); },
  async installaOra() { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* niente */ } installEvt = null; disegna(false); },
  provaLiv(d) { sel.prova = { tipo: d.tipo }; location.hash = '#prova/2'; },
  provaSlot(d) { sel.prova.id = d.id; location.hash = '#prova/3'; },
  provaIndietro() { history.back(); },
  confermaProva() { if (!sel.prova.id) return; S.prova = { id: sel.prova.id }; salva(); location.hash = '#prova/fatto'; },
  annullaProva() { S.prova = null; salva(); toast('Prova annullata.'); location.hash = '#benvenuto'; },
  ics() { const l = S.prova && lezione(S.prova.id); if (l) scaricaIcs(l, 'Prova gratuita · ' + TIPI[l.tipo].nome, 'Arriva 10 minuti prima. Calze antiscivolo: se non le hai te le diamo noi.', 'prova'); },
  icsLezione(d) {
    const l = lezione(d.id), p = S.pren.find(x => x.id === d.id); if (!l || !p) return;
    scaricaIcs(l, `${TIPI[l.tipo].nome} · lettino ${p.letto}`, `Con ${ISTR[l.chi].nome}. Annulli gratis fino a 12 ore prima dall'app.`, 'lezione');
  },
  fissa(d) {
    const l = lezione(d.id); if (!l) return;
    const g = l.inizio.getDay(), letto = S.prefs.letto || (S.pren.find(p => p.id === d.id) || {}).letto || sel.letto[d.id] || null;
    // le date già nella finestra dei 14 giorni, con cosa succederà a ciascuna
    const date = [];
    for (let i = 0; i <= FINESTRA; i++) lezioniDel(piuGiorni(oggi0(), i)).forEach(x => {
      if (x.inizio.getDay() !== g || x.ora !== l.ora || x.tipo !== l.tipo || x.inizio - Date.now() < 3600e3) return;
      const st = stato(x.id);
      date.push(`<div><span>${quando(x.inizio)}${quando(x.inizio).length < 8 ? ' ' + x.inizio.getDate() + ' ' + MESI[x.inizio.getMonth()] : ''}</span><span class="grigio">${st.mia ? 'già prenotata' : st.attesa ? 'già in lista' : st.pieno ? 'piena: lista d\'attesa' : 'la prenotiamo'}</span></div>`);
    });
    apriFoglio(`<div class="sopra">Prenotazione fissa</div><h2>Ogni ${GIORNI[g]} alle ${l.ora}</h2>
      <div class="t16">${TIPI[l.tipo].nome} con ${ISTR[l.chi].nome}${letto ? `, lettino ${letto} se è libero` : ''}. Ti prenotiamo appena si apre la prenotazione (14 giorni prima); se la lezione è piena ti mettiamo in lista d'attesa.</div>
      ${date.length ? `<div class="date-fisse">${date.join('')}</div>` : ''}
      <div class="riquadro">${mensileAttivo() ? 'Con il mensile è tutto incluso.' : 'Con il carnet ogni lezione scala un ingresso quando viene prenotata.'} Puoi annullare una singola data o togliere la prenotazione fissa quando vuoi.</div>
      <div class="giu"><button class="btn" type="button" data-act="fissaOk" data-id="${d.id}">Attiva la prenotazione fissa</button><button class="btn btn--bordo" type="button" data-act="chiudi">Annulla</button></div>`, 'Prenotazione fissa');
  },
  fissaOk(d) {
    const l = lezione(d.id); if (!l || fissaDi(l)) { chiudiFoglio(); return; }
    const letto = S.prefs.letto || (S.pren.find(p => p.id === d.id) || {}).letto || sel.letto[d.id] || null;
    S.fisse.push({ g: l.inizio.getDay(), ora: l.ora, tipo: l.tipo, chi: l.chi, letto });
    const prima = S.pren.length;
    prenotaFisse(); salva(); chiudiFoglio();
    const n = S.pren.length - prima;
    toast(`Prenotazione fissa attiva${n ? `: ${n} ${n === 1 ? 'lezione prenotata' : 'lezioni prenotate'}` : ''}.`);
    disegna(false);
  },
  togliFissa(d) {
    S.fisse.splice(+d.k, 1); salva();
    toast('Prenotazione fissa tolta. Le lezioni già prenotate restano: annullale una per una se non vieni.');
    disegna(false);
  },
  privataTipo(d) { sel.privata = { tipo: d.k }; location.hash = '#privata/2'; },
  privataChi(d) { sel.privata.chi = d.k || null; location.hash = '#privata/2b'; },
  privataSlot(d) { sel.privata.slot = slotPrivate(sel.privata.chi)[+d.k]; location.hash = '#privata/3'; },
  confermaPrivata() {
    const pv = sel.privata; if (!pv || !pv.slot) return;
    const s = pv.slot, id = `p_${s.g}_${s.o.replace(':', '')}_${s.chi}`;
    if (S.private.some(p => p.id === id)) { toast('Questo orario è appena stato preso.'); return; }
    const regalo = pv.tipo === 'sola' && S.crediti.privata > 0;
    if (regalo) S.crediti.privata--;
    S.private.push({ id, tipo: pv.tipo, chi: s.chi, regalo });
    aggiungiNotifica('conferma', 'Lezione privata confermata', `${Maiusc(fGiorno(s.inizio))}, ${s.o} · con ${ISTR[s.chi].nome}`, { letto: true });
    salva(); location.hash = '#privata/fatto';
  },
  chiediAnnullaPrivata(d) {
    const p = S.private.find(x => x.id === d.id); if (!p) return;
    const dt = privataDa(p);
    apriFoglio(`<div class="sopra">Annulla lezione privata</div><h2>${Maiusc(fGiorno(dt))}, ${fOra(dt)}</h2><div class="t16">${PRIVATE[p.tipo].nome} con ${ISTR[p.chi].nome}.</div><div class="riquadro">${dt - Date.now() >= 24 * 3600e3 ? 'Mancano più di 24 ore: nessun costo.' : 'Mancano meno di 24 ore: la lezione viene addebitata.'}</div><div class="giu"><button class="btn" type="button" data-act="annullaPrivata" data-id="${p.id}">Sì, annulla</button><button class="btn btn--bordo" type="button" data-act="chiudi">Tienila</button></div>`, 'Annulla privata');
  },
  annullaPrivata(d) {
    const p = S.private.find(x => x.id === d.id); if (!p) return;
    if (p.regalo && privataDa(p) - Date.now() >= 24 * 3600e3) S.crediti.privata++;
    S.private = S.private.filter(x => x.id !== d.id); salva(); chiudiFoglio(); toast('Lezione privata annullata.'); disegna(false);
  },
  usaCodice() {
    const campo = document.getElementById('f-codice'), cod = (campo.value || '').trim().toUpperCase();
    let lista = []; try { lista = JSON.parse(localStorage.getItem('cr-regali') || '[]'); } catch (e) { /* niente */ }
    const r = lista.find(x => x.codice === cod);
    if (!/^CR-REGALO-\d{4}$/.test(cod) || !r) { toast('Codice non valido. In questa demo vale solo un codice creato su questo dispositivo, da "Regala una lezione" nel sito.'); return; }
    if (r.usato) { toast('Questo codice è già stato usato.'); return; }
    const g = REGALI[r.tipo], o = oggi0();
    if (g.mensile) S.mensile = { dal: ymd(o), al: ymd(piuGiorni(o, 30)) };
    else if (g.privata) S.crediti.privata += g.privata;
    else if (carnetValido()) { S.carnet.tot += g.ingressi; const al = piuGiorni(o, 60); if (daYmd(S.carnet.al) < al) S.carnet.al = ymd(al); }
    else S.carnet = { tot: g.ingressi, usati: 0, dal: ymd(o), al: ymd(piuGiorni(o, 60)) };
    r.usato = true; try { localStorage.setItem('cr-regali', JSON.stringify(lista)); } catch (e) { /* niente */ }
    aggiungiNotifica('studio', 'Regalo attivato', `${g.nome}${r.da ? ' da parte di ' + r.da : ''}. Buone lezioni!`, { letto: true });
    salva(); toast(`Regalo attivato: ${g.nome}.`); disegna(false);
  },
  lettoPref(d, el) { S.prefs.letto = el.value ? +el.value : null; salva(); toast(el.value ? `Lettino preferito: ${el.value}. Lo sceglieremo per primo quando è libero.` : 'Nessun lettino preferito.'); },
};
async function chiediPermesso(dopoLista) {
  if (!('Notification' in window)) { toast('Su iPhone gli avvisi funzionano con l\'app aggiunta alla schermata Home: trovi la guida nel Profilo.'); return; }
  try { const r = await Notification.requestPermission(); if (r === 'granted') toast(dopoLista ? 'Avvisi attivi: ti scriviamo appena si libera un posto.' : 'Avvisi attivi.'); } catch (e) { /* niente */ }
  disegna(false);
}
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go && !go.disabled) { location.hash = go.dataset.go; return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const f = A[b.dataset.act];
  if (f) { e.preventDefault(); f(b.dataset, b); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('input[data-act], select[data-act]');
  if (el && A[el.dataset.act]) A[el.dataset.act](el.dataset, el);
});

// ---------- QR d'ingresso a tutto schermo ----------
// codice personale dell'iscritta (lo stesso che legge il pannello dello studio)
function codiceIngresso() { return 'CR-DEMO-' + (hash(S.utente.email) % 9000 + 1000); }
let wake = null, qrEl = null;
function apriQR() {
  chiudiQR();
  const codice = codiceIngresso();
  let svg = '';
  svg = qrSvg(codice) || '<p>QR non disponibile</p>';
  qrEl = document.createElement('div');
  qrEl.className = 'qr-vista'; qrEl.setAttribute('role', 'dialog'); qrEl.setAttribute('aria-modal', 'true'); qrEl.setAttribute('aria-label', 'QR d\'ingresso');
  const sotto = mensileAttivo() ? 'Mensile illimitato' : `Carnet ${S.carnet.tot} ingressi · ${rimasti()} rimast${rimasti() === 1 ? 'o' : 'i'}`;
  qrEl.innerHTML = `<button class="chiudi" type="button">Chiudi</button><div class="centro"><div><div class="serif" style="font-size:32px;line-height:1">${esc(S.utente.nome)}</div><div class="t16" style="margin-top:6px">${sotto}</div></div><div class="qr-box">${svg}</div><div class="codice">${codice}</div><div class="t16" style="max-width:280px">Avvicina il telefono al lettore all'ingresso. Se non legge, alza la luminosità.</div><div class="demo-nota">Demo: il codice non apre nessuna porta.</div></div>`;
  qrEl.querySelector('.chiudi').addEventListener('click', chiudiQR);
  document.body.appendChild(qrEl);
  document.documentElement.style.overflow = 'hidden';
  qrEl.querySelector('.chiudi').focus();
  if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); // lo schermo resta acceso
}
function chiudiQR() {
  if (!qrEl) return;
  qrEl.remove(); qrEl = null;
  if (!foglioAperto) document.documentElement.style.overflow = '';
  if (wake) { wake.release().catch(() => {}); wake = null; }
}

// ---------- avvio ----------
// il motore (lezioni, lettini, account) è usato anche dal pannello dello studio (studio/), che non ha le schermate dell'app
window.CR_MOTORE = {
  get S() { return S; }, ricarica() { const x = carica(); if (x) S = completa(x); }, salva,
  lezioniDel, lezione, stato, altri, hash, ymd, daYmd, piuGiorni, oggi0, fGiorno, fOra, quando, Maiusc,
  privataDa, aggiungiNotifica, codiceIngresso, POSTI, DURATA, GIORNI, MESI,
};
addEventListener('storage', e => { if (e.key === KEY) { const x = carica(); if (x) S = completa(x); if (app) disegna(false); } });
if (!app) return;
// solo l'app si installa e funziona senza rete; l'area clienti è un sito normale
if (!WEB && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
disegna(true);
controlla();
setInterval(controlla, 2000);
// file .ics per aggiungere una lezione al calendario del telefono
function scaricaIcs(l, titolo, nota, nome) {
  const f = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const fine = new Date(l.inizio.getTime() + DURATA * 60e3);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cento Respiri//Demo//IT', 'BEGIN:VEVENT', `UID:${nome}-${l.id}@centorespiri.demo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${f(l.inizio)}`, `DTEND:${f(fine)}`, `SUMMARY:${titolo}`, 'LOCATION:Cento Respiri\\, Via delle Filande 7\\, Torino (studio dimostrativo)', `DESCRIPTION:${nota.replace(/,/g, '\\,')}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${titolo}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${nome}-cento-respiri-${l.id}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
})();
