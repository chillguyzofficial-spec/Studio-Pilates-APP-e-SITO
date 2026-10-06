// Cento Respiri — sito: striscia foto dello studio (frecce + contatore)
document.querySelectorAll('[data-striscia]').forEach(s => {
  const track = s.querySelector('.striscia__track'), items = [...track.children];
  const conta = s.querySelector('[data-conta]'), [prev, next] = s.querySelectorAll('button');
  const attuale = () => { const x = track.scrollLeft; let i = 0, d = 1e9; items.forEach((el, k) => { const dd = Math.abs(el.offsetLeft - track.offsetLeft - x); if (dd < d) { d = dd; i = k; } }); return i; };
  const fine = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  const agg = () => { const i = fine() ? items.length - 1 : attuale(); conta.textContent = (i + 1) + ' / ' + items.length; prev.disabled = track.scrollLeft < 4; next.disabled = fine(); };
  s.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const i = Math.max(0, Math.min(items.length - 1, attuale() + +b.dataset.dir));
    track.scrollTo({ left: items[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }));
  track.addEventListener('scroll', () => requestAnimationFrame(agg), { passive: true });
  addEventListener('resize', agg); agg();
});

// orario della settimana: si apre sul giorno di oggi; ogni lezione porta alla sua prossima data nell'app
document.querySelectorAll('[data-orario]').forEach(o => {
  const tabs = [...o.querySelectorAll('[role=tab]')];
  const apri = g => tabs.forEach(t => {
    const on = t.dataset.g === String(g);
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => apri(t.dataset.g));
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return;
      const n = tabs[(i + k + tabs.length) % tabs.length]; apri(n.dataset.g); n.focus();
    });
  });
  const oggi = new Date().getDay();
  apri(oggi === 0 ? 1 : oggi);
  const pad = n => String(n).padStart(2, '0');
  o.querySelectorAll('.orario__riga').forEach(a => {
    const g = +a.dataset.g, [h, m] = a.dataset.ora.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    let diff = (g - d.getDay() + 7) % 7;
    if (diff === 0 && d <= new Date()) diff = 7; // già iniziata oggi: la settimana prossima
    d.setDate(d.getDate() + diff);
    a.href = `area/#lezione/${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(h)}${pad(m)}`;
  });
});

// menu da telefono: pannello sotto la testata, scroll bloccato solo su <html> (sul body romperebbe la testata sticky)
(() => {
  const btn = document.querySelector('.menu-btn'), pan = document.getElementById('menu-tel'), head = document.querySelector('.header');
  if (!btn || !pan) return;
  const chiudi = (focus) => { pan.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; document.documentElement.style.overflow = ''; if (focus) btn.focus({ preventScroll: true }); };
  btn.addEventListener('click', () => {
    if (!pan.hidden) return chiudi(false);
    document.documentElement.style.setProperty('--alto-testata', head.getBoundingClientRect().bottom + 'px');
    pan.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Chiudi';
    document.documentElement.style.overflow = 'hidden';
  });
  pan.addEventListener('click', e => { if (e.target.closest('a')) chiudi(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !pan.hidden) chiudi(true); });
  addEventListener('resize', () => { if (innerWidth >= 1240 && !pan.hidden) chiudi(false); });
})();

// menu su PC: si evidenzia la sezione in cui ci si trova
(() => {
  const links = [...document.querySelectorAll('.header nav a.solo-pc')];
  const sez = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sez.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('attiva', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sez.forEach(s => io.observe(s));
})();

// "Respira con noi": cento battiti, cinque inspirando e cinque espirando, mezzo secondo l'uno (si avvia solo a tocco)
document.querySelectorAll('[data-battiti]').forEach(box => {
  const barre = [...box.querySelectorAll('.battiti__barre span')], dida = box.querySelector('.battiti__dida'), btn = box.querySelector('.battiti__btn');
  const testo0 = dida.textContent, btn0 = btn.textContent;
  let t = null, i = 0;
  const ferma = (fine) => {
    clearInterval(t); t = null; box.classList.remove('va');
    barre.forEach(b => b.classList.remove('fatto', 'ora'));
    dida.textContent = fine ? 'Cento battiti. Così comincia ogni lezione.' : testo0;
    btn.textContent = fine ? 'Ancora una volta' : btn0;
  };
  const passo = () => {
    if (i >= barre.length) return ferma(true);
    barre.forEach((b, k) => { b.classList.toggle('fatto', k <= i); b.classList.toggle('ora', k === i); });
    const respiro = Math.floor(i / 10) + 1, dentro = i % 10 < 5;
    dida.textContent = `${dentro ? 'Inspira' : 'Espira'} · respiro ${respiro} di 10 · ${i + 1}/100`;
    i++;
  };
  btn.addEventListener('click', () => {
    if (t) return ferma(false);
    i = 0; box.classList.add('va'); btn.textContent = 'Ferma';
    passo(); t = setInterval(passo, 500);
  });
});

// orario vivo: nella giornata di oggi le lezioni passate si spengono, la prossima dice tra quanto inizia
(() => {
  const agg = () => {
    const ora = new Date(), g = ora.getDay();
    let prossima = null;
    document.querySelectorAll('.orario__riga').forEach(a => {
      a.classList.remove('passata'); const v = a.querySelector('.vai'); v.textContent = 'Prenota ›';
      const tra = a.querySelector('.tra'); if (tra) tra.remove();
      if (+a.dataset.g !== g) return;
      const [h, m] = a.dataset.ora.split(':').map(Number), inizio = new Date(); inizio.setHours(h, m, 0, 0);
      if (inizio <= ora) { a.classList.add('passata'); v.textContent = inizio.getTime() + 50 * 60e3 > ora ? 'In corso' : 'Conclusa'; }
      else if (!prossima) prossima = { a, min: Math.round((inizio - ora) / 60e3) };
    });
    if (prossima) {
      const s = document.createElement('span'); s.className = 'tra';
      s.textContent = prossima.min < 60 ? `tra ${prossima.min} min` : `tra ${Math.floor(prossima.min / 60)} h ${prossima.min % 60 ? (prossima.min % 60) + ' min' : ''}`.trim();
      prossima.a.querySelector('strong').append(s);
    }
  };
  if (document.querySelector('.orario__riga')) { agg(); setInterval(agg, 60e3); }
})();

// popup "Scarica l'app": dopo l'apertura, chiudibile (non torna per 7 giorni), mai con il menu aperto o con l'app già installata.
// Niente lavoro durante lo scorrimento: un IntersectionObserver avvisa quando si supera l'apertura, e il popup
// compare cambiando solo opacità e posizione (classe .su), così il browser non rifà l'impaginazione della pagina.
(() => {
  const pop = document.getElementById('pop-app');
  if (!pop || matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
  const KEY = 'cr-pop-app-chiuso', SETTE = 7 * 864e5;
  try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < SETTE) return; } catch (e) { /* niente memoria: si mostra */ }
  const qr = pop.querySelector('.pop-app__qr');
  if (qr && window.qrcode) { try { const q = qrcode(0, 'M'); q.addData(new URL('app/', location.href).href); q.make(); qr.innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); } catch (e) { /* niente */ } }
  const menu = document.getElementById('menu-tel');
  let oltre = false, menuAperto = false, visibile = null;
  const aggiorna = () => {
    const v = oltre && !menuAperto;
    if (v === visibile) return; // cambia stato solo quando serve
    visibile = v; pop.classList.toggle('su', v); pop.setAttribute('aria-hidden', String(!v)); pop.inert = !v;
  };
  pop.hidden = false; aggiorna(); // pronto ma invisibile
  // sentinella: l'apertura, o una riga invisibile a 400 px nelle pagine senza apertura
  let sentinella = document.querySelector('.apertura');
  if (!sentinella) { sentinella = document.createElement('div'); sentinella.style.cssText = 'position:absolute;top:400px;left:0;width:1px;height:1px;pointer-events:none'; sentinella.setAttribute('aria-hidden', 'true'); document.body.appendChild(sentinella); }
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { oltre = !e.isIntersecting && e.boundingClientRect.top < 0; aggiorna(); }).observe(sentinella);
  if (menu) new MutationObserver(() => { menuAperto = !menu.hidden; aggiorna(); }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  pop.querySelector('.pop-app__x').addEventListener('click', () => {
    pop.hidden = true;
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* niente */ }
  });
})();

// regala una lezione: scelta, dedica, biglietto con codice (salvato su questo dispositivo per poterlo usare nell'app)
document.querySelectorAll('[data-regala]').forEach(box => {
  const scelte = [...box.querySelectorAll('[data-regalo]')], out = box.querySelector('#biglietto');
  let tipo = scelte[0].dataset.regalo;
  scelte.forEach(b => b.addEventListener('click', () => { tipo = b.dataset.regalo; scelte.forEach(x => x.setAttribute('aria-checked', x === b)); }));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  box.querySelector('[data-crea-regalo]').addEventListener('click', () => {
    const per = box.querySelector('#rg-per').value.trim(), da = box.querySelector('#rg-da').value.trim(), dedica = box.querySelector('#rg-dedica').value.trim();
    const scelto = scelte.find(b => b.dataset.regalo === tipo);
    const codice = 'CR-REGALO-' + String(Math.floor(1000 + Math.random() * 9000));
    try { const l = JSON.parse(localStorage.getItem('cr-regali') || '[]'); l.push({ codice, tipo, per, da, usato: false, il: Date.now() }); localStorage.setItem('cr-regali', JSON.stringify(l)); } catch (e) { /* niente memoria: il biglietto resta valido solo da stampare */ }
    const marchio = (document.querySelector('.logo svg') || {}).outerHTML || '';
    out.innerHTML = `<div class="biglietto__carta">${marchio.replace(/#2B2620/g, '#F3EEE5').replace(/#6A2C2E/g, '#F3EEE5')}
      <div class="eti">Cento Respiri · un regalo per ${esc(per || 'te')}</div>
      <h3>${esc(scelto.querySelector('b').textContent)}</h3>
      <p>${esc(scelto.querySelector('small').textContent)}</p>
      ${dedica ? `<p><i>«${esc(dedica)}»</i></p>` : ''}
      ${da ? `<p>Da ${esc(da)}</p>` : ''}
      <div class="biglietto__codice">${codice}</div>
      <p style="font-size:14px">Si usa nell'area clienti o nell'app, sezione Carnet. Via delle Filande 7, Torino · studio dimostrativo.</p></div>
      <div class="biglietto__azioni"><button type="button" data-stampa>Stampa</button><button type="button" data-copia="${codice}">Copia il codice</button></div>`;
    out.hidden = false;
    out.querySelector('[data-stampa]').addEventListener('click', () => print());
    out.querySelector('[data-copia]').addEventListener('click', e => { const t = e.currentTarget; (navigator.clipboard ? navigator.clipboard.writeText(codice) : Promise.reject()).then(() => { t.textContent = 'Copiato'; }, () => { t.textContent = codice; }); });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  });
});

// mappa vera dello studio (pagina "Lo studio"): OpenStreetMap con Leaflet.
// Su telefono non si trascina col dito e nessuna rotella la cattura: non può "bloccare" lo scorrimento della pagina.
(() => {
  const box = document.getElementById('mappa-vera');
  if (!box) return;
  // Leaflet si scarica solo quando la mappa sta per entrare nello schermo: la pagina si apre più leggera
  const carica = () => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; css.crossOrigin = 'anonymous'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; js.crossOrigin = 'anonymous'; js.onload = avvia; document.head.appendChild(js); // senza rete resta la mappa illustrata
  };
  // si carica quando il telefono è libero (dopo l'apertura, non mentre si scorre); se arrivi prima alla mappa, subito
  let fatto = false;
  const una = () => { if (!fatto) { fatto = true; carica(); } };
  const libero = window.requestIdleCallback || (f => setTimeout(f, 1200));
  addEventListener('load', () => libero(una, { timeout: 4000 }), { once: true });
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); una(); } }, { rootMargin: '300px 0px' }); io.observe(box); }
  function avvia() {
  const L = window.L, tocco = matchMedia('(pointer: coarse)').matches;
  box.innerHTML = '';
  box.classList.add('mappa--vera');
  const ZONA = [45.0553, 7.6788];          // San Salvario, tra metro Nizza e Largo Saluzzo
  const NIZZA = [45.05173, 7.674766];      // stazione metro Nizza (Wikipedia)
  const PORTA_NUOVA = [45.0622, 7.6786];   // stazione di Torino Porta Nuova
  const mappa = L.map(box, { center: ZONA, zoom: 15, scrollWheelZoom: false, dragging: !tocco, tap: false, zoomControl: true, attributionControl: false });
  L.control.attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' }).addTo(mappa);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mappa);
  L.circle(ZONA, { radius: 260, color: '#6A2C2E', weight: 2, fillColor: '#6A2C2E', fillOpacity: .18 }).addTo(mappa)
    .bindTooltip('<b>Cento Respiri</b><br>zona San Salvario', { permanent: true, direction: 'top', className: 'mappa__etichetta', offset: [0, -8] });
  const punto = (pos, lettera, nome) => L.marker(pos, { icon: L.divIcon({ className: 'mappa__punto', html: `<span>${lettera}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }), keyboard: false, title: nome })
    .addTo(mappa).bindTooltip(nome, { direction: 'right', offset: [14, 0], className: 'mappa__nome' });
  punto(NIZZA, 'M', 'Metro Nizza · 5 minuti a piedi');
  punto(PORTA_NUOVA, 'FS', 'Stazione Porta Nuova · 10 minuti');
  mappa.fitBounds(L.latLngBounds([NIZZA, PORTA_NUOVA, ZONA]).pad(0.25));
  if (tocco) box.insertAdjacentHTML('beforeend', '<p class="mappa__aiuto">Usa + e − per lo zoom</p>');
  }
})();
