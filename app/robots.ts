import type { MetadataRoute } from "next";
const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gymtrackey.com";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/member", "/trainer", "/api", "/setup"] }], sitemap: `${base}/sitemap.xml` };
}
