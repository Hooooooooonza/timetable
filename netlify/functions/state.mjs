import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const sha = (s) => createHash("sha256").update(String(s)).digest();
function passwordOk(p) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof p !== "string") return false;
  return timingSafeEqual(sha(p), sha(expected));
}

const SLOT = /^[a-z0-9-]{1,30}\|[0-4]\|\d{2}:\d{2}$/;
const WEEK_SLOT = /^\d{4}-\d{2}-\d{2}\|[a-z0-9-]{1,30}\|([0-4]\|\d{2}:\d{2}|all)$/;

function prune(state) {
  const limit = Date.now() - 10 * 7 * 864e5;
  for (const k of Object.keys(state.once)) {
    if (new Date(k.slice(0, 10)).getTime() < limit) delete state.once[k];
  }
  for (const k of Object.keys(state.alt)) {
    const v = state.alt[k];
    if (!v.even && !v.odd) delete state.alt[k];
  }
  return state;
}

export default async (req) => {
  const store = getStore("rozvrh");
  const read = async () => {
    const s = (await store.get("state", { type: "json" })) || {};
    return { alt: s.alt || {}, once: s.once || {} };
  };

  if (req.method === "GET") return json(await read());
  if (req.method !== "POST") return json({ error: "Metoda není povolena" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Neplatné tělo" }, 400); }
  if (!passwordOk(body.password)) return json({ error: "Špatné heslo" }, 401);
  if (body.op === "verify") return json({ ok: true });

  const state = await read();
  const { op, key } = body;

  if (op === "once") {
    if (!WEEK_SLOT.test(key)) return json({ error: "Neplatný klíč" }, 400);
    if (body.value === null) delete state.once[key];
    else if (body.value === "base" || body.value === "group2") state.once[key] = body.value;
    else return json({ error: "Neplatná hodnota" }, 400);
  } else if (op === "alt") {
    if (!SLOT.test(key)) return json({ error: "Neplatný klíč" }, 400);
    const cur = state.alt[key] || { even: false, odd: false };
    if (body.parity === "both") { cur.even = cur.odd = !!body.value; }
    else if (body.parity === "even" || body.parity === "odd") cur[body.parity] = !!body.value;
    else return json({ error: "Neplatná parita" }, 400);
    state.alt[key] = cur;
  } else {
    return json({ error: "Neznámá operace" }, 400);
  }

  prune(state);
  await store.setJSON("state", state);
  return json(state);
};

export const config = { path: "/api/state" };
