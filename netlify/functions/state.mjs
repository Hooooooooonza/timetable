import { getStore } from "@netlify/blobs";

// Ukládá přepínače rozvrhu (sdílené mezi zařízeními). Se školním serverem nemluví.
export default async (req) => {
  const store = getStore("rozvrh");

  if (req.method === "GET") {
    const s = await store.get("state", { type: "json" });
    return Response.json(s || {}, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return new Response("bad request", { status: 400 }); }
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass || b.password !== pass) return new Response("unauthorized", { status: 401 });
    if (b.state && typeof b.state === "object") await store.setJSON("state", b.state);
    return Response.json({ ok: true });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/state" };
