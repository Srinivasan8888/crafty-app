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
    const btn = "padding:8px 14px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid #E6DED0;";
    const primary = "padding:8px 14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;background:#FF90E8;color:#171614;";

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Mock payment");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);padding:16px;";
    overlay.innerHTML = `
      <div style="background:#fff;color:#171614;max-width:380px;width:100%;border-radius:16px;padding:20px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 12px 40px -8px rgba(0,0,0,0.3);">
        <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:#FFE0F6;color:#B5365B;padding:2px 8px;border-radius:999px;">Mock payment</span>
        <h2 style="font-size:18px;font-weight:700;margin:10px 0 2px;">${escapeHtml(args.title ?? "Crafty")}</h2>
        <p style="font-size:13px;color:#545049;margin:0;">${escapeHtml(args.description ?? "")}</p>
        <p style="font-size:28px;font-weight:800;margin:10px 0 0;">${inr}</p>
        <p style="font-size:12px;color:#868076;margin:2px 0 16px;">No real charge — demo mode.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button data-act="cancel" style="${btn}">Cancel</button>
          <button data-act="pay" style="${primary}">Pay ${inr}</button>
        </div>
        <p data-err role="alert" style="display:none;color:#D3404A;font-size:13px;margin:8px 0 0;"></p>
      </div>`;
    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();
    const payBtn = overlay.querySelector('[data-act="pay"]') as HTMLButtonElement;
    const cancelBtn = overlay.querySelector('[data-act="cancel"]') as HTMLButtonElement;
    const errEl = overlay.querySelector("[data-err]") as HTMLElement;

    const dismiss = () => {
      cleanup();
      resolve(false);
    };
    cancelBtn.onclick = dismiss;
    overlay.onclick = (e) => {
      if (e.target === overlay) dismiss();
    };

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
