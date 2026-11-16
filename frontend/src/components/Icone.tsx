/** Ícones em linha (traço), sem dependências. */
const CAMINHOS = {
  painel: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  estoque: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10",
  mais: "M12 5v14M5 12h14",
  perdas: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  conta: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0",
  alerta: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  relogio: "M12 22a10 10 0 100-20 10 10 0 000 20zm0-15v5l3 3",
  check: "M5 13l4 4L19 7",
  lixo: "M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14",
  usar: "M5 13l4 4L19 7",
  voltar: "M15 18l-6-6 6-6",
  avancar: "M9 18l6-6-6-6",
  folha: "M5 21c0-9 6-15 15-16-1 9-7 15-15 16zm0 0c3-5 6-8 10-11",
  busca: "M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.3-4.3",
  sair: "M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3",
  diagonal: "M7 17L17 7M8 7h9v9",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4m8-4v4",
  doar: "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z",
  queda: "M3 7l6 6 4-4 8 8m0 0h-6m6 0v-6",
  pizza: "M12 3v9h9M21 12a9 9 0 1 1-9-9",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({
  nome,
  className = "h-5 w-5",
  traco = 2,
}: {
  nome: NomeIcone;
  className?: string;
  traco?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

/** Logo: um "zero" aberto que a folha fecha (alimento salvo). Igual ao ícone do app. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <rect width="512" height="512" rx="112" fill="#0d6b45" />
      <path d="M256 106a150 150 0 1 0 150 150" fill="none" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
      <path d="M300 212C300 140 350 100 420 92c-6 74-48 120-120 120z" fill="#c6f36b" />
      <path d="M306 206L396 116" stroke="#0d6b45" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
