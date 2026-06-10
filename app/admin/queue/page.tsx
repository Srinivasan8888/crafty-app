// V3 Tier 4 — Background-job queue diagnostic page.
//
// Today this just confirms which mode the queue is in:
//   - Redis connected (REDIS_URL set and not placeholder) → "connected"
//   - Otherwise → "inline mode" — every enqueue() runs the handler inline.
//
// V3.1 polish: live job stats (waiting / active / failed counts), retry
// controls for the dead-letter queue. Today we just list the registered
// handler names so an admin can confirm the bootstrap module loaded.

import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { bootstrapQueueHandlers } from "@/lib/queue-bootstrap";
import { isQueueConfigured, listRegisteredHandlers } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function QueueDiagnosticPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  bootstrapQueueHandlers();
  const connected = isQueueConfigured();
  const handlers = listRegisteredHandlers();

  return (
    <main id="main" className="container my-10 max-w-3xl">
      <h1 className="text-2xl font-bold">Background job queue</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Diagnostic view. V3.1 will add live job stats and dead-letter
        introspection.
      </p>

      <div className="mt-6 card p-5">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              connected ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold">
            {connected
              ? "Redis queue: connected"
              : "Inline mode (no Redis)"}
          </h2>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {connected ? (
            <>
              <code className="rounded bg-canvas-sunken px-1.5 py-0.5 text-xs">REDIS_URL</code>{" "}
              is set. Jobs pushed through <code>enqueue()</code> land on
              BullMQ; a worker process picks them up.
            </>
          ) : (
            <>
              Set <code className="rounded bg-canvas-sunken px-1.5 py-0.5 text-xs">REDIS_URL</code>{" "}
              (e.g. Upstash Redis, Railway Redis, or a self-hosted instance)
              to enable background processing. Until then, every{" "}
              <code>enqueue()</code> call runs its handler inline.
            </>
          )}
        </p>
      </div>

      <div className="mt-6 card p-5">
        <h2 className="text-base font-semibold">Registered handlers</h2>
        {handlers.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            None. The bootstrap module didn&apos;t register any handlers —
            check <code>lib/queue-bootstrap.ts</code>.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {handlers.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2"
              >
                <code className="font-mono text-xs">{name}</code>
                <span className="text-xs text-ink-subtle">
                  {connected ? "queued" : "inline"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-ink-subtle">
        To flip the queue on:{" "}
        <code className="rounded bg-canvas-sunken px-1.5 py-0.5">bun add bullmq</code>{" "}
        and set{" "}
        <code className="rounded bg-canvas-sunken px-1.5 py-0.5">REDIS_URL</code>{" "}
        to a real connection string.
      </p>
    </main>
  );
}
