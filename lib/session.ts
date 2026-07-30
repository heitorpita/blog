import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

// Segunda linha de defesa da autenticação. O `proxy.ts` continua existindo para
// redirecionar cedo, mas ele é só uma otimização: a documentação do Next diz
// explicitamente que proxy não deve ser a única checagem, porque um matcher
// alterado ou uma rota movida tiram a cobertura em silêncio. Toda page, layout
// e route handler que toca no banco chama uma das funções daqui.

/**
 * `cache` do React memoiza por requisição: várias chamadas no mesmo render
 * (layout + page + handler) leem o cookie uma vez só.
 */
export const hasSession = cache(async (): Promise<boolean> => {
  const password = process.env.APP_PASSWORD;

  // Sem senha configurada o comportamento espelha o do proxy: em produção
  // ninguém entra, em desenvolvimento o login é dispensado.
  if (!password) return process.env.NODE_ENV !== "production";

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return isValidSessionToken(token, password);
});

/** Para pages e layouts: quem não tem sessão vai para o login. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

/**
 * Para route handlers. Devolve a resposta de erro quando não há sessão e `null`
 * quando pode seguir:
 *
 * ```ts
 * const denied = await denyWithoutSession();
 * if (denied) return denied;
 * ```
 */
export async function denyWithoutSession(): Promise<Response | null> {
  if (await hasSession()) return null;

  if (!process.env.APP_PASSWORD && process.env.NODE_ENV === "production") {
    return Response.json({ error: "APP_PASSWORD não configurada" }, { status: 503 });
  }

  return Response.json({ error: "Não autorizado" }, { status: 401 });
}
