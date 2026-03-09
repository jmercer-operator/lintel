import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "destructive";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  size?: Size;
}

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-emerald-primary text-white hover:bg-emerald-dark active:bg-emerald-dark shadow-button",
  secondary:
    "bg-bg-alt text-body border border-border hover:bg-border active:bg-border",
  ghost:
    "bg-transparent text-secondary hover:bg-bg-alt active:bg-border",
  accent:
    "bg-gold text-white hover:opacity-90 active:opacity-80 shadow-button",
  destructive:
    "bg-error text-white hover:opacity-90 active:opacity-80 shadow-button",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-[var(--radius-button)]
          font-semibold
          transition-all duration-150 ease-in-out
          disabled:opacity-50 disabled:pointer-events-none
          cursor-pointer
          ${sizeStyles[size]}
          ${variantStyles[variant]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
