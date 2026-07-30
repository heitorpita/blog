import GithubSlugger from "github-slugger";

/**
 * Prefixo que o `rehype-sanitize` põe em todo `id` para impedir DOM clobbering
 * (um título chamado "body" viraria `document.body`). Ele é o padrão da
 * biblioteca; está declarado aqui porque o sumário precisa apontar para o id
 * final, e `components/journal/markdown.tsx` importa esta constante para
 * configurar o sanitizador — assim os dois lados não podem divergir.
 */
export const HEADING_ID_PREFIX = "user-content-";

export type TocEntry = { depth: number; text: string; slug: string };

/**
 * Sumário a partir dos títulos do markdown.
 *
 * O slug SAI do `github-slugger`, não do nosso `slugify`, porque é ele que o
 * `rehype-slug` usa para gerar os `id` na hora de renderizar. Os dois divergem:
 * o nosso tira acento ("integrais-improprias") e o do rehype mantém
 * ("integrais-impróprias"). Num app em português isso deixava praticamente todo
 * link do sumário apontando para uma âncora inexistente.
 *
 * A instância é criada por chamada de propósito: o slugger guarda estado para
 * desambiguar títulos repetidos ("limites", "limites-1"), exatamente como o
 * rehype-slug faz ao percorrer o mesmo documento.
 */
export function extractToc(markdown: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const entries: TocEntry[] = [];
  let insideCodeFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    if (insideCodeFence) continue;

    const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2].replace(/[*_`]/g, "");
    entries.push({
      depth: match[1].length,
      text,
      slug: `${HEADING_ID_PREFIX}${slugger.slug(text)}`,
    });
  }

  return entries;
}
