(function () {
  const CFG = window.ROZVRH_CONFIG;
  const L = window.RozvrhLogic;
  const $ = (s) => document.querySelector(s);

  const S = { term: "Actual", data: null, st: { alt: {}, once: {} }, unlocked: false, grid: null };

  // ---------- pomocné ----------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const getPw = () => { try { return sessionStorage.getItem("rozvrh-pw") || ""; } catch { return ""; } };
  const setPw = (v) => { try { v ? sessionStorage.setItem("rozvrh-pw", v) : sessionStorage.removeItem("rozvrh-pw"); } catch {} };
  const setStatus = (t, err) => { const s = $("#status"); s.textContent = t || ""; s.classList.toggle("error", !!err); };

  async function post(body) {
    const r = await fetch("/api/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: getPw(), ...body }),
    });
    if (r.status === 401) { setPw(""); S.unlocked = false; renderLock(); throw new Error("auth"); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Chyba " + r.status);
    return r.json();
  }

  // ---------- dialog ----------
  const dlg = $("#dlg");
  function ask({ title, text, input, options }) {
    return new Promise((resolve) => {
      $("#dlgTitle").textContent = title;
      $("#dlgText").textContent = text || "";
      const body = $("#dlgBody"); body.replaceChildren();
      let field = null;
      if (input) {
        field = el("input"); field.type = "password"; field.autocomplete = "current-password";
        field.placeholder = input; field.setAttribute("aria-label", input);
        body.append(field);
      }
      const acts = $("#dlgActions"); acts.replaceChildren();
      let result = null;
      for (const o of options) {
        const b = el("button", o.cls || "", o.label);
        b.type = "button";
        if (o.hint) b.append(el("small", "", o.hint));
        b.onclick = () => { result = { value: o.value, text: field ? field.value : "" }; dlg.close(); };
        acts.append(b);
      }
      dlg.onclose = () => resolve(result);
      dlg.showModal();
      if (field) field.focus();
    });
  }

  // ---------- odemykání ----------
  function renderLock() {
    const b = $("#lockBtn");
    b.textContent = S.unlocked ? "Zamknout" : "Odemknout";
    b.setAttribute("aria-pressed", S.unlocked);
    if (S.grid) render();
  }
  async function unlock() {
    for (let i = 0; i < 2; i++) {
      const r = await ask({
        title: "Heslo", text: "Po zadání hesla půjde přepínat předměty.", input: "Heslo",
        options: [{ label: "Odemknout", value: "ok", cls: "primary" }, { label: "Zrušit", value: null, cls: "quiet" }],
      });
      if (!r || !r.value) return false;
      setPw(r.text);
      try { await post({ op: "verify" }); S.unlocked = true; renderLock(); return true; }
      catch (e) { if (e.message !== "auth") setStatus(e.message, true); }
    }
    return false;
  }
  $("#lockBtn").addEventListener("click", async () => {
    if (S.unlocked) { S.unlocked = false; setPw(""); renderLock(); } else await unlock();
  });

  // ---------- akce přepnutí ----------
  async function openSwitch(cell) {
    const g = S.grid, rule = cell.over.rule, par = g.parity;
    const altKey = cell.slotKey;
    const onceKey = `${g.weekKey}|${altKey}`;
    const weekKey = `${g.weekKey}|${rule.id}|all`;
    const a = S.st.alt[altKey] || {};
    const opts = [];

    if (rule.kind === "once") {
      opts.push(cell.hidden
        ? { label: `Vrátit ${rule.name} (${rule.label})`, value: { op: "once", key: onceKey, value: null }, cls: "primary" }
        : { label: `Tento týden místo toho předmět ${CFG.base.label}`, value: { op: "once", key: onceKey, value: "base" }, cls: "primary" });
    } else {
      if (rule.groups) {
        opts.push(cell.group2
          ? { label: "Vrátit na skupinu 1", hint: "zruší přehození pro tento týden", value: { op: "once", key: weekKey, value: null }, cls: "primary" }
          : { label: "Přehodit na skupinu 2", hint: "jen tento týden", value: { op: "once", key: weekKey, value: "group2" }, cls: "primary" });
      }
      const here = !!a[par];
      opts.push(here
        ? { label: `Vrátit ${rule.name} v tomto týdnu`, value: { op: "alt", key: altKey, parity: par, value: false }, cls: rule.groups ? "" : "primary" }
        : { label: `${rule.groups ? "Ne, přepnout" : "Přepnout"} na předmět ${CFG.base.label}`,
            hint: "tento týden a pak každý druhý (střídání)", value: { op: "alt", key: altKey, parity: par, value: true }, cls: rule.groups ? "" : "primary" });
      if (!(a.even && a.odd)) opts.push({ label: `Úplně odebrat (${CFG.base.label} každý týden)`, value: { op: "alt", key: altKey, parity: "both", value: true } });
      if (a.even || a.odd) opts.push({ label: "Obnovit střídání", value: { op: "alt", key: altKey, parity: "both", value: false } });
    }
    opts.push({ label: "Zrušit", value: null, cls: "quiet" });

    const base = cell.base.filter((x) => !x.removed).map((x) => x.abbr).join(" + ") || "nic";
    const r = await ask({
      title: `${rule.name} (${rule.label})`,
      text: `V ${CFG.base.label} je v tuhle hodinu: ${base}.`,
      options: opts,
    });
    if (!r || !r.value) return;
    try { S.st = await post(r.value); render(); }
    catch (e) { if (e.message === "auth") { if (await unlock()) openSwitch(cell); } else setStatus(e.message, true); }
  }

  // ---------- vykreslení ----------
  function atomBlock(a, withGroup) {
    const d = el("div", "more");
    const t = el("div", "abbr", a.abbr || "?");
    if (withGroup && a.group) t.append(el("span", "grp", a.group));
    d.append(t);
    const meta = [a.room, a.teacher].filter(Boolean).join(" · ");
    if (meta) d.append(el("div", "meta", meta));
    return d;
  }

  function renderCell(cell) {
    const td = el("td");
    const c = el("div", "cell");
    td.append(c);
    const baseLive = cell.base.filter((a) => !a.removed);
    const showOver = cell.over && !cell.hidden;

    if (cell.over) { c.style.setProperty("--c", cell.over.rule.color); }
    if (showOver) {
      c.classList.add("over");
      cell.over.atoms.forEach((a) => c.append(atomBlock(a, true)));
      c.append(el("div", "corner", `${CFG.base.label}: ${baseLive.map((a) => a.abbr).join("+") || "–"}`));
    } else {
      if (baseLive.length) {
        baseLive.forEach((a) => c.append(atomBlock(a, true)));
        if (baseLive.some((a) => a.changed)) c.classList.add("changed");
      } else if (cell.base.length) {
        c.classList.add("removed"); c.append(el("div", "abbr", "odpadá"));
      }
      if (cell.over) {
        c.classList.add("hidden-over");
        const r = cell.over.rule;
        c.append(el("div", "corner", `${r.label}: ${cell.over.atoms.map((a) => a.abbr).join("+")}`));
      }
    }
    if (cell.over && S.unlocked) {
      c.classList.add("switchable");
      c.tabIndex = 0; c.setAttribute("role", "button");
      c.setAttribute("aria-label", `Přepnout: ${cell.over.rule.name}`);
      c.addEventListener("click", () => openSwitch(cell));
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSwitch(cell); } });
    }
    return td;
  }

  function render() {
    const g = S.grid;
    const t = $("#grid"); t.replaceChildren();
    const head = el("tr"); head.append(el("th"));
    const todayIdx = (new Date().getDay() + 6) % 7;
    const isCurrent = S.term === "Actual";
    g.days.forEach((d, i) => {
      const th = el("th", isCurrent && i === todayIdx ? "today" : ""); th.scope = "col";
      th.append(document.createTextNode(d.abbr));
      th.append(el("small", "", d.date));
      head.append(th);
    });
    const thead = el("thead"); thead.append(head); t.append(thead);

    const tb = el("tbody");
    g.hours.forEach((h, hi) => {
      const tr = el("tr");
      const th = el("th", "hour", h.caption); th.scope = "row";
      th.append(el("small", "", h.key.replace(/^0/, "")));
      tr.append(th);
      g.days.forEach((d) => {
        if (d.off) {
          if (hi === 0) {
            const td = el("td", "off-day", d.offName ? d.offName[0].toUpperCase() + d.offName.slice(1) : "Volno");
            td.rowSpan = g.hours.length; tr.append(td);
          }
          return;
        }
        tr.append(renderCell(d.cells[h.key]));
      });
      tb.append(tr);
    });
    t.append(tb);

    $("#weekTitle").textContent = `Týden ${g.week}`;
    const f = g.days[0], l = g.days[4];
    $("#weekSub").textContent = `${f.date} – ${l.date} · ${CFG.base.label}${[...new Set(CFG.overlays.map((o) => o.label))].map((x) => " + " + x).join("")}`;

    const lg = $("#legend"); lg.replaceChildren();
    const seen = new Set();
    CFG.overlays.forEach((o) => {
      if (seen.has(o.id)) return; seen.add(o.id);
      const li = el("li", "", `${o.name} (${o.label})`); li.style.setProperty("--c", o.color); lg.append(li);
    });
    setStatus(S.unlocked ? "Odemčeno: klepni na podbarvenou hodinu pro přepnutí." : "");
  }

  // ---------- načítání ----------
  async function load() {
    setStatus("Načítám…");
    const ids = [...new Set([CFG.base.id, ...CFG.overlays.map((o) => o.classId)])];
    try {
      const [tt, st] = await Promise.all([
        fetch(`/api/timetable?term=${S.term}&classes=${ids.join(",")}`).then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || "Rozvrh se nepodařilo načíst (" + r.status + ")");
          return j;
        }),
        fetch("/api/state").then((r) => (r.ok ? r.json() : { alt: {}, once: {} })).catch(() => ({ alt: {}, once: {} })),
      ]);
      S.data = tt; S.st = st;
      S.grid = L.buildGrid(CFG, tt, st);
      render();
    } catch (e) { setStatus(e.message, true); }
  }

  document.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      S.term = b.dataset.term;
      document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-selected", x === b));
      load();
    })
  );

  // render s aktuálním stavem po každé změně
  const _render = render;
  render = function () { if (S.data) S.grid = L.buildGrid(CFG, S.data, S.st); _render(); };

  (async () => {
    if (getPw()) { try { await post({ op: "verify" }); S.unlocked = true; $("#lockBtn").textContent = "Zamknout"; $("#lockBtn").setAttribute("aria-pressed", "true"); } catch {} }
    load();
  })();
})();
