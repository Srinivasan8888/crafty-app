// Privacy-safe label for the messaging counterparty. NEVER returns a raw email.
//
// A buyer talks to a listing's owner, so when the owner has no display name the
// public business/listing name is the natural, non-PII label. An owner talking
// to a nameless buyer gets a neutral fallback. The email is never used.
export function safeCounterpartyName(args: {
  viewerIsBuyer: boolean;
  displayName: string | null | undefined;
  entityName: string | null | undefined;
}): string {
  const name = args.displayName?.trim();
  if (name) return name;
  if (args.viewerIsBuyer && args.entityName) return args.entityName;
  return "Crafty member";
}
