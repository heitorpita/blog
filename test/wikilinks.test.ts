import { test } from "node:test";
import assert from "node:assert/strict";
import { linkKey, parseWikiLinks } from "@/lib/wikilinks";
import { slugify } from "@/lib/slug";
import { extractToc } from "@/lib/toc";

test("extrai alvos simples", () => {
  assert.deepEqual(parseWikiLinks("Estudei [[Limites]] e [[Derivadas]] hoje."), [
    "Limites",
    "Derivadas",
  ]);
});

test("alvo repetido aparece uma vez só", () => {
  assert.deepEqual(parseWikiLinks("[[Limites]] e mais [[Limites]]"), ["Limites"]);
});

test("alias com pipe: guarda o alvo, não o texto exibido", () => {
  assert.deepEqual(parseWikiLinks("veja [[Cálculo I|a matéria]]"), ["Cálculo I"]);
});

test("espaços em volta do alvo são aparados", () => {
  assert.deepEqual(parseWikiLinks("[[  Integrais  ]]"), ["Integrais"]);
});

test("link vazio é ignorado", () => {
  assert.deepEqual(parseWikiLinks("[[]] e [[   ]]"), []);
});

test("bloco de código cercado não vira link", () => {
  const md = "Texto [[Real]]\n\n```ts\nconst a = [[Falso]]\n```\n";
  assert.deepEqual(parseWikiLinks(md), ["Real"]);
});

test("código inline não vira link", () => {
  assert.deepEqual(parseWikiLinks("use `[[NaoEhLink]]` mas [[EhLink]] sim"), ["EhLink"]);
});

test("colchete solto não quebra o parser", () => {
  assert.deepEqual(parseWikiLinks("[[Aberto e [[Fechado]]"), ["Fechado"]);
});

test("linkKey ignora acento e caixa, para [[Limites]] casar com 'limites'", () => {
  assert.equal(linkKey("Limites"), linkKey("limites"));
  assert.equal(linkKey("Cálculo"), linkKey("calculo"));
  assert.equal(linkKey("  ÁLGEBRA  "), "algebra");
});

test("linkKey NÃO junta palavras diferentes", () => {
  assert.notEqual(linkKey("Limites"), linkKey("Limite"));
});

test("slugify tira acento, baixa a caixa e junta com hífen", () => {
  assert.equal(slugify("Cálculo Diferencial e Integral II"), "calculo-diferencial-e-integral-ii");
  assert.equal(slugify("  Espaços   demais  "), "espacos-demais");
  assert.equal(slugify("Pontuação!!! e (parênteses)"), "pontuacao-e-parenteses");
});

test("slugify não deixa hífen sobrando nas pontas", () => {
  assert.equal(slugify("---oi---"), "oi");
  assert.equal(slugify("!!!"), "", "só pontuação vira string vazia — quem chama trata");
});

test("slugify é idempotente", () => {
  const uma = slugify("Integrais Impróprias");
  assert.equal(slugify(uma), uma);
});

test("sumário pega os títulos de nível 2 a 4", () => {
  const md = "# Não entra\n## Limites\n### Laterais\n#### Detalhe\n##### Fundo demais\n";
  assert.deepEqual(
    extractToc(md).map((e) => [e.depth, e.text]),
    [
      [2, "Limites"],
      [3, "Laterais"],
      [4, "Detalhe"],
    ],
  );
});

test("título dentro de bloco de código não entra no sumário", () => {
  const md = "## Real\n\n```md\n## Falso\n```\n\n## Outro\n";
  assert.deepEqual(
    extractToc(md).map((e) => e.text),
    ["Real", "Outro"],
  );
});

test("slug do sumário bate com o slugify do texto", () => {
  const [entrada] = extractToc("## Integrais Impróprias\n");
  assert.equal(entrada.slug, slugify("Integrais Impróprias"));
});

test("marcação inline é removida do texto do sumário", () => {
  const [entrada] = extractToc("## O que é **limite**\n");
  assert.equal(entrada.text, "O que é limite");
});
