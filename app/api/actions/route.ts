import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The sync code (sent as x-visitor-id) scopes every query: whoever holds it can read and change that board's actions.
const CODE = /^(VB-([A-Z2-9]{4}-){3}[A-Z2-9]{4}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const MAX_ACTIONS = 500;

function db() {
  const url = process.env.NEON_DATABASE_URL;
  return url ? neon(url) : null;
}

function visitor(req: Request) {
  const id = req.headers.get("x-visitor-id") || "";
  return CODE.test(id) ? id : null;
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const sql = db();
  if (!sql) return fail("not configured", 503);
  const v = visitor(req);
  if (!v) return fail("invalid sync code", 400);
  try {
    const rows = await sql`select client_id, area, text, done from public.actions where visitor_id = ${v} order by created_at, id`;
    return NextResponse.json({ actions: rows });
  } catch {
    return fail("database error", 500);
  }
}

// Insert or update one or more actions: body is { actions: [{ id, area, text, done }] }.
export async function PUT(req: Request) {
  const sql = db();
  if (!sql) return fail("not configured", 503);
  const v = visitor(req);
  if (!v) return fail("invalid sync code", 400);
  let body: { actions?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("invalid body", 400);
  }
  const list = Array.isArray(body.actions) ? body.actions : [];
  if (list.length === 0 || list.length > MAX_ACTIONS) return fail("invalid body", 400);
  const rows: { id: string; area: string; text: string; done: boolean }[] = [];
  for (const a of list) {
    const { id, area, text, done } = (a ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 80 || typeof area !== "string" || !area || area.length > 40) return fail("invalid action", 400);
    if (typeof text !== "string" || text.trim().length < 1 || text.length > 200 || typeof done !== "boolean") return fail("invalid action", 400);
    rows.push({ id, area, text: text.trim(), done });
  }
  try {
    await sql`
      insert into public.actions (visitor_id, client_id, area, text, done)
      select ${v}, r.id, r.area, r.text, r.done
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as r(id text, area text, text text, done boolean)
      on conflict (visitor_id, client_id)
      do update set area = excluded.area, text = excluded.text, done = excluded.done, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch {
    return fail("database error", 500);
  }
}

export async function DELETE(req: Request) {
  const sql = db();
  if (!sql) return fail("not configured", 503);
  const v = visitor(req);
  if (!v) return fail("invalid sync code", 400);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id || id.length > 80) return fail("invalid id", 400);
  try {
    await sql`delete from public.actions where visitor_id = ${v} and client_id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return fail("database error", 500);
  }
}
