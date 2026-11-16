"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "./Icone";

const ITENS: { href: string; label: string; icone: NomeIcone }[] = [
  { href: "/", label: "Painel", icone: "painel" },
  { href: "/insumos", label: "Estoque", icone: "estoque" },
  { href: "/indicadores", label: "Indicadores", icone: "pizza" },
  { href: "/relatorio", label: "Perdas", icone: "queda" },
];

function ativo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/insumos") return pathname === "/insumos" || pathname.startsWith("/lotes");
  return pathname.startsWith(href);
}

/** Topo: abas em pílula (telas largas) + Entrada e Conta. No celular, só o botão de Conta. */
export function NavTopo() {
  const pathname = usePathname();
  return (
    <>
      <nav className="hidden items-center gap-1 rounded-full bg-stone-100 p-1 md:flex">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo(pathname, i.href) ? "page" : undefined}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:text-stone-900 aria-[current=page]:bg-white aria-[current=page]:text-stone-900 aria-[current=page]:shadow-sm"
          >
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/insumos/novo" className="btn-limao hidden py-2 text-sm md:inline-flex">
          <Icone nome="mais" className="h-4 w-4" traco={2.5} /> Entrada
        </Link>
        <Link
          href="/conta"
          aria-label="Conta"
          aria-current={ativo(pathname, "/conta") ? "page" : undefined}
          className="seta-canto aria-[current=page]:border-mata aria-[current=page]:bg-limao/40 aria-[current=page]:text-mata"
        >
          <Icone nome="conta" />
        </Link>
      </div>
    </>
  );
}

/** Barra inferior flutuante (celular), com o "+" de entrada em destaque. */
export function NavInferior() {
  const pathname = usePathname();
  const [a, b, c, d] = ITENS;
  const item = (i: (typeof ITENS)[number]) => (
    <Link
      key={i.href}
      href={i.href}
      aria-label={i.label}
      aria-current={ativo(pathname, i.href) ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-white/60 aria-[current=page]:text-limao"
    >
      <Icone nome={i.icone} className="h-[22px] w-[22px]" />
      {i.label}
    </Link>
  );

  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 md:hidden">
      <div className="grid grid-cols-5 items-center rounded-full bg-noite/95 px-2 py-1.5 shadow-2xl shadow-noite/40 ring-1 ring-white/10 backdrop-blur">
        {item(a)}
        {item(b)}
        <Link href="/insumos/novo" aria-label="Nova entrada" className="flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-limao text-noite shadow-lg shadow-limao/30 active:scale-95">
            <Icone nome="mais" className="h-6 w-6" traco={2.75} />
          </span>
        </Link>
        {item(c)}
        {item(d)}
      </div>
    </nav>
  );
}
