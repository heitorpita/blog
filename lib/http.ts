import type { z } from "zod";

/**
 * Lê e valida o corpo JSON de uma requisição.
 *
 * O padrão anterior — `schema.safeParse(await request.json())` — tinha um furo:
 * `request.json()` LANÇA quando o corpo não é JSON válido, e isso acontece
 * antes do `safeParse` rodar. Resultado: corpo malformado virava 500 em vez de
 * 400, com o schema cuidadoso nunca chegando a ser consultado.
 */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Corpo da requisição não é JSON válido" },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json({ error: parsed.error.issues }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed.data };
}
