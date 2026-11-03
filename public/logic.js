// Čistá logika skládání rozvrhu (bez DOM), aby šla testovat i v Node.
(function (root) {
  const DAYS = 5;

  function isoWeek(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    const dayNr = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - dayNr + 3);
    const firstThu = t.valueOf();
    t.setUTCMonth(0, 1);
    if (t.getUTCDay() !== 4) t.setUTCMonth(0, 1 + ((4 - t.getUTCDay() + 7) % 7));
    return 1 + Math.ceil((firstThu - t) / 604800000);
  }

  function fallbackMonday(term, now = new Date()) {
    const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
    if (term === "Next") t.setUTCDate(t.getUTCDate() + 7);
    return t.toISOString().slice(0, 10);
  }

  const groupNum = (g) => {
    const m = /(\d+)\s*$/.exec(g || "");
    return m ? +m[1] : 1;
  };

  function buildGrid(config, termData, state) {
    const cls = termData.classes;
    const base = cls[config.base.id];
    if (!base) throw new Error("Chybí data třídy " + config.base.label);
    const weekKey = base.monday || fallbackMonday(termData.term);
    const parity = isoWeek(weekKey) % 2 === 0 ? "even" : "odd";
    const alt = state.alt || {};
    const once = state.once || {};

    // časy hodin = sjednocení všech tříd
    const names = {};
    const keys = new Set();
    for (const c of Object.values(cls)) {
      for (const h of c.hours || []) names[h.begin] = h;
      for (const d of c.days) Object.keys(d.slots).forEach((k) => keys.add(k));
    }
    let hourKeys = [...keys].sort();

    const days = [];
    for (let di = 0; di < DAYS; di++) {
      const bd = base.days[di] || { slots: {}, abbr: "", date: "" };
      const cells = {};
      for (const key of hourKeys) {
        const baseAtoms = bd.slots[key] || [];
        let found = null;
        for (const rule of config.overlays) {
          const c = cls[rule.classId];
          if (!c || !c.days[di]) continue;
          let atoms = (c.days[di].slots[key] || []).filter((a) => !a.removed && rule.match(a));
          if (rule.groups) {
            const g = once[`${weekKey}|${rule.id}|all`] === "group2" ? 2 : 1;
            atoms = atoms.filter((a) => groupNum(a.group) === g);
          }
          if (atoms.length) { found = { rule, atoms }; break; }
        }
        const cell = { key, base: baseAtoms, over: null, hidden: false, slotKey: null, group2: false };
        if (found) {
          const { rule } = found;
          cell.over = found;
          cell.slotKey = `${rule.id}|${di}|${key}`;
          cell.group2 = !!rule.groups && once[`${weekKey}|${rule.id}|all`] === "group2";
          const altHidden = !!(alt[cell.slotKey] && alt[cell.slotKey][parity]);
          const onceHidden = once[`${weekKey}|${cell.slotKey}`] === "base";
          cell.hidden = rule.kind === "once" ? onceHidden : altHidden || onceHidden;
        }
        cells[key] = cell;
      }
      days.push({ abbr: bd.abbr, date: bd.date, off: bd.off, offName: bd.offName, cells });
    }

    // ořež prázdné řádky na začátku a konci
    const used = (key) => days.some((d) => {
      const c = d.cells[key];
      return c.base.length || c.over;
    });
    const filled = hourKeys.filter(used);
    if (filled.length) {
      hourKeys = hourKeys.filter((k) => k >= filled[0] && k <= filled[filled.length - 1]);
    }
    const hours = hourKeys.map((k) => ({ key: k, caption: names[k]?.caption ?? "", end: names[k]?.end ?? "" }));
    return { weekKey, parity, week: isoWeek(weekKey), hours, days };
  }

  const api = { buildGrid, isoWeek, fallbackMonday, groupNum };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RozvrhLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
