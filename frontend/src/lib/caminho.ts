/** Só aceita caminhos internos do app (evita redirecionar para outro site). */
export function caminhoSeguro(v: FormDataEntryValue | string | null | undefined): string {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}
