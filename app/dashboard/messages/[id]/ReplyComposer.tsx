"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export function ReplyComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        // Keep the typed text so nothing is lost on a failed send.
        show("Couldn't send your message. Please try again.", "error");
      }
    } catch {
      show("Couldn't send your message. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={send}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas-raised p-3"
    >
      <div className="container flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a reply…"
          rows={2}
          className="input flex-1 resize-none"
          maxLength={4000}
        />
        <button type="submit" disabled={busy || body.trim().length === 0} className="btn btn-primary btn-sm">
          {busy ? <Loader2 className="animate-spin" size={14} /> : <><Send size={14} /> Send</>}
        </button>
      </div>
    </form>
  );
}
