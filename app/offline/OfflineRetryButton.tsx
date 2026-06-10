"use client";

export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="btn btn-secondary"
    >
      Retry connection
    </button>
  );
}
