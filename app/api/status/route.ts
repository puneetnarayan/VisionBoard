import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Reports whether Neon answers a real query, plus the space this app's table uses (no user data is returned).
export async function GET() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) return NextResponse.json({ connected: false }, { status: 503 });
  try {
    const rows = await neon(url)`select pg_total_relation_size('public.actions')::bigint as bytes`;
    return NextResponse.json({ connected: true, bytes: Number(rows[0].bytes) });
  } catch {
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
