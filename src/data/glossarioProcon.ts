// ==========================================================================
// GLOSSÁRIO PROCON — práticas abusivas e sanções administrativas
//
// FONTE: Lei nº 8.078/90 (Código de Defesa do Consumidor).
// - Art. 39: rol de práticas abusivas (incisos I a XIV). Texto oficial
//   confirmado via pesquisa (WebSearch), incluindo o inciso XI, que não é
//   citado com a mesma frequência que os demais e foi verificado em duas
//   buscas independentes antes de entrar aqui.
// - Art. 56: rol de sanções administrativas (incisos I a XII), aplicáveis
//   cumulativamente, inclusive como medida cautelar (parágrafo único).
//
// Isso é nacional — vale para qualquer Procon do Brasil, municipal ou
// estadual, porque é lei federal. Diferente do PRAZO de defesa (que varia
// por Procon) e do VALOR da multa (dosimetria caso a caso, art. 57), o que
// cada prática ou sanção SIGNIFICA é uniforme em todo o país.
// ==========================================================================

export type TipoItemProcon = "pratica-abusiva" | "sancao";

export interface ItemProcon {
  tipo: TipoItemProcon;
  inciso: string;
  slug: string;
  nome: string;
  textoOficial: string;
  explicacao: string;
  exemplo?: string;
  oQueFazer?: string;
}

export const PRATICAS_ABUSIVAS: ItemProcon[] = [
  {
    tipo: "pratica-abusiva",
    inciso: "I",
    slug: "venda-casada",
    nome: "Venda casada",
    textoOficial:
      "condicionar o fornecimento de produto ou de serviço ao fornecimento de outro produto ou serviço, bem como, sem justa causa, a limites quantitativos",
    explicacao:
      "Obrigar o consumidor a levar um produto ou serviço junto com outro que ele não pediu, ou impor um limite de quantidade sem motivo justo.",
    exemplo:
      "O banco só libera o empréstimo se você contratar um seguro específico dele; a loja só vende o produto em kit com outro item que você não quer.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "II",
    slug: "recusa-de-atendimento",
    nome: "Recusa de atendimento com estoque disponível",
    textoOficial:
      "recusar atendimento às demandas dos consumidores, na exata medida de suas disponibilidades de estoque, e, ainda, de conformidade com os usos e costumes",
    explicacao:
      "Negar-se a atender um pedido do consumidor quando há estoque disponível e a prática é comum no mercado.",
    exemplo:
      "A loja tem o produto anunciado na prateleira ou no site, mas se recusa a vender pelo preço divulgado.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "III",
    slug: "produto-ou-servico-nao-solicitado",
    nome: "Produto ou serviço não solicitado",
    textoOficial:
      "enviar ou entregar ao consumidor, sem solicitação prévia, qualquer produto, ou fornecer qualquer serviço",
    explicacao:
      "Mandar um produto ou prestar um serviço que o consumidor não pediu — e, principalmente, tentar cobrar por isso depois.",
    exemplo:
      "Enviar um cartão adicional não solicitado, ou ativar um serviço extra na conta sem autorização e cobrá-lo na fatura.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "IV",
    slug: "aproveitar-se-da-fraqueza-do-consumidor",
    nome: "Aproveitar-se da fraqueza ou ignorância do consumidor",
    textoOficial:
      "prevalecer-se da fraqueza ou ignorância do consumidor, tendo em vista sua idade, saúde, conhecimento ou condição social, para impingir-lhe seus produtos ou serviços",
    explicacao:
      "Usar a vulnerabilidade do consumidor — idade avançada, doença, falta de instrução, situação social — para empurrar produtos ou serviços.",
    exemplo:
      "Vender um plano caro e desnecessário a uma pessoa idosa, explorando sua dificuldade de entender o contrato.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "V",
    slug: "vantagem-manifestamente-excessiva",
    nome: "Exigir vantagem manifestamente excessiva",
    textoOficial: "exigir do consumidor vantagem manifestamente excessiva",
    explicacao:
      "Cobrar ou exigir do consumidor algo desproporcional ao produto ou serviço prestado.",
    exemplo: "Multa de cancelamento contratual muito acima do valor do próprio contrato.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "VI",
    slug: "servico-sem-orcamento-previo",
    nome: "Serviço sem orçamento prévio",
    textoOficial:
      "executar serviços sem a prévia elaboração de orçamento e autorização expressa do consumidor, ressalvadas as decorrentes de práticas anteriores entre as partes",
    explicacao:
      "Realizar um serviço sem antes apresentar o orçamento e obter a autorização do cliente.",
    exemplo:
      "A oficina troca peças do carro sem avisar o valor antes, e só informa o preço na hora de cobrar.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "VII",
    slug: "informacao-depreciativa-por-exercicio-de-direito",
    nome: "Informação depreciativa por exercício de direito",
    textoOficial:
      "repassar informação depreciativa, referente a ato praticado pelo consumidor no exercício de seus direitos",
    explicacao:
      "Divulgar informação negativa sobre o consumidor só porque ele exerceu um direito — reclamou, contestou uma cobrança, entrou com uma ação.",
    exemplo:
      "Incluir o consumidor numa lista restritiva interna porque ele registrou reclamação no Procon.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "VIII",
    slug: "produto-fora-das-normas-tecnicas",
    nome: "Produto ou serviço fora das normas técnicas",
    textoOficial:
      "colocar, no mercado de consumo, qualquer produto ou serviço em desacordo com as normas expedidas pelos órgãos oficiais competentes ou, se normas específicas não existirem, pela Associação Brasileira de Normas Técnicas ou outra entidade credenciada pelo Conselho Nacional de Metrologia, Normalização e Qualidade Industrial (Conmetro)",
    explicacao:
      "Vender produto ou prestar serviço que não segue as normas técnicas oficiais (ABNT ou órgão equivalente).",
    exemplo: "Vender um brinquedo infantil fora do padrão de segurança exigido.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "IX",
    slug: "recusa-de-venda-a-vista",
    nome: "Recusa de venda à vista",
    textoOficial:
      "recusar a venda de bens ou a prestação de serviços, diretamente a quem se disponha a adquiri-los mediante pronto pagamento, ressalvados os casos de intermediação regulados em leis especiais",
    explicacao: "Recusar-se a vender um produto ou prestar um serviço a quem quer pagar à vista, na hora.",
    exemplo: "A loja informa que só vende parcelado, recusando quem quer pagar à vista.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "X",
    slug: "elevar-preco-sem-justa-causa",
    nome: "Elevar o preço sem justa causa",
    textoOficial: "elevar sem justa causa o preço de produtos ou serviços",
    explicacao: "Aumentar o preço de um produto ou serviço sem um motivo real que justifique.",
    exemplo:
      "Aumentar abusivamente o preço de itens essenciais numa situação de escassez, sem custo real que explique a alta.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "XI",
    slug: "cancelamento-unilateral-do-contrato",
    nome: "Cancelamento unilateral do contrato",
    textoOficial:
      "autorizar-se, no fornecimento de produtos ou serviços, a cancelar o contrato unilateralmente, sem que igual direito seja conferido ao consumidor",
    explicacao:
      "O fornecedor se reservar o direito de cancelar o contrato quando quiser, sem dar ao consumidor o mesmo direito.",
    exemplo:
      "Contrato que permite à empresa encerrar o serviço a qualquer momento, mas impõe multa ou trava para o consumidor sair.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "XII",
    slug: "sem-prazo-para-cumprir-a-obrigacao",
    nome: "Não estipular prazo para cumprir a obrigação",
    textoOficial:
      "deixar de estipular prazo para o cumprimento de sua obrigação ou deixar a fixação do termo inicial a seu exclusivo critério",
    explicacao:
      "Não definir um prazo claro para entregar o produto ou cumprir o serviço, ou deixar essa data só a critério da própria empresa.",
    exemplo: "Contrato de compra de imóvel na planta sem prazo de entrega definido.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "XIII",
    slug: "reajuste-fora-do-indice-legal",
    nome: "Reajuste fora do índice legal ou contratual",
    textoOficial: "aplicar fórmula ou índice de reajuste diverso do legal ou contratualmente estabelecido",
    explicacao: "Usar um índice de reajuste diferente do que a lei ou o próprio contrato determinam.",
    exemplo: "Reajustar a mensalidade com um índice maior que o previsto no contrato assinado.",
  },
  {
    tipo: "pratica-abusiva",
    inciso: "XIV",
    slug: "lotacao-acima-do-limite-autorizado",
    nome: "Permitir lotação acima do limite autorizado",
    textoOficial:
      "permitir o ingresso em estabelecimentos comerciais ou de serviços de um número maior de consumidores que o fixado pela autoridade administrativa como máximo",
    explicacao: "Deixar entrar mais pessoas no estabelecimento do que o limite definido pela autoridade competente.",
    exemplo: "Evento que vende mais ingressos do que a capacidade autorizada do local.",
  },
];

export const SANCOES_PROCON: ItemProcon[] = [
  {
    tipo: "sancao",
    inciso: "I",
    slug: "multa",
    nome: "Multa",
    textoOficial: "multa",
    explicacao:
      "Penalidade em dinheiro. O valor é calculado conforme a gravidade da infração, a vantagem obtida e a condição econômica do fornecedor, entre outros critérios do art. 57 do CDC — não é um valor fixo por infração.",
    oQueFazer:
      "É a sanção mais comum, e a que este site analisa: vale conferir se o auto de infração tem os requisitos formais do processo administrativo e se o valor foi fundamentado.",
  },
  {
    tipo: "sancao",
    inciso: "II",
    slug: "apreensao-do-produto",
    nome: "Apreensão do produto",
    textoOficial: "apreensão do produto",
    explicacao:
      "Retenção física do produto pelo órgão fiscalizador, geralmente por risco à saúde, à segurança, ou por irregularidade grave.",
    oQueFazer: "Confira se há laudo ou motivo técnico documentado que fundamente a apreensão.",
  },
  {
    tipo: "sancao",
    inciso: "III",
    slug: "inutilizacao-do-produto",
    nome: "Inutilização do produto",
    textoOficial: "inutilização do produto",
    explicacao:
      "Destruição do produto apreendido — aplicada em casos mais graves, como produto vencido, falsificado ou com risco concreto à saúde.",
    oQueFazer: "Verifique se há justificativa técnica documentada, não apenas uma alegação genérica.",
  },
  {
    tipo: "sancao",
    inciso: "IV",
    slug: "cassacao-do-registro-do-produto",
    nome: "Cassação do registro do produto",
    textoOficial: "cassação do registro do produto junto ao órgão competente",
    explicacao: "Cancelamento do registro do produto junto ao órgão competente, impedindo sua comercialização.",
  },
  {
    tipo: "sancao",
    inciso: "V",
    slug: "proibicao-de-fabricacao-do-produto",
    nome: "Proibição de fabricação do produto",
    textoOficial: "proibição de fabricação do produto",
    explicacao: "Proíbe a empresa de continuar fabricando aquele produto específico.",
  },
  {
    tipo: "sancao",
    inciso: "VI",
    slug: "suspensao-de-fornecimento",
    nome: "Suspensão de fornecimento de produto ou serviço",
    textoOficial: "suspensão de fornecimento de produtos ou serviço",
    explicacao: "Suspende temporariamente o fornecimento daquele produto ou serviço específico.",
  },
  {
    tipo: "sancao",
    inciso: "VII",
    slug: "suspensao-temporaria-de-atividade",
    nome: "Suspensão temporária de atividade",
    textoOficial: "suspensão temporária de atividade",
    explicacao: "Suspende a atividade da empresa por um período — mais abrangente que suspender só um produto.",
  },
  {
    tipo: "sancao",
    inciso: "VIII",
    slug: "revogacao-de-concessao-ou-permissao",
    nome: "Revogação de concessão ou permissão de uso",
    textoOficial: "revogação de concessão ou permissão de uso",
    explicacao: "Cancela uma concessão ou permissão pública que a empresa detinha para operar.",
  },
  {
    tipo: "sancao",
    inciso: "IX",
    slug: "cassacao-de-licenca",
    nome: "Cassação de licença do estabelecimento ou atividade",
    textoOficial: "cassação de licença do estabelecimento ou de atividade",
    explicacao: "Cancela a licença de funcionamento do estabelecimento ou da atividade exercida.",
  },
  {
    tipo: "sancao",
    inciso: "X",
    slug: "interdicao-de-estabelecimento",
    nome: "Interdição de estabelecimento, obra ou atividade",
    textoOficial: "interdição, total ou parcial, de estabelecimento, de obra ou de atividade",
    explicacao: "Fecha total ou parcialmente o estabelecimento, obra ou atividade.",
  },
  {
    tipo: "sancao",
    inciso: "XI",
    slug: "intervencao-administrativa",
    nome: "Intervenção administrativa",
    textoOficial: "intervenção administrativa",
    explicacao:
      "O poder público passa a intervir diretamente na gestão da atividade — é a sanção mais grave e menos comum do rol.",
  },
  {
    tipo: "sancao",
    inciso: "XII",
    slug: "contrapropaganda",
    nome: "Imposição de contrapropaganda",
    textoOficial: "imposição de contrapropaganda",
    explicacao:
      "Obriga a empresa a veicular uma propaganda corretiva, desfazendo publicidade enganosa ou abusiva anterior, com alcance equivalente ao da propaganda original.",
  },
];

export const GLOSSARIO_PROCON: ItemProcon[] = [...PRATICAS_ABUSIVAS, ...SANCOES_PROCON];

export function buscarItemProconPorSlug(slug: string): ItemProcon | undefined {
  return GLOSSARIO_PROCON.find((i) => i.slug === slug);
}
