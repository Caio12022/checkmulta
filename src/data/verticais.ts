import { Car, Building2, ShieldCheck, Zap, Leaf, Scale, FileText } from "lucide-react";

/**
 * Fonte única de verdade das verticais e ferramentas do CheckMulta.
 *
 * Todo lugar que lista serviços (carrossel, home-mãe, rodapés) deve ler daqui.
 * Vertical nova = uma entrada neste arquivo, e ela aparece em todos os lugares.
 *
 * IMPORTANTE (SEO): o campo "resumo" e os textos de "detalhe" são exclusivos
 * desta listagem. Nunca copiar texto da landing da vertical para cá — as duas
 * páginas passariam a competir pelo mesmo termo no Google.
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
  /** Link interno opcional (artigo ou categoria do blog). */
  href?: string;
}

export interface Vertical {
  id: VerticalId;
  /** Quem é o cliente. Vira o "eyebrow" acima do título. */
  publico: string;
  /** Título do card. Na home-mãe é renderizado como H2. */
  titulo: string;
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
  /** Rota da landing com âncora do upload — usada nos botões. */
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
    resumo:
      "Notificação de autuação ou de penalidade do DETRAN, PRF ou órgão municipal.",
    detalhe:
      "A notificação de trânsito precisa cumprir requisitos formais do Código de Trânsito Brasileiro para valer. Prazo de expedição, descrição do local, identificação do agente e aferição do equipamento são pontos em que o auto costuma falhar. Enviamos a análise gratuita apontando o que foi encontrado e, se houver falha, entregamos a defesa pronta para protocolo.",
    especialidades: [
      { texto: "Excesso de velocidade e radar" },
      { texto: "Avanço de sinal vermelho" },
      { texto: "Uso do celular ao volante" },
      { texto: "Cinto de segurança" },
      { texto: "Estacionamento irregular e rodízio" },
      { texto: "Embriaguez ao volante e recusa ao teste" },
      { texto: "CNH vencida e condutor não habilitado" },
      { texto: "Notificação recebida fora do prazo" },
    ],
    baseLegal: "Código de Trânsito Brasileiro e Manual Brasileiro de Fiscalização de Trânsito",
    preco: "A partir de R$ 19,90",
    href: "/",
    hrefAnalise: "/#analise",
    hrefBlog: "/blog",
    botao: "Analisar minha multa",
    Icone: Car,
    cor: { faixa: "#10b981", icone: "#047857", fundoIcone: "#ecfdf5", texto: "#047857" },
  },
  {
    id: "procon",
    publico: "Para empresas",
    titulo: "Multa do Procon",
    resumo:
      "Auto de infração lavrado por órgão de proteção e defesa do consumidor.",
    detalhe:
      "O processo administrativo do Procon tem regras próprias de instrução, dosimetria e prazo. Auto genérico, ausência de averiguação preliminar, multa calculada sem considerar o porte da empresa e falha na notificação são falhas frequentes. A análise é gratuita e só cobramos se houver fundamento para recorrer.",
    especialidades: [
      { texto: "Auto de infração sem descrição clara da conduta" },
      { texto: "Multa desproporcional ao porte da empresa" },
      { texto: "Tratamento diferenciado a ME e EPP" },
      { texto: "Falha na notificação e contagem de prazo" },
      { texto: "Ausência de averiguação preliminar" },
      { texto: "Recurso administrativo em segunda instância" },
    ],
    baseLegal: "Código de Defesa do Consumidor e Decreto 2.181/97",
    preco: "R$ 99,00",
    href: "/procon",
    hrefAnalise: "/procon#analise",
    hrefBlog: "/procon/blog",
    botao: "Analisar o auto",
    Icone: Building2,
    cor: { faixa: "#f59e0b", icone: "#b45309", fundoIcone: "#fffbeb", texto: "#b45309" },
  },
  {
    id: "vigilancia",
    publico: "Para empresas",
    titulo: "Vigilância Sanitária",
    resumo:
      "Auto de infração sanitária, termo de interdição ou apreensão de produtos.",
    detalhe:
      "A fiscalização sanitária atinge restaurantes, farmácias, clínicas, mercados e indústrias de alimentos. O auto precisa descrever a irregularidade de forma determinada, indicar o dispositivo infringido e observar a gradação da penalidade. Interdição cautelar tem limite de duração e não pode se tornar definitiva por inércia do órgão.",
    especialidades: [
      { texto: "Auto com descrição genérica da irregularidade" },
      { texto: "Interdição cautelar do estabelecimento" },
      { texto: "Apreensão e inutilização de produtos" },
      { texto: "Classificação equivocada da gravidade" },
      { texto: "Atenuantes não consideradas na dosimetria" },
      { texto: "Prazo de defesa e contagem da notificação" },
    ],
    baseLegal: "Lei 6.437/77",
    preco: "R$ 79,00",
    href: "/vigilancia-sanitaria",
    hrefAnalise: "/vigilancia-sanitaria#analise",
    hrefBlog: "/vigilancia-sanitaria/blog",
    botao: "Analisar o auto",
    Icone: ShieldCheck,
    cor: { faixa: "#0ea5e9", icone: "#0369a1", fundoIcone: "#f0f9ff", texto: "#0369a1" },
  },
  {
    id: "energia",
    publico: "Para pessoas e empresas",
    titulo: "Cobrança retroativa de energia",
    resumo:
      "TOI ou notificação de recuperação de consumo emitida pela distribuidora.",
    detalhe:
      "O Termo de Ocorrência e Inspeção só sustenta a cobrança se a distribuidora cumprir as providências exigidas pela ANEEL: perícia metrológica, entrega de cópia legível, informação sobre o direito à perícia e demonstração do período de irregularidade. Cobrar o período máximo sem provar quando a irregularidade começou é a falha mais comum.",
    especialidades: [
      { texto: "TOI sem perícia metrológica do medidor" },
      { texto: "Cópia do termo não entregue ao consumidor" },
      { texto: "Período de cobrança sem demonstração técnica" },
      { texto: "Cálculo da recuperação de consumo" },
      { texto: "Ameaça de corte com base em débito de TOI" },
      { texto: "Faturamento a maior e devolução em dobro" },
    ],
    baseLegal: "Resolução Normativa ANEEL nº 1.000/2021",
    preco: "A partir de R$ 39,90",
    href: "/energia",
    hrefAnalise: "/energia#analise",
    hrefBlog: "/energia/blog",
    botao: "Analisar a cobrança",
    Icone: Zap,
    cor: { faixa: "#eab308", icone: "#a16207", fundoIcone: "#fefce8", texto: "#a16207" },
  },
  {
    id: "ibama",
    publico: "Para pessoas e empresas",
    titulo: "Auto de infração ambiental",
    resumo:
      "Autuação federal lavrada pelo IBAMA por infração ambiental.",
    detalhe:
      "O auto ambiental é ato vinculado: precisa descrever a conduta de forma clara e objetiva, indicar os dispositivos infringidos e ser lavrado por agente competente. Descrição vaga, tipificação incorreta, ausência de laudo de constatação e prescrição do processo são os pontos que mais comprometem a autuação.",
    especialidades: [
      { texto: "Descrição vaga ou tipificação incorreta" },
      { texto: "Autuação por agente incompetente" },
      { texto: "Prescrição em cinco anos" },
      { texto: "Prescrição intercorrente por processo parado" },
      { texto: "Audiência de conciliação ambiental" },
      { texto: "Conversão da multa em serviços ambientais" },
    ],
    baseLegal: "Lei 9.605/98 e Decreto 6.514/08",
    preco: "A partir de R$ 149,00",
    href: "/ibama",
    hrefAnalise: "/ibama#analise",
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
