export default function NewStore() {
  return (
    <Stub label="Store" desc="A store create flow ships in the next pass — the schema and APIs are ready; the form mirrors the crafter one with supply categories instead." />
  );
}

function Stub({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-2xl font-bold">{label} create flow — coming next</h1>
      <p className="mt-2 max-w-xl mx-auto text-sm text-ink-muted">{desc}</p>
    </div>
  );
}
