import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PerdaZero",
    short_name: "PerdaZero",
    description: "Controle de validade e desperdício para pequenos restaurantes",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#047857",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
