import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // Em produção o app falha fechado: sem senha configurada, ninguém entra.
  // Assim um deploy sem a env var não expõe os dados por engano.
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();

    return new NextResponse(
      "APP_PASSWORD não configurada. Defina a variável de ambiente para liberar o acesso.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value, password)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// `api/health` fica de fora porque quem chama é o orquestrador do container, que
// não tem cookie — e a rota não devolve dado nenhum, só se o banco responde.
export const config = {
  matcher: [
    "/((?!login(?:/|$)|api/login(?:/|$)|api/health(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
