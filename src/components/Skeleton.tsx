interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-input)] bg-bg-alt ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[var(--radius-card)] border border-border shadow-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-border last:border-0 flex gap-6">
          {[...Array(6)].map((_, j) => (
            <Skeleton key={j} className="h-4 w-20" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonProjectCard() {
  return (
    <div className="bg-white rounded-[var(--radius-card)] border border-border shadow-card p-6 space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-56" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}
