export type SubjectSeed = {
  id: string;
  code: string;
  name: string;
  hours: number;
  teacher: string;
  color: string;
  topics: string[];
};

export const subjects: SubjectSeed[] = [
  {
    id: "calculo1",
    code: "ECT3207",
    name: "Cálculo Diferencial e Integral I",
    hours: 90,
    teacher: "A definir",
    color: "#e63946",
    topics: [
      "Limites",
      "Continuidade",
      "Derivadas",
      "Regra da Cadeia",
      "Aplicações da Derivada",
      "Integral Indefinida",
      "Técnicas de Integração",
      "Integral Definida",
      "Aplicações de Integral",
      "Integrais Impróprias",
    ],
  },
  {
    id: "algebra-linear",
    code: "ECT3202",
    name: "Álgebra Linear",
    hours: 60,
    teacher: "Simone Batista",
    color: "#3a86ff",
    topics: [
      "Matrizes e Operações",
      "Sistemas Lineares",
      "Determinantes",
      "Espaços Vetoriais",
      "Combinação Linear e Dependência Linear",
      "Base e Dimensão",
      "Transformações Lineares",
      "Autovalores e Autovetores",
      "Diagonalização de Matrizes",
      "Produto Interno",
    ],
  },
  {
    id: "quimica-geral",
    code: "ECT3206",
    name: "Química Geral",
    hours: 60,
    teacher: "Marcelo Prata Vidal",
    color: "#2a9d8f",
    topics: [
      "Estrutura Atômica",
      "Tabela Periódica",
      "Ligações Químicas",
      "Geometria Molecular",
      "Estequiometria",
      "Soluções e Concentração",
      "Termoquímica",
      "Cinética Química",
      "Equilíbrio Químico",
      "Reações de Oxirredução",
    ],
  },
  {
    id: "modelagem-mundo-fisico",
    code: "ECT3204",
    name: "Modelagem do Mundo Físico I",
    hours: 30,
    teacher: "Neemias Alves de Lima",
    color: "#f4a261",
    topics: [
      "Grandezas Físicas e Unidades",
      "Vetores",
      "Cinemática",
      "Leis de Newton",
      "Trabalho e Energia",
      "Modelagem Matemática de Fenômenos Físicos",
      "Gráficos e Análise de Dados Experimentais",
      "Movimento Circular",
      "Gravitação",
      "Introdução a Modelos Computacionais",
    ],
  },
  {
    id: "leitura-escrita",
    code: "ECT3205",
    name: "Práticas de Leitura e Escrita II",
    hours: 30,
    teacher: "Alana Driziê Gonzatti dos Santos",
    color: "#9b5de5",
    topics: [
      "Leitura Crítica de Textos Acadêmicos",
      "Normas ABNT",
      "Resumo e Resenha",
      "Estruturação de Parágrafos",
      "Argumentação e Coesão Textual",
      "Artigo Científico",
      "Citações e Referências",
      "Revisão e Reescrita de Texto",
      "Comunicação Oral Acadêmica",
      "Ética na Produção Acadêmica",
    ],
  },
];
