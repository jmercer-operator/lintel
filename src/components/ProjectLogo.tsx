"use client";

interface ProjectLogoProps {
  logoUrl: string | null;
  name: string;
  size?: number;
}

export function ProjectLogo({ logoUrl, name, size = 28 }: ProjectLogoProps) {
  if (!logoUrl) return null;

  return (
    <img
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="rounded-[4px] object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
