// Mounts Descope's <AuthProvider> only when DEV_AUTH is not set. In dev-stub
// mode the hardcoded user from lib/auth.ts is the sole source of identity, so
// loading the Descope SDK provides no value (and would warn about the
// placeholder project ID).

import { AuthProvider } from "@descope/nextjs-sdk";

export function MaybeAuthProvider({ children }: { children: React.ReactNode }) {
  if (process.env.DEV_AUTH === "true") return <>{children}</>;
  const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
  if (!projectId || projectId.startsWith("P_placeholder")) return <>{children}</>;
  return <AuthProvider projectId={projectId}>{children}</AuthProvider>;
}
