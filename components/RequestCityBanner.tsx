"use client";

// V1.5 — "Crafty isn't in your city yet — request it" banner.
// Shown when the IP-derived country is IN but no city pill matches the
// detected location. Submits to /api/city-requests; the server-side
// route does deduplication + count increment.

import { useState } from "react";
import { X, MapPin } from "lucide-react";

export function RequestCityBanner({ defaultCity = "" }: { defaultCity?: string }) {
  const [open, setOpen] = useState(true);
  const [cityName, setCityName] = useState(defaultCity);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cityName.trim().length < 2) {
      setError("Please enter a city name (at least 2 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/city-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_name: cityName, reporter_email: email || null }),
      });
      if (!res.ok) throw new Error("submit_failed");
      setOk(true);
      try {
        localStorage.setItem("crafty_city_requested", "1");
      } catch {}
    } catch (err: any) {
      setError("Couldn't submit — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div id="request-city" className="card mx-auto my-4 max-w-3xl p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MapPin size={16} aria-hidden /> Crafty isn't in your city yet.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="icon-btn"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      {ok ? (
        <p className="text-sm text-ink-muted">
          Thanks — we've logged the request. The more people ask for {cityName}, the sooner we open it up.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="input"
            placeholder="Your city"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            required
            maxLength={80}
          />
          <input
            type="email"
            className="input"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
            {submitting ? "Sending…" : "Request"}
          </button>
          {error && <p className="text-sm text-danger sm:col-span-3">{error}</p>}
        </form>
      )}
    </div>
  );
}
