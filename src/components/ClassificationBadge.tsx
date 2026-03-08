import type { ContactClassification } from "@/lib/types";

interface ClassificationBadgeProps {
  classification: ContactClassification;
  className?: string;
}

const styles: Record<ContactClassification, { bg: string; text: string; dot: string }> = {
  prospect: { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]", dot: "bg-[#D4A855]" },
  customer: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]", dot: "bg-[#1A9E6F]" },
};

export function ClassificationBadge({ classification, className = "" }: ClassificationBadgeProps) {
  const s = styles[classification];
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-1 rounded-full
        text-xs font-semibold capitalize
        ${s.bg} ${s.text} ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} mr-1.5`} />
      {classification}
    </span>
  );
}
