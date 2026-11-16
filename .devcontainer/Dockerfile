# Imagem oficial do Haskell (GHC 9.10 + cabal).
FROM haskell:9.10

# Node 20 direto do nodejs.org, sem apt-get: a imagem do Haskell é Debian 11 (bullseye),
# cujo repositório de segurança saiu do ar, e o apt-get falha ao instalar pacotes.
ARG NODE_VERSION=20.19.5
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" \
      | tar -xz -C /usr/local --strip-components=1 \
 && node --version && npm --version && ghc --version && cabal --version

# "ps" (pacote procps): o concurrently usa para parar a API e o site no Ctrl+C do "npm run dev".
# Se o apt-get falhar (repositório do Debian 11), segue sem ele: só o Ctrl+C mostra um erro.
RUN (apt-get update && apt-get install -y --no-install-recommends procps && rm -rf /var/lib/apt/lists/*) \
 || echo "aviso: procps não instalado"
