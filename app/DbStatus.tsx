'use client';
import { useEffect, useState } from "react";
import { checkNeon, checkSupabase, formatBytes, type DbState } from "../lib/status";

function useDb(check: () => Promise<DbState>) {
  const [state, setState] = useState<DbState>({ status: "checking" });
  useEffect(() => {
    let active = true;
    const run = () => { check().then((s) => { if (active) setState(s); }); };
    run();
    const id = window.setInterval(run, 60000);
    window.addEventListener("online", run);
    window.addEventListener("offline", run);
    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("online", run);
      window.removeEventListener("offline", run);
    };
  }, [check]);
  return state;
}

function Pill({ name, kind, state }: { name: string; kind: "neon" | "supabase"; state: DbState }) {
  const text =
    state.status === "checking" ? `Checking ${name}…`
    : state.status === "connected" ? `${name} connected${state.bytes !== undefined ? ` • ${formatBytes(state.bytes)}` : ""}`
    : `${name} not connected`;
  return (
    <span className={`db-status ${kind} ${state.status}`} role="status" title={state.status === "connected" ? `Space used by this app's tables in ${name}` : undefined}>
      <i aria-hidden="true" />{text}
    </span>
  );
}

export default function DbStatus() {
  const supabase = useDb(checkSupabase);
  const neon = useDb(checkNeon);
  return (
    <span className="db-statuses">
      <Pill name="Neon" kind="neon" state={neon} />
      <Pill name="Supabase" kind="supabase" state={supabase} />
    </span>
  );
}
