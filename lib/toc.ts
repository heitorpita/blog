import { slugify } from "@/lib/slug";

export type TocEntry = { depth: number; text: string; slug: string };

export function extractToc(markdown: string): TocEntry[] {
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
    entries.push({ depth: match[1].length, text, slug: slugify(text) });
  }

  return entries;
}
