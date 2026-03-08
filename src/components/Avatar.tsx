interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name = "", src, size = "md", className = "" }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`
          ${sizes[size]}
          rounded-full object-cover
          border border-border
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full
        bg-emerald-primary text-white
        flex items-center justify-center
        font-semibold
        select-none
        ${className}
      `}
    >
      {name ? getInitials(name) : "?"}
    </div>
  );
}
