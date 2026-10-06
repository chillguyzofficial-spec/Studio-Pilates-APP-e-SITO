// Genera le icone dell'app (PWA, apple-touch-icon, favicon) dal marchio a cento tacche.
// Uso: node _build/icone.js
const fs = require('fs');
const path = require('path');
let sharp;
for (const p of ['sharp', 'C:/Users/CLAUDE~1/AppData/Local/Temp/claude/node_modules/sharp']) { try { sharp = require(p); break; } catch (e) { /* prossimo */ } }
if (!sharp) { console.error('sharp non trovato: npm i sharp'); process.exit(1); }
sharp.cache(false);

const out = path.join(__dirname, '..', 'assets', 'icone');
fs.mkdirSync(out, { recursive: true });
// quadrante: 100 tacche, ogni decima più lunga e più spessa
function tacche(color, scala) {
  let s = '';
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2 - Math.PI / 2, long = i % 10 === 0;
    const r1 = long ? 30 : 39, r2 = 47, f = n => +n.toFixed(2);
    s += `<line x1="${f(50 + r1 * Math.cos(a))}" y1="${f(50 + r1 * Math.sin(a))}" x2="${f(50 + r2 * Math.cos(a))}" y2="${f(50 + r2 * Math.sin(a))}" stroke-width="${(long ? 2.2 : 1.1) * scala}"/>`;
  }
  return `<g fill="none" stroke="${color}" stroke-linecap="round">${s}</g>`;
}
// quadrato pieno Barolo (iOS e Android arrotondano da soli), marchio al centro
const icona = (lato, quota, scala) => {
  const m = (1 - quota) / 2 * 100;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lato}" height="${lato}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#6A2C2E"/><g transform="translate(${m} ${m}) scale(${quota})">${tacche('#F3EEE5', scala)}</g></svg>`);
};
(async () => {
  for (const [nome, lato, quota, scala] of [['icona-180', 180, .74, 1.2], ['icona-192', 192, .74, 1.2], ['icona-512', 512, .74, 1], ['icona-maskable-512', 512, .6, 1.1], ['favicon-32', 32, .86, 2.2]]) {
    await sharp(icona(lato, quota, scala)).png().toFile(path.join(out, nome + '.png'));
  }
  console.log('icone pronte in assets/icone');
})();
