import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // No GitHub Codespaces o site é aberto por https://<nome>-8080.app.github.dev.
      // Sem isto o Next recusa os formulários (proteção contra CSRF), porque o
      // endereço do navegador não bate com o host que chega ao servidor.
      allowedOrigins: ["localhost:8080", "*.app.github.dev"],
    },
  },
};

export default nextConfig;
