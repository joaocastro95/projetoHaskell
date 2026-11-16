import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { caminhoSeguro } from "@/lib/caminho";
import { qtd, type Lote } from "@/lib/format";
import { buscarLote, requireUser } from "@/lib/api";
import { editarLote } from "../actions";

const UNIDADES = ["kg", "g", "L", "mL", "un", "cx", "pct", "dz"];

export default async function EditarLote({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; voltar?: string }>;
}) {
  const { id } = await params;
  const { erro, voltar: voltarParam } = await searchParams;
  const voltar = caminhoSeguro(voltarParam ?? "/insumos");

  await requireUser();
  const data = await buscarLote(id);
  if (!data) notFound();
  const lote = data as Lote;
  const temHistorico = (data?.movimentacoes ?? 0) > 0;
  const custoTotal = Math.round(lote.quantidade_inicial * lote.custo_unitario * 100) / 100;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3, useGrouping: false });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href={`/lotes/${id}?voltar=${encodeURIComponent(voltar)}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        <Icone nome="voltar" className="h-4 w-4" /> {lote.produto}
      </Link>
      <div>
        <h1 className="titulo-pagina">Editar lote</h1>
        <p className="text-sm text-stone-500">Corrija o que foi cadastrado errado.</p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <form action={editarLote} className="space-y-4">
        <input type="hidden" name="lote_id" value={lote.id} />
        <input type="hidden" name="voltar" value={voltar} />

        <div className="cartao space-y-4">
          <label className="block">
            <span className="rotulo">Insumo</span>
            <input name="produto" required defaultValue={lote.produto} className="campo" />
          </label>

          {temHistorico ? (
            <Aviso tipo="info">
              Quantidade ({qtd(lote.quantidade_inicial, lote.unidade)}), unidade e custo não podem mudar
              porque este lote já tem usos ou descartes registrados. Se estiver errado, exclua o lote e
              cadastre de novo.
            </Aviso>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block">
                  <span className="rotulo">Quantidade</span>
                  <input name="quantidade" required inputMode="decimal" defaultValue={fmt(lote.quantidade_inicial)} className="campo" />
                </label>
                <label className="block">
                  <span className="rotulo">Unidade</span>
                  <select name="unidade" defaultValue={lote.unidade} className="campo pr-8">
                    {UNIDADES.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="rotulo">Quanto pagou pelo lote (R$)</span>
                <input
                  name="custo_total"
                  required
                  inputMode="decimal"
                  defaultValue={custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, useGrouping: false })}
                  className="campo"
                />
              </label>
            </>
          )}
        </div>

        <div className="cartao grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="rotulo">Recebido em</span>
            <input name="recebido_em" type="date" required defaultValue={lote.recebido_em} className="campo" />
          </label>
          <label className="block">
            <span className="rotulo">Validade</span>
            <input name="validade" type="date" required defaultValue={lote.validade} className="campo" />
          </label>
          <label className="block">
            <span className="rotulo">Código do lote</span>
            <input name="lote" defaultValue={lote.lote ?? ""} placeholder="Opcional" className="campo" />
          </label>
        </div>

        <BotaoEnviar className="btn-primario w-full">Salvar alterações</BotaoEnviar>
      </form>
    </div>
  );
}
