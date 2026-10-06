// Cento Respiri — genera il sito (index.html), la pagina dell'app (app/index.html),
// il service worker, il manifest e ELENCO-FOTO.md.
// Le foto: se esiste assets/foto/<id>.webp si usa la foto, altrimenti un segnaposto con la descrizione.
// Il build si ferma se una foto è usata in più punti.
// Uso: node _build/build.js   (dopo foto nuove: prima node _build/varianti.js)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const V = '2'; // cache-busting di css/js: alzarlo a ogni pubblicazione
const DATI = require('../app/dati.js'); // orario, lezioni e istruttori: gli stessi dell'app
const GBREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const GNOMI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// ---------- foto ----------
const FOTO = {
  'sito-apertura': { r: '2880×1280', d: 'Sala con i reformer in legno, luce dalle finestre alte', alt: 'La sala di Cento Respiri con i reformer in legno' },
  'sito-metodo': { r: '4:5 · 1200×1500', d: 'Signora sui sessant\'anni che esegue il Cento sul reformer', alt: 'Una signora esegue il Cento sul reformer' },
  'sito-lezioni': { r: '16:7 · 2400×1050', d: 'Lezione in corso, persone di età diverse sui reformer', alt: 'Una lezione di gruppo sui reformer con l\'istruttrice' },
  'sito-marta': { r: '4:5 · 900×1125', d: 'Ritratto di Marta accanto a un reformer', alt: 'Marta Ferrero, fondatrice dello studio' },
  'sito-elena': { r: '4:5 · 900×1125', d: 'Ritratto di Elena seduta sul reformer', alt: 'Elena Sacco, fisioterapista e istruttrice' },
  'sito-davide': { r: '4:5 · 900×1125', d: 'Ritratto di Davide, uomo sui 40 anni, alla Tower o accanto al reformer', alt: 'Davide Rinaldi, istruttore' },
  'sito-studio': { r: '2880×1440', d: 'La sala vuota con sei reformer', alt: 'La sala vuota con sei reformer e l\'insegna in legno' },
  'studio-ingresso': { r: '3:2', d: 'Ingresso su strada con l\'insegna', alt: 'L\'ingresso dello studio con l\'insegna Cento Respiri' },
  'studio-accoglienza': { r: '3:2', d: 'Il bancone dell\'accoglienza', alt: 'Il bancone dell\'accoglienza in legno' },
  'studio-barrel': { r: '3:2', d: 'Ladder barrel e attrezzi', alt: 'Il ladder barrel in legno e gli attrezzi piccoli' },
  'studio-kit': { r: '3:2', d: 'Dall\'alto: calze antiscivolo, asciugamano, borraccia', alt: 'Calze antiscivolo, asciugamano e borraccia sul reformer' },
  'app-benvenuto': { r: '716×800', d: 'Sala luminosa con i reformer', alt: '' },
  'app-home': { r: '716×300', d: 'Dettaglio: piedi sulla barra del reformer', alt: '' },
  'app-lezione-base': { r: '716×340', d: 'Lezione Base: istruttrice che corregge un\'allieva', alt: '' },
  'app-lezione-intermedio': { r: '716×340', d: 'Lezione Intermedio: esercizio con le cinghie', alt: '' },
  'app-lezione-avanzato': { r: '716×340', d: 'Lezione Avanzato: istruttore tra due reformer', alt: '' },
  'app-lezione-prenatale': { r: '716×340', d: 'Lezione Prenatale: futura mamma sul reformer con l\'istruttrice', alt: '' },
  'app-lezione-tower': { r: '716×340', d: 'Lezione Tower: lavoro a parete con molle e barra', alt: '' },
  'app-prova': { r: '716×400', d: 'Istruttrice che accompagna una principiante', alt: '' },
};
const usate = {};
const esiste = id => fs.existsSync(path.join(ROOT, 'assets/foto', id + '.webp'));
// img con srcset (pre = '' per il sito, '../' per l'app)
function foto(id, sizes, pre = '', eager = false) {
  const f = FOTO[id]; if (!f) throw new Error('foto sconosciuta: ' + id);
  usate[id] = (usate[id] || 0) + 1;
  if (!esiste(id)) return `<div class="ph" role="img" aria-label="${f.alt || 'Foto in arrivo'}"><span>Foto · ${f.r} · ${f.d}</span></div>`;
  const b = pre + 'assets/foto/';
  return `<img class="foto" src="${b}800/${id}.webp" srcset="${b}480/${id}.webp 480w, ${b}800/${id}.webp 800w, ${b}1400/${id}.webp 1400w, ${b}${id}.webp 1920w" sizes="${sizes}" alt="${f.alt}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

// ---------- marchio: quadrante di cento tacche, ogni decima più lunga ----------
function marchio(color = 'currentColor', accent = '#6A2C2E') {
  let s = '';
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2 - Math.PI / 2, long = i % 10 === 0;
    const r1 = long ? 30 : 39, r2 = 47, f = n => +n.toFixed(2);
    s += `<line x1="${f(50 + r1 * Math.cos(a))}" y1="${f(50 + r1 * Math.sin(a))}" x2="${f(50 + r2 * Math.cos(a))}" y2="${f(50 + r2 * Math.sin(a))}"${long ? ` stroke="${accent}" stroke-width="2.2"` : ''}/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round">${s}</svg>`;
}

// ---------- contenuti ----------
const LEZIONI = [
  { name: 'Reformer Base', level: 'Livello 1', text: 'Per iniziare o ricominciare. Molle leggere, posizioni semplici, tanto lavoro sul respiro.' },
  { name: 'Reformer Intermedio', level: 'Livello 2', text: 'Serie complete e lavoro in piedi sul carrello. Dopo almeno dieci lezioni.' },
  { name: 'Reformer Avanzato', level: 'Livello 3', text: 'Sequenze lunghe, transizioni senza pause, equilibrio. Su indicazione dell\'istruttore.' },
  { name: 'Prenatale', level: 'Dal 2° trimestre', text: 'Mobilità, respiro e pavimento pelvico, con il via libera del ginecologo.' },
  { name: 'Tower', level: 'Tutti i livelli', text: 'Lavoro a parete con molle e barra: allungamento e forza per la schiena.' },
];
const PREZZI = [
  { name: 'Carnet 5 ingressi', price: '135 €', unit: '27 € a lezione', text: 'Per provare con calma o venire una volta a settimana.', note: 'Valido 2 mesi' },
  { name: 'Carnet 10 ingressi', price: '250 €', unit: '25 € a lezione', text: 'La formula più scelta, per due lezioni a settimana.', note: 'Valido 4 mesi' },
  { name: 'Mensile illimitato', price: '169 €', unit: 'al mese', text: 'Tutte le lezioni, prenotazione fino a 14 giorni prima.', note: 'Rinnovo mensile, disdici quando vuoi' },
];
const FAQ = [
  ['Devo aver già fatto pilates?', 'No. La prova gratuita è in Reformer Base: l\'istruttore ti spiega il lettino prima di cominciare.'],
  ['Cosa devo portare?', 'Abiti comodi e aderenti e calze antiscivolo. Se non le hai, te le diamo noi. Asciugamano e acqua ci sono.'],
  ['Serve il certificato medico?', 'No, per il pilates amatoriale non è obbligatorio. Se hai condizioni particolari puoi caricarlo nell\'app: lo vede solo lo staff.'],
  ['Come annullo una lezione?', 'Dall\'area clienti del sito o dall\'app, nella sezione Prenotazioni. Fino a 12 ore prima l\'ingresso torna nel carnet; dopo viene scalato.'],
  ['Cosa succede se la lezione è piena?', 'Ti metti in lista d\'attesa. Se si libera un posto ti arriva una notifica e hai 45 minuti per confermarlo.'],
  ['Posso venire in gravidanza?', 'Sì, dal secondo trimestre e con il via libera del ginecologo, nelle lezioni Prenatale con Elena.'],
  ['Serve l\'app per prenotare?', 'No: puoi prenotare anche dal computer, nell\'area clienti del sito. L\'app è più comoda dal telefono: avviso quando si libera un posto, QR per entrare in studio, funziona anche senza rete.'],
  ['Come installo l\'app?', 'Apri l\'app dal telefono: su iPhone con Safari, tasto Condividi, "Aggiungi alla schermata Home"; su Android Chrome te lo propone da solo. Nel Profilo trovi la guida passo per passo.'],
];
const MENU = [['metodo', 'Il metodo'], ['lezioni', 'Lezioni'], ['orario', 'Orario'], ['prezzi', 'Prezzi'], ['regala', 'Regala'], ['studio', 'Lo studio'], ['dove', 'Dove siamo']];
const STRISCIA = ['studio-ingresso', 'studio-accoglienza', 'studio-barrel', 'studio-kit'];

// mappa illustrata (la via è di fantasia, quindi niente mappa vera)
const MAPPA = `<svg viewBox="0 0 600 400" role="img" aria-label="Mappa illustrata di San Salvario: lo studio in Via delle Filande 7, a 5 minuti dalla metro Nizza, tra la stazione di Porta Nuova e il Parco del Valentino">
<rect width="600" height="400" fill="#EAE2D4"/>
<path d="M455 0 C430 120 470 220 440 400 L600 400 L600 0Z" fill="#D9E0CF"/>
<path d="M520 0 C500 120 545 230 515 400" stroke="#BFD0D6" stroke-width="26" fill="none"/>
<g stroke="#FBF8F3" stroke-width="10" stroke-linecap="round">
<path d="M0 70 L450 70"/><path d="M0 160 L440 160"/><path d="M0 250 L445 250"/><path d="M0 335 L440 335"/>
<path d="M90 0 L90 400"/><path d="M215 0 L215 400"/><path d="M330 0 L330 400"/></g>
<g stroke="#FBF8F3" stroke-width="5"><path d="M150 0 L150 400"/><path d="M272 0 L272 400"/><path d="M0 115 L440 115"/><path d="M0 205 L440 205"/><path d="M0 292 L440 292"/></g>
<rect x="14" y="8" width="150" height="46" rx="8" fill="#DCD1BF"/>
<g font-family="Hanken Grotesk, sans-serif" font-size="19" fill="#4A433A">
<text x="89" y="38" text-anchor="middle">Porta Nuova</text>
<text x="96" y="390" transform="rotate(-90 96 390)" dx="0" dy="-8" fill="#6B6257">Via Nizza</text>
<text x="180" y="60" fill="#6B6257">C.so Vittorio Emanuele II</text>
<text x="490" y="190" transform="rotate(90 490 190)" text-anchor="middle" fill="#5E6B55">Parco del Valentino</text>
<text x="560" y="300" transform="rotate(90 560 300)" text-anchor="middle" fill="#6E8A94">Po</text></g>
<circle cx="90" cy="250" r="18" fill="#2B2620"/><text x="90" y="257" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="19" font-weight="700" fill="#FBF8F3">M</text>
<text x="114" y="284" font-family="Hanken Grotesk, sans-serif" font-size="19" fill="#2B2620">Metro Nizza</text>
<path d="M105 250 L272 250 L272 205" stroke="#6A2C2E" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/>
<circle cx="272" cy="196" r="20" fill="#6A2C2E"/><circle cx="272" cy="196" r="7" fill="#FBF8F3"/>
<rect x="296" y="158" width="196" height="72" rx="12" fill="#FBF8F3"/>
<text x="310" y="188" font-family="Gilda Display, serif" font-size="24" fill="#2B2620">Cento Respiri</text>
<text x="310" y="216" font-family="Hanken Grotesk, sans-serif" font-size="18" fill="#6B6257">Via delle Filande 7</text>
</svg>`;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const head = (title, desc, pre, extra = '') => `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#F3EEE5">
<link rel="icon" type="image/png" sizes="32x32" href="${pre}assets/icone/favicon-32.png">
<link rel="apple-touch-icon" href="${pre}assets/icone/icona-180.png">
<link rel="preload" href="${pre}assets/fonts/gilda-display-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${pre}assets/fonts/hanken-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${pre}assets/css/base.css?v=${V}">
${extra}</head>`;

// ---------- sito ----------
const battiti = Array.from({ length: 100 }, (_, i) => `<span${i % 10 === 9 ? ' class="r"' : i % 10 >= 5 ? ' class="f"' : ''}></span>`).join('');
const sito = `${head('Cento Respiri · Pilates reformer a Torino', 'Studio di pilates reformer a San Salvario, Torino: classi da sei, prima lezione gratuita, prenotazione dall\'app. Progetto dimostrativo.', '', `<link rel="stylesheet" href="assets/css/sito.css?v=${V}">
<meta property="og:title" content="Cento Respiri · Pilates reformer a Torino">
<meta property="og:description" content="Classi da sei, un lettino a testa, prenotazione dall'app. Progetto dimostrativo.">
<meta property="og:type" content="website">
${esiste('sito-apertura') ? '<meta property="og:image" content="assets/foto/1400/sito-apertura.webp">\n' : ''}`)}
<body>
<a class="sr" href="#contenuto">Vai al contenuto</a>
<header class="header">
  <div class="wrap">
    <a class="logo" href="#top" aria-label="Cento Respiri, torna su">${marchio('#2B2620')}<b>CENTO RESPIRI</b></a>
    <nav aria-label="Principale">
${MENU.map(([h, t]) => `      <a class="solo-pc" href="#${h}">${t}</a>`).join('\n')}
      <a class="accedi" href="area/">Accedi</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-tel">Menu</button>
    </nav>
  </div>
  <div class="menu-tel" id="menu-tel" hidden>
    <nav aria-label="Sezioni">
${MENU.map(([h, t]) => `      <a href="#${h}">${t}</a>`).join('\n')}
      <a href="#faq">Domande</a>
    </nav>
    <div class="menu-tel__giu">
      <a class="btn" href="area/#prova">Prenota la prova gratuita</a>
      <a class="btn btn--bordo" href="area/">Accedi all'area clienti</a>
      <div class="menu-tel__link"><a href="app/">App per il telefono</a></div>
    </div>
  </div>
</header>
<main id="contenuto">
<section class="apertura wrap" id="top">
  <div class="apertura__foto">${foto('sito-apertura', '(max-width:1376px) 100vw, 1344px', '', true)}</div>
  <div class="apertura__sotto">
    <h1>Pilates reformer a Torino, in classi da sei.</h1>
    <div class="apertura__cta">
      <a class="btn" href="area/#prova">Prenota la prova gratuita</a>
      <div>San Salvario · prima lezione gratuita, senza impegno</div>
    </div>
  </div>
</section>

<section class="fondo-carta" id="metodo">
  <div class="wrap sez metodo">
    <div class="metodo__testo">
      <div class="eti">Il metodo</div>
      <h2 class="h2">Perché cento respiri</h2>
      <p class="p-grande">Il Cento, <i>The Hundred</i>, è il primo esercizio della sequenza di Joseph Pilates. Sdraiati sulla schiena, testa e gambe sollevate, le braccia battono l'aria vicino ai fianchi: cinque battiti inspirando, cinque espirando. Dieci volte, cento battiti.</p>
      <p class="p-grande">Scalda il corpo e mette il respiro al centro. Da qui parte ogni nostra lezione, e da qui viene il nome. Sul reformer lo stesso principio vale per tutto il resto: movimenti precisi, molle che accompagnano, il ritmo deciso dal fiato.</p>
      <div class="battiti" data-battiti>
        <div class="battiti__barre" aria-hidden="true">${battiti}</div>
        <div class="battiti__riga">
          <div class="battiti__dida" aria-live="polite">100 battiti · 10 respiri · 5 dentro, 5 fuori</div>
          <button class="battiti__btn" type="button">Respira con noi · 50 s</button>
        </div>
      </div>
    </div>
    <div class="r45">${foto('sito-metodo', '(max-width:1000px) 100vw, 640px')}</div>
  </div>
</section>

<section class="wrap sez lezioni" id="lezioni">
  <div class="testa-riga">
    <div class="testa"><div class="eti">Le lezioni</div><h2 class="h2">Cinque lezioni, un lettino a testa</h2></div>
    <p class="p2">50 minuti, al massimo sei persone, sempre su prenotazione dall'app. Il lettino lo scegli tu.</p>
  </div>
  <div class="lezioni__foto">${foto('sito-lezioni', '(max-width:1376px) 100vw, 1344px')}</div>
  <ul class="lezioni__elenco">
${LEZIONI.map(l => `    <li><div class="riga"><h3>${l.name}</h3><span class="liv">${l.level}</span></div><p>${esc(l.text)}</p></li>`).join('\n')}
  </ul>
</section>

<section class="fondo-carta" id="orario">
  <div class="wrap sez orario" data-orario>
    <div class="testa-riga">
      <div class="testa"><div class="eti">Orario</div><h2 class="h2">La settimana dello studio</h2></div>
      <p class="p2">Tocca una lezione per vedere i posti liberi e prenotare il lettino.</p>
    </div>
    <div class="orario__giorni" role="tablist" aria-label="Giorni della settimana">
${[1, 2, 3, 4, 5, 6].map(g => `      <button type="button" role="tab" id="og-${g}" aria-controls="op-${g}" aria-selected="${g === 1}" data-g="${g}"><span class="solo-tel">${GBREVI[g]}</span><span class="solo-largo">${GNOMI[g]}</span></button>`).join('\n')}
    </div>
${[1, 2, 3, 4, 5, 6].map(g => `    <div class="orario__lista" role="tabpanel" id="op-${g}" aria-labelledby="og-${g}"${g === 1 ? '' : ' hidden'}>
${DATI.SCHEMA[g].map(([ora, tipo, chi]) => `      <a class="orario__riga" href="area/#orario" data-g="${g}" data-ora="${ora}"><b>${ora}</b><span class="cosa"><strong>${DATI.TIPI[tipo].nome}</strong><span>${DATI.ISTR[chi].nome} · 50 min</span></span><span class="vai">Prenota ›</span></a>`).join('\n')}
    </div>`).join('\n')}
    <p class="p2 orario__nota">Domenica chiuso. Si prenota fino a 14 giorni prima; annulli gratis fino a 12 ore prima.</p>
  </div>
</section>

<section class="wrap sez prima" id="prima" aria-labelledby="t-prima">
  <div class="testa"><div class="eti">La prima volta</div><h2 class="h2" id="t-prima">Mai visto un reformer? Funziona così</h2></div>
  <ol class="passi3">
    <li><b>1</b><h3>Prenoti la prova</h3><p>Gratis, in due minuti: scegli se è la prima volta, il giorno e l'ora. Nessun dato di pagamento.</p></li>
    <li><b>2</b><h3>Arrivi dieci minuti prima</h3><p>Ti mostriamo il lettino: carrello, molle, cinghie, poggiapiedi. Ti diamo noi le calze antiscivolo, se non le hai.</p></li>
    <li><b>3</b><h3>Cinquanta minuti, poi decidi</h3><p>Una lezione di Reformer Base con al massimo sei persone. Dopo, nessun obbligo: se ti è piaciuta scegli la formula con calma.</p></li>
  </ol>
</section>

<section class="fondo-sabbia">
  <div class="wrap sez istruttori">
    <div class="testa"><div class="eti">Gli istruttori</div><h2 class="h2">Tre persone, sempre le stesse</h2></div>
    <div class="istruttori__griglia">
      <article class="istr"><div class="r45">${foto('sito-marta', '(max-width:700px) 100vw, 440px')}</div><h3>Marta Ferrero</h3><div class="ruolo">Fondatrice · Reformer e Tower</div><p>Insegna dal 2011. Ha aperto lo studio per lavorare con pochi allievi alla volta e conoscerli per nome.</p></article>
      <article class="istr"><div class="r45">${foto('sito-elena', '(max-width:700px) 100vw, 440px')}</div><h3>Elena Sacco</h3><div class="ruolo">Base e Prenatale</div><p>Fisioterapista, segue le future mamme e chi riprende dopo un infortunio.</p></article>
      <article class="istr"><div class="r45">${foto('sito-davide', '(max-width:700px) 100vw, 440px')}</div><h3>Davide Rinaldi</h3><div class="ruolo">Avanzato e Tower</div><p>Ex danzatore classico. Le sue lezioni sono lente, precise e faticose.</p></article>
    </div>
  </div>
</section>

<section class="wrap sez prezzi" id="prezzi">
  <div class="testa"><div class="eti">Prezzi</div><h2 class="h2">Quattro formule, nessuna quota d'iscrizione</h2></div>
  <div class="prezzi__griglia">
    <div class="prezzo prezzo--prova">
      <h3>Prova gratuita</h3>
      <div class="cifra"><b>0 €</b></div>
      <p>Una lezione di Reformer Base o Prenatale. Una volta per persona.</p>
      <a class="btn btn--chiaro" href="area/#prova">Prenota la prova gratuita</a>
    </div>
${PREZZI.map(p => `    <div class="prezzo"><h3>${p.name}</h3><div class="cifra"><b>${p.price}</b><span>${p.unit}</span></div><p>${p.text}</p><div class="nota">${p.note}</div></div>`).join('\n')}
  </div>
  <div class="privata">
    <div class="testa"><div class="eti">Lezione privata</div><h3 class="h3">Un istruttore solo per te, o per voi due</h3><p class="p2">${esc(DATI.PRIVATE.sola.testo)}</p></div>
    <div class="privata__prezzi">
      <div><span>Da sola o da solo</span><b>${DATI.PRIVATE.sola.prezzo} €</b></div>
      <div><span>In coppia</span><b>${DATI.PRIVATE.coppia.prezzo} €</b><small>45 € a testa</small></div>
      <a class="link-freccia" href="area/#privata">Prenota una privata ›</a>
    </div>
  </div>
  <p class="p2">Carnet e mensile si acquistano in studio o dall'app. Annulli gratis fino a 12 ore prima della lezione.</p>
</section>

<section class="fondo-sabbia" id="regala" aria-labelledby="t-regala">
  <div class="wrap sez regala" data-regala>
    <div class="testa-riga">
      <div class="testa"><div class="eti">Regala una lezione</div><h2 class="h2" id="t-regala">Cento respiri in regalo</h2></div>
      <p class="p2">Scegli cosa regalare e scrivi una dedica: ti prepariamo il biglietto da stampare o da mandare. Chi lo riceve inserisce il codice nell'area clienti o nell'app.</p>
    </div>
    <div class="regala__scelte" role="radiogroup" aria-label="Cosa regalare">
${Object.entries(DATI.REGALI).map(([k, r], i) => `      <button type="button" role="radio" aria-checked="${i === 0}" data-regalo="${k}"><b>${r.nome}</b><span>${r.prezzo} €</span><small>${esc(r.testo)}</small></button>`).join('\n')}
    </div>
    <div class="regala__form">
      <label>Per chi è<input type="text" id="rg-per" maxlength="40" placeholder="Es. Giulia"></label>
      <label>Da parte di<input type="text" id="rg-da" maxlength="40" placeholder="Es. Marco"></label>
      <label class="largo">Dedica (facoltativa)<textarea id="rg-dedica" maxlength="160" rows="2" placeholder="Es. Per ricominciare con calma"></textarea></label>
    </div>
    <div class="regala__giu">
      <button class="btn" type="button" data-crea-regalo>Prepara il biglietto</button>
      <span class="p2">Demo: nessun pagamento, il codice funziona solo su questo dispositivo.</span>
    </div>
    <div class="biglietto" id="biglietto" hidden aria-live="polite"></div>
  </div>
</section>

<section class="studio" id="studio" aria-labelledby="t-studio">
  <div class="wrap"><div class="studio__foto">${foto('sito-studio', '(max-width:1376px) 100vw, 1344px')}</div></div>
  <div class="wrap testa-riga">
    <div class="testa"><div class="eti">Lo studio</div><h2 class="h2" id="t-studio">Una sola sala, a piano terra</h2></div>
    <p class="p-grande">Una vetrina in legno in una via tranquilla di San Salvario. Sei reformer, una Tower, finestre alte e luce naturale. Spogliatoio con doccia, armadietti, calze antiscivolo per chi le dimentica.</p>
  </div>
  <div class="wrap">
    <div class="striscia" data-striscia>
      <div class="striscia__track" tabindex="0" aria-label="Foto dello studio">
${STRISCIA.map(id => `        <figure class="striscia__item">${foto(id, '(max-width:700px) 86vw, 640px')}</figure>`).join('\n')}
      </div>
      <div class="striscia__ctrl">
        <button type="button" data-dir="-1" aria-label="Foto precedente">‹</button>
        <span data-conta>1 / ${STRISCIA.length}</span>
        <button type="button" data-dir="1" aria-label="Foto successiva">›</button>
      </div>
    </div>
  </div>
</section>

<section class="fondo-carta" id="dove">
  <div class="wrap sez dove">
    <div class="mappa">${MAPPA}</div>
    <div class="dove__info">
      <div class="testa"><div class="eti">Dove siamo</div><h2 class="h2">Via delle Filande 7, Torino</h2><p class="p2">San Salvario, ingresso su strada. Metro Nizza a 5 minuti a piedi, Porta Nuova a 10.</p></div>
      <div class="eti eti--grigia" style="margin-bottom:-16px">Orari</div>
      <dl class="orari">
        <div><dt>Lunedì – venerdì</dt><dd>7:00 – 21:30</dd></div>
        <div><dt>Sabato</dt><dd>9:00 – 13:00</dd></div>
        <div><dt>Domenica</dt><dd>chiuso</dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="wrap sez faq" id="faq">
  <div class="testa"><div class="eti">Domande frequenti</div><h2 class="h2">Prima di venire</h2></div>
  <div class="faq__elenco">
${FAQ.map(([q, a]) => `    <details><summary>${q}</summary><p>${esc(a)}</p></details>`).join('\n')}
  </div>
</section>
</main>

<footer class="footer">
  <div class="wrap">
    <div class="footer__alto">
      <div class="logo">${marchio('#F3EEE5', '#C99A8F')}<b>CENTO RESPIRI</b></div>
      <div class="footer__col">
        <div><span class="eti">Studio</span><span>Via delle Filande 7, 10126 Torino</span><span>Lun–Ven 7–21:30 · Sab 9–13</span></div>
        <div><span class="eti">Contatti</span><span>ciao@centorespiri.it</span><span>+39 011 000 0000</span></div>
        <div><span class="eti">Clienti</span><a href="area/">Area clienti</a><a href="app/">App per il telefono</a><a href="studio/">Pannello dello studio</a></div>
      </div>
    </div>
    <div class="footer__nota">Progetto dimostrativo per portfolio. Studio, persone, indirizzo, contatti e prezzi sono di fantasia; nessun pagamento reale.</div>
  </div>
</footer>
<aside class="pop-app" id="pop-app" aria-label="Scarica l'app" hidden>
  <div class="pop-app__qr" aria-hidden="true"></div>
  <a class="pop-app__testo" href="app/">
    <span class="pop-app__icona" aria-hidden="true">${marchio('#F3EEE5', '#F3EEE5')}</span>
    <span><b>Scarica l'app</b><small class="solo-tocco">Prenoti con un tocco e ti avvisiamo se si libera un posto</small><small class="solo-mouse">Inquadra il codice col telefono</small></span>
  </a>
  <button class="pop-app__x" type="button" aria-label="Chiudi">✕</button>
</aside>
<script src="assets/js/qrcode.min.js?v=${V}" defer></script>
<script src="assets/js/sito.js?v=${V}" defer></script>
</body>
</html>
`;

// ---------- app (shell: le schermate le disegna app.js) ----------
const fotoApp = {};
for (const id of Object.keys(FOTO).filter(k => k.startsWith('app-'))) {
  fotoApp[id] = esiste(id) ? { src: `../assets/foto/800/${id}.webp`, srcset: `../assets/foto/480/${id}.webp 480w, ../assets/foto/800/${id}.webp 800w` } : { ph: `Foto · ${FOTO[id].r} · ${FOTO[id].d}` };
  usate[id] = (usate[id] || 0) + 1;
}
const app = `${head('Cento Respiri · App iscritti', 'App iscritti di Cento Respiri: prenota le lezioni di pilates reformer, lista d\'attesa, carnet e QR d\'ingresso. Demo.', '../', `<link rel="stylesheet" href="app.css?v=${V}">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Cento Respiri">
`)}
<body class="app">
<div id="app" class="app__col" aria-live="polite"></div>
<div id="toast" class="toast" role="status" hidden></div>
<script>window.CR_FOTO=${JSON.stringify(fotoApp)};window.CR_MARCHIO=${JSON.stringify(marchio('currentColor', 'currentColor'))};window.CR_V=${JSON.stringify(V)};</script>
<script src="../assets/js/qrcode.min.js?v=${V}" defer></script>
<script src="dati.js?v=${V}" defer></script>
<script src="app.js?v=${V}" defer></script>
</body>
</html>
`;

// ---------- area clienti nel browser: stesso motore dell'app, impaginazione da PC, nessuna installazione ----------
const area = `${head('Area clienti · Cento Respiri', 'Area clienti di Cento Respiri: prenota le lezioni dal computer, gestisci carnet e lista d\'attesa. Demo.', '../', `<link rel="stylesheet" href="../app/app.css?v=${V}">
<link rel="stylesheet" href="area.css?v=${V}">
`)}
<body class="app web">
<div id="app" class="app__col" aria-live="polite"></div>
<div id="toast" class="toast" role="status" hidden></div>
<script>window.CR_FOTO=${JSON.stringify(fotoApp)};window.CR_MARCHIO=${JSON.stringify(marchio('currentColor', 'currentColor'))};window.CR_V=${JSON.stringify(V)};</script>
<script src="../assets/js/qrcode.min.js?v=${V}" defer></script>
<script src="../app/dati.js?v=${V}" defer></script>
<script src="../app/app.js?v=${V}" defer></script>
</body>
</html>
`;

// ---------- pannello dello studio: lezioni del giorno, lettini, presenze, lettore del QR d'ingresso ----------
const studio = `${head('Pannello studio · Cento Respiri', 'Pannello dello staff di Cento Respiri: lezioni del giorno, lettini, lista d\'attesa, presenze con il QR dell\'app. Demo.', '../', `<link rel="stylesheet" href="studio.css?v=${V}">
`)}
<body class="studio">
<div id="studio"></div>
<script>window.CR_FOTO={};window.CR_MARCHIO=${JSON.stringify(marchio('currentColor', '#6A2C2E'))};</script>
<script src="../assets/js/jsQR.min.js?v=${V}" defer></script>
<script src="../app/dati.js?v=${V}" defer></script>
<script src="../app/app.js?v=${V}" defer></script>
<script src="studio.js?v=${V}" defer></script>
</body>
</html>
`;

// ---------- service worker: guscio dell'app in cache per l'uso offline ----------
const fotoCache = Object.keys(fotoApp).filter(esiste).flatMap(id => [`../assets/foto/480/${id}.webp`, `../assets/foto/800/${id}.webp`]);
const sw = `// generato da _build/build.js
const CACHE = 'cento-respiri-v${V}';
const FILES = ${JSON.stringify(['./', 'index.html', `app.css?v=${V}`, `dati.js?v=${V}`, `app.js?v=${V}`, 'manifest.webmanifest', `../assets/css/base.css?v=${V}`, `../assets/js/qrcode.min.js?v=${V}`, '../assets/fonts/gilda-display-latin.woff2', '../assets/fonts/hanken-grotesk-latin.woff2', '../assets/icone/icona-192.png', ...fotoCache])};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // prima la rete (così gli aggiornamenti arrivano), la cache se si è offline
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); if (r.ok) caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
// tocco su una notifica: apre (o riporta in primo piano) l'app sulla schermata giusta
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
`;
const manifest = {
  name: 'Cento Respiri', short_name: 'Cento Respiri', description: 'Prenota le lezioni di pilates reformer (demo).', lang: 'it',
  start_url: './', scope: './', display: 'standalone', background_color: '#F3EEE5', theme_color: '#F3EEE5',
  icons: [
    { src: '../assets/icone/icona-192.png', sizes: '192x192', type: 'image/png' },
    { src: '../assets/icone/icona-512.png', sizes: '512x512', type: 'image/png' },
    { src: '../assets/icone/icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

// ---------- controlli e scrittura ----------
const doppie = Object.entries(usate).filter(([, n]) => n > 1);
if (doppie.length) { console.error('FOTO USATE PIÙ VOLTE: ' + doppie.map(([id, n]) => id + ' ×' + n).join(', ')); process.exit(1); }
fs.mkdirSync(path.join(ROOT, 'app'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'index.html'), sito);
fs.writeFileSync(path.join(ROOT, 'app/index.html'), app);
fs.mkdirSync(path.join(ROOT, 'area'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'area/index.html'), area);
fs.writeFileSync(path.join(ROOT, 'studio/index.html'), studio);
fs.writeFileSync(path.join(ROOT, 'app/sw.js'), sw);
fs.writeFileSync(path.join(ROOT, 'app/manifest.webmanifest'), JSON.stringify(manifest, null, 1));
const ids = Object.keys(FOTO);
const ok = ids.filter(esiste);
fs.writeFileSync(path.join(ROOT, 'ELENCO-FOTO.md'), `# Elenco foto — Cento Respiri\n\nGenerato da \`_build/build.js\`. Per sostituire o aggiungere una foto: metti \`assets/foto/<id>.webp\`, poi \`node _build/varianti.js\` e \`node _build/build.js\`.\n\n**${ok.length}/${ids.length} presenti.**\n\n| id | misura | contenuto | stato |\n|---|---|---|---|\n${ids.map(id => `| \`${id}\` | ${FOTO[id].r} | ${FOTO[id].d} | ${esiste(id) ? 'ok' : '**manca**'} |`).join('\n')}\n`);
console.log(`build ok · foto ${ok.length}/${ids.length}` + (ok.length < ids.length ? ' · mancano: ' + ids.filter(i => !esiste(i)).join(', ') : ''));
