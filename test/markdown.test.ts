import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/journal/markdown";
import { extractToc } from "@/lib/toc";

const render = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md));

// A troca de MDX por markdown sanitizado existe por causa destes casos.

test("chave solta no texto é só texto — antes quebrava a página inteira", () => {
  // Em MDX, `{` abre expressão: escrever sobre conjuntos derrubava o post, e
  // sem UI de edição ele ficava inacessível até para corrigir.
  const html = render("O conjunto {x : x > 0} é aberto.");
  assert.match(html, /\{x : x &gt; 0\}/);
});

test("expressão não é avaliada", () => {
  const html = render("Valor: {process.env.DATABASE_URL}");
  assert.match(html, /\{process\.env\.DATABASE_URL\}/, "sai literal, como escrito");
});

test("<script> é removido", () => {
  const html = render('Antes\n\n<script>alert("xss")</script>\n\nDepois');
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /alert\(/);
});

test("handler inline em HTML embutido é removido", () => {
  const html = render('<img src="x" onerror="alert(1)">');
  assert.doesNotMatch(html, /onerror/i);
});

test("link javascript: é neutralizado", () => {
  const html = render("[clique](javascript:alert(1))");
  assert.doesNotMatch(html, /href="javascript:/i);
});

test("link http normal continua funcionando", () => {
  assert.match(render("[docs](https://exemplo.com)"), /href="https:\/\/exemplo\.com"/);
});

test("GFM continua ligado: tabela, riscado e checkbox", () => {
  const tabela = render("| a | b |\n| - | - |\n| 1 | 2 |");
  assert.match(tabela, /<table/);

  assert.match(render("~~riscado~~"), /<del>/);

  const lista = render("- [x] feito\n- [ ] pendente");
  assert.match(lista, /type="checkbox"/);
});

test("o id do título casa com o slug que o sumário gera", () => {
  const markdown = "## Integrais Impróprias\n\ntexto\n";
  const [entrada] = extractToc(markdown);
  const html = render(markdown);

  assert.match(
    html,
    new RegExp(`id="${entrada.slug}"`),
    "o href do sumário precisa achar a âncora renderizada",
  );
});

test("títulos repetidos: âncora e sumário continuam casando", () => {
  const markdown = "## Limites\n\na\n\n## Limites\n\nb\n";
  const html = render(markdown);

  for (const entrada of extractToc(markdown)) {
    assert.match(html, new RegExp(`id="${entrada.slug}"`), `sem âncora para ${entrada.slug}`);
  }
});

test("markdown básico ainda renderiza", () => {
  assert.match(render("**forte**"), /<strong>forte<\/strong>/);
  assert.match(render("- um\n- dois"), /<ul>/);
  assert.match(render("```js\nconst a = 1\n```"), /<code/);
});
