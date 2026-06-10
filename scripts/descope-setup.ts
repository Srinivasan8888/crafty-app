/**
 * Descope Phase 0 automation — one-shot setup script.
 *
 * Replaces the manual dashboard work documented in README "Descope setup".
 * Configures: JWT template claims (email, name).
 * Attempts audit-webhook connector automation when the API is available, but
 * current Descope projects may require creating that connector in the Console.
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   DESCOPE_MANAGEMENT_KEY=K2... \
 *   NEXT_PUBLIC_DESCOPE_PROJECT_ID=P2... \
 *   DESCOPE_WEBHOOK_SECRET=<your-secret> \
 *   SITE_URL=https://your-domain.com \
 *   bunx tsx scripts/descope-setup.ts
 *
 * The Flow Editor and active User JWT Token Format selection cannot reliably be
 * scripted — those parts remain manual Console work.
 * Default flows (`sign-in`, `sign-up`, `sign-up-or-in`) work out of the box.
 *
 * Docs:
 *   - https://docs.descope.com/management-api
 *   - https://docs.descope.com/management/token/jwt-templates
 *   - https://docs.descope.com/connectors/connector-configuration-guides/network/audit-webhook
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
const MGMT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;
const WEBHOOK_SECRET = process.env.DESCOPE_WEBHOOK_SECRET;
const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const BASE = process.env.NEXT_PUBLIC_DESCOPE_BASE_URL ?? "https://api.descope.com";

function bail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!PROJECT_ID || PROJECT_ID.startsWith("P_placeholder")) {
  bail("NEXT_PUBLIC_DESCOPE_PROJECT_ID is not set to a real value.");
}
if (!MGMT_KEY || MGMT_KEY.startsWith("K_placeholder")) {
  bail("DESCOPE_MANAGEMENT_KEY is not set to a real value.");
}
if (!WEBHOOK_SECRET || WEBHOOK_SECRET === "placeholder") {
  bail("DESCOPE_WEBHOOK_SECRET is not set to a real value.");
}

/** Authorization for the management API: `Bearer <projectId>:<mgmtKey>`. */
const AUTH = `Bearer ${PROJECT_ID}:${MGMT_KEY}`;

async function mgmt<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({} as T));
}

// ─── 1. JWT template claims ───────────────────────────────────────
//
// PRD §12 — server-side auth reads `email` and `name` from the session JWT
// to avoid an extra management-API round-trip per request.
//
// Descope now exposes project-wide JWT customization via JWT Templates:
//   POST /v1/mgmt/jwt/templates/{list,create,update}
// The Console may still need one manual click to select this template as the
// active User JWT Token Format under Project Settings > Session Management.

const JWT_TEMPLATE_NAME = "crafty-default-user";

type JwtTemplate = {
  id?: string;
  name?: string;
  description?: string;
  template?: Record<string, unknown>;
  tags?: string[];
  authSchema?: string;
  type?: "user" | "key";
  issuerType?: string;
  emptyClaimPolicy?: string;
};

async function ensureUserJwtTemplate() {
  console.log(`→ JWT template: ${JWT_TEMPLATE_NAME}`);

  const template: JwtTemplate = {
    name: JWT_TEMPLATE_NAME,
    description: "Crafty user session claims consumed by the Next.js app.",
    type: "user",
    authSchema: "default",
    issuerType: "legacy",
    emptyClaimPolicy: "delete",
    template: {
      email: "{{user.email}}",
      name: "{{user.name}}",
    },
    tags: ["crafty", "codex-managed"],
  };

  const list = await mgmt<{ templates?: JwtTemplate[] }>("/v1/mgmt/jwt/templates/list", {});
  const existing = list.templates?.find((t) => t.name === JWT_TEMPLATE_NAME);

  if (existing?.id) {
    await mgmt("/v1/mgmt/jwt/templates/update", {
      template: { ...template, id: existing.id },
    });
    console.log(`  ✓ updated existing template id=${existing.id}`);
  } else {
    const created = await mgmt<{ template?: JwtTemplate }>("/v1/mgmt/jwt/templates/create", {
      template,
    });
    console.log(`  ✓ created template id=${created.template?.id ?? "?"}`);
  }

  console.log("  ! In Descope Console, set Project Settings > Session Management > User JWT Token Format to this template if it is not already active.");
}

// ─── 2. Audit-webhook connector ───────────────────────────────────
//
// Creates (or updates if it already exists by name) a connector that POSTs
// User events to /api/webhooks/descope on our deployment.

const WEBHOOK_NAME = "crafty-user-sync";

async function ensureAuditWebhook() {
  console.log(`→ audit webhook connector: ${WEBHOOK_NAME}`);
  const url = `${SITE_URL.replace(/\/$/, "")}/api/webhooks/descope`;

  // The connectors API exposes search + create + update. We search by name
  // first to make this script idempotent.
  const list = await mgmt<{ connectors?: Array<{ id: string; name: string; type: string }> }>(
    "/v1/mgmt/connectors/search",
    { types: ["AuditWebhook"] },
  );
  const existing = list.connectors?.find((c) => c.name === WEBHOOK_NAME);

  const configuration = {
    url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    hmacSecret: WEBHOOK_SECRET,
    // Filter to the user-lifecycle events our handler cares about.
    auditFilters: [
      { key: "action", operator: "Equals", value: "User Created" },
      { key: "action", operator: "Equals", value: "User Modified" },
      { key: "action", operator: "Equals", value: "User Deleted" },
    ],
  };

  if (existing) {
    await mgmt(`/v1/mgmt/connectors/audit-webhook/update`, {
      id: existing.id,
      name: WEBHOOK_NAME,
      enabled: true,
      configuration,
    });
    console.log(`  ✓ updated existing connector id=${existing.id} → ${url}`);
  } else {
    const created = await mgmt<{ id?: string }>("/v1/mgmt/connectors/audit-webhook/create", {
      name: WEBHOOK_NAME,
      enabled: true,
      configuration,
    });
    console.log(`  ✓ created connector id=${created.id ?? "?"} → ${url}`);
  }
}

// ─── main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Descope project: ${PROJECT_ID}`);
  console.log(`Webhook URL    : ${SITE_URL}/api/webhooks/descope`);
  console.log("");

  await ensureUserJwtTemplate();
  try {
    await ensureAuditWebhook();
  } catch (e) {
    console.warn(`  ! Audit webhook automation could not complete: ${String(e).replace(/^Error:\s*/, "")}`);
    console.warn(`  ! Manual fallback: create an Audit Webhook connector named "${WEBHOOK_NAME}" pointing to ${SITE_URL.replace(/\/$/, "")}/api/webhooks/descope.`);
    console.warn("  ! Filter actions: User Created, User Modified, User Deleted. Set the HMAC secret from DESCOPE_WEBHOOK_SECRET.");
  }

  console.log("");
  console.log("✓ Descope project configured. Remaining manual step:");
  console.log("  - Confirm Project Settings > Session Management uses the JWT template above.");
  console.log("  - Open the Flow Editor and brand the sign-in/sign-up flows.");
  console.log("    (The default magenta themeOverride in lib/descopeTheme.ts is");
  console.log("    applied at the component level; dashboard tweaks layer on top.)");
}

main().catch((e) => bail(String(e)));
