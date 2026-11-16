"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ehInteira, hojeISO, lerNumero } from "@/lib/format";
import { api, ErroApi, requireUser } from "@/lib/api";

function numero(v: FormDataEntryValue | null): number {
  return lerNumero(v);
}

export async function cadastrarLote(formData: FormData) {
  await requireUser();

  const produto = String(formData.get("produto") ?? "").trim();
  const quantidade = numero(formData.get("quantidade"));
  const custoTotal = numero(formData.get("custo_total"));
  const validade = String(formData.get("validade") ?? "");

  const falha = (msg: string) => redirect(`/insumos/novo?erro=${encodeURIComponent(msg)}`);
  if (!produto) falha("Informe o nome do insumo.");
  if (!(quantidade > 0)) falha("Quantidade deve ser maior que zero.");
  const unidade = String(formData.get("unidade") ?? "un");
  if (ehInteira(unidade) && !Number.isInteger(quantidade))
    falha(`Use um número inteiro: não existe fração de ${unidade}.`);
  if (!(custoTotal >= 0)) falha("Custo inválido. Use o formato 89,90.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade)) falha("Informe a data de validade.");

  const hoje = hojeISO();
  const recebidoParam = String(formData.get("recebido_em") ?? "");
  const recebido = /^\d{4}-\d{2}-\d{2}$/.test(recebidoParam) ? recebidoParam : hoje;
  if (recebido > hoje) falha("A data de recebimento não pode ser no futuro.");
  if (validade < recebido) falha("A validade não pode ser antes da data de recebimento.");
  if (validade < hoje)
    falha("Esse lote já está vencido. Não use insumo vencido (RDC 216/2004): devolva ao fornecedor.");

  try {
    await api("POST", "/lote", {
      produto,
      codigo: String(formData.get("lote") ?? "").trim() || null,
      unidade,
      quantidade,
      custoTotal,
      validade,
      recebidoEm: recebido,
    });
  } catch (e) {
    falha(e instanceof ErroApi ? e.message : "Não foi possível salvar.");
  }

  revalidatePath("/", "layout");
  const msg = encodeURIComponent(`${produto} cadastrado.`);
  // t= força um formulário limpo para o próximo cadastro
  redirect(formData.get("continuar") ? `/insumos/novo?ok=${msg}&t=${Date.now()}` : `/insumos?ok=${msg}`);
}
