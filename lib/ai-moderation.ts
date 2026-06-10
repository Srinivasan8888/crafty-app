// V3 Tier 4 — AI-assisted moderation triage.
//
// Goal: when an admin opens a flag in /admin, they can click "AI triage" to
// get Claude's read on whether the flagged listing breaks Crafty's rules.
// This is decision support, NOT auto-moderation: the admin still presses
// "dismiss" / "hide" / "delete" themselves. The verdict + reasoning are
// logged to AuditLog for accountability.
//
// No SDK dependency — we call the Anthropic Messages API directly via fetch.
// Configured by ANTHROPIC_API_KEY; without a real key the function returns
// a no-op stub verdict so admin UI still renders gracefully.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = "claude-opus-4-7";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type TriageVerdict = "DISMISS" | "HIDE" | "DELETE" | "UNCLEAR";

export type TriageResult = {
  verdict: TriageVerdict;
  confidence: number; // 0..1
  reasoning: string;
  model: string;
};

export function isAiModerationConfigured(): boolean {
  return (
    !!ANTHROPIC_API_KEY &&
    !ANTHROPIC_API_KEY.startsWith("sk-ant-placeholder") &&
    ANTHROPIC_API_KEY !== "placeholder"
  );
}

const SYSTEM_PROMPT = `You are a content-moderation assistant for Crafty, an
India-focused craft community discovery platform. You review user-submitted
flags against listings (crafters, supply stores, studios, events).

Crafty's rules:
1. No doxxing — no posting other people's private contact info, home address,
   or personal identifiers without consent.
2. No scams — no fake businesses, fake credentials, paid-promotion-as-listing,
   or financial fraud.
3. No off-platform commerce solicitation that bypasses Crafty's
   transactional flow (DM-only "send UPI to this number" pitches).
4. No harassment, hate speech, or targeted abuse.
5. Respect copyright — no listings using clearly-stolen photos or another
   crafter's work as their own.
6. Listings should be real attempts at the listed craft activity; obviously
   off-topic posts (e.g. a tech consultancy listed as a "studio") are
   misleading.

Given a flag report and the listing's name + tagline + bio, decide:
- DISMISS — the flag is unsubstantiated; the listing is fine.
- HIDE — there's a real concern; an admin should review and likely hide
  while the lister is contacted.
- DELETE — clear, severe violation; the listing should be removed entirely.
- UNCLEAR — you genuinely can't tell from the info provided; admin must
  judge manually.

Respond in EXACTLY this format on three lines, nothing else:
VERDICT: <DISMISS|HIDE|DELETE|UNCLEAR>
CONFIDENCE: <0.0-1.0>
REASONING: <one or two sentences explaining your call, citing which rule
applies if any>`;

type FlagLike = {
  reason: string;
  note?: string | null;
  entity_type: string;
  reporter_email?: string | null;
};

type EntityLike = {
  name?: string | null;
  tagline?: string | null;
  bio?: string | null;
};

function buildUserPrompt(flag: FlagLike, entity: EntityLike | null): string {
  const lines: string[] = [];
  lines.push(`Flag report on a ${flag.entity_type.toLowerCase()} listing.`);
  lines.push(`Reason category: ${flag.reason}`);
  if (flag.note) lines.push(`Reporter note: ${flag.note}`);
  if (flag.reporter_email) lines.push(`Reporter: ${flag.reporter_email}`);
  lines.push("");
  lines.push("Listing details:");
  lines.push(`Name: ${entity?.name ?? "(unknown — listing not found)"}`);
  if (entity?.tagline) lines.push(`Tagline: ${entity.tagline}`);
  if (entity?.bio) lines.push(`Bio: ${entity.bio.slice(0, 1000)}`);
  return lines.join("\n");
}

function parseVerdict(text: string): TriageResult {
  // Tolerant parser: the model is instructed to use the three-line format,
  // but we don't crash if it adds extra prose.
  const verdictMatch = text.match(/VERDICT:\s*(DISMISS|HIDE|DELETE|UNCLEAR)/i);
  const confMatch = text.match(/CONFIDENCE:\s*([0-9.]+)/i);
  const reasonMatch = text.match(/REASONING:\s*([\s\S]+?)(?:\n\n|$)/i);

  const verdict = (verdictMatch?.[1]?.toUpperCase() as TriageVerdict) ?? "UNCLEAR";
  let confidence = confMatch ? parseFloat(confMatch[1]) : 0.5;
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));
  const reasoning = (reasonMatch?.[1] ?? text).trim().slice(0, 1000);
  return { verdict, confidence, reasoning, model: ANTHROPIC_MODEL };
}

export async function triageFlag(
  flag: FlagLike,
  entity: EntityLike | null,
): Promise<TriageResult> {
  if (!isAiModerationConfigured()) {
    return {
      verdict: "UNCLEAR",
      confidence: 0,
      reasoning: "AI moderation not configured. Set ANTHROPIC_API_KEY.",
      model: "unconfigured",
    };
  }

  const userPrompt = buildUserPrompt(flag, entity);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        verdict: "UNCLEAR",
        confidence: 0,
        reasoning: `AI request failed: ${res.status} ${txt.slice(0, 200)}`,
        model: ANTHROPIC_MODEL,
      };
    }
    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    if (!text) {
      return {
        verdict: "UNCLEAR",
        confidence: 0,
        reasoning: "AI returned an empty response.",
        model: ANTHROPIC_MODEL,
      };
    }
    return parseVerdict(text);
  } catch (e) {
    return {
      verdict: "UNCLEAR",
      confidence: 0,
      reasoning: `AI request errored: ${(e as Error).message?.slice(0, 200) ?? "unknown"}`,
      model: ANTHROPIC_MODEL,
    };
  }
}
