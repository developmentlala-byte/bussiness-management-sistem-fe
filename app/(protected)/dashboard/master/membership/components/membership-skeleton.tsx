export function MembershipSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-7 w-64 bg-muted/20 rounded animate-pulse" />
          <div className="h-4 w-80 bg-muted/20 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-64 bg-muted/20 rounded-xl animate-pulse" />
          <div className="h-11 w-32 bg-muted/20 rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-2">
            <div className="h-4 w-24 bg-muted/20 rounded mb-3 animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted/20 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </aside>

        <div className="flex-1">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="h-6 w-48 bg-muted/20 rounded" />
            <div className="h-4 w-full bg-muted/20 rounded mt-3" />
            <div className="flex gap-4 mt-4">
              <div className="h-10 w-32 bg-muted/20 rounded" />
              <div className="h-10 w-32 bg-muted/20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
