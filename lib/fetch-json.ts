// Cliente HTTP dos componentes do navegador.
//
// Antes cada componente chamava `fetch` solto: `task-manager` e `topic-checklist`
// nem liam `response.ok`, então o toast "+30 XP" comemorava mesmo quando o PATCH
// tinha falhado — e numa sessão expirada o usuário via a comemoração e era
// deslogado no refresh seguinte. Pior: uma falha de rede faz o `fetch` REJEITAR,
// e a exceção sumia dentro do handler de evento sem nada aparecer na tela.
//
// Este helper nunca lança: devolve um resultado que obriga quem chama a olhar.

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

/** `status: 0` significa que a requisição nem chegou ao servidor. */
export const OFFLINE_STATUS = 0;

function messageFor(status: number): string {
  if (status === OFFLINE_STATUS) return "Sem conexão. Verifique a internet e tente de novo.";
  if (status === 401) return "Sua sessão expirou. Entrando de novo…";
  if (status === 404) return "Este item não existe mais. Atualize a página.";
  if (status === 429) return "Muitas tentativas. Espere um pouco.";
  if (status >= 500) return "O servidor falhou. Tente de novo em instantes.";
  return "Não foi possível concluir a ação.";
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, status: OFFLINE_STATUS, message: messageFor(OFFLINE_STATUS) };
  }

  if (!response.ok) {
    // Sessão expirada não é erro para mostrar e esquecer: o usuário precisa
    // voltar ao login, senão fica clicando em botões que nunca vão funcionar.
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }

    return { ok: false, status: response.status, message: messageFor(response.status) };
  }

  if (response.status === 204) return { ok: true, data: undefined as T };

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    // 2xx sem corpo JSON: a mutação funcionou, só não há o que ler.
    return { ok: true, data: undefined as T };
  }
}

/** Açúcar para as mutações, que sempre mandam JSON. */
export function jsonBody(method: "POST" | "PATCH" | "DELETE", body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  };
}
