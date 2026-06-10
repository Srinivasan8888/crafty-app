import Link from "next/link";
import { Download } from "lucide-react";

export default function AdminExportPage() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const buckets = [
    { label: "Users",    href: `/api/admin/export?bucket=users&v=${today}` },
    { label: "Crafters", href: `/api/admin/export?bucket=crafters&v=${today}` },
    { label: "Stores",   href: `/api/admin/export?bucket=stores&v=${today}` },
    { label: "Studios",  href: `/api/admin/export?bucket=studios&v=${today}` },
    { label: "Events",   href: `/api/admin/export?bucket=events&v=${today}` },
    { label: "Flags",    href: `/api/admin/export?bucket=flags&v=${today}` },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">CSV export</h1>
        <p className="mt-1 text-sm text-ink-muted">
          PRD §24.4 — one-click streams of each top-level table. Filenames embed today's date.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {buckets.map((b) => (
          <li key={b.label}>
            <Link
              href={b.href}
              className="card flex items-center justify-between p-4 hover:border-line-strong"
              prefetch={false}
            >
              <span className="font-medium text-ink">{b.label}</span>
              <Download className="h-4 w-4 text-ink-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
