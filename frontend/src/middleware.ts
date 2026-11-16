import { NextResponse, type NextRequest } from "next/server";

/**
 * Sem cookie de sessão, manda para /login. A validade do token é conferida pela API Haskell
 * em cada chamada (requireUser redireciona para /login se a sessão expirou).
 */
export function middleware(request: NextRequest) {
  const temSessao = Boolean(request.cookies.get("pz_token")?.value);
  const naLogin = request.nextUrl.pathname.startsWith("/login");

  if (!temSessao && !naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (temSessao && naLogin && !request.nextUrl.searchParams.has("erro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
