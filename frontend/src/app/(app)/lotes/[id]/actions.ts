"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, buscarLote, ErroApi, requireUser } from "@/lib/api";
import { caminhoSeguro } from "@/lib/caminho";
import { brl, diasAte, ehInteira, hojeISO, lerNumero, qtd } from "@/lib/format";

function comAviso(caminho: string, msg: string) {
  const [base, busca = ""] = caminho.split("?");
  const p = new URLSearchParams(busca);
  p.set("ok", msg);
  return `${base}?${p.toString()}`;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof ErroApi ? e.message : padrao);

/** Registra uso ou descarte (POST /lote/:id/movimentacao). A API Haskell valida as regras. */
export async function movimentar(formData: FormData) {
  await requireUser();

  const loteId = String(formData.get("lote_id"));
  const voltar = caminhoSeguro(formData.get("voltar"));
  const tipo = formData.get("tipo") === "descarte" ? "descarte" : "uso";
  const quantidade = lerNumero(formData.get("quantidade"));
  const falha = (msg: string) => {
    const p = new URLSearchParams({ tipo, erro: msg, voltar });
    redirect(`/lotes/${loteId}?${p.toString()}`);
  };

  const lote = await buscarLote(loteId);
  // Checagens rápidas antes de chamar a API (a API repete todas)
  if (lote) {
    const vencido = diasAte(lote.validade) < 0;
    const motivo = String(formData.get("motivo"));
    if (ehInteira(lote.unidade) && !Number.isInteger(quantidade))
      falha(`Use um número inteiro: não existe fração de ${lote.unidade}.`);
    if (tipo === "uso" && vencido)
      falha("Lote vencido não pode ser usado nem doado (RDC 216/2004). Registre o descarte.");
    if (tipo === "descarte" && motivo === "vencido" && !vencido)
      falha("A validade ainda não passou: escolha 'Estragado' ou 'Sobra'.");
  }

  try {
    await api("POST", `/lote/${loteId}/movimentacao`, {
      tipo,
      quantidade,
      motivo: tipo === "descarte" ? String(formData.get("motivo")) : null,
      destino: tipo === "uso" ? String(formData.get("destino")) : null,
    });
  } catch (e) {
    falha(mensagem(e, "Não foi possível registrar."));
  }

  const resumo = lote
    ? `${lote.produto}: ${qtd(quantidade, lote.unidade)} (${brl(quantidade * lote.custo_unitario)})`
    : "";
  const msg = tipo === "descarte" ? `Descarte registrado. ${resumo}` : `Uso registrado. ${resumo}`;

  revalidatePath("/", "layout");
  redirect(comAviso(voltar, msg.trim()));
}

/** DELETE /lote/:id */
export async function excluirLote(formData: FormData) {
  await requireUser();
  const loteId = String(formData.get("lote_id"));
  const voltar = caminhoSeguro(formData.get("voltar"));

  try {
    await api("DELETE", `/lote/${loteId}`);
  } catch (e) {
    redirect(`/lotes/${loteId}?erro=${encodeURIComponent(mensagem(e, "Não foi possível excluir."))}`);
  }

  revalidatePath("/", "layout");
  redirect(comAviso(voltar, "Lote excluído."));
}

/**
 * Corrige um lote cadastrado errado. Sem histórico: PUT /lote/:id (troca tudo).
 * Com usos/descartes: PATCH /lote/:id/dados (só nome, código e datas), para não
 * deixar o histórico em R$ inconsistente.
 */
export async function editarLote(formData: FormData) {
  await requireUser();
  const loteId = String(formData.get("lote_id"));
  const voltar = caminhoSeguro(formData.get("voltar"));
  const falha = (msg: string) =>
    redirect(`/lotes/${loteId}/editar?${new URLSearchParams({ erro: msg, voltar }).toString()}`);

  const produto = String(formData.get("produto") ?? "").trim();
  const validade = String(formData.get("validade") ?? "");
  const recebido = String(formData.get("recebido_em") ?? "");
  const codigo = String(formData.get("lote") ?? "").trim() || null;
  if (!produto) falha("Informe o nome do insumo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade) || !/^\d{4}-\d{2}-\d{2}$/.test(recebido))
    falha("Informe as datas de recebimento e validade.");
  if (recebido > hojeISO()) falha("A data de recebimento não pode ser no futuro.");
  if (validade < recebido) falha("A validade não pode ser antes da data de recebimento.");

  const lote = await buscarLote(loteId);
  if (!lote) falha("Lote não encontrado.");

  try {
    if (lote!.movimentacoes === 0) {
      const quantidade = lerNumero(formData.get("quantidade"));
      const custoTotal = lerNumero(formData.get("custo_total"));
      const unidade = String(formData.get("unidade") ?? "un");
      if (!(quantidade > 0)) falha("Quantidade deve ser maior que zero.");
      if (ehInteira(unidade) && !Number.isInteger(quantidade))
        falha(`Use um número inteiro: não existe fração de ${unidade}.`);
      if (!(custoTotal >= 0)) falha("Custo inválido. Use o formato 89,90.");
      await api("PUT", `/lote/${loteId}`, {
        produto,
        codigo,
        unidade,
        quantidade,
        custoTotal,
        validade,
        recebidoEm: recebido,
      });
    } else {
      await api("PATCH", `/lote/${loteId}/dados`, { produto, codigo, validade, recebidoEm: recebido });
    }
  } catch (e) {
    falha(mensagem(e, "Não foi possível salvar."));
  }

  revalidatePath("/", "layout");
  redirect(`/lotes/${loteId}?${new URLSearchParams({ voltar }).toString()}`);
}
