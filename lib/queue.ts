// V3 Tier 4 — Background job queue (SCAFFOLD).
//
// Decision: ship the interface now, run inline by default. When a real Redis
// instance is available, set REDIS_URL to a non-placeholder value and
// `enqueue()` will push to BullMQ instead of running the handler inline. The
// caller code doesn't change between dev and prod — only the env var flips.
//
// In dev, enqueue() runs the registered handler immediately so callers can
// rely on side effects happening before they return. This is fine for now
// because the call sites we plan to migrate (transactional email sends,
// image reprocessing) already use the fire-and-forget pattern.
//
// Mirroring lib/storage.ts's S3Driver trick: BullMQ is imported via a
// string-variable specifier with `webpackIgnore: true` so Next.js doesn't
// try to bundle the package when it isn't installed.
//
// V3.1 polish: queue introspection (jobs in flight, dead-letter inspection)
// belongs in /app/api/admin/queue. Today's diagnostic page just confirms the
// connection mode.

type Handler = (payload: unknown) => Promise<void>;

const HANDLERS = new Map<string, Handler>();

// Lazily-resolved BullMQ singletons. Keyed by job name so each named queue
// reuses a single Queue instance for the process lifetime.
const QUEUES = new Map<string, unknown>();

const REDIS_URL = process.env.REDIS_URL;

export function isQueueConfigured(): boolean {
  return (
    !!REDIS_URL &&
    !REDIS_URL.startsWith("redis://placeholder") &&
    REDIS_URL !== "placeholder"
  );
}

export function registerHandler(name: string, fn: Handler): void {
  HANDLERS.set(name, fn);
}

export function listRegisteredHandlers(): string[] {
  return Array.from(HANDLERS.keys()).sort();
}

/**
 * Push a job onto the queue (Redis mode) or execute the registered handler
 * inline (dev mode). Returns the BullMQ job id when queued, or null when run
 * inline.
 *
 * Errors thrown by inline handlers are logged but not re-thrown — same
 * fire-and-forget posture as the rest of the codebase (sendEmail, logAudit).
 */
export async function enqueue(
  name: string,
  payload: unknown,
  opts?: { delay_ms?: number },
): Promise<string | null> {
  if (!isQueueConfigured()) {
    const fn = HANDLERS.get(name);
    if (!fn) {
      console.warn(`[queue:inline] no handler registered for "${name}"`);
      return null;
    }
    console.log(`[queue:inline] running "${name}" inline (no Redis)`);
    try {
      await fn(payload);
    } catch (e) {
      console.error(`[queue:inline:error] ${name}`, e);
    }
    return null;
  }

  // Redis mode — push to BullMQ. We hide the import behind a string variable
  // so Next.js's static analyzer doesn't blow up when bullmq isn't installed.
  // To activate: `bun add bullmq` and set REDIS_URL to a real connection.
  const pkg = "bullmq";
  const mod = await import(/* webpackIgnore: true */ pkg).catch(() => {
    throw new Error(
      "REDIS_URL is set but `bullmq` is not installed. Run: bun add bullmq",
    );
  });
  const { Queue } = mod as {
    Queue: new (
      name: string,
      cfg: { connection: { url: string } },
    ) => {
      add: (
        jobName: string,
        data: unknown,
        opts?: { delay?: number },
      ) => Promise<{ id?: string | null }>;
    };
  };

  let q = QUEUES.get(name) as
    | { add: (n: string, d: unknown, o?: { delay?: number }) => Promise<{ id?: string | null }> }
    | undefined;
  if (!q) {
    q = new Queue(`crafty:${name}`, { connection: { url: REDIS_URL! } });
    QUEUES.set(name, q);
  }
  const job = await q.add(name, payload, opts?.delay_ms ? { delay: opts.delay_ms } : undefined);
  return job.id ?? null;
}
