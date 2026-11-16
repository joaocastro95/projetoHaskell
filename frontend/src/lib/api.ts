import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Lote } from "./format";

/**
 * Cliente da API Haskell (Servant). Roda só no servidor do Next: as chamadas vão de
 * localhost:8080 (site) para localhost:8081 (API), então não há CORS e o token nunca aparece no JavaScript
 * do navegador (fica num cookie httpOnly).
 */
const API = process.env.API_URL ?? "http://localhost:8081";
export const COOKIE_TOKEN = "pz_token";

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export type Usuario = { id: number; email: string; restaurante: string };

/** Chama a API com o token do cookie. Lança ErroApi com a mensagem {"erro": "..."} da API. */
export async function api<T = unknown>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const token = (await cookies()).get(COOKIE_TOKEN)?.value;
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, {
      method: metodo,
      cache: "no-store",
      headers: {
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(503, "Não foi possível falar com a API Haskell. Ela está rodando (cabal run)?");
  }
  if (r.status === 204) return null as T;
  const texto = await r.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    /* resposta não-JSON */
  }
  if (!r.ok) {
    const msg = (json as { erro?: string } | null)?.erro ?? (texto || `Erro ${r.status}`);
    throw new ErroApi(r.status, msg);
  }
  return json as T;
}

/** Usuário logado, ou redireciona para /login (sem token ou sessão expirada). */
export async function requireUser(): Promise<{ user: Usuario }> {
  try {
    const user = await api<Usuario>("GET", "/eu");
    return { user };
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) redirect("/login");
    throw e;
  }
}

/** Formato do lote como a API Haskell devolve. */
export type LoteApi = {
  id: number;
  produto: string;
  codigo: string | null;
  unidade: string;
  quantidadeInicial: number;
  quantidade: number;
  custoUnitario: number;
  validade: string;
  recebidoEm: string;
  diasParaVencer: number;
  nivel: string;
  movimentacoes: number;
};

/** Converte para o formato que as telas já usam. */
export function paraLote(l: LoteApi): Lote & { movimentacoes: number } {
  return {
    id: String(l.id),
    produto: l.produto,
    lote: l.codigo,
    unidade: l.unidade,
    quantidade_inicial: l.quantidadeInicial,
    quantidade: l.quantidade,
    custo_unitario: l.custoUnitario,
    validade: l.validade,
    recebido_em: l.recebidoEm,
    movimentacoes: l.movimentacoes,
  };
}

export async function listarLotes() {
  return (await api<LoteApi[]>("GET", "/lotes")).map(paraLote);
}

export async function buscarLote(id: string) {
  try {
    return paraLote(await api<LoteApi>("GET", `/lote/${encodeURIComponent(id)}`));
  } catch (e) {
    if (e instanceof ErroApi && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}
