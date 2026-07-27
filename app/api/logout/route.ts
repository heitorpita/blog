import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = new Response(null, { status: 204 });

  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );

  return response;
}
