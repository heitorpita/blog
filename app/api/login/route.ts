import { NextRequest } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isCorrectPassword,
} from "@/lib/auth";

const loginSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    return Response.json({ error: "APP_PASSWORD não configurada" }, { status: 503 });
  }

  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success || !isCorrectPassword(parsed.data.password, password)) {
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }

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
