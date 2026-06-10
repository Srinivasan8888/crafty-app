// V3 Tier 4 — Job-handler registry.
//
// Imported at startup (from the queue diagnostic page + any future worker
// process) so every job name we care about has an inline-mode handler. When
// REDIS_URL is configured and a BullMQ worker spins up, the worker uses this
// same registry to dispatch real queued jobs.
//
// Keep handlers small and stub-only at this stage — real implementations
// land alongside the call sites that need them.

import { registerHandler } from "./queue";

let _booted = false;

export function bootstrapQueueHandlers(): void {
  if (_booted) return;
  _booted = true;

  // email.send — generic transactional email passthrough. Eventually all
  // sendEmail() calls will route through here instead of inline so we can
  // retry / batch / rate-limit them in one place.
  //
  // For now this is a logged stub. lib/email.ts's sendEmail() is module-
  // private; once we promote it to a named export we'll wire it through
  // here. Until then the inline-mode behavior is "log what would have been
  // sent" which mirrors sendEmail's own no-op path.
  registerHandler("email.send", async (payload) => {
    const p = payload as {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
    } | null;
    if (!p?.to || !p.subject) {
      console.warn("[queue:email.send] missing required fields", p);
      return;
    }
    console.log(`[queue:email.send:stub] to=${p.to} subject="${p.subject}"`);
  });

  // image.reprocess — kick a stored image through the variant pipeline
  // again (e.g. after upgrading image.ts presets). Stub for now.
  registerHandler("image.reprocess", async (payload) => {
    const p = payload as { url?: string } | null;
    console.log(`[queue:image.reprocess:stub] url=${p?.url ?? "(none)"}`);
  });
}
