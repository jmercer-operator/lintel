import type { MetadataRoute } from "next";

// Private CRM — do not index anything.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
