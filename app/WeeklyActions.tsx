'use client';
import { useState } from "react";
import { MAX_ACTIONS_PER_AREA, type Action } from "../lib/actions";

type Props = {
  actions: Action[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

export default function WeeklyActions({ actions, onAdd, onToggle, onEdit, onDelete }: Props) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const done = actions.filter((a) => a.done).length;

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  }
  function saveEdit() {
    if (!editing) return;
    const text = editing.text.trim();
    if (text) onEdit(editing.id, text);
    setEditing(null);
  }

  return (
    <div className="weekly">
      <div className="weekly-head">
        <strong>This week</strong>
        <span>{actions.length ? `${done} of ${actions.length} done` : "No actions yet"}</span>
      </div>
      <ul>
        {actions.map((a) => (
          <li key={a.id} className={a.done ? "done" : ""}>
            <input type="checkbox" checked={a.done} onChange={() => onToggle(a.id)} aria-label={`Mark done: ${a.text}`} />
            {editing?.id === a.id ? (
              <input
                className="weekly-edit"
                autoFocus
                maxLength={200}
                value={editing.text}
                onChange={(e) => setEditing({ id: a.id, text: e.target.value })}
                onBlur={saveEdit}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
              />
            ) : (
              <span className="weekly-text">{a.text}</span>
            )}
            <button type="button" aria-label="Edit action" onClick={() => setEditing({ id: a.id, text: a.text })}>✎</button>
            <button type="button" aria-label="Delete action" onClick={() => onDelete(a.id)}>✕</button>
          </li>
        ))}
      </ul>
      {actions.length < MAX_ACTIONS_PER_AREA && (
        <div className="weekly-add">
          <input
            value={draft}
            maxLength={200}
            placeholder="Add one action for this week…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          <button type="button" onClick={submit} disabled={!draft.trim()}>Add</button>
        </div>
      )}
    </div>
  );
}
