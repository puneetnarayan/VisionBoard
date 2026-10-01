'use client';
import { useEffect, useState } from "react";
import { FALLBACK_ID, getVisitorId, normalizeCode, setVisitorId } from "../lib/identity";
import { cloudConfigured } from "../lib/syncLabel";

export default function SyncCode() {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => setCode(getVisitorId()), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setNote("Code copied ✓");
    } catch {
      setNote("Couldn't copy — select the code and copy it manually");
    }
  }

  function connect() {
    const next = normalizeCode(input);
    if (!next) return setNote("That doesn't look like a valid sync code");
    if (next === code) return setNote("This device already uses that code");
    if (!window.confirm("Switch this device to that code? Views and actions saved only on this device will be added to it; nothing is deleted.")) return;
    try {
      setVisitorId(next);
      window.location.reload();
    } catch {
      setNote("Couldn't save the code in this browser");
    }
  }

  const usable = code && code !== FALLBACK_ID;
  return (
    <section className="sync-panel">
      <button type="button" className="sync-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        🔗 Sync across devices {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="sync-body">
          {!cloudConfigured && <p className="sync-warn">Supabase isn&apos;t configured for this site, so there is nothing to sync yet.</p>}
          {usable ? (
            <>
              <p>Your sync code — enter it on your other device to see the same views and actions. Keep it private: anyone with it can see and change your board.</p>
              <div className="sync-row"><code>{code}</code><button type="button" onClick={copy}>Copy</button></div>
              <p>On another device, paste a code here:</p>
              <div className="sync-row">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="VB-XXXX-XXXX-XXXX-XXXX" aria-label="Sync code" />
                <button type="button" onClick={connect} disabled={!input.trim()}>Connect</button>
              </div>
            </>
          ) : (
            <p className="sync-warn">This browser blocks local storage, so a sync code can&apos;t be kept.</p>
          )}
          {note && <p className="sync-note">{note}</p>}
        </div>
      )}
    </section>
  );
}
