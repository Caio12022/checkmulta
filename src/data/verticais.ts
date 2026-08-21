import { Car, Building2, ShieldCheck, Zap, Leaf, Scale, FileText } from "lucide-react";

/**
 * Fonte única de verdade das verticais e ferramentas do CheckMulta.
 *
 * Todo lugar que lista serviços (carrossel, home-mãe, rodapés) deve ler daqui.
 * Vertical nova = uma entrada neste arquivo, e ela aparece em todos os lugares.
 *
 * IMPORTANTE (SEO): os campos "resumo" e "detalhe" são exclusivos desta
 * listagem. Nunca copiar texto da landing da vertical para cá — as duas
 * páginas passariam a competir pelo mesmo termo no Google.
 *
 * Os "href" das especialidades apontam para artigos que já existem no blog.
 * Especialidade sem artigo fica só como texto, sem link — basta acrescentar
 * o href quando o artigo for publicado.
 */

export type VerticalId =
  | "transito"
  | "procon"
  | "vigilancia"
  | "energia"
  | "ibama";

export type FerramentaId = "simulador" | "codigos";

export type ServicoId = VerticalId | FerramentaId;

export interface Especialidade {
  /** Texto curto que aparece na lista dentro do acordeão. */
  texto: string;
  /** Link interno opcional (artigo do blog da vertical). */
  href?: string;
}

export interface Vertical {
  id: VerticalId;
  /** Quem é o cliente. Vira o "eyebrow" acima do título. */
  publico: string;
  /** Título do card. Na home-mãe é renderizado como H3. */
  titulo: string;
  /**
   * Nome curto, para espaços estreitos (menu do blog no celular). O título
   * completo ("Cobrança retroativa de energia") não cabe numa faixa de
   * navegação de 350px sem esconder as outras verticais atrás de rolagem.
   */
  tituloCurto: string;
  /** Resumo de 1-2 linhas, visível sem abrir o acordeão. */
  resumo: string;
  /** Texto que abre na setinha. Explica o serviço, sem repetir a landing. */
  detalhe: string;
  /** O que a vertical cobre. Vira lista de links dentro do acordeão. */
  especialidades: Especialidade[];
  /** Base legal citada. Dá credibilidade e é termo de busca. */
  baseLegal: string;
  /** Faixa de preço da peça. A análise é sempre gratuita. */
  preco: string;
  /** Rota da landing. */
  href: string;
  /** Rota da landing com âncora do upload — reservado para uso futuro. */
  hrefAnalise: string;
  /** Blog da vertical, quando existe. */
  hrefBlog?: string;
  botao: string;
  Icone: typeof Building2;
  cor: { faixa: string; icone: string; fundoIcone: string; texto: string };
}

export interface Ferramenta {
  id: FerramentaId;
  publico: string;
  titulo: string;
  resumo: string;
  href: string;
  botao: string;
  Icone: typeof Building2;
  cor: { faixa: string; icone: string; fundoIcone: string; texto: string };
}

/* ------------------------------------------------------------------ */
/* Verticais                                                           */
/* ------------------------------------------------------------------ */

export const VERTICAIS: Vertical[] = [
  {
    id: "transito",
    publico: "Para motoristas",
    titulo: "Multa de trânsito",
    tituloCurto: "Trânsito",
    resumo:
      "Notificação de autuação ou de penalidade do DETRAN, PRF ou órgão municipal.",
    detalhe:
      "A notificação de trânsito precisa cumprir requisitos formais do Código de Trânsito Brasileiro para valer. Prazo de expedição, descrição do local, identificação do agente e aferição do equipamento são pontos em que o auto costuma falhar. Enviamos a análise gratuita apontando o que foi encontrado e, se houver falha, entregamos a defesa pronta para protocolo.",
    especialidades: [
      {
        texto: "Excesso de velocidade e radar",
        href: "/multa-de-transito/blog/recurso-de-multa-por-excesso-de-velocidade-veja-como-recorrer",
      },
      {
        texto: "Avanço de sinal vermelho",
        href: "/multa-de-transito/blog/multa-sinal-vermelho-como-recorrer",
      },
      {
        texto: "Celular ao volante e cinto de segurança",
        href: "/multa-de-transito/blog/multa-celular-cinto-como-recorrer",
      },
      {
        texto: "Estacionamento irregular",
        href: "/multa-de-transito/blog/multa-estacionamento-como-cancelar",
      },
      {
        texto: "Rodízio municipal",
        href: "/multa-de-transito/blog/multa-rodizio-municipal-como-recorrer",
      },
      {
        texto: "Direção sob efeito de álcool",
        href: "/multa-de-transito/blog/multa-transito-dirigir-alcool",
      },
      {
        texto: "CNH vencida",
        href: "/multa-de-transito/blog/multa-cnh-vencida-o-que-fazer",
      },
      {
        texto: "Notificação recebida fora do prazo",
        href: "/multa-de-transito/blog/multa-chegou-apos-prazo-vencido",
      },
    ],
    baseLegal:
      "Código de Trânsito Brasileiro e Manual Brasileiro de Fiscalização de Trânsito",
    preco: "a partir de R$ 19,90",
    href: "/multa-de-transito",
    hrefAnalise: "/multa-de-transito",
    hrefBlog: "/multa-de-transito/blog",
    botao: "Analisar minha multa",
    Icone: Car,
    cor: { faixa: "#3b82f6", icone: "#1d4ed8", fundoIcone: "#eff6ff", texto: "#1d4ed8" },
  },
  {
    id: "procon",
    publico: "Para empresas",
    titulo: "Multa do Procon",
    tituloCurto: "Procon",
    resumo:
      "Auto de infração lavrado por órgão de proteção e defesa do consumidor.",
    detalhe:
      "O processo administrativo do Procon tem regras próprias de instrução, dosimetria e prazo. Auto genérico, ausência de capitulação legal, multa calculada sem considerar o porte da empresa e falha na notificação são falhas frequentes. A análise é gratuita e só cobramos se houver fundamento para recorrer.",
    especialidades: [
      {
        texto: "Auto com descrição genérica da conduta",
        href: "/procon/blog/descricao-generica-no-auto-de-infracao-um-vicio-que-pode-anular",
      },
      {
        texto: "Ausência de capitulação legal",
        href: "/procon/blog/auto-de-infracao-sem-capitulacao-legal-como-contestar",
      },
      {
        texto: "Multa desproporcional ao porte da empresa",
        href: "/procon/blog/multa-do-procon-como-questionar-o-valor-quando-for-desproporcional",
      },
      {
        texto: "Tratamento diferenciado a ME e EPP",
        href: "/procon/blog/micro-e-pequena-empresa-tratamento-diferenciado-no-procon",
      },
      {
        texto: "Erro na identificação da empresa autuada",
        href: "/procon/blog/erro-na-identificacao-do-autuado-vicio-que-anula-o-auto-de-infracao",
      },
      {
        texto: "Contagem do prazo de defesa",
        href: "/procon/blog/como-contar-o-prazo-de-defesa-em-um-auto-de-infracao-do-procon",
      },
      {
        texto: "Decisão sem motivação",
        href: "/procon/blog/decisao-do-procon-sem-motivacao-como-questionar-essa-nulidade",
      },
      {
        texto: "Diferença entre defesa e recurso",
        href: "/procon/blog/defesa-administrativa-e-recurso-no-procon-entenda-a-diferenca",
      },
    ],
    baseLegal: "Código de Defesa do Consumidor e Decreto 2.181/97",
    preco: "R$ 99,00",
    href: "/procon",
    hrefAnalise: "/procon",
    hrefBlog: "/procon/blog",
    botao: "Analisar o auto",
    Icone: Building2,
    cor: { faixa: "#f97316", icone: "#c2410c", fundoIcone: "#fff7ed", texto: "#c2410c" },
  },
  {
    id: "vigilancia",
    publico: "Para empresas",
    titulo: "Vigilância Sanitária",
    tituloCurto: "Vigilância",
    resumo:
      "Auto de infração sanitária, termo de interdição ou apreensão de produtos.",
    detalhe:
      "A fiscalização sanitária atinge restaurantes, farmácias, clínicas, mercados e indústrias de alimentos. O auto precisa descrever a irregularidade de forma determinada, indicar o dispositivo infringido e observar a gradação da penalidade. A interdição cautelar tem limite de duração e não pode se tornar definitiva por inércia do órgão.",
    especialidades: [
      {
        texto: "Auto sem indicação da norma violada",
        href: "/vigilancia-sanitaria/blog/ausencia-de-indicacao-da-norma-violada-no-auto-de-infracao-sanitaria",
      },
      {
        texto: "Auto sem identificação do agente",
        href: "/vigilancia-sanitaria/blog/auto-de-infracao-sem-identificacao-do-agente-e-possivel-contestar",
      },
      {
        texto: "Interdição cautelar do estabelecimento",
        href: "/vigilancia-sanitaria/blog/interdicao-cautelar-vs-interdicao-como-penalidade-entenda-a-diferenca",
      },
      {
        texto: "Interdição total desproporcional",
        href: "/vigilancia-sanitaria/blog/interdicao-total-desproporcional-como-contestar-o-excesso",
      },
      {
        texto: "Multa sem fundamentação da dosimetria",
        href: "/vigilancia-sanitaria/blog/multa-sanitaria-sem-fundamentacao-dos-criterios-de-dosimetria",
      },
      {
        texto: "Intimação irregular e prazo de defesa",
        href: "/vigilancia-sanitaria/blog/intimacao-irregular-da-vigilancia-sanitaria-e-os-prazos-de-defesa",
      },
      {
        texto: "Cancelamento de licença sanitária",
        href: "/vigilancia-sanitaria/blog/cancelamento-de-licenca-sanitaria-como-reagir-e-reverter-a-situacao",
      },
      {
        texto: "Pedido de reinspeção após regularizar",
        href: "/vigilancia-sanitaria/blog/como-solicitar-reinspecao-da-vigilancia-sanitaria-apos-regularizacao",
      },
    ],
    baseLegal: "Lei 6.437/77",
    preco: "R$ 79,00",
    href: "/vigilancia-sanitaria",
    hrefAnalise: "/vigilancia-sanitaria",
    hrefBlog: "/vigilancia-sanitaria/blog",
    botao: "Analisar o auto",
    Icone: ShieldCheck,
    cor: { faixa: "#ef4444", icone: "#b91c1c", fundoIcone: "#fef2f2", texto: "#b91c1c" },
  },
  {
    id: "energia",
    publico: "Para pessoas e empresas",
    titulo: "Cobrança retroativa de energia",
    tituloCurto: "Energia",
    resumo:
      "TOI ou notificação de recuperação de consumo emitida pela distribuidora.",
    detalhe:
      "O Termo de Ocorrência e Inspeção só sustenta a cobrança se a distribuidora cumprir as providências exigidas pela ANEEL: perícia metrológica, entrega de cópia legível, informação sobre o direito à perícia e demonstração do período de irregularidade. Cobrar o período máximo sem provar quando a irregularidade começou é a falha mais comum.",
    especialidades: [
      {
        texto: "O que é o TOI e para que serve",
        href: "/energia/blog/o-que-e-toi-termo-de-ocorrencia-e-inspecao",
      },
      {
        texto: "TOI lavrado sem o consumidor presente",
        href: "/energia/blog/toi-lavrado-sem-o-consumidor-presente",
      },
      {
        texto: "Direito à perícia no medidor",
        href: "/energia/blog/direito-a-pericia-no-medidor-inmetro",
      },
      {
        texto: "Perícia do medidor em laboratório",
        href: "/energia/blog/pericia-do-medidor-em-laboratorio-seus-direitos",
      },
      {
        texto: "Cobrança de 36 meses sem demonstração",
        href: "/energia/blog/cobranca-de-36-meses-de-energia-quando-e-indevida",
      },
      {
        texto: "Como é calculada a recuperação de consumo",
        href: "/energia/blog/como-e-calculada-a-recuperacao-de-consumo",
      },
      {
        texto: "Ameaça de corte por débito de TOI",
        href: "/energia/blog/podem-cortar-a-luz-por-debito-de-toi",
      },
      {
        texto: "Recebi a cobrança, o que fazer agora",
        href: "/energia/blog/recebi-cobranca-retroativa-de-energia-o-que-fazer",
      },
    ],
    baseLegal: "Resolução Normativa ANEEL nº 1.000/2021",
    preco: "a partir de R$ 39,90",
    href: "/energia",
    hrefAnalise: "/energia",
    hrefBlog: "/energia/blog",
    botao: "Analisar a cobrança",
    Icone: Zap,
    cor: { faixa: "#f59e0b", icone: "#b45309", fundoIcone: "#fffbeb", texto: "#b45309" },
  },
  {
    id: "ibama",
    publico: "Para pessoas e empresas",
    titulo: "Auto de infração ambiental",
    tituloCurto: "IBAMA",
    resumo: "Autuação federal lavrada pelo IBAMA por infração ambiental.",
    detalhe:
      "O auto ambiental é ato vinculado: precisa descrever a conduta de forma clara e objetiva, indicar os dispositivos infringidos e ser lavrado por agente competente. Descrição vaga, tipificação incorreta, ausência de laudo de constatação e prescrição do processo são os pontos que mais comprometem a autuação.",
    especialidades: [
      {
        texto: "Requisitos formais do auto de infração",
        href: "/ibama/blog/requisitos-do-auto-de-infracao-ambiental-art-97",
      },
      {
        texto: "Autuação por órgão incompetente",
        href: "/ibama/blog/auto-do-ibama-ou-do-orgao-estadual-competencia",
      },
      {
        texto: "Prescrição da pretensão punitiva",
        href: "/ibama/blog/prescricao-do-auto-de-infracao-ambiental",
      },
      {
        texto: "Prazo de defesa e contagem",
        href: "/ibama/blog/prazo-de-defesa-auto-de-infracao-ambiental",
      },
      {
        texto: "Conversão da multa em serviços ambientais",
        href: "/ibama/blog/conversao-de-multa-ambiental-em-servicos",
      },
      {
        texto: "Recebi o auto, o que fazer agora",
        href: "/ibama/blog/recebi-auto-de-infracao-do-ibama-o-que-fazer",
      },
    ],
    baseLegal: "Lei 9.605/98 e Decreto 6.514/08",
    preco: "a partir de R$ 149,00",
    href: "/ibama",
    hrefAnalise: "/ibama",
    hrefBlog: "/ibama/blog",
    botao: "Analisar o auto",
    Icone: Leaf,
    cor: { faixa: "#16a34a", icone: "#15803d", fundoIcone: "#f0fdf4", texto: "#15803d" },
  },
];

/* ------------------------------------------------------------------ */
/* Ferramentas gratuitas                                               */
/* ------------------------------------------------------------------ */

export const FERRAMENTAS: Ferramenta[] = [
  {
    id: "simulador",
    publico: "Ferramenta gratuita",
    titulo: "Simulador de pontos na CNH",
    resumo:
      "Some suas multas dos últimos 12 meses e veja quanto falta para o limite. A margem muda conforme as infrações gravíssimas: pode ser 20, 30 ou 40 pontos.",
    href: "/simulador-pontos",
    botao: "Simular agora",
    Icone: Scale,
    cor: { faixa: "#8b5cf6", icone: "#6d28d9", fundoIcone: "#f5f3ff", texto: "#6d28d9" },
  },
  {
    id: "codigos",
    publico: "Ferramenta gratuita",
    titulo: "Consulta de código de infração",
    resumo:
      "Digite o código que aparece no auto e veja o valor, os pontos, a gravidade e o artigo do CTB. São 258 infrações da tabela oficial da SENATRAN.",
    href: "/infracao",
    botao: "Consultar código",
    Icone: FileText,
    cor: { faixa: "#10b981", icone: "#047857", fundoIcone: "#ecfdf5", texto: "#047857" },
  },
];

/** Atalho para buscar uma vertical pelo id. */
export function getVertical(id: VerticalId): Vertical | undefined {
  return VERTICAIS.find((v) => v.id === id);
}
