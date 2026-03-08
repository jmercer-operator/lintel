type StockStatus = "Available" | "EOI" | "Under Contract" | "Exchanged" | "Settled";

interface StatusBadgeProps {
  status: StockStatus;
  className?: string;
}

const statusColors: Record<StockStatus, { bg: string; text: string }> = {
  Available: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]" },
  EOI: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]" },
  "Under Contract": { bg: "bg-[#7B3FA0]/10", text: "text-[#7B3FA0]" },
  Exchanged: { bg: "bg-[#E07858]/10", text: "text-[#E07858]" },
  Settled: { bg: "bg-[#2D8C5A]/10", text: "text-[#2D8C5A]" },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colors = statusColors[status];
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-1
        rounded-full
        text-xs font-semibold
        ${colors.bg} ${colors.text}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace("text-", "bg-")} mr-1.5`} />
      {status}
    </span>
  );
}
