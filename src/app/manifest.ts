import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مهرنگار",
    short_name: "مهرنگار",
    description: "سامانه حسابداری و مدیریت انبار مهرنگار",
    start_url: "/",
    display: "standalone",
    background_color: "#07050f",
    theme_color: "#7c4dff",
    lang: "fa",
    dir: "rtl",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
