export default function Loading() {
  return (
    <div className="container py-8">
      <div className="h-8 w-64 bg-cream-2 rounded animate-pulse mb-4" />
      <div className="h-4 w-96 bg-cream-2 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card">
            <div className="img aspect-[16/9] bg-cream-2 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-cream-2 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-cream-2 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
