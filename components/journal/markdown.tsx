import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { HEADING_ID_PREFIX } from "@/lib/toc";

// Schema padrão (preserva `id`, tabelas, `del` e checkboxes do GFM, e limita
// href a http/https/mailto), com o prefixo anti-clobbering vindo da mesma
// constante que o sumário usa para montar os links.
const schema = { ...defaultSchema, clobberPrefix: HEADING_ID_PREFIX };

// Um renderizador só, usado pela leitura do post (servidor) e pela prévia do
// editor (navegador). Antes eram dois: o post ia por MDX e a prévia por um
// renderizador caseiro que só entendia título e parágrafo — ou seja, a prévia
// mentia sobre listas, tabelas, negrito, links e código.
//
// E MDX saiu por um motivo mais sério: MDX não é Markdown. As expressões `{}`
// são AVALIADAS, então um post com {process.env.DATABASE_URL} imprimiria a
// connection string. Pior no dia a dia: uma chave `{` solta — escrevendo sobre
// conjuntos, derivadas ou código — quebrava a compilação e deixava o post
// inacessível, inclusive para corrigir.
//
// Ordem dos plugins importa: `rehype-slug` cria os `id` dos títulos e o
// `rehype-sanitize` roda depois, com o schema padrão (que preserva `id`, tabelas,
// `del` e os checkboxes do GFM, e permite href só em http/https/mailto).
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, [rehypeSanitize, schema]]}
    >
      {children}
    </ReactMarkdown>
  );
}
