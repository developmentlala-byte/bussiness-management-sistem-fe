"use client";

import { Skeleton } from "@heroui/react";

export function ProductLayananSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="w-64 h-6 rounded-lg" />
          <Skeleton className="w-80 h-4 rounded-lg" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="w-full sm:w-64 h-10 rounded-xl" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* SIDEBAR */}
        <aside className="md:w-64 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <Skeleton className="w-20 h-3 rounded-lg" />
              <Skeleton className="w-6 h-6 rounded-md" />
            </div>

            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-full h-10 rounded-xl" />
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              {/* SERVICE HEADER */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-40 h-4 rounded-lg" />
                    <Skeleton className="w-64 h-3 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>

              {/* VARIANT GRID */}
              <div className="pl-0 md:pl-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="p-5 border border-border rounded-2xl"
                    >
                      <div className="space-y-3">
                        <Skeleton className="w-32 h-4 rounded-lg" />
                        <Skeleton className="w-20 h-3 rounded-lg" />
                      </div>

                      <div className="mt-6 flex justify-between items-end">
                        <div className="space-y-2">
                          <Skeleton className="w-24 h-5 rounded-lg" />
                          <Skeleton className="w-16 h-3 rounded-lg" />
                        </div>
                        <Skeleton className="w-8 h-8 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border w-full mt-8 opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
