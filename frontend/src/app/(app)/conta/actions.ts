"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ErroApi, requireUser } from "@/lib/api";
import { gerarDadosDemo } from "@/lib/demo";
import { hojeISO } from "@/lib/format";

const voltar = (chave: "ok" | "erro", msg: string) =>
  redirect(`/conta?${chave}=${encodeURIComponent(msg)}`);

const mensagem = (e: unknown, padrao: string) => (e instanceof ErroApi ? e.message : padrao);

/** Gera o restaurante fictício e envia para a API Haskell (POST /demo), que troca os dados numa transação. */
export async function carregarDemo(formData: FormData) {
  await requireUser();
  const { lotes, movs } = gerarDadosDemo(hojeISO(), () => crypto.randomUUID());

  try {
    await api("POST", "/demo", {
      confirmar: formData.get("confirmar") === "1",
      lotes: lotes.map((l) => ({
        chave: l.id,
        produto: l.produto,
        codigo: l.lote,
        unidade: l.unidade,
        quantidadeInicial: l.quantidade_inicial,
        quantidade: l.quantidade,
        custoUnitario: l.custo_unitario,
        validade: l.validade,
        recebidoEm: l.recebido_em,
      })),
      movimentacoes: movs.map((m) => ({
        chave: m.lote_id,
        tipo: m.tipo,
        motivo: m.motivo,
        destino: m.destino,
        quantidade: m.quantidade,
        valor: m.valor,
        data: m.created_at.slice(0, 10),
      })),
    });
  } catch (e) {
    voltar("erro", mensagem(e, "Não foi possível carregar os dados de demonstração."));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** DELETE /meus-dados */
export async function apagarDados() {
  await requireUser();
  try {
    await api("DELETE", "/meus-dados");
  } catch (e) {
    voltar("erro", mensagem(e, "Não foi possível apagar os dados."));
  }
  revalidatePath("/", "layout");
  voltar("ok", "Todos os seus dados foram apagados.");
}

/** PATCH /eu */
export async function salvarPerfil(formData: FormData) {
  await requireUser();
  const restaurante = String(formData.get("restaurante") ?? "").trim().slice(0, 60);
  try {
    await api("PATCH", "/eu", { restaurante });
  } catch (e) {
    voltar("erro", mensagem(e, "Não foi possível salvar."));
  }
  revalidatePath("/", "layout");
  voltar("ok", "Nome do restaurante salvo.");
}

/** PUT /eu/senha */
export async function trocarSenha(formData: FormData) {
  await requireUser();
  const senhaAtual = String(formData.get("senha_atual") ?? "");
  const senhaNova = String(formData.get("senha_nova") ?? "");
  if (senhaNova !== String(formData.get("confirmar") ?? "")) voltar("erro", "As duas senhas novas não são iguais.");
  try {
    await api("PUT", "/eu/senha", { senhaAtual, senhaNova });
  } catch (e) {
    voltar("erro", mensagem(e, "Não foi possível trocar a senha."));
  }
  voltar("ok", "Senha alterada.");
}
