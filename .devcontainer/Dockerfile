# Imagem oficial do Haskell (GHC 9.10 + cabal).
FROM haskell:9.10

# Node 20 direto do nodejs.org, sem apt-get: a imagem do Haskell é Debian 11 (bullseye),
# cujo repositório de segurança saiu do ar, e o apt-get falha ao instalar pacotes.
ARG NODE_VERSION=20.18.1
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" \
      | tar -xz -C /usr/local --strip-components=1 \
 && node --version && npm --version && ghc --version && cabal --version
