// Pravidla rozvrhu. Přidat předmět nebo třídu = přidat jeden objekt.
//
// kind:
//   "once" – přepnutí na předmět 3.E platí jen pro aktuálně zobrazený týden
//   "alt"  – střídavé: první přepnutí = 3.E v tomhle týdnu a každém druhém,
//            přepnutí i v druhém týdnu = pryč úplně (3.E vždy)
// groups:  předmět se dělí na skupiny (SCh1/SCh2); výchozí je skupina 1,
//          „přehodit na skupinu 2“ platí jen pro jeden týden
// match:   funkce (atom) => boolean; atom = { abbr, text, group, room, teacher }
const has = (a, re) => re.test(a.text) || re.test(a.abbr);

window.ROZVRH_CONFIG = {
  base: { id: "WF", label: "3.E" },
  overlays: [
    // 6.E
    { id: "mat",       classId: "W5", label: "6.E", name: "Matematika",
      kind: "once", color: "#2f6fde",
      match: (a) => has(a, /matemat/i) && !has(a, /prakti|semin|cvi[cč]en/i) },
    { id: "mat-prakt", classId: "W5", label: "6.E", name: "Praktika z matematiky",
      kind: "alt", color: "#2f6fde",
      match: (a) => has(a, /prakti/i) && has(a, /matemat/i) },
    // 7.E
    { id: "fyz",       classId: "W4", label: "7.E", name: "Fyzika",
      kind: "once", color: "#0e8f6e",
      match: (a) => has(a, /fyzik/i) && !has(a, /prakti|semin|cvi[cč]en/i) },
    { id: "fyz-prakt", classId: "W4", label: "7.E", name: "Praktika z fyziky",
      kind: "alt", color: "#0e8f6e",
      match: (a) => has(a, /prakti/i) && has(a, /fyzik/i) },
    { id: "che-sem",   classId: "W4", label: "7.E", name: "Seminář z chemie",
      kind: "alt", groups: true, color: "#c4571a",
      match: (a) => a.abbr === "SCh" || /semin.*chemi/i.test(a.text) },
  ],
};
