import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-heading"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3.5 py-2.5
            rounded-[var(--radius-input)]
            border border-border
            bg-white text-body text-sm
            placeholder:text-muted
            transition-colors duration-150
            hover:border-secondary
            focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none
            disabled:opacity-50 disabled:bg-bg-alt
            ${error ? "border-error focus:border-error focus:ring-error" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
