'use client';
import { useEffect, useState } from "react";
import { checkSupabase, type ConnectionStatus } from "../lib/status";

const LABEL: Record<ConnectionStatus, string> = {
  checking: "Checking Supabase…",
  connected: "Supabase connected",
  "not-connected": "Supabase not connected",
};

export default function SupabaseStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

  useEffect(() => {
    let active = true;
    const run = () => { checkSupabase().then((s) => { if (active) setStatus(s); }); };
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
  }, []);

  return <span className={"db-status " + status} role="status"><i aria-hidden="true" />{LABEL[status]}</span>;
}
