"use client";

// Client-side mock checkout overlay.
//
// Used when the server returns the "mock" key sentinel (PAYMENTS_MOCK=true).
// Instead of loading the real Razorpay Checkout SDK, this renders a lightweight
// fake gateway, and on "Pay" POSTs /api/mock-pay to perform the real state
// transition. Returns true if the user paid, false if they dismissed.
//
// Built with plain DOM + inline styles so it works regardless of which CSS is
// loaded and needs no per-component React state.

export type MockCheckoutArgs = {
  kind: "order" | "feature" | "subscription";
  id: string;
  amountInr: number;
  title?: string;
  description?: string;
};

export function runMockCheckout(args: MockCheckoutArgs): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const inr = "₹" + args.amountInr.toLocaleString("en-IN");
    // Sunday Bazaar palette so the money moment still looks like Crafty: cream
    // surface, rose action button, warm walnut text, terracotta shadow.
    const sans = "var(--font-sans),system-ui,-apple-system,sans-serif";
    const btn = `padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid rgba(31,95,60,0.35);background:#FFF6E5;color:#1F5F3C;font-family:${sans};`;
    const primary = `padding:10px 16px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;background:#B5365B;color:#FFF6E5;font-family:${sans};`;

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Mock payment");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(26,26,26,0.45);padding:16px;";
    overlay.innerHTML = `
      <div style="background:#FFF6E5;color:#1A1A1A;max-width:380px;width:100%;border-radius:16px;padding:20px;font-family:${sans};border:1px solid rgba(31,95,60,0.25);box-shadow:0 12px 40px -8px rgba(180,80,40,0.30);">
        <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:#FBEBC8;color:#B5365B;padding:2px 8px;border-radius:999px;">Mock payment</span>
        <h2 style="font-family:var(--font-display),Georgia,serif;font-size:20px;font-weight:700;margin:10px 0 2px;color:#1A1A1A;">${escapeHtml(args.title ?? "Crafty")}</h2>
        <p style="font-size:13px;color:#6B5A3E;margin:0;">${escapeHtml(args.description ?? "")}</p>
        <p style="font-size:28px;font-weight:800;margin:10px 0 0;color:#1A1A1A;">${inr}</p>
        <p style="font-size:12px;color:#6B5A3E;margin:2px 0 16px;">No real charge. Demo mode.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button data-act="cancel" style="${btn}">Cancel</button>
          <button data-act="pay" style="${primary}">Pay ${inr}</button>
        </div>
        <p data-err role="alert" style="display:none;color:#B5365B;font-size:13px;margin:8px 0 0;"></p>
      </div>`;
    document.body.appendChild(overlay);

    const payBtn = overlay.querySelector('[data-act="pay"]') as HTMLButtonElement;
    const cancelBtn = overlay.querySelector('[data-act="cancel"]') as HTMLButtonElement;
    const errEl = overlay.querySelector("[data-err]") as HTMLElement;

    // Keyboard safety on the money moment: Escape dismisses, Tab is trapped
    // between Cancel and Pay so focus can't wander to the page behind.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = [cancelBtn, payBtn].filter((b) => !b.disabled);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const firstF = focusables[0];
      const lastF = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstF) {
        e.preventDefault();
        lastF.focus();
      } else if (!e.shiftKey && document.activeElement === lastF) {
        e.preventDefault();
        firstF.focus();
      }
    };
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const cleanup = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      previouslyFocused?.focus?.();
    };

    const dismiss = () => {
      cleanup();
      resolve(false);
    };
    cancelBtn.onclick = dismiss;
    overlay.onclick = (e) => {
      if (e.target === overlay) dismiss();
    };
    document.addEventListener("keydown", onKey);
    payBtn.focus();

    payBtn.onclick = async () => {
      payBtn.disabled = true;
      payBtn.textContent = "Processing…";
      cancelBtn.disabled = true;
      try {
        const res = await fetch("/api/mock-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: args.kind, id: args.id }),
        });
        if (!res.ok) throw new Error("fulfill_failed");
        cleanup();
        resolve(true);
      } catch {
        payBtn.disabled = false;
        payBtn.textContent = "Pay " + inr;
        cancelBtn.disabled = false;
        errEl.style.display = "block";
        errEl.textContent = "Mock payment failed. Try again.";
      }
    };
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
