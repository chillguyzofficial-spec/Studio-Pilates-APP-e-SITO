// Cento Respiri — genera il sito (index.html), la pagina dell'app (app/index.html),
// il service worker, il manifest e ELENCO-FOTO.md.
// Le foto: se esiste assets/foto/<id>.webp si usa la foto, altrimenti un segnaposto con la descrizione.
// Il build si ferma se una foto è usata in più punti.
// Uso: node _build/build.js   (dopo foto nuove: prima node _build/varianti.js)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITO = 'https://chillguyzofficial-spec.github.io/Studio-Pilates-APP-e-SITO/'; // indirizzo pubblico (anteprime di condivisione)
const V = '4'; // cache-busting di css/js: alzarlo a ogni pubblicazione
const DATI = require('../app/dati.js'); // orario, lezioni e istruttori: gli stessi dell'app
const GBREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const GNOMI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// ---------- foto ----------
const FOTO = {
  'sito-apertura': { r: '2880×1280', d: 'Sala con i reformer in legno, luce dalle finestre alte', alt: 'La sala di Cento Respiri con i reformer in legno' },
  'sito-metodo': { r: '4:5 · 1200×1500', d: 'Signora sui sessant\'anni che esegue il Cento sul reformer', alt: 'Una signora esegue il Cento sul reformer' },
  'lezioni-alto': { r: '1920×1080', d: 'La lezione vista dall\'alto, sei reformer', alt: 'Una lezione vista dall\'alto: sei persone sui reformer e l\'istruttrice' },
  'sito-lezioni': { r: '16:7 · 2400×1050', d: 'Lezione in corso, persone di età diverse sui reformer', alt: 'Una lezione di gruppo sui reformer con l\'istruttrice' },
  'sito-marta': { r: '4:5 · 900×1125', d: 'Ritratto di Marta accanto a un reformer', alt: 'Marta Ferrero, fondatrice dello studio' },
  'sito-elena': { r: '4:5 · 900×1125', d: 'Ritratto di Elena seduta sul reformer', alt: 'Elena Sacco, fisioterapista e istruttrice' },
  'sito-davide': { r: '4:5 · 900×1125', d: 'Ritratto di Davide, uomo sui 40 anni, alla Tower o accanto al reformer', alt: 'Davide Rinaldi, istruttore' },
  'sito-studio': { r: '2880×1440', d: 'La sala vuota con sei reformer', alt: 'La sala vuota con sei reformer e l\'insegna in legno' },
  'studio-ingresso': { r: '3:2', d: 'Ingresso su strada con l\'insegna', alt: 'L\'ingresso dello studio con l\'insegna Cento Respiri' },
  'studio-accoglienza': { r: '3:2', d: 'Il bancone dell\'accoglienza', alt: 'Il bancone dell\'accoglienza in legno' },
  'studio-barrel': { r: '3:2', d: 'Ladder barrel e attrezzi', alt: 'Il ladder barrel in legno e gli attrezzi piccoli' },
  'studio-kit': { r: '3:2', d: 'Dall\'alto: calze antiscivolo, asciugamano, borraccia', alt: 'Calze antiscivolo, asciugamano e borraccia sul reformer' },
  'studio-spogliatoio': { r: '1920×1040', d: 'Spogliatoio con armadietti in legno', alt: 'Lo spogliatoio con gli armadietti in legno e gli asciugamani' },
  'studio-doccia': { r: '3:2', d: 'La doccia', alt: 'La doccia in pietra chiara con asciugamani e prodotti' },
  'studio-dettaglio': { r: '3:2', d: 'Asciugamani e candela', alt: 'Asciugamani piegati e una candela su una panca di legno' },
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

// ---------- sito: 8 pagine con testata, menu e footer comuni ----------
// struttura come i migliori studi del 2026: home breve + lezioni, orario, istruttori, prezzi (+ regala, studio, domande)
const PAG = [['lezioni.html', 'Lezioni'], ['orario.html', 'Orario'], ['istruttori.html', 'Istruttori'], ['prezzi.html', 'Prezzi'], ['regala.html', 'Regala'], ['studio.html', 'Lo studio']];
const battiti = Array.from({ length: 100 }, (_, i) => `<span${i % 10 === 9 ? ' class="r"' : i % 10 >= 5 ? ' class="f"' : ''}></span>`).join('');
// lezioni della settimana di un istruttore o di un tipo, dall'orario vero (app/dati.js)
const settimanaDi = filtro => [1, 2, 3, 4, 5, 6].map(g => [g, DATI.SCHEMA[g].filter(filtro)]).filter(([, l]) => l.length);
const righeSettimana = (filtro, mostra) => `<ul class="sett">${settimanaDi(filtro).map(([g, l]) => `<li><b>${GNOMI[g]}</b><span>${l.map(mostra).join(' · ')}</span></li>`).join('')}</ul>`;

const PROFILI = {
  marta: {
    foto: 'sito-marta', ruolo: 'Fondatrice · Base e Intermedio', dal: 'Insegna dal 2011',
    storia: 'Ha cominciato col pilates per un mal di schiena da scrivania e non ha più smesso. Dopo dieci anni in palestre grandi ha aperto Cento Respiri nel 2019 con un\'idea semplice: classi da sei, per conoscere ognuno per nome e ricordarsi come si muove.',
    formazione: ['Laurea in Scienze motorie', 'Diploma di insegnante pilates, matwork e grandi attrezzi (450 ore)', 'Aggiornamento su pilates e mal di schiena cronico'],
    stile: 'Precisa e calma. Corregge con le parole prima che con le mani e ti spiega sempre perché un esercizio si fa così.',
    con: ['Chi comincia da zero', 'Chi passa la giornata seduto', 'Chi vuole una tecnica pulita prima di salire di livello'],
    frase: 'Il reformer non perdona la fretta. È il suo bello.',
  },
  elena: {
    foto: 'sito-elena', ruolo: 'Fisioterapista · Base e Prenatale', dal: 'Nello studio dal 2020',
    storia: 'Fisioterapista, lavora da anni con chi riprende a muoversi dopo un infortunio. Il pilates è arrivato come strumento di lavoro ed è diventato il suo modo di insegnare: pochi esercizi, scelti bene, fatti con attenzione.',
    formazione: ['Laurea in Fisioterapia', 'Diploma di insegnante pilates sui grandi attrezzi', 'Formazione su pilates in gravidanza e nel post parto'],
    stile: 'Attenta e rassicurante. Adatta ogni esercizio al corpo che ha davanti, non il contrario.',
    con: ['Future mamme dal secondo trimestre', 'Chi torna dopo un infortunio o un intervento', 'Chi ha più di sessant\'anni e vuole muoversi in sicurezza'],
    frase: 'Prima di rinforzare, impariamo a respirare.',
  },
  davide: {
    foto: 'sito-davide', ruolo: 'Avanzato e Tower', dal: 'Nello studio dal 2021',
    storia: 'Quindici anni di danza classica, poi il pilates per prolungare la carriera e alla fine per insegnarlo. Dalla danza si è portato dietro l\'ossessione per l\'allineamento e la pazienza di ripetere un movimento finché è giusto.',
    formazione: ['Diploma di danza classica', 'Diploma di insegnante pilates sui grandi attrezzi', 'Specializzazione sul lavoro alla Tower'],
    stile: 'Lento, preciso, faticoso. Poche pause e molta attenzione all\'equilibrio.',
    con: ['Chi ha già le basi e vuole salire di livello', 'Sportivi e runner che cercano mobilità', 'Chi vuole lavorare su equilibrio e postura'],
    frase: 'Lento non vuol dire facile.',
  },
};
const LEZ_DETTAGLI = {
  base: { per: 'Chi non ha mai usato il reformer o riprende dopo una pausa.', cosa: 'Esercizi da sdraiati e seduti, molle leggere, tanto lavoro sul respiro e sull\'allineamento. Si impara a usare il lettino in sicurezza.' },
  intermedio: { per: 'Chi ha fatto almeno dieci lezioni e conosce il lettino.', cosa: 'Serie complete, lavoro in ginocchio e in piedi sul carrello, transizioni più fluide. Il respiro guida il ritmo.' },
  avanzato: { per: 'Chi ha basi solide, su indicazione dell\'istruttore.', cosa: 'Sequenze lunghe senza pause, equilibrio sul carrello in movimento, esercizi di forza e controllo.' },
  prenatale: { per: 'Future mamme dal secondo trimestre, con il via libera del ginecologo.', cosa: 'Mobilità del bacino e della schiena, respiro, pavimento pelvico. Molle leggere e posizioni adattate mese per mese.' },
  tower: { per: 'Tutti i livelli.', cosa: 'Lavoro a parete con molle e barra: allungamento della catena posteriore e forza per la schiena. Ottima per chi passa molte ore seduto.' },
};
const RECENSIONI = [
  ['Dopo dieci lezioni il mal di schiena da ufficio è quasi sparito. Marta corregge ogni dettaglio, senza mai farti sentire in difficoltà.', 'Giulia, 41 anni'],
  ['Ho seguito le lezioni Prenatale con Elena fino all\'ottavo mese. Mi sono sentita seguita, ogni settimana l\'esercizio giusto.', 'Sara, 34 anni'],
  ['Le lezioni di Davide sono lente e durissime. Esattamente quello che cercavo dopo anni di corsa.', 'Luca, 52 anni'],
];

const ogMeta = (titolo, descr, file) => `<link rel="stylesheet" href="assets/css/sito.css?v=${V}">
<meta property="og:title" content="${titolo}">
<meta property="og:description" content="${descr}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITO}assets/og-cento-respiri.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${SITO}${file === 'index.html' ? '' : file}">
<meta name="twitter:card" content="summary_large_image">
`;
function pagina(file, titolo, descr, corpo) {
  const att = h => h === file ? ' aria-current="page"' : '';
  return `${head(titolo, descr + ' Progetto dimostrativo.', '', ogMeta(titolo, descr, file))}
<body>
<a class="sr" href="#contenuto">Vai al contenuto</a>
<header class="header">
  <div class="wrap">
    <a class="logo" href="./" aria-label="Cento Respiri, home">${marchio('#2B2620')}<b>CENTO RESPIRI</b></a>
    <nav aria-label="Principale">
${PAG.map(([h, t]) => `      <a class="solo-pc" href="${h}"${att(h)}>${t}</a>`).join('\n')}
      <a class="accedi" href="area/">Accedi</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-tel">Menu</button>
    </nav>
  </div>
  <div class="menu-tel" id="menu-tel" hidden>
    <nav aria-label="Pagine">
      <a href="./"${att('index.html')}>Home</a>
${PAG.map(([h, t]) => `      <a href="${h}"${att(h)}>${t}</a>`).join('\n')}
      <a href="domande.html"${att('domande.html')}>Domande</a>
    </nav>
    <div class="menu-tel__giu">
      <a class="btn" href="area/#prova">Prenota la prova gratuita</a>
      <a class="btn btn--bordo" href="area/">Accedi all'area clienti</a>
      <div class="menu-tel__link"><a href="app/">App per il telefono</a></div>
    </div>
  </div>
</header>
<main id="contenuto">
${corpo}
</main>
<footer class="footer">
  <div class="wrap">
    <div class="footer__alto">
      <a class="logo" href="./" aria-label="Cento Respiri, home">${marchio('#F3EEE5', '#C99A8F')}<b>CENTO RESPIRI</b></a>
      <div class="footer__col">
        <div><span class="eti">Studio</span><span>Via delle Filande 7, 10126 Torino</span><span>Lun–Ven 7–21:30 · Sab 9–13</span><a href="studio.html">Come arrivare</a></div>
        <div><span class="eti">Contatti</span><span>ciao@centorespiri.it</span><span>+39 011 000 0000</span></div>
        <div><span class="eti">Sito</span>${PAG.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}<a href="domande.html">Domande</a></div>
        <div><span class="eti">Clienti</span><a href="area/">Area clienti</a><a href="app/">App per il telefono</a><a href="studio/">Pannello dello studio</a></div>
        <div><span class="eti">Seguici</span><span class="social">Instagram</span><span class="social">Facebook</span><span class="social">YouTube</span><small class="footer__piccolo">Profili di esempio</small></div>
      </div>
    </div>
    <div class="footer__nota">Progetto dimostrativo per portfolio. Studio, persone, indirizzo, contatti, recensioni e prezzi sono di fantasia; nessun pagamento reale.</div>
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
<script src="app/dati.js?v=${V}" defer></script>
<script src="app/app.js?v=${V}" defer></script>
<script src="assets/js/sito.js?v=${V}" defer></script>
<script src="assets/js/vivo.js?v=${V}" defer></script>
</body>
</html>
`;
}
const testaPagina = (eti, titolo, intro) => `<section class="wrap pagina-testa"><div class="eti">${eti}</div><h1>${titolo}</h1>${intro ? `<p class="p-grande">${intro}</p>` : ''}</section>`;
const ORARIO = `<div class="orario" data-orario>
    <div class="orario__giorni" role="tablist" aria-label="Giorni della settimana">
${[1, 2, 3, 4, 5, 6].map(g => `      <button type="button" role="tab" id="og-${g}" aria-controls="op-${g}" aria-selected="${g === 1}" data-g="${g}"><span class="solo-tel">${GBREVI[g]}</span><span class="solo-largo">${GNOMI[g]}</span></button>`).join('\n')}
    </div>
${[1, 2, 3, 4, 5, 6].map(g => `    <div class="orario__lista" role="tabpanel" id="op-${g}" aria-labelledby="og-${g}"${g === 1 ? '' : ' hidden'}>
${DATI.SCHEMA[g].map(([ora, tipo, chi]) => `      <a class="orario__riga" href="area/#orario" data-g="${g}" data-ora="${ora}"><b>${ora}</b><span class="cosa"><strong>${DATI.TIPI[tipo].nome}</strong><span>${DATI.ISTR[chi].nome} · 50 min</span></span><span class="vai">Prenota ›</span></a>`).join('\n')}
    </div>`).join('\n')}
    <p class="p2 orario__nota">Domenica chiuso. Si prenota fino a 14 giorni prima; annulli gratis fino a 12 ore prima.</p>
  </div>`;

const PAGINE = {};
// --- home: breve, invoglia e smista
PAGINE['index.html'] = pagina('index.html', 'Cento Respiri · Pilates reformer a Torino', 'Studio di pilates reformer a San Salvario, Torino: classi da sei, prima lezione gratuita, prenotazione dall\'app.', `
<section class="apertura wrap">
  <div class="apertura__foto">${foto('sito-apertura', '(max-width:1376px) 100vw, 1344px', '', true)}</div>
  <div class="apertura__sotto">
    <h1>Pilates reformer a Torino, in classi da sei.</h1>
    <div class="apertura__cta">
      <a class="btn" href="area/#prova">Prenota la prova gratuita</a>
      <div>San Salvario · prima lezione gratuita, senza impegno</div>
    </div>
  </div>
</section>
<section class="wrap oggi-studio" data-oggi-studio aria-live="polite" hidden></section>

<section class="fondo-carta" id="metodo">
  <div class="wrap sez metodo">
    <div class="metodo__testo">
      <div class="eti">Il metodo</div>
      <h2 class="h2">Perché cento respiri</h2>
      <p class="p-grande">Il Cento, <i>The Hundred</i>, è il primo esercizio della sequenza di Joseph Pilates. Sdraiati sulla schiena, testa e gambe sollevate, le braccia battono l'aria vicino ai fianchi: cinque battiti inspirando, cinque espirando. Dieci volte, cento battiti.</p>
      <p class="p-grande">Scalda il corpo e mette il respiro al centro. Da qui parte ogni nostra lezione, e da qui viene il nome.</p>
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

<section class="wrap sez vie" aria-label="Da dove partire">
  <a class="via" href="lezioni.html"><span class="eti">Lezioni</span><b>Cinque lezioni, un lettino a testa</b><span>Base, Intermedio, Avanzato, Prenatale e Tower. E le private, da soli o in coppia.</span><i aria-hidden="true">›</i></a>
  <a class="via" href="orario.html"><span class="eti">Orario</span><b>La settimana dello studio</b><span>Dalle 7:30 alle 20:35, sabato mattina. Vedi i posti liberi e prenoti il lettino.</span><i aria-hidden="true">›</i></a>
  <a class="via" href="istruttori.html"><span class="eti">Istruttori</span><b>Marta, Elena e Davide</b><span>Chi sono, come insegnano, con chi lavorano meglio. Sempre le stesse persone.</span><i aria-hidden="true">›</i></a>
</section>

<section class="fondo-carta">
  <div class="wrap sez prima" aria-labelledby="t-prima">
    <div class="testa"><div class="eti">La prima volta</div><h2 class="h2" id="t-prima">Mai visto un reformer? Funziona così</h2></div>
    <ol class="passi3">
      <li><b>1</b><h3>Prenoti la prova</h3><p>Gratis, in due minuti: scegli se è la prima volta, il giorno e l'ora. Nessun dato di pagamento.</p></li>
      <li><b>2</b><h3>Arrivi dieci minuti prima</h3><p>Ti mostriamo il lettino: carrello, molle, cinghie, poggiapiedi. Ti diamo noi le calze antiscivolo, se non le hai.</p></li>
      <li><b>3</b><h3>Cinquanta minuti, poi decidi</h3><p>Una lezione di Reformer Base con al massimo sei persone. Dopo, nessun obbligo: se ti è piaciuta scegli la formula con calma.</p></li>
    </ol>
  </div>
</section>

<section class="wrap sez recensioni" aria-labelledby="t-rec">
  <div class="testa-riga"><div class="testa"><div class="eti">Dicono di noi</div><h2 class="h2" id="t-rec">Chi viene, torna</h2></div><p class="p2 rec__nota">Recensioni di esempio · sito dimostrativo</p></div>
  <div class="rec__griglia">
${RECENSIONI.map(([t, chi]) => `    <figure class="rec"><div class="rec__stelle" aria-label="5 stelle su 5">★★★★★</div><blockquote>«${esc(t)}»</blockquote><figcaption>${chi}</figcaption></figure>`).join('\n')}
  </div>
</section>

<section class="fondo-sabbia">
  <div class="wrap sez assaggio">
    <div class="testa"><div class="eti">Prezzi</div><h2 class="h2">La prima è gratis. Poi scegli tu</h2></div>
    <ul class="assaggio__lista">
      <li><b>0 €</b><span>Prova gratuita</span></li>
      <li><b>da 25 €</b><span>a lezione con il carnet</span></li>
      <li><b>169 €</b><span>al mese, illimitato</span></li>
      <li><b>65 €</b><span>lezione privata</span></li>
    </ul>
    <div class="assaggio__link"><a class="link-freccia" href="prezzi.html">Tutti i prezzi ›</a><a class="link-freccia" href="regala.html">Regala una lezione ›</a></div>
  </div>
</section>`);

// --- lezioni: una scheda per lezione, con chi la tiene e quando
PAGINE['lezioni.html'] = pagina('lezioni.html', 'Lezioni · Cento Respiri', 'Le lezioni di pilates reformer di Cento Respiri a Torino: Base, Intermedio, Avanzato, Prenatale, Tower e lezioni private.', `
${testaPagina('Le lezioni', 'Cinque lezioni, un lettino a testa', '50 minuti, al massimo sei persone, sempre su prenotazione. Il lettino lo scegli tu.')}
<section class="wrap"><div class="r-vera" style="aspect-ratio:16/9;border-radius:24px">${foto('lezioni-alto', '(max-width:1376px) 100vw, 1344px', '', true)}</div></section>
<section class="fondo-carta"><div class="wrap sez trova-sez"><div class="testa"><div class="eti">Non sai da dove partire?</div><h2 class="h2">Quale lezione fa per te?</h2><p class="p2">Tre domande, un tocco ciascuna.</p></div><div class="trova" data-trova aria-live="polite"></div></div></section>
<section class="wrap sez lez-schede">
${Object.entries(DATI.TIPI).map(([k, t]) => {
  const chi = [...new Set(Object.values(DATI.SCHEMA).flat().filter(r => r[1] === k).map(r => r[2]))];
  return `  <article class="lez-scheda" id="${k}">
    <div class="lez-scheda__testa"><h2>${t.nome}</h2><span class="liv">${t.livTxt}</span></div>
    <dl>
      <div><dt>Per chi</dt><dd>${esc(LEZ_DETTAGLI[k].per)}</dd></div>
      <div><dt>Cosa si fa</dt><dd>${esc(LEZ_DETTAGLI[k].cosa)}</dd></div>
      <div><dt>Con</dt><dd>${chi.map(c => `<a href="istruttori.html#${c}">${DATI.ISTR[c].nome}</a>`).join(', ')}</dd></div>
      <div><dt>Quando</dt><dd>${righeSettimana(r => r[1] === k, r => r[0])}</dd></div>
    </dl>
    <a class="link-freccia" href="area/#orario">Prenota ${t.nome} ›</a>
  </article>`;
}).join('\n')}
</section>
<section class="fondo-carta">
  <div class="wrap sez privata-pag">
    <div class="r32">${foto('sito-lezioni', '(max-width:1000px) 100vw, 640px')}</div>
    <div class="testa"><div class="eti">Lezione privata</div><h2 class="h2">Un istruttore solo per te, o per voi due</h2><p class="p-grande">${esc(DATI.PRIVATE.sola.testo)}</p>
      <div class="privata__prezzi"><div><span>Da sola o da solo</span><b>${DATI.PRIVATE.sola.prezzo} €</b></div><div><span>In coppia</span><b>${DATI.PRIVATE.coppia.prezzo} €</b><small>45 € a testa</small></div></div>
      <a class="btn" href="area/#privata" style="align-self:flex-start">Prenota una privata</a></div>
  </div>
</section>`);

// --- orario
PAGINE['orario.html'] = pagina('orario.html', 'Orario · Cento Respiri', 'L\'orario della settimana di Cento Respiri, pilates reformer a Torino: lezioni dal lunedì al sabato, posti liberi e prenotazione del lettino.', `
${testaPagina('Orario', 'La settimana dello studio', 'Tocca una lezione per vedere i posti liberi e prenotare il lettino. Le lezioni di oggi già passate sono spente; la prossima ti dice tra quanto inizia.')}
<section class="wrap sez" style="padding-top:0">${ORARIO}</section>
<section class="fondo-carta"><div class="wrap sez legenda">
  <div><b>Prenoti fino a 14 giorni prima</b><span>Con carnet o mensile, dall'area clienti o dall'app.</span></div>
  <div><b>Annulli gratis fino a 12 ore prima</b><span>Dopo, l'ingresso viene scalato.</span></div>
  <div><b>Lezione piena?</b><span>Ti metti in lista d'attesa: se si libera un posto ti avvisiamo, o lo prendiamo per te.</span></div>
</div></section>`);

// --- istruttori: un profilo per persona, con le sue lezioni della settimana
PAGINE['istruttori.html'] = pagina('istruttori.html', 'Istruttori · Cento Respiri', 'Gli istruttori di Cento Respiri, pilates reformer a Torino: Marta Ferrero, Elena Sacco e Davide Rinaldi. Formazione, stile e lezioni della settimana.', `
${testaPagina('Gli istruttori', 'Tre persone, sempre le stesse', 'Si prenota con le persone, non con un orario. Qui trovi chi ti segue: come insegna, con chi lavora meglio e quando lo trovi in studio.')}
<nav class="wrap salta" aria-label="Istruttori">${Object.keys(PROFILI).map(k => `<a href="#${k}">${DATI.ISTR[k].nome}</a>`).join('')}</nav>
${Object.entries(PROFILI).map(([k, p], i) => `<section class="${i % 2 ? 'fondo-carta' : ''}" id="${k}" aria-labelledby="t-${k}">
  <div class="wrap sez profilo">
    <div class="r45">${foto(p.foto, '(max-width:1000px) 100vw, 560px')}</div>
    <div class="profilo__testo">
      <div class="eti">${p.ruolo}</div>
      <h2 class="h2" id="t-${k}">${DATI.ISTR[k].nome}</h2>
      <p class="profilo__dal">${p.dal}</p>
      <p class="p-grande">${esc(p.storia)}</p>
      <blockquote class="profilo__frase">«${esc(p.frase)}»</blockquote>
      <div class="profilo__griglia">
        <div><h3>Formazione</h3><ul>${p.formazione.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
        <div><h3>Lavora meglio con</h3><ul>${p.con.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
      </div>
      <div><h3>Come insegna</h3><p class="p2">${esc(p.stile)}</p></div>
      <div><h3>Le sue lezioni</h3>${righeSettimana(r => r[2] === k, r => `${r[0]} ${DATI.TIPI[r[1]].nome.replace('Reformer ', '')}`)}</div>
      <a class="link-freccia" href="area/#orario">Prenota con ${DATI.ISTR[k].breve} ›</a>
    </div>
  </div>
</section>`).join('\n')}`);

// --- prezzi
PAGINE['prezzi.html'] = pagina('prezzi.html', 'Prezzi · Cento Respiri', 'I prezzi di Cento Respiri, pilates reformer a Torino: prova gratuita, carnet da 5 e 10 ingressi, mensile illimitato, lezioni private.', `
${testaPagina('Prezzi', 'Quattro formule, nessuna quota d\'iscrizione', 'La prima lezione è gratuita. Poi scegli la formula con calma: si acquista in studio o dall\'app.')}
<section class="wrap sez prezzi" style="padding-top:0">
  <div class="prezzi__griglia">
    <div class="prezzo prezzo--prova">
      <h2>Prova gratuita</h2>
      <div class="cifra"><b>0 €</b></div>
      <p>Una lezione di Reformer Base o Prenatale. Una volta per persona.</p>
      <a class="btn btn--chiaro" href="area/#prova">Prenota la prova gratuita</a>
    </div>
${PREZZI.map(p => `    <div class="prezzo"><h2>${p.name}</h2><div class="cifra"><b>${p.price}</b><span>${p.unit}</span></div><p>${p.text}</p><div class="nota">${p.note}</div></div>`).join('\n')}
  </div>
  <div class="privata">
    <div class="testa"><div class="eti">Lezione privata</div><h2 class="h3">Un istruttore solo per te, o per voi due</h2><p class="p2">${esc(DATI.PRIVATE.sola.testo)}</p></div>
    <div class="privata__prezzi">
      <div><span>Da sola o da solo</span><b>${DATI.PRIVATE.sola.prezzo} €</b></div>
      <div><span>In coppia</span><b>${DATI.PRIVATE.coppia.prezzo} €</b><small>45 € a testa</small></div>
      <a class="link-freccia" href="area/#privata">Prenota una privata ›</a>
    </div>
  </div>
</section>
<section class="wrap sez conviene" data-conviene aria-live="polite" style="padding-top:0">
  <div class="testa"><div class="eti">Fai due conti</div><h2 class="h2">Quale formula ti conviene?</h2><p class="p2">Quante volte a settimana pensi di venire?</p></div>
  <div class="conv__scelte" role="group" aria-label="Lezioni a settimana"><button type="button" data-volte="1" aria-pressed="false">1<small>volta</small></button><button type="button" data-volte="2" aria-pressed="false">2<small>volte</small></button><button type="button" data-volte="3" aria-pressed="false">3<small>volte</small></button><button type="button" data-volte="4" aria-pressed="false">4<small>volte</small></button></div>
  <div data-esito></div>
</section>
<section class="fondo-carta"><div class="wrap sez legenda">
  <div><b>Annulli gratis fino a 12 ore prima</b><span>Dopo, l'ingresso del carnet viene scalato.</span></div>
  <div><b>Validità</b><span>Carnet 5: due mesi. Carnet 10: quattro mesi. Il mensile si rinnova ogni mese e si disdice quando vuoi.</span></div>
  <div><b>Da regalare</b><span>Carnet, mensile e lezioni private diventano un biglietto con codice. <a href="regala.html">Regala una lezione</a></span></div>
</div></section>`);

// --- regala
PAGINE['regala.html'] = pagina('regala.html', 'Regala una lezione · Cento Respiri', 'Regala una lezione di pilates reformer a Torino: carnet, mese illimitato o lezione privata, con biglietto da stampare e codice.', `
${testaPagina('Regala una lezione', 'Cento respiri in regalo', 'Scegli cosa regalare e scrivi una dedica: ti prepariamo il biglietto da stampare o da mandare. Chi lo riceve inserisce il codice nell\'area clienti o nell\'app.')}
<section class="wrap sez regala" data-regala style="padding-top:0">
  <div class="regala__scelte" role="radiogroup" aria-label="Cosa regalare">
${Object.entries(DATI.REGALI).map(([k, r], i) => `    <button type="button" role="radio" aria-checked="${i === 0}" data-regalo="${k}"><b>${r.nome}</b><span>${r.prezzo} €</span><small>${esc(r.testo)}</small></button>`).join('\n')}
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
</section>`);

// --- lo studio: foto, come arrivare, contatti, social
PAGINE['studio.html'] = pagina('studio.html', 'Lo studio · Cento Respiri', 'Lo studio Cento Respiri a San Salvario, Torino: una sala con sei reformer e una Tower, come arrivare, orari e contatti.', `
${testaPagina('Lo studio', 'Una sola sala, a piano terra', 'Una vetrina in legno in una via tranquilla di San Salvario. Sei reformer, una Tower, finestre alte e luce naturale. Spogliatoio con doccia, armadietti, calze antiscivolo per chi le dimentica.')}
<section class="wrap"><div class="studio__foto">${foto('sito-studio', '(max-width:1376px) 100vw, 1344px', '', true)}</div></section>
<section class="wrap sez" style="padding-bottom:clamp(40px,6vw,80px)">
  <!-- griglia ferma (niente scorrimento laterale: su telefono non può "bloccare" la pagina) -->
  <div class="galleria" aria-label="Foto dello studio">
${STRISCIA.map(id => `    <figure class="r-vera" style="aspect-ratio:3/2">${foto(id, '(max-width:700px) 100vw, 660px')}</figure>`).join('\n')}
  </div>
</section>
<section class="wrap sez servizi" aria-labelledby="t-servizi" style="padding-top:0">
  <div class="testa-riga"><div class="testa"><div class="eti">Prima e dopo la lezione</div><h2 class="h2" id="t-servizi">Arrivi, ti cambi, respiri</h2></div><p class="p2">Armadietti con chiave, doccia, asciugamani e calze antiscivolo: porti solo te stessa o te stesso.</p></div>
  <div class="servizi__griglia">
    <figure><div class="r-vera" style="aspect-ratio:1920/1040">${foto('studio-spogliatoio', '(max-width:900px) 100vw, 440px')}</div><figcaption>Spogliatoio con armadietti</figcaption></figure>
    <figure><div class="r-vera" style="aspect-ratio:3/2">${foto('studio-doccia', '(max-width:900px) 100vw, 440px')}</div><figcaption>Doccia, prodotti inclusi</figcaption></figure>
    <figure><div class="r-vera" style="aspect-ratio:3/2">${foto('studio-dettaglio', '(max-width:900px) 100vw, 440px')}</div><figcaption>Asciugamani per tutti</figcaption></figure>
  </div>
</section>
<section class="fondo-carta" id="dove">
  <div class="wrap sez dove">
    <div class="mappa">${MAPPA}</div>
    <div class="dove__info">
      <div class="testa"><div class="eti">Dove siamo</div><h2 class="h2">Via delle Filande 7, Torino</h2><p class="p2">San Salvario, ingresso su strada. Metro Nizza a 5 minuti a piedi, Porta Nuova a 10. Biciclette nel cortile.</p></div>
      <div class="eti eti--grigia" style="margin-bottom:-16px">Orari</div>
      <dl class="orari">
        <div><dt>Lunedì – venerdì</dt><dd>7:00 – 21:30</dd></div>
        <div><dt>Sabato</dt><dd>9:00 – 13:00</dd></div>
        <div><dt>Domenica</dt><dd>chiuso</dd></div>
      </dl>
      <div class="contatti"><div><span class="eti eti--grigia">Scrivici</span><b>ciao@centorespiri.it</b></div><div><span class="eti eti--grigia">Chiamaci</span><b>+39 011 000 0000</b></div></div>
    </div>
  </div>
</section>
<section class="wrap sez seguici" aria-labelledby="t-seguici">
  <div class="testa"><div class="eti">Seguici</div><h2 class="h2" id="t-seguici">Un esercizio a settimana, sui social</h2><p class="p2">Ogni lunedì un esercizio da fare a casa spiegato da Marta, Elena o Davide, e le novità dell'orario.</p></div>
  <ul class="seguici__lista">
    <li><b>Instagram</b><span>@centorespiri.demo · esercizi e storie dallo studio</span></li>
    <li><b>Facebook</b><span>Cento Respiri Torino · eventi e workshop</span></li>
    <li><b>YouTube</b><span>Cento Respiri · il Cento spiegato passo per passo</span></li>
  </ul>
  <p class="p2 rec__nota">Profili di esempio: lo studio è di fantasia, i link non portano a pagine reali.</p>
</section>`);

// --- domande
PAGINE['domande.html'] = pagina('domande.html', 'Domande frequenti · Cento Respiri', 'Domande frequenti su Cento Respiri, pilates reformer a Torino: prima lezione, cosa portare, certificato, annullamenti, gravidanza, app.', `
${testaPagina('Domande frequenti', 'Prima di venire', '')}
<section class="wrap sez faq" style="padding-top:0">
  <div class="faq__elenco">
${FAQ.map(([q, a]) => `    <details><summary>${q}</summary><p>${esc(a)}</p></details>`).join('\n')}
  </div>
  <p class="p2">Non trovi la risposta? Scrivici a ciao@centorespiri.it o chiamaci: rispondiamo in giornata.</p>
</section>`);

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
for (const [file, html] of Object.entries(PAGINE)) fs.writeFileSync(path.join(ROOT, file), html);
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
