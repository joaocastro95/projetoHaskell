import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A raiz do site é esta pasta (frontend/). Sem isto o Next acha também o
  // package-lock.json da raiz do projeto (o do "npm run dev" que sobe tudo) e avisa.
  turbopack: {
    root: __dirname,
  },
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
