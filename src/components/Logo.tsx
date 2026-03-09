export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span
      className={`${sizes[size]} font-sans select-none`}
    >
      <span className="font-extrabold text-emerald-primary tracking-tight">L</span>
      <span className="font-medium text-body tracking-[0.04em]">INTEL</span>
    </span>
  );
}
