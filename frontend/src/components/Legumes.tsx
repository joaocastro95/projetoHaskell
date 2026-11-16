/**
 * Ilustrações próprias do PerdaZero: traço de caneta marrom com uma mancha de cor
 * levemente deslocada por trás (estilo "desenhado à mão").
 */
type Props = { className?: string; traco?: string; semCor?: boolean };

const TRACO = "#4a2a1a";

function Desenho({
  className,
  traco = TRACO,
  semCor,
  manchas,
  linhas,
}: Props & { manchas: [string, string][]; linhas: string[] }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {!semCor && (
        <g transform="translate(2.6 2.2)">
          {manchas.map(([d, cor], i) => (
            <path key={i} d={d} fill={cor} />
          ))}
        </g>
      )}
      <g fill="none" stroke={traco} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
        {linhas.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function Cenoura(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[
        ["M35 19C28 29 19 41 12 52c-1 3 1 4 4 3 11-8 23-17 31-26-2-5-7-9-12-10z", "#f08a24"],
        ["M41 23c-1-8 3-14 10-17-1 7-4 13-10 17zM43 26c6-3 12-2 16 2-6 2-11 1-16-2z", "#5f9a3a"],
      ]}
      linhas={[
        "M35 18C28 28 19 41 12 52c-1 3 1 4 4 3 11-8 23-17 31-26",
        "M35 18c5 1 10 5 12 11",
        "M22 42l4 2M28 34l3 2M34 27l3 1",
        "M41 22c-1-8 3-14 10-17-1 7-4 13-10 17",
        "M43 25c6-3 12-2 16 2-6 2-11 1-16-2",
        "M39 20c-4-4-5-9-2-14",
      ]}
    />
  );
}

export function Tomate(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[
        ["M32 19c13 0 22 8 22 19S45 56 32 56 10 49 10 38s9-19 22-19z", "#e8502a"],
        ["M32 20l-7-6 5 1 2-6 2 6 5-1-7 6z", "#5f9a3a"],
      ]}
      linhas={[
        "M31 19c14-1 23 8 23 19 0 10-9 18-22 18-14 0-22-8-22-19 0-10 8-17 21-18",
        "M32 20l-7-6M32 20l7-6M32 20l-9 1M32 20l9 1M32 20V10",
        "M18 31c-2 3-2 6-1 9",
      ]}
    />
  );
}

export function Cebola(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[["M32 14c-3 5-20 12-20 26 0 9 9 15 20 15s20-6 20-15c0-14-17-21-20-26z", "#e9b44c"]]}
      linhas={[
        "M32 13c-2 5-20 12-20 27 0 9 9 15 20 15 12 0 20-6 20-15 0-15-18-22-20-27",
        "M32 13l-2-5M32 13l2-6M32 13l4-4",
        "M26 22c-5 8-6 20-1 31M38 22c5 8 6 20 1 31M32 20v34",
        "M28 55l-2 3M32 55v3M36 55l2 3",
      ]}
    />
  );
}

export function Brocolis(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[
        ["M18 33a8 8 0 0 1 2-15 9 9 0 0 1 16-4 8 8 0 0 1 12 8 8 8 0 0 1-2 14H20a5 5 0 0 1-2-3z", "#1f8a5c"],
        ["M27 36l2 18h8l2-18z", "#7fb069"],
      ]}
      linhas={[
        "M19 32a8 8 0 0 1 2-14 9 9 0 0 1 16-4 8 8 0 0 1 11 8 8 8 0 0 1-3 14H22c-2 0-3-2-3-4",
        "M27 36l2 18h8l2-18",
        "M33 36v-6M28 40l-4-6M38 40l4-6",
        "M24 24c2-1 4-1 5 1M36 21c2 0 3 1 4 3",
      ]}
    />
  );
}

export function Folha(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[["M10 52C11 30 27 13 53 11c-1 25-17 40-43 41z", "#5f9a3a"]]}
      linhas={[
        "M11 53C11 30 27 12 54 10c-1 26-18 42-43 43",
        "M11 53c12-14 22-24 34-34",
        "M23 42l-1-8M29 36v-8M35 30l1-7M27 39l9 1M33 33h8",
      ]}
    />
  );
}

export function Ervilha(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[["M10 46c8 8 26 6 38-8 6-7 8-15 6-20-6 9-14 18-26 24-7 3-13 4-18 4z", "#a6cf5f"]]}
      linhas={[
        "M10 46c8 8 26 6 38-8 7-8 8-16 6-21",
        "M10 46c5 0 11-1 18-4 12-6 20-15 26-25",
        "M20 47a3 3 0 1 0 0-.1M28 44a3 3 0 1 0 0-.1M36 39a3 3 0 1 0 0-.1M43 32a3 3 0 1 0 0-.1",
        "M54 17l3-6",
      ]}
    />
  );
}

export function Alho(p: Props) {
  return (
    <Desenho
      {...p}
      manchas={[["M32 16c4 6 18 12 18 24 0 9-8 15-18 15s-18-6-18-15c0-12 14-18 18-24z", "#fbf6ea"]]}
      linhas={[
        "M32 15c3 6 18 12 18 25 0 9-8 15-18 15s-18-6-18-15c0-13 15-19 18-25",
        "M32 15V8M29 8h6",
        "M25 26c-4 7-4 18 2 28M39 26c4 7 4 18-2 28M32 24v31",
      ]}
    />
  );
}

/** Faixa decorativa com vários legumes espalhados. */
export function FaixaLegumes({ className = "" }: { className?: string }) {
  const itens = [Cenoura, Tomate, Cebola, Brocolis, Ervilha, Alho, Folha, Tomate];
  return (
    <div className={`pointer-events-none flex items-center justify-between gap-6 ${className}`} aria-hidden="true">
      {itens.map((C, i) => (
        <C key={i} className={`h-14 w-14 shrink-0 sm:h-20 sm:w-20 ${i % 2 ? "rotate-6" : "-rotate-6"}`} />
      ))}
    </div>
  );
}
