// Cento Respiri — dati dello studio condivisi da app (browser) e sito (_build/build.js).
// Modificare l'orario qui, poi node _build/build.js.
(function (root) {
  const ISTR = {
    marta: { nome: 'Marta Ferrero', breve: 'Marta', iniz: 'MF', bio: 'Fondatrice, insegna dal 2011', f: 'a' },
    elena: { nome: 'Elena Sacco', breve: 'Elena', iniz: 'ES', bio: 'Fisioterapista, Base e Prenatale', f: 'a' },
    davide: { nome: 'Davide Rinaldi', breve: 'Davide', iniz: 'DR', bio: 'Ex danzatore classico', f: 'o' },
  };
  const TIPI = {
    base: { nome: 'Reformer Base', liv: 1, livTxt: 'Livello base · molle leggere', desc: 'Per iniziare o ricominciare. Posizioni semplici, tanto lavoro sul respiro, l\'istruttore ti spiega il lettino.' },
    intermedio: { nome: 'Reformer Intermedio', liv: 2, livTxt: 'Livello intermedio · molle medie', desc: 'Serie complete in piedi e in ginocchio sul carrello, controllo del respiro. Per chi ha almeno dieci lezioni alle spalle.' },
    avanzato: { nome: 'Reformer Avanzato', liv: 3, livTxt: 'Livello avanzato · transizioni senza pause', desc: 'Sequenze lunghe, equilibrio e lavoro in piedi. Su indicazione dell\'istruttore.' },
    prenatale: { nome: 'Prenatale', liv: 1, livTxt: 'Dal 2° trimestre · molle leggere', desc: 'Mobilità, respiro e pavimento pelvico. Serve il via libera del ginecologo.' },
    tower: { nome: 'Tower', liv: 0, livTxt: 'Tutti i livelli · lavoro a parete', desc: 'Molle e barra a parete: allungamento e forza per la schiena.' },
  };
  // orario settimanale (0 = domenica, chiuso). Lezioni da 50 minuti; lo studio chiude alle 21:30.
  const SCHEMA = {
    1: [['07:30', 'base', 'marta'], ['12:30', 'base', 'elena'], ['18:30', 'tower', 'davide'], ['19:45', 'intermedio', 'marta'], ['20:35', 'avanzato', 'davide']],
    2: [['07:30', 'base', 'elena'], ['09:00', 'prenatale', 'elena'], ['12:30', 'intermedio', 'marta'], ['18:30', 'base', 'marta'], ['19:45', 'intermedio', 'marta'], ['20:35', 'avanzato', 'davide']],
    3: [['07:30', 'intermedio', 'marta'], ['12:30', 'base', 'elena'], ['18:30', 'tower', 'davide'], ['19:45', 'base', 'elena'], ['20:35', 'intermedio', 'davide']],
    4: [['07:30', 'base', 'marta'], ['09:00', 'prenatale', 'elena'], ['12:30', 'base', 'elena'], ['18:30', 'tower', 'davide'], ['19:45', 'intermedio', 'marta'], ['20:35', 'avanzato', 'davide']],
    5: [['07:30', 'base', 'elena'], ['12:30', 'base', 'marta'], ['18:30', 'intermedio', 'marta'], ['19:45', 'avanzato', 'davide']],
    6: [['09:00', 'base', 'elena'], ['10:00', 'intermedio', 'elena'], ['11:15', 'tower', 'davide']],
    0: [],
  };
  // lezioni private: solo negli spazi in cui la sala è libera (nessuna lezione di gruppo), 50 minuti
  const PRIVATE = {
    sola: { nome: 'Lezione privata', breve: 'Da sola o da solo', prezzo: 65, testo: 'Un istruttore solo per te: programma su misura, ideale per iniziare, dopo un infortunio o per preparare il livello successivo.' },
    coppia: { nome: 'Privata in coppia', breve: 'In due', prezzo: 90, testo: 'Due lettini, un istruttore: per allenarsi con un\'amica o col partner. 45 € a testa.' },
  };
  const SLOT_PRIVATE = { 1: ['10:15', '11:15', '14:00', '15:00', '16:00', '17:15'], 2: ['10:15', '11:15', '14:00', '15:00', '16:00', '17:15'], 3: ['10:15', '11:15', '14:00', '15:00', '16:00', '17:15'], 4: ['10:15', '11:15', '14:00', '15:00', '16:00', '17:15'], 5: ['10:15', '11:15', '14:00', '15:00', '16:00', '17:15'], 6: [], 0: [] };
  // carte regalo
  const REGALI = {
    prova: { nome: 'Lezione privata', prezzo: 65, testo: 'Una lezione 1 a 1 con un istruttore, da prenotare quando vuole.', ingressi: 0, privata: 1 },
    carnet5: { nome: 'Carnet 5 ingressi', prezzo: 135, testo: 'Cinque lezioni di gruppo sul reformer, valide due mesi dalla prima.', ingressi: 5, privata: 0 },
    mensile: { nome: 'Un mese illimitato', prezzo: 169, testo: 'Tutte le lezioni per trenta giorni, dal giorno in cui lo attiva.', ingressi: 0, privata: 0, mensile: 1 },
  };
  const dati = { ISTR, TIPI, SCHEMA, PRIVATE, SLOT_PRIVATE, REGALI };
  if (typeof module !== 'undefined' && module.exports) module.exports = dati;
  else root.CR_DATI = dati;
})(typeof window !== 'undefined' ? window : this);
