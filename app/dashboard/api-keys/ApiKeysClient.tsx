"use client";

// V3 Tier 3 — Interactive shell for API key management.
// One-time reveal of plaintext secret on create; revoke wipes the key.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2, X, Loader2, Check } from "lucide-react";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function ApiKeysClient({ initialKeys }: { initialKeys: KeyRow[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [open, setOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [scopes, setScopes] = useState("read:public");
  const [rpm, setRpm] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) {
      setError("Give the key a name (e.g. \"my-widget\").");
      return;
    }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean),
          rate_limit_per_min: rpm,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "create_failed");
      setRevealed({ id: j.id, key: j.key });
      setNewKeyName("");
      router.refresh();
      // Refresh local list
      const refresh = await fetch("/api/api-keys");
      if (refresh.ok) {
        const data = await refresh.json();
        setKeys(data.data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Existing integrations using it will stop working immediately.")) return;
    const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((ks) => ks.map((k) => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    }
  }

  function closeModal() {
    setOpen(false);
    setRevealed(null);
    setNewKeyName("");
    setError(null);
  }

  function copyKey() {
    if (!revealed) return;
    navigator.clipboard?.writeText(revealed.key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} type="button">
          <Plus size={14} /> New API key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-muted">You haven&apos;t created any API keys yet.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => setOpen(true)} type="button">
            Create your first key
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink-subtle">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Scopes</th>
                <th className="px-4 py-3">RPM</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">crafty_{k.prefix}…</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{k.scopes.join(", ")}</td>
                  <td className="px-4 py-3 text-ink-muted">{k.rate_limit_per_min}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {k.revoked_at
                      ? <span className="text-danger">revoked</span>
                      : <span className="text-success">active</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!k.revoked_at && (
                      <button
                        type="button"
                        onClick={() => revoke(k.id)}
                        className="btn btn-ghost btn-sm text-danger"
                        aria-label={`Revoke ${k.name}`}
                      >
                        <Trash2 size={12} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apikey-modal-title"
        >
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h2 id="apikey-modal-title" className="font-display text-lg font-bold text-ink">
                {revealed ? "Your new API key" : "Create API key"}
              </h2>
              <button className="icon-btn" onClick={closeModal} aria-label="Close" type="button">
                <X size={16} />
              </button>
            </div>

            {revealed ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink-muted">
                  Save this secret somewhere safe — it&apos;ll never be shown again.
                </p>
                <div className="flex items-center gap-2 rounded-md border border-line bg-canvas-sunken p-3">
                  <code className="flex-1 break-all font-mono text-xs">{revealed.key}</code>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="btn btn-sm btn-ghost"
                    aria-label="Copy key"
                  >
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <div className="text-xs text-ink-subtle">
                  Use it as <code>Authorization: Bearer {revealed.key.slice(0, 20)}…</code>
                </div>
                <button className="btn btn-primary w-full mt-4" type="button" onClick={closeModal}>
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="key-name">Name *</label>
                  <input
                    id="key-name"
                    className="input"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="my-widget"
                    maxLength={80}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label" htmlFor="key-scopes">Scopes</label>
                  <input
                    id="key-scopes"
                    className="input"
                    value={scopes}
                    onChange={(e) => setScopes(e.target.value)}
                    placeholder="read:public"
                  />
                  <p className="mt-1 text-xs text-ink-subtle">
                    Comma-separated. Default is <code>read:public</code>.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="key-rpm">Rate limit (req/min)</label>
                  <input
                    id="key-rpm"
                    type="number"
                    min={10}
                    max={600}
                    className="input"
                    value={rpm}
                    onChange={(e) => setRpm(Math.max(10, Math.min(600, Number(e.target.value) || 60)))}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn" type="button" onClick={closeModal} disabled={busy}>Cancel</button>
                  <button className="btn btn-primary" type="button" onClick={createKey} disabled={busy}>
                    {busy ? <><Loader2 className="animate-spin" size={12} /> Creating…</> : "Create key"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
