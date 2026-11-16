import { Aviso } from "@/components/Aviso";
import { FormEntrada, type ProdutoConhecido } from "@/components/FormEntrada";
import { hojeISO } from "@/lib/format";
import { api, requireUser } from "@/lib/api";
import { cadastrarLote } from "./actions";

export default async function NovaEntrada({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; t?: string }>;
}) {
  const { erro, ok, t } = await searchParams;
  await requireUser();

  // Produtos já cadastrados (o mais recente de cada) para sugerir nome, unidade e prazo
  const produtos = await api<{ produto: string; unidade: string; custoUnitario: number; vida: number }[]>(
    "GET",
    "/produtos",
  );
  const conhecidos: ProdutoConhecido[] = produtos.map((p) => ({
    produto: p.produto,
    unidade: p.unidade,
    custo_unitario: p.custoUnitario,
    vida: p.vida,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="titulo-pagina">Nova entrada</h1>
        <p className="text-sm text-stone-600">O que chegou do fornecedor?</p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="ok">{ok} Pode lançar o próximo.</Aviso>}

      <FormEntrada key={t ?? "novo"} action={cadastrarLote} hoje={hojeISO()} conhecidos={conhecidos} />
    </div>
  );
}
