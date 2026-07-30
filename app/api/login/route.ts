import { NextRequest } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isCorrectPassword,
} from "@/lib/auth";
import { readJson } from "@/lib/http";
import {
  checkLoginAllowed,
  clientKey,
  registerLoginFailure,
  registerLoginSuccess,
} from "@/lib/login-throttle";

const loginSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    return Response.json({ error: "APP_PASSWORD não configurada" }, { status: 503 });
  }

  const key = clientKey(request);
  const verdict = checkLoginAllowed(key);

  if (!verdict.allowed) {
    return Response.json(
      { error: "Muitas tentativas. Tente de novo mais tarde." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  const body = await readJson(request, loginSchema);

  // Corpo lixo é bot varrendo, não usuário digitando errado: conta como
  // tentativa falha para não virar rota livre de contornar o freio.
  if (!body.ok) {
    registerLoginFailure(key);
    return body.response;
  }

  if (!isCorrectPassword(body.data.password, password)) {
    registerLoginFailure(key);
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }

  registerLoginSuccess(key);

  const response = new Response(null, { status: 204 });

  response.headers.set(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${createSessionToken(password)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );

  return response;
}
