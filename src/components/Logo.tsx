export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span
      className={`${sizes[size]} tracking-[0.08em] font-sans select-none`}
    >
      <span className="font-extrabold text-emerald-primary">L</span>
      <span className="font-medium text-body">INTEL</span>
    </span>
  );
}
