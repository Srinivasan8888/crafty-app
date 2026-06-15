import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Ban enforcement (feature-bug-audit 1.1/1.2). `is_banned` is set by the admin
 * "Ban" action but was never read — banned users could still sign in and
 * mutate. getCurrentUser() now treats a banned account as anonymous, so every
 * downstream guard (requireUser / requireCreator / requireAdmin) inherits the
 * denial. We exercise the DEV_AUTH path, which resolves the user purely from a
 * single prisma.user.upsert we can mock.
 */

process.env.DEV_AUTH = "true";

const upsert = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { user: { upsert: (...args: unknown[]) => upsert(...args) } },
}));
vi.mock("@/lib/email", () => ({ sendSignupWelcome: vi.fn() }));

const baseUser = {
  id: "u1",
  descope_id: null,
  email: "dev@crafty.app",
  display_name: "Dev",
  role: "ADMIN",
  is_admin: true,
  is_banned: false,
};

describe("ban enforcement", () => {
  beforeEach(() => {
    upsert.mockReset();
    vi.resetModules();
  });

  it("treats a banned account as anonymous", async () => {
    upsert.mockResolvedValue({ ...baseUser, is_banned: true });
    const { getCurrentUser } = await import("@/lib/auth");
    expect(await getCurrentUser()).toBeNull();
  });

  it("requireUser denies a banned account (authenticated pages bounce)", async () => {
    upsert.mockResolvedValue({ ...baseUser, is_banned: true });
    const { requireUser } = await import("@/lib/auth");
    await expect(requireUser()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("requireCreator denies a banned account (mutation routes reject)", async () => {
    upsert.mockResolvedValue({
      ...baseUser,
      role: "CREATOR",
      is_admin: false,
      is_banned: true,
    });
    const { requireCreator } = await import("@/lib/auth");
    await expect(requireCreator()).rejects.toThrow();
  });

  it("leaves a non-banned account fully functional", async () => {
    upsert.mockResolvedValue({ ...baseUser, is_banned: false });
    const { getCurrentUser, requireUser } = await import("@/lib/auth");
    expect((await getCurrentUser())?.id).toBe("u1");
    await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
  });
});
