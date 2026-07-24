export interface ArtigoProcon {
  slug: string;
  titulo: string;
  descricao: string;
  categoria: string;
  tempoLeitura: string;
  imagemEmoji: string;
  imagemBg: string;
  palavrasChave: string[];
  conteudo: string;
}

export const artigosProcon: ArtigoProcon[] = [
  {
    slug: "recebeu-reclamacao-no-procon-como-agir-antes-da-autuacao",
    titulo: "Recebeu reclamação no Procon? Como agir antes da autuação",
    descricao: "Recebeu uma notificação do Procon? Saiba como organizar sua defesa e evitar o agravamento para um auto de infração. Analise seu caso no CheckMulta.",
    categoria: "Primeiros Passos",
    tempoLeitura: "6 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["reclamacao Procon empresa", "processo administrativo Procon", "defesa Procon empresa", "notificacao Procon o que fazer"],
    conteudo: `## A importância da fase pré-autuação no Procon

Receber uma notificação do Procon é um momento de atenção para qualquer gestor. Muitas empresas, ao serem comunicadas de uma reclamação, cometem o equívoco de ignorar o chamado ou responder de forma genérica. É fundamental compreender que a fase de atendimento preliminar representa uma oportunidade de resolver um conflito antes que o órgão instale um processo administrativo sancionador formal, que pode culminar em sanções pecuniárias.

O Código de Defesa do Consumidor e a legislação que rege os procedimentos administrativos nos órgãos de proteção ao consumidor incentivam a autocomposição. Resolver o problema do cliente diretamente, neste estágio inicial, costuma ser o caminho mais eficiente para evitar a lavratura de um auto de infração, que é um ato administrativo mais gravoso.

## Primeiros passos ao receber uma notificação

Ao ser notificado, o primeiro passo é a verificação detalhada do teor da reclamação. O Procon enviará um documento contendo o prazo para resposta. A partir disso, as seguintes etapas devem ser observadas:

- Identificação do reclamante: Verifique se os dados do consumidor coincidem com os registros internos da sua empresa.
- Análise da fundamentação: Leia com atenção o relato do consumidor. Quais normas ele alega que foram violadas? O fato realmente ocorreu conforme descrito?
- Levantamento de provas: Reúna todos os documentos pertinentes, como notas fiscais, contratos, registros de atendimento, comprovantes de entrega ou histórico de conversas. Ter os fatos documentados é o pilar de qualquer resposta administrativa.
- Verificação de prazos: O prazo para resposta é definido pelo órgão notificante. Nunca perca a data limite indicada no próprio documento de notificação, pois os prazos variam conforme a legislação local ou estadual específica do órgão. A perda de prazo pode ser interpretada como desinteresse da empresa ou gerar revelia, o que fragiliza sua posição.

## Como formular a resposta à notificação

A resposta enviada ao Procon deve ser pautada pelo profissionalismo e pela objetividade. Evite tom defensivo ou agressivo. O foco deve ser esclarecer os fatos sob o prisma da legalidade.

- Seja claro e direto: Explique a situação sem rodeios. Se houve uma falha por parte da empresa, avalie a possibilidade de reparação imediata. Se a reclamação for improcedente, demonstre com base na legislação e nas provas reunidas por que o pleito do consumidor não se sustenta.
- Proponha soluções: Caso a responsabilidade da empresa seja identificada, apresentar uma solução antes da autuação demonstra boa-fé e pode ser um fator considerado na análise de eventual penalidade.
- Mantenha a formalidade: Utilize documentos timbrados, com a identificação clara da empresa e de seu representante legal. A clareza na exposição dos fatos auxilia o servidor público que irá analisar o processo.

## O risco da inércia ou do despreparo

O processo administrativo do Procon não se encerra apenas com o contato do consumidor. Caso a empresa não responda, ou caso a resposta seja insuficiente, o órgão pode concluir pela existência de uma infração ao Código de Defesa do Consumidor e lavrar um auto de infração. Neste ponto, o cenário muda: a empresa passa a figurar como autuada, e o procedimento torna-se uma disputa administrativa formal, que exige defesa técnica e obediência a ritos rigorosos.

Lembre-se que cada Procon estadual ou municipal possui autonomia para estabelecer procedimentos internos específicos. Por isso, a leitura atenta de cada notificação recebida é indispensável. O que é aceito em um órgão local pode variar em termos de prazos e ritos procedimentais em comparação com outros órgãos de defesa do consumidor.

## Busque orientação técnica

Se a situação escalar e você receber um auto de infração formal, o processo exige uma análise técnica cuidadosa. Vícios formais na lavratura do auto, ausência de fundamentação legal adequada ou erros processuais podem ser explorados em uma defesa administrativa bem estruturada. O objetivo é assegurar que a empresa exerça seu direito constitucional ao contraditório e à ampla defesa.

Caso deseje uma análise técnica, é possível buscar especialistas para verificar se o auto de infração apresenta vícios formais ou outros pontos de atenção necessários para a composição da sua defesa.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "erro-na-identificacao-da-empresa-autuada-pelo-procon-como-proceder",
    titulo: "Erro na identificação da empresa autuada pelo Procon: Como proceder",
    descricao: "Recebeu uma autuação do Procon com dados da empresa incorretos? Entenda como o vício de identificação pode afetar a validade do processo administrativo.",
    categoria: "Vícios e Nulidades",
    tempoLeitura: "5 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["erro identificação autuação Procon", "auto de infração incorreto", "defesa administrativa Procon", "nulidade processo administrativo"],
    conteudo: `## A importância da correta qualificação da empresa autuada

No âmbito do processo administrativo instaurado pelo Procon, a precisão das informações contidas no auto de infração não é apenas uma formalidade burocrática, mas um requisito fundamental para a validade do procedimento. Entre os erros mais comuns que podem fragilizar uma autuação está a identificação incorreta da empresa autuada.

Quando um agente fiscal lavra um auto de infração, ele está formalizando uma acusação que pode culminar na aplicação de penalidades, incluindo multas administrativas. Para que esse ato tenha eficácia jurídica, é indispensável que o documento indique com precisão quem é o sujeito passivo da sanção, ou seja, a pessoa jurídica responsável pelo suposto descumprimento das normas de defesa do consumidor.

## O que constitui o erro de identificação?

O erro de identificação ocorre quando o Procon indica uma razão social, nome fantasia ou número de inscrição cadastral que não corresponde à realidade da operação ou da empresa fiscalizada. Exemplos frequentes incluem:

- Incorreção na Razão Social: Quando o auto cita um nome empresarial diferente daquele registrado nos órgãos competentes.
- Erro no número de registro: A indicação de um cadastro que pertence a outra filial, a outra unidade do grupo econômico ou a uma empresa completamente diversa.
- Confusão entre Matriz e Filial: A autuação de uma unidade que não realizou a operação objeto da reclamação ou a identificação genérica de uma rede inteira quando o fato é restrito a um ponto de venda específico.
- Erro de endereço ou qualificação dos sócios: Dados cadastrais desatualizados que impedem a correta localização e notificação da empresa.

## As implicações jurídicas na defesa administrativa

Sob a ótica do Direito Administrativo, o processo instaurado pelo Procon deve observar o devido processo legal, o contraditório e a ampla defesa. Se a entidade autuada não foi corretamente identificada, ocorre um vício de natureza formal que compromete a legitimidade do ato administrativo.

A identificação correta é pressuposto para que a empresa possa exercer o seu direito de defesa de forma plena. Se o órgão notifica uma entidade que sequer participou do evento em questão, ou se a autuação falha ao qualificar a pessoa jurídica, há fundamento para questionar a continuidade do processo. A legislação estabelece que o ato administrativo deve conter requisitos essenciais de validade; a ausência ou o erro grosseiro em elementos de identificação pode fundamentar pedidos de revisão da penalidade.

## Como proceder ao identificar um erro no auto?

Ao receber um auto de infração, a primeira providência do responsável administrativo deve ser a conferência minuciosa de todos os dados descritos no documento. Caso seja constatada uma divergência na identificação da empresa, é necessário avaliar a estratégia de defesa. O vício deve ser arguido logo na peça de defesa inicial, expondo claramente a falha documental e comprovando a real qualificação da empresa autuada através de documentos oficiais.

É importante lembrar que os prazos para apresentação de defesa não são uniformes. Embora exista uma previsão em normas federais, muitos Procons estaduais e municipais possuem legislação própria que estabelece prazos distintos. Portanto, consulte sempre o documento recebido para verificar a data limite para protocolar a sua manifestação.

## Considerações sobre a análise técnica

Identificar vícios formais, como erros na qualificação da empresa, exige atenção aos detalhes e conhecimento das normas que regem o processo administrativo sancionador. Uma defesa bem estruturada, que aponta falhas procedimentais, é uma ferramenta essencial para assegurar que a empresa busque resguardar seus direitos diante de eventuais equívocos do órgão fiscalizador.

Caso deseje, é possível encaminhar o auto de infração do Procon para uma análise técnica que avalie se a autuação apresenta vício formal, permitindo que a empresa tome decisões mais informadas sobre como prosseguir com a defesa.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "recebeu-um-auto-de-infracao-do-procon-por-que-nao-pagar-imediatamente",
    titulo: "Recebeu um auto de infração do Procon? Por que não pagar imediatamente",
    descricao: "Receber uma multa do Procon gera preocupação, mas o pagamento imediato pode ser um erro estratégico. Entenda como analisar o auto antes de qualquer decisão.",
    categoria: "Primeiros Passos",
    tempoLeitura: "5 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["auto de infração procon", "defesa administrativa procon", "multa procon empresa", "como recorrer multa procon"],
    conteudo: `## A chegada do auto de infração

O recebimento de um auto de infração do Procon é um momento de tensão para qualquer gestor. A notificação de uma autuação, muitas vezes acompanhada de uma penalidade pecuniária expressiva, gera um impulso imediato de resolver a pendência financeira para encerrar o assunto. Contudo, do ponto de vista jurídico e administrativo, realizar o pagamento imediato do valor estipulado sem uma análise técnica prévia pode representar o abandono de direitos fundamentais da sua empresa.

## O risco da precipitação

Ao pagar uma multa administrativa sem questionar o seu conteúdo ou a forma como foi emitida, a empresa pode estar declarando, tacitamente, que aceita a validade de todos os pontos ali apontados. O processo administrativo sancionador, regido pelo Código de Defesa do Consumidor e pela legislação federal pertinente, possui ritos rigorosos que a autoridade fiscalizadora deve seguir à risca. Caso esses ritos não sejam observados, o ato administrativo pode conter vícios que permitam buscar a sua anulação ou, no mínimo, a redução da sanção aplicada.

O pagamento imediato encerra precocemente qualquer possibilidade de discussão administrativa. Uma vez pago, torna-se complexo reaver os valores ou questionar os motivos que levaram à autuação.

## O que deve ser analisado antes de qualquer pagamento

Antes de considerar o desembolso, a empresa deve realizar uma triagem detalhada do documento recebido. Abaixo, destacamos pontos cruciais que podem ser verificados:

- Descrição clara da conduta: O fiscal descreveu de forma inequívoca qual foi a suposta irregularidade? Autuações genéricas, que não indicam exatamente o dispositivo legal infringido ou a conduta específica da empresa, podem ser contestadas por cerceamento de defesa.
- Observância aos prazos: Verifique qual é o prazo concedido para a apresentação da defesa administrativa. Este prazo varia conforme a legislação e o órgão de proteção ao consumidor que expediu a autuação. É imprescindível conferir o prazo impresso no seu documento, pois a perda deste marco temporal impede que qualquer argumentação seja apresentada.
- Competência e formalidade: Verifique se o documento contém os requisitos formais necessários, como a identificação correta do autuado, a assinatura do agente fiscalizador e a fundamentação legal da infração.
- Proporcionalidade da multa: A legislação estabelece que a penalidade deve ser aplicada considerando a gravidade da infração, a vantagem auferida e a condição econômica do infrator. Se o valor fixado não observar esses critérios, ele pode ser questionado tecnicamente.

## A importância da defesa administrativa

O processo administrativo é o momento oportuno para a empresa expor a sua versão dos fatos e apresentar provas. Argumentar que a empresa está em conformidade com as normas, ou que a interpretação da autoridade foi excessiva, é um direito garantido pelo contraditório e pela ampla defesa. Muitas autuações são revertidas ou têm suas sanções mitigadas quando a empresa demonstra tecnicamente que não houve a irregularidade apontada, ou que os fatos foram distorcidos no momento da lavratura do auto.

## Consequências do pagamento versus a estratégia de defesa

Ao optar por analisar o auto, a empresa ganha tempo para organizar documentos, relatórios e evidências que comprovem a sua regularidade. A pressa, nestes casos, pode resultar em prejuízo financeiro desnecessário. O entendimento das normas de proteção ao consumidor e dos princípios que regem a administração pública permite que a empresa avalie se a autuação é legítima ou se carece de base legal sólida.

Lembre-se que o processo administrativo possui ritos específicos. Cada etapa deve ser respeitada, e o envio de uma peça de defesa bem fundamentada é um direito legítimo de qualquer organização que identifique erros formais no documento recebido.

## O primeiro passo para a sua segurança jurídica

Se você recebeu um auto de infração, o momento ideal é o da cautela técnica. Analisar se o documento apresenta vícios, se a fundamentação é adequada e se existem argumentos de defesa é a estratégia recomendada para avaliar a viabilidade de contestar a cobrança.

Na plataforma, é possível enviar o auto de infração do Procon para receber uma análise preliminar que aponta se a autuação apresenta vício formal ou outros pontos passíveis de contestação administrativa.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "prazo-defesa-auto-infracao-procon",
    titulo: "Prazo para apresentar defesa em auto de infração do Procon: quantos dias a empresa tem",
    descricao:
      "O Decreto 2.181/97 fixa o prazo de defesa do auto de infração do Procon. Saiba a partir de quando ele conta, o que acontece se perder e como verificar gratuitamente se a sua autuação tem vício formal.",
    categoria: "Prazos e Procedimento",
    tempoLeitura: "6 min",
    imagemEmoji: "⏳",
    imagemBg: "from-amber-50 to-orange-50",
    palavrasChave: [
      "prazo defesa procon",
      "auto de infração procon prazo",
      "quantos dias para responder procon",
      "defesa administrativa procon",
      "decreto 2181/97 prazo",
    ],
    conteudo: `A empresa que recebe um auto de infração do Procon tem um prazo legal para apresentar defesa administrativa. Perder esse prazo significa que a autuação segue seu curso sem que a sua versão dos fatos seja considerada — e a multa é fixada com base apenas no que o fiscal registrou.

## Qual é o prazo

O processo administrativo sancionatório do Procon é regido pelo **Decreto nº 2.181/97**, que regulamenta o Código de Defesa do Consumidor (Lei nº 8.078/90). A norma estabelece o prazo para impugnação do auto de infração contado da data da notificação.

É importante observar que alguns Procons estaduais e municipais possuem regulamentos próprios que detalham a contagem. Por isso, o próprio auto de infração e a notificação recebida devem ser lidos com atenção: o prazo aplicável ao seu caso costuma estar expresso no documento.

## A partir de quando conta

A contagem se inicia com a **notificação válida** da empresa — não com a data em que o fiscal esteve no estabelecimento. Essa distinção é relevante e frequentemente ignorada.

Se a notificação foi entregue a pessoa sem poderes de representação, ou se foi enviada a endereço diverso do cadastro da empresa, há discussão sobre a validade do ato — e, por consequência, sobre o início do prazo. Vícios de notificação estão entre as alegações mais comuns em defesas administrativas.

## O que acontece se o prazo passar

A ausência de defesa não gera reconhecimento automático de culpa, mas retira da empresa a oportunidade de contrapor os fatos narrados no auto. Na prática, a autoridade julgadora decide com base unilateral, e a penalidade tende a ser aplicada.

Ainda restam etapas recursais posteriores, mas elas são mais restritas em matéria e mais difíceis de reverter do que a defesa apresentada no momento certo.

## O que examinar antes de escrever a defesa

Antes de discutir o mérito — ou seja, antes de argumentar que a empresa não cometeu a infração —, vale examinar se o auto de infração foi lavrado corretamente. Um auto que não descreve a conduta com precisão, que não indica o dispositivo legal infringido ou que omite dados obrigatórios pode apresentar vício formal.

Entre os pontos que costumam ser verificados:

- Identificação completa e correta da empresa autuada
- Descrição clara e específica da conduta imputada
- Indicação do dispositivo legal supostamente violado
- Identificação e assinatura do agente fiscalizador
- Data, hora e local da fiscalização
- Regularidade da notificação

## Como verificar a sua autuação

No CheckMulta, você pode enviar o auto de infração do Procon e receber uma análise gratuita que aponta se há vício formal na autuação. A verificação é feita por inteligência artificial treinada no CDC e no Decreto 2.181/97, e leva menos de dois minutos.

Se a análise identificar fundamento, você pode obter a defesa administrativa completa, redigida e pronta para protocolo. Se não identificar, nada é cobrado.

---

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },
  {
    slug: "auto-infracao-procon-o-que-fazer",
    titulo: "Recebi um auto de infração do Procon: o que fazer agora",
    descricao:
      "Guia objetivo para a empresa autuada pelo Procon: os primeiros passos, o que não fazer, quais documentos reunir e como checar grátis se a autuação tem vício formal.",
    categoria: "Primeiros Passos",
    tempoLeitura: "7 min",
    imagemEmoji: "📋",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: [
      "recebi auto de infração procon",
      "o que fazer auto infração procon",
      "empresa autuada procon",
      "como responder procon",
      "notificação procon empresa",
    ],
    conteudo: `Receber um auto de infração do Procon costuma gerar duas reações igualmente prejudiciais: ignorar o documento na expectativa de que nada aconteça, ou pagar imediatamente para encerrar o assunto. Nenhuma das duas é recomendável antes de examinar a autuação.

## Primeiro: identifique o prazo

O documento recebido informa o prazo para apresentação de defesa administrativa. Anote a data de recebimento e calcule o vencimento antes de qualquer outra providência. Todo o resto depende disso.

## Segundo: leia o auto inteiro, com atenção

O auto de infração é um documento formal e precisa atender a requisitos específicos. Leia procurando responder:

- **Quem foi autuado?** A razão social e o CNPJ estão corretos? Autuação em nome de empresa errada ou com dados divergentes é vício relevante.
- **O que exatamente foi imputado?** A descrição da conduta é específica ou genérica? Um auto que apenas menciona "prática abusiva" sem narrar o fato concreto dificulta a defesa e pode ser questionado.
- **Com base em qual dispositivo?** O auto deve indicar o artigo do CDC ou da norma supostamente violada.
- **Quando e onde?** Data, hora e local da fiscalização precisam constar.
- **Quem lavrou?** Identificação e assinatura do agente fiscalizador.

## Terceiro: reúna a documentação

Separe tudo o que se relacione ao fato imputado: notas fiscais, contratos, registros de atendimento, prints de sistema, comprovantes de troca ou devolução, protocolos de resposta ao consumidor. Se houve reclamação prévia no Procon, o histórico de tratativas é especialmente relevante.

Documentação demonstrando que a empresa atendeu à demanda do consumidor, ainda que tardiamente, costuma influenciar a dosimetria da penalidade.

## O que não fazer

**Não pague antes de analisar.** O pagamento pode ser interpretado como reconhecimento da infração e inviabiliza a discussão.

**Não ignore.** A ausência de defesa não faz o processo desaparecer — apenas o faz seguir sem a sua versão.

**Não responda informalmente.** Telefonema ou e-mail ao órgão não substitui a defesa protocolada nos autos.

## Quarto: verifique se há vício formal

A defesa administrativa pode discutir o mérito (a empresa não cometeu a infração) ou a forma (o auto foi lavrado irregularmente). A segunda linha é frequentemente mais eficaz, porque independe de prova sobre os fatos.

No CheckMulta, você pode enviar o auto de infração do Procon e receber, gratuitamente, uma verificação de vícios formais na autuação, fundamentada no CDC e no Decreto 2.181/97. Havendo fundamento, a defesa administrativa completa é entregue pronta para protocolo.

---

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },
  {
    slug: "vicios-formais-auto-infracao-procon",
    titulo: "Vícios formais no auto de infração do Procon: os erros que anulam a autuação",
    descricao:
      "Nem todo auto de infração é válido. Conheça os vícios formais que podem comprometer a autuação do Procon e verifique grátis se o seu documento apresenta algum deles.",
    categoria: "Vícios e Nulidades",
    tempoLeitura: "8 min",
    imagemEmoji: "🔍",
    imagemBg: "from-emerald-50 to-teal-50",
    palavrasChave: [
      "vício formal auto infração procon",
      "nulidade auto de infração procon",
      "anular multa procon",
      "erro no auto de infração",
      "defesa procon vício formal",
    ],
    conteudo: `O auto de infração é um ato administrativo, e como todo ato administrativo está sujeito a requisitos de validade. Quando esses requisitos não são observados, abre-se margem para questionar a autuação independentemente de a empresa ter ou não praticado a conduta imputada.

Esta é uma distinção importante: discutir vício formal não é o mesmo que negar o fato. É afirmar que o Estado não observou o procedimento que a lei lhe impõe.

## Por que a forma importa

O processo administrativo sancionatório do Procon é regido pelo Decreto nº 2.181/97, que regulamenta o Código de Defesa do Consumidor. A norma estabelece requisitos para a lavratura do auto de infração. Esses requisitos não são burocracia: existem para garantir que a empresa saiba exatamente do que está sendo acusada e possa se defender.

Quando o auto é impreciso, o direito de defesa fica prejudicado — e é justamente aí que reside o argumento.

## Vícios frequentes

**Identificação incorreta do autuado.** Razão social divergente, CNPJ errado, autuação dirigida a filial quando o fato ocorreu em outra unidade. A penalidade deve recair sobre quem efetivamente praticou a conduta.

**Descrição genérica da conduta.** Autos que se limitam a mencionar a infração em abstrato — "prática abusiva", "publicidade enganosa" — sem narrar o fato concreto, a data, o consumidor envolvido ou o produto em questão. Sem saber o que exatamente se imputa, não há como se defender adequadamente.

**Ausência ou erro na capitulação legal.** O auto precisa indicar qual dispositivo foi violado. Capitulação ausente, genérica ou que não corresponde à conduta descrita compromete a autuação.

**Falta de identificação do agente.** Nome, matrícula e assinatura do fiscal que lavrou o auto.

**Ausência de dados temporais e espaciais.** Data, hora e local da fiscalização.

**Notificação irregular.** Entrega a pessoa sem poderes de representação, endereço divergente do cadastro, ausência de comprovação de recebimento. A notificação válida é o que dá início ao prazo de defesa — se ela é viciada, o prazo é questionável.

**Cerceamento de defesa.** Negativa de acesso aos autos, ausência de documentos essenciais no processo, prazo inferior ao legal.

## Vício formal anula automaticamente?

Não. A autoridade julgadora avalia se o vício é sanável e se efetivamente prejudicou a defesa. Irregularidades meramente materiais — um erro de digitação que não gera dúvida sobre o autuado, por exemplo — tendem a ser relevadas.

O que se busca demonstrar na defesa é que o vício comprometeu a compreensão da acusação ou a possibilidade de contrapô-la. Por isso, a alegação precisa ser fundamentada e vinculada ao caso concreto, não genérica.

## Como identificar os vícios do seu auto

Examinar um auto de infração exige comparar o documento com os requisitos legais, item por item. É trabalho técnico e demorado quando feito manualmente.

No CheckMulta, você envia o auto de infração do Procon e recebe uma análise gratuita que verifica cada requisito e aponta quais estão ausentes ou irregulares. Havendo vício identificado, a defesa administrativa completa é redigida com base no que foi encontrado — citando o trecho do próprio documento e o dispositivo aplicável.

Se a análise não identificar vício, nada é cobrado.

---

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },
];

export function getArtigoProconPorSlug(slug: string): ArtigoProcon | undefined {
  return artigosProcon.find((a) => a.slug === slug);
}

export function getCategoriasProcon(): string[] {
  return Array.from(new Set(artigosProcon.map((a) => a.categoria)));
}

export function getArtigosProconPorCategoria(categoria: string): ArtigoProcon[] {
  return artigosProcon.filter((a) => a.categoria === categoria);
}

export function slugifyCategoriaProcon(categoria: string): string {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
