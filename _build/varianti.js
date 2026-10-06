// Prepara le foto per il web:
// 1) ricomprime le foto in assets/foto (qualità 80, max 2048 px): gli originali restano in design-source/foto-originali
// 2) crea le versioni ridotte da 480, 800 e 1400 px per il srcset
// Uso: node _build/varianti.js   — poi node _build/build.js
const fs = require('fs');
const path = require('path');
let sharp;
for (const p of ['sharp', 'C:/Users/CLAUDE~1/AppData/Local/Temp/claude/node_modules/sharp']) { try { sharp = require(p); break; } catch (e) { /* prossimo */ } }
if (!sharp) { console.error('sharp non trovato: npm i sharp'); process.exit(1); }
sharp.cache(false); // su Windows la cache tiene aperti i file e impedisce di sovrascriverli

const dir = path.join(__dirname, '..', 'assets', 'foto');
const SIZES = [480, 800, 1400];
const MARK = path.join(dir, '.compresse.json'); // foto già ricompresse (per non rifarlo a ogni giro)
const done = fs.existsSync(MARK) ? JSON.parse(fs.readFileSync(MARK, 'utf8')) : {};
(async () => {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.webp'))) {
    const src = path.join(dir, f);
    const st = fs.statSync(src);
    if (done[f] !== st.size) {
      const buf = await sharp(fs.readFileSync(src)).resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      if (buf.length < st.size) fs.writeFileSync(src, buf);
      done[f] = fs.statSync(src).size;
      console.log('ricompressa:', f, Math.round(st.size / 1024) + ' → ' + Math.round(done[f] / 1024) + ' KB');
    }
    for (const w of SIZES) {
      const d = path.join(dir, String(w)); fs.mkdirSync(d, { recursive: true });
      const dst = path.join(d, f);
      if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) continue;
      await sharp(fs.readFileSync(src)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dst);
    }
  }
  fs.writeFileSync(MARK, JSON.stringify(done, null, 1));
  console.log('varianti 480/800/1400 pronte');
})();
