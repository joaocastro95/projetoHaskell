"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, COOKIE_TOKEN, ErroApi } from "@/lib/api";

type Sessao = { token: string; email: string; restaurante: string };

const irPara = (params: Record<string, string>) =>
  redirect(`/login?${new URLSearchParams(params).toString()}`);

async function guardarSessao(s: Sessao) {
  (await cookies()).set(COOKIE_TOKEN, s.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias, igual à sessão na API
  });
}

function credenciais(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    senha: String(formData.get("senha") ?? ""),
  };
}

export async function entrar(formData: FormData) {
  let sessao: Sessao;
  try {
    sessao = await api<Sessao>("POST", "/login", { ...credenciais(formData), restaurante: null });
  } catch (e) {
    irPara({ erro: e instanceof ErroApi ? e.message : "Não foi possível entrar." });
  }
  await guardarSessao(sessao!);
  redirect("/");
}

export async function cadastrar(formData: FormData) {
  const restaurante = String(formData.get("restaurante") ?? "").trim() || "Meu restaurante";
  let sessao: Sessao;
  try {
    sessao = await api<Sessao>("POST", "/cadastro", { ...credenciais(formData), restaurante });
  } catch (e) {
    irPara({ erro: e instanceof ErroApi ? e.message : "Não foi possível criar a conta." });
  }
  await guardarSessao(sessao!);
  redirect("/?bemvindo=1");
}

export async function sair() {
  try {
    await api("POST", "/logout");
  } catch {
    /* sessão já inválida */
  }
  (await cookies()).delete(COOKIE_TOKEN);
  redirect("/login");
}
