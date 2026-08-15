import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مهرنگار",
    short_name: "مهرنگار",
    description: "نرم‌افزار حسابداری و مدیریت فروش مهرنگار",
    start_url: "/demo",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#5b4dff",
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
