import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { CampoQuantidade } from "@/components/CampoQuantidade";
import {
  DESTINOS,
  MOTIVOS,
  ROTULO_ALERTA,
  brl,
  dataBR,
  diasAte,
  nivelAlerta,
  qtd,
  textoDias,
  type Lote,
} from "@/lib/format";
import { buscarLote, requireUser } from "@/lib/api";
import { caminhoSeguro } from "@/lib/caminho";
import { excluirLote, movimentar } from "./actions";

const DICA_MOTIVO: Record<keyof typeof MOTIVOS, string> = {
  vencido: "Passou da validade sem ser usado. Sinal de compra em excesso ou giro de estoque.",
  estragado: "Estragou antes da validade. Sinal de armazenamento: temperatura, embalagem, manuseio.",
  sobra: "Foi preparado e não saiu. Sinal de produção acima da venda.",
};

const DICA_DESTINO: Record<keyof typeof DESTINOS, string> = {
  uso_normal: "Consumido na rotina da cozinha, como planejado.",
  prato_do_dia: "Aproveitado num prato especial para não vencer no estoque.",
  promocao: "Vendido com desconto para sair antes de vencer.",
  doacao: "Doado a ONG ou banco de alimentos, ainda dentro da validade e próprio para consumo.",
};

const NOME_VOLTAR: Record<string, string> = { "/": "Painel", "/insumos": "Estoque" };

export default async function MovimentarLote({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; erro?: string; voltar?: string }>;
}) {
  const { id } = await params;
  const { tipo: tipoParam, erro, voltar: voltarParam } = await searchParams;
  const tipo = tipoParam === "descarte" ? "descarte" : "uso";
  const voltar = caminhoSeguro(voltarParam ?? "/");
  const linkTipo = (t: string) => `/lotes/${id}?tipo=${t}&voltar=${encodeURIComponent(voltar)}`;

  await requireUser();
  const data = await buscarLote(id);
  if (!data) notFound();
  const lote = data as Lote;
  const dias = diasAte(lote.validade);
  const nivel = nivelAlerta(dias);

  return (
    <div className="space-y-4">
      <Link
        href={voltar}
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        <Icone nome="voltar" className="h-4 w-4" />
        {NOME_VOLTAR[voltar.split("?")[0]] ?? "Voltar"}
      </Link>

      <div className="cartao">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-extrabold tracking-tight">{lote.produto}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              nivel === "vencido" || nivel === "hoje"
                ? "bg-red-100 text-red-800"
                : nivel === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
            }`}
          >
            {nivel === "ok" ? textoDias(dias) : ROTULO_ALERTA[nivel]}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-stone-500">Saldo</dt>
            <dd className="font-semibold">{qtd(lote.quantidade, lote.unidade)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Valor</dt>
            <dd className="font-semibold">{brl(lote.quantidade * lote.custo_unitario)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Validade</dt>
            <dd className="font-semibold">{dataBR(lote.validade)}</dd>
          </div>
        </dl>
        <Link
          href={`/lotes/${id}/editar?voltar=${encodeURIComponent(voltar)}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mata hover:underline"
        >
          Editar dados do lote <Icone nome="avancar" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Alternância Usar / Descartar */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1">
        <Link
          href={linkTipo("uso")}
          replace
          aria-current={tipo === "uso"}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-stone-600 aria-[current=true]:bg-white aria-[current=true]:text-emerald-800 aria-[current=true]:shadow-sm"
        >
          <Icone nome="usar" className="h-4 w-4" traco={2.5} /> Usar
        </Link>
        <Link
          href={linkTipo("descarte")}
          replace
          aria-current={tipo === "descarte"}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-stone-600 aria-[current=true]:bg-white aria-[current=true]:text-red-700 aria-[current=true]:shadow-sm"
        >
          <Icone nome="lixo" className="h-4 w-4" /> Descartar
        </Link>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {lote.quantidade <= 0 ? (
        <p className="cartao text-center text-stone-600">Este lote já foi totalmente baixado.</p>
      ) : tipo === "uso" && dias < 0 ? (
        <div className="cartao space-y-3 text-sm">
          <p className="font-semibold text-red-700">Lote vencido não pode ser usado nem doado.</p>
          <p className="text-stone-600">
            Pela RDC 216/2004 da Anvisa, insumo vencido não pode ir para preparo. A Lei
            14.016/2020 só permite doar alimento dentro da validade.
          </p>
          <Link href={linkTipo("descarte")} replace className="btn-perigo w-full">
            Registrar descarte
          </Link>
        </div>
      ) : (
        <form key={tipo} action={movimentar} className="cartao space-y-5">
          <input type="hidden" name="lote_id" value={lote.id} />
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="voltar" value={voltar} />

          <CampoQuantidade saldo={Number(lote.quantidade)} unidade={lote.unidade} custo={Number(lote.custo_unitario)} tipo={tipo} />

          <fieldset>
            <legend className="rotulo">{tipo === "descarte" ? "Motivo" : "Para onde vai?"}</legend>
            <div className="mt-2 grid gap-2">
              {tipo === "descarte"
                ? Object.entries(MOTIVOS).map(([valor, rotulo]) => {
                    const bloqueado = valor === "vencido" && dias >= 0;
                    return (
                      <Opcao
                        key={valor}
                        nome="motivo"
                        valor={valor}
                        rotulo={rotulo}
                        dica={DICA_MOTIVO[valor as keyof typeof MOTIVOS] + (bloqueado ? " (a validade ainda não passou)" : "")}
                        marcado={valor === (dias < 0 ? "vencido" : "estragado")}
                        bloqueado={bloqueado}
                        cor="red"
                      />
                    );
                  })
                : Object.entries(DESTINOS).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      nome="destino"
                      valor={valor}
                      rotulo={rotulo}
                      dica={DICA_DESTINO[valor as keyof typeof DESTINOS]}
                      selo={valor !== "uso_normal" ? "conta como salvo" : undefined}
                      alerta={
                        valor === "doacao" && dias <= 1
                          ? `${dias === 0 ? "Vence hoje" : "Vence amanhã"}: confirme se a instituição consegue buscar e distribuir a tempo. O ideal é doar com 2 a 3 dias de folga.`
                          : undefined
                      }
                      marcado={valor === (dias <= 3 ? "prato_do_dia" : "uso_normal")}
                      cor="emerald"
                    />
                  ))}
            </div>
          </fieldset>

          <BotaoEnviar className={tipo === "descarte" ? "btn-perigo w-full" : "btn-primario w-full"}>
            {tipo === "descarte" ? "Registrar descarte" : "Registrar uso"}
          </BotaoEnviar>
        </form>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-stone-500 hover:text-stone-700">
          Lançou errado? Excluir este lote
        </summary>
        <form action={excluirLote} className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <input type="hidden" name="lote_id" value={lote.id} />
          <input type="hidden" name="voltar" value={voltar} />
          <p className="text-red-800">
            O lote e todos os usos/descartes dele serão apagados e saem do relatório. Use só para
            corrigir um cadastro errado ou duplicado. Não dá para desfazer.
          </p>
          <BotaoEnviar pendente="Excluindo…" className="btn-perigo w-full">
            Excluir lote definitivamente
          </BotaoEnviar>
        </form>
      </details>
    </div>
  );
}

function Opcao({
  nome,
  valor,
  rotulo,
  dica,
  selo,
  alerta,
  marcado,
  bloqueado,
  cor,
}: {
  nome: string;
  valor: string;
  rotulo: string;
  dica: string;
  selo?: string;
  alerta?: string;
  marcado: boolean;
  bloqueado?: boolean;
  cor: "red" | "emerald";
}) {
  const ativo =
    cor === "red"
      ? "has-[:checked]:border-red-500 has-[:checked]:bg-red-50/70 has-[:checked]:ring-1 has-[:checked]:ring-red-500"
      : "has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50/70 has-[:checked]:ring-1 has-[:checked]:ring-emerald-600";
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm transition ${ativo} ${
        bloqueado ? "cursor-not-allowed opacity-40" : "cursor-pointer active:scale-[0.99]"
      }`}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        required
        disabled={bloqueado}
        defaultChecked={marcado && !bloqueado}
        className={`mt-0.5 h-4 w-4 ${cor === "red" ? "accent-red-600" : "accent-emerald-700"}`}
      />
      <span>
        <span className="font-semibold text-stone-900">{rotulo}</span>
        {selo && (
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            {selo}
          </span>
        )}
        <span className="block text-stone-600">{dica}</span>
        {alerta && <span className="mt-1 block font-medium text-amber-700">{alerta}</span>}
      </span>
    </label>
  );
}
