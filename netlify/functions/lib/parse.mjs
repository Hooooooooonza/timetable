// Parsování veřejného rozvrhu Bakalářů: data jsou v HTML jako `const timetableData = {...}`.
const pad = (n) => String(n).padStart(2, "0");

export const hm = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s || "");
  return m ? pad(m[1]) + ":" + m[2] : null;
};

export function extractTimetableJson(html) {
  const m = /const\s+timetableData\s*=\s*/.exec(html);
  if (!m) throw new Error("V odpovědi nejsou data rozvrhu (špatná URL nebo se změnila stránka).");
  const start = html.indexOf("{", m.index + m[0].length - 1);
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error("Nepodařilo se přečíst data rozvrhu.");
}

export function normalize(data) {
  const hours = (data.Hours || []).map((h) => ({
    caption: h.Caption,
    begin: hm(h.BeginTime),
    end: hm(h.EndTime),
  }));
  let monday = null;
  const days = (data.Days || []).map((d, di) => {
    const slots = {};
    for (const h of d.Hours || []) {
      const key = hm(h.Begin);
      if (!key) continue;
      for (const a of h.Atoms || []) {
        if (!monday && a.Day) {
          const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(a.Day);
          if (m) {
            const t = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1] - di));
            monday = t.toISOString().slice(0, 10);
          }
        }
        (slots[key] ||= []).push({
          abbr: a.SubjectAbbrev || "",
          text: a.SubjectText || "",
          group: a.GroupsNames || "",
          room: a.Room || "",
          teacher: a.Teacher || "",
          changed: !!a.HasChanged,
          removed: a.Type === "removed",
        });
      }
    }
    return {
      abbr: d.DayAbbrev,
      date: d.Date,
      off: !!d.DayOff,
      offName: d.DayOffName || "",
      slots,
    };
  });
  return { hours, days, monday };
}
