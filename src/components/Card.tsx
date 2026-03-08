import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  accent?: boolean;
  accentColor?: string;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  accent = false,
  accentColor = "var(--color-emerald-primary)",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-[var(--radius-card)]
        border border-border
        shadow-card
        transition-shadow duration-200
        hover:shadow-card-hover
        ${paddings[padding]}
        ${accent ? "border-l-[3px]" : ""}
        ${className}
      `}
      style={accent ? { borderLeftColor: accentColor } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
