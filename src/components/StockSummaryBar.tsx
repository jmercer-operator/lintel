import { STATUS_COLORS, type StockStats } from "@/lib/types";

interface StockSummaryBarProps {
  stats: StockStats;
}

export function StockSummaryBar({ stats }: StockSummaryBarProps) {
  if (stats.total === 0) {
    return (
      <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden">
        <div className="h-full w-full bg-border" />
      </div>
    );
  }

  const segments = [
    { count: stats.available, color: STATUS_COLORS.Available, label: "Available" },
    { count: stats.eoi, color: STATUS_COLORS.EOI, label: "EOI" },
    { count: stats.underContract, color: STATUS_COLORS["Under Contract"], label: "Under Contract" },
    { count: stats.exchanged, color: STATUS_COLORS.Exchanged, label: "Exchanged" },
    { count: stats.settled, color: STATUS_COLORS.Settled, label: "Settled" },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-2">
      <div className="w-full h-2.5 bg-bg-alt rounded-full overflow-hidden flex">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
            style={{
              width: `${(segment.count / stats.total) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1 text-xs text-secondary">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: segment.color }}
            />
            {segment.count} {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}
