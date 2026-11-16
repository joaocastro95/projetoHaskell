import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { Icone } from "@/components/Icone";
import { Cebola } from "@/components/Legumes";
import { LoteCard } from "@/components/LoteCard";
import { brl, hojeISO, somarDias, type Lote } from "@/lib/format";
import { listarLotes, requireUser } from "@/lib/api";

const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "vencidos", rotulo: "Vencidos" },
  { id: "3dias", rotulo: "Até 3 dias" },
  { id: "7dias", rotulo: "Até 7 dias" },
] as const;

export default async function Estoque({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; f?: string }>;
}) {
  const { q, ok, f: fParam } = await searchParams;
  const f = FILTROS.some((x) => x.id === fParam) ? fParam! : "todos";
  await requireUser();
  const hoje = hojeISO();

  // A API devolve os lotes com saldo, do que vence primeiro ao último; aqui só filtramos.
  const busca = (q ?? "").trim().toLowerCase();
  const lotes: Lote[] = (await listarLotes()).filter((l) => {
    if (busca && !l.produto.toLowerCase().includes(busca)) return false;
    if (f === "vencidos") return l.validade < hoje;
    if (f === "3dias") return l.validade >= hoje && l.validade <= somarDias(hoje, 3);
    if (f === "7dias") return l.validade >= hoje && l.validade <= somarDias(hoje, 7);
    return true;
  });
  const valorTotal = lotes.reduce((s, l) => s + l.quantidade * l.custo_unitario, 0);

  const link = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, f, ...params })) if (v && v !== "todos") p.set(k, v);
    const s = p.toString();
    return s ? `/insumos?${s}` : "/insumos";
  };
  const voltar = link({});

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Estoque</h1>
          <p className="text-sm text-stone-600">
            {lotes.length} lote(s) · {brl(valorTotal)}
          </p>
        </div>
        <Link href="/insumos/novo" className="btn-primario hidden shrink-0 sm:inline-flex">
          <Icone nome="mais" traco={2.5} /> Entrada
        </Link>
      </div>

      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      <form className="relative">
        {f !== "todos" && <input type="hidden" name="f" value={f} />}
        <Icone nome="busca" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar insumo…"
          className="campo mt-0 pl-11"
          type="search"
          enterKeyHint="search"
        />
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((x) => (
          <Link key={x.id} href={link({ f: x.id })} replace aria-current={f === x.id} className="chip shrink-0">
            {x.rotulo}
          </Link>
        ))}
      </div>

      <p className="text-xs text-stone-500">Ordem: primeiro que vence, primeiro que sai.</p>

      {lotes.length === 0 ? (
        <div className="cartao flex flex-col items-center gap-2 p-6 text-center text-stone-600">
          <Cebola className="h-16 w-16" />
          {q || f !== "todos" ? (
            <>
              Nada encontrado.{" "}
              <Link href="/insumos" className="font-medium text-emerald-700 underline">
                Limpar filtros
              </Link>
            </>
          ) : (
            <>
              Estoque vazio.{" "}
              <Link href="/insumos/novo" className="font-medium text-emerald-700 underline">
                Cadastrar entrada
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {lotes.map((l) => (
            <LoteCard key={l.id} lote={l} hoje={hoje} voltar={voltar} />
          ))}
        </ul>
      )}
    </div>
  );
}
