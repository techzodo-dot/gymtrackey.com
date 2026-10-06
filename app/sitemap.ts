import type { MetadataRoute } from "next";
const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gymtrackey.com";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/features", "/demo", "/about", "/contact", "/terms", "/privacy", "/refund-policy"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
