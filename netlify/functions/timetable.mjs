import { extractTimetableJson, normalize } from "./lib/parse.mjs";

const TERMS = new Set(["Actual", "Next", "Permanent"]);
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

async function loadClass(base, term, id) {
  const res = await fetch(`${base}/timetable/public/${term}/class/${id}`, {
    headers: { "user-agent": "Mozilla/5.0 (rozvrh-proxy)", "accept-language": "cs" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Bakaláři vrátili ${res.status} pro třídu ${id}`);
  return normalize(extractTimetableJson(await res.text()));
}

export default async (req) => {
  const url = new URL(req.url);
  const term = url.searchParams.get("term") || "Actual";
  const ids = (url.searchParams.get("classes") || "").split(",").filter(Boolean);
  if (!TERMS.has(term) || !ids.length || ids.length > 6 || ids.some((i) => !/^[A-Za-z0-9]{1,8}$/.test(i)))
    return json({ error: "Neplatný požadavek" }, 400);

  const base = (process.env.BAKALARI_URL || "").replace(/\/+$/, "");
  if (!base) return json({ error: "Chybí proměnná prostředí BAKALARI_URL" }, 500);

  try {
    const entries = await Promise.all(ids.map(async (id) => [id, await loadClass(base, term, id)]));
    return json({ term, classes: Object.fromEntries(entries) }, 200, {
      "cache-control": "public, max-age=0, s-maxage=120",
    });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
};

export const config = { path: "/api/timetable" };
