"use client";

export function BundlePromoSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animate-pulse">
      <div className="h-8 w-64 bg-muted/30 rounded-lg mb-2" />
      <div className="h-4 w-96 bg-muted/20 rounded-lg mb-8" />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-72 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted/20 rounded-xl" />
          ))}
        </div>
        <div className="flex-1 h-96 bg-muted/20 rounded-2xl" />
      </div>
    </div>
  );
}
