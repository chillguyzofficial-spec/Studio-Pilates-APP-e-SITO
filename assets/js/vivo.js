// Cento Respiri — parti dinamiche del sito, con lo stesso motore dell'app (posti liberi veri, prenotazioni tue riconosciute):
// "Oggi in studio" (home), "Quale lezione fa per te?" (lezioni), "Quale formula ti conviene?" (prezzi). Tutto a tocco.
(() => {
'use strict';
const M = window.CR_MOTORE, D = window.CR_DATI;
if (!M || !D) return;
const { TIPI, ISTR } = D;
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fra = min => min < 60 ? `tra ${min} min` : `tra ${Math.floor(min / 60)} h${min % 60 ? ' ' + (min % 60) + ' min' : ''}`;
function statoRiga(l) {
  const st = M.stato(l.id), ora = Date.now(), fine = l.inizio.getTime() + M.DURATA * 60e3;
  if (l.inizio <= ora && fine > ora) return { t: 'in corso', c: 'grigio' };
  if (st.mia) return { t: `la tua lezione · lettino ${st.mia.letto}`, c: 'tua' };
  if (st.pieno) return { t: 'piena · lista d\'attesa', c: 'piena' };
  return { t: `${st.liberi} post${st.liberi === 1 ? 'o libero' : 'i liberi'}`, c: st.liberi <= 2 ? 'pochi' : 'liberi' };
}

// ---------- home: oggi in studio ----------
const oggiBox = document.querySelector('[data-oggi-studio]');
function disegnaOggi() {
  M.ricarica();
  const ora = Date.now();
  let giorno = M.oggi0(), lz = [];
  for (let i = 0; i < 7 && !lz.length; i++) {
    giorno = M.piuGiorni(M.oggi0(), i);
    lz = M.lezioniDel(giorno).filter(l => l.inizio.getTime() + M.DURATA * 60e3 > ora);
  }
  if (!lz.length) { oggiBox.hidden = true; return; }
  const titolo = M.ymd(giorno) === M.ymd(M.oggi0()) ? `Oggi in studio · ancora ${lz.length} lezion${lz.length === 1 ? 'e' : 'i'}` : `${M.Maiusc(M.quando(giorno))} in studio`;
  oggiBox.innerHTML = `<div class="oggi__testa"><span class="eti">${titolo}</span><a class="link-freccia" href="orario.html">Tutto l'orario ›</a></div>
    <div class="oggi__righe">${lz.slice(0, 4).map(l => {
      const s = statoRiga(l), min = Math.round((l.inizio - ora) / 60e3);
      return `<a class="oggi__riga ${s.c}" href="area/#lezione/${l.id}"><b>${l.ora}</b><span><strong>${TIPI[l.tipo].nome}</strong><small>${ISTR[l.chi].nome}${min > 0 && min < 180 ? ' · ' + fra(min) : ''}</small></span><em>${s.t}</em></a>`;
    }).join('')}</div>`;
  oggiBox.hidden = false;
}
if (oggiBox) { disegnaOggi(); setInterval(disegnaOggi, 60e3); addEventListener('storage', disegnaOggi); }

// ---------- lezioni: quale lezione fa per te (3 domande a un tocco) ----------
const trova = document.querySelector('[data-trova]');
const DOMANDE = [
  ['esperienza', 'Hai già usato il reformer?', [['mai', 'Mai'], ['qualche', 'Qualche volta'], ['spesso', 'Sì, più di dieci lezioni']]],
  ['obiettivo', 'Cosa cerchi soprattutto?', [['schiena', 'Schiena e postura'], ['forza', 'Forza e tono'], ['sfida', 'Una sfida'], ['gravidanza', 'Sono in gravidanza']]],
  ['quando', 'Quando preferisci venire?', [['mattina', 'Mattina presto'], ['pranzo', 'Pausa pranzo'], ['sera', 'Sera'], ['sabato', 'Sabato'], ['qualsiasi', 'Quando capita']]],
];
let risposte = {};
function consiglio(r) {
  if (r.obiettivo === 'gravidanza') return ['prenatale', null];
  if (r.obiettivo === 'schiena') return r.esperienza === 'mai' ? ['base', 'tower'] : ['tower', 'base'];
  if (r.obiettivo === 'sfida') return r.esperienza === 'spesso' ? ['avanzato', 'intermedio'] : r.esperienza === 'qualche' ? ['base', 'intermedio'] : ['base', null];
  return r.esperienza === 'spesso' ? ['intermedio', 'avanzato'] : ['base', 'tower'];
}
function fascia(l, q) {
  const h = +l.ora.slice(0, 2), g = l.inizio.getDay();
  if (q === 'mattina') return h < 10 && g !== 6;
  if (q === 'pranzo') return h >= 12 && h < 14;
  if (q === 'sera') return h >= 18;
  if (q === 'sabato') return g === 6;
  return true;
}
function prossime(tipo, q) {
  const ora = Date.now(), out = [];
  for (let i = 0; i < 14 && out.length < 3; i++) M.lezioniDel(M.piuGiorni(M.oggi0(), i)).forEach(l => { if (out.length < 3 && l.tipo === tipo && l.inizio - ora > 3600e3 && fascia(l, q)) out.push(l); });
  return out;
}
function disegnaTrova() {
  const n = Object.keys(risposte).length;
  if (n < DOMANDE.length) {
    const [k, testo, opz] = DOMANDE[n];
    trova.innerHTML = `<div class="trova__passi" aria-hidden="true">${DOMANDE.map((_, i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</div>
      <h3>${testo}</h3>
      <div class="trova__scelte">${opz.map(([v, t]) => `<button type="button" data-k="${k}" data-v="${v}">${t}</button>`).join('')}</div>
      ${n ? '<button type="button" class="trova__ind" data-indietro>‹ Indietro</button>' : ''}`;
    return;
  }
  const [tipo, alt] = consiglio(risposte);
  let lz = prossime(tipo, risposte.quando), avviso = '';
  if (!lz.length) { lz = prossime(tipo, 'qualsiasi'); avviso = `<p class="trova__nota">Nella fascia che hai scelto non c'è: ecco le prossime in altri orari.</p>`; }
  const chi = [...new Set(Object.values(D.SCHEMA).flat().filter(r => r[1] === tipo).map(r => ISTR[r[2]].nome))];
  trova.innerHTML = `<div class="trova__esito">
    <span class="eti">Ti consigliamo</span>
    <h3>${TIPI[tipo].nome}</h3>
    <p>${esc(TIPI[tipo].desc)}</p>
    <p class="trova__chi">Con ${chi.join(' o ')}</p>
    ${avviso}
    <div class="oggi__righe">${lz.map(l => { const s = statoRiga(l); return `<a class="oggi__riga ${s.c}" href="area/#lezione/${l.id}"><b>${l.ora}</b><span><strong>${M.Maiusc(M.quando(l.inizio))}</strong><small>${ISTR[l.chi].nome}</small></span><em>${s.t}</em></a>`; }).join('')}</div>
    ${risposte.esperienza === 'mai' ? '<a class="btn" href="area/#prova">Prenota la prova gratuita</a>' : ''}
    ${alt ? `<p class="trova__nota">Ti potrebbe piacere anche <a href="#${alt}">${TIPI[alt].nome}</a>.</p>` : ''}
    <button type="button" class="trova__ind" data-ricomincia>Ricomincia</button>
  </div>`;
}
if (trova) {
  trova.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k) risposte[b.dataset.k] = b.dataset.v;
    else if ('indietro' in b.dataset) { const ks = Object.keys(risposte); delete risposte[ks[ks.length - 1]]; }
    else if ('ricomincia' in b.dataset) risposte = {};
    disegnaTrova();
    const h = trova.querySelector('h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  });
  disegnaTrova();
}

// ---------- prezzi: quale formula ti conviene ----------
const conv = document.querySelector('[data-conviene]');
function disegnaConv(volte) {
  const mese = Math.round(volte * 4.33);
  const f = [['Carnet 5', 27, mese * 27], ['Carnet 10', 25, mese * 25], ['Mensile', null, 169]];
  const best = f.reduce((a, b) => b[2] < a[2] ? b : a);
  const max = Math.max(...f.map(x => x[2]));
  conv.querySelector('[data-esito]').innerHTML = `<p class="conv__frase">Con <b>${volte} lezion${volte === 1 ? 'e' : 'i'} a settimana</b> (circa ${mese} al mese) ti conviene il <b>${best[0].toLowerCase()}</b>: <b>${best[2]} € al mese</b>${best[0] === 'Mensile' ? `, cioè ${Math.round(169 / mese)} € a lezione` : ''}.</p>
    <div class="conv__barre">${f.map(([n, , tot]) => `<div class="conv__riga${n === best[0] ? ' best' : ''}"><span>${n}</span><i><s style="width:${Math.round(tot / max * 100)}%"></s></i><b>${tot} €</b></div>`).join('')}</div>`;
  conv.querySelectorAll('[data-volte]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.volte === volte));
}
if (conv) { conv.addEventListener('click', e => { const b = e.target.closest('[data-volte]'); if (b) disegnaConv(+b.dataset.volte); }); disegnaConv(2); }
})();
