import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymTrackey", short_name: "GymTrackey", description: "Track Members. Manage Fees. Grow Your Gym.", start_url: "/dashboard", scope: "/", display: "standalone",
    background_color: "#07090c", theme_color: "#07090c",
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  };
}
