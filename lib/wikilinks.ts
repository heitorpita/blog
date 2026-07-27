/** Extrai os alvos de `[[Alvo]]` do markdown, sem repetir e ignorando blocos de código. */
export function parseWikiLinks(markdown: string): string[] {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");

  const targets = new Set<string>();

  for (const match of withoutCode.matchAll(/\[\[([^\][|]+)(?:\|[^\][]*)?\]\]/g)) {
    const target = match[1].trim();
    if (target) targets.add(target);
  }

  return [...targets];
}

/** Chave de comparação tolerante a acento e caixa, para casar `[[Limites]]` com "limites". */
export function linkKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}
