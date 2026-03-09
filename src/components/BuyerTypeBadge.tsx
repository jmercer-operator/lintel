"use client";

import { BUYER_TYPE_LABELS, BUYER_TYPE_COLORS, type BuyerType } from "@/lib/types";

interface Props {
  buyerType: BuyerType | null;
}

export function BuyerTypeBadge({ buyerType }: Props) {
  if (!buyerType) return null;

  const colors = BUYER_TYPE_COLORS[buyerType];
  const label = BUYER_TYPE_LABELS[buyerType];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

export function FirbBadge({ required }: { required: boolean }) {
  if (!required) return null;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D4A855]/10 text-[#D4A855]">
      FIRB Required
    </span>
  );
}
