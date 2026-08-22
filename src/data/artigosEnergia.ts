export interface ArtigoEnergia {
  slug: string;
  titulo: string;
  descricao: string;
  categoria: string;
  tempoLeitura: string;
  imagemEmoji: string;
  imagemBg: string;
  /** Imagem de capa gerada por IA (opcional - artigos antigos não têm). */
  imagemUrl?: string;
  palavrasChave: string[];
  conteudo: string;
}

export const artigosEnergia: ArtigoEnergia[] = [
  {
    slug: "negativacao-por-debito-de-recuperacao-em-discussao",
    titulo: "Negativacao por Debito de Recuperacao em Discussao",
    descricao: "Saiba como proceder se a distribuidora ameaçar negativar seu nome por cobranças de TOI em aberto. Veja grátis o que falta no TOI.",
    categoria: "Direitos do Consumidor",
    tempoLeitura: "5 min",
    imagemEmoji: "⚠️",
    imagemBg: "from-amber-50 to-orange-50",
    imagemUrl: "/blog/energia/negativacao-por-debito-de-recuperacao-em-discussao.jpg",
    palavrasChave: ["TOI energia", "recuperação de consumo", "negativação débito indevido", "contestação fatura energia"],
    conteudo: `## O risco da negativação frente a um débito em discussão

Receber uma notificação de recuperação de consumo, comumente originada por um Termo de Ocorrência e Inspeção, gera preocupação imediata ao consumidor. Além do valor expressivo, surge o temor quanto à interrupção do fornecimento de energia ou ao registro do nome em órgãos de proteção ao crédito. Quando o consumidor apresenta uma contestação administrativa, o débito passa a ser considerado em discussão. A questão central é entender se a distribuidora pode realizar a negativação enquanto o processo de apuração ainda está em curso.

É importante esclarecer que o Código de Defesa do Consumidor protege a parte hipossuficiente na relação de consumo. Em caso de cobranças baseadas em procedimentos unilaterais, a distribuidora possui o ônus de provar a regularidade de cada etapa do processo de fiscalização e do cálculo apresentado.

## A exigência de regularidade procedimental

Para que uma cobrança de recuperação de consumo seja válida, a distribuidora deve seguir rigorosamente as etapas estabelecidas pela Resolução ANEEL nº 1.000/2021. De acordo com o art. 590, há providências cumulativas para a caracterização da irregularidade. Não basta apenas a lavratura do documento de inspeção. A empresa deve observar critérios procedimentais rigorosos estabelecidos pelas normas do setor.

Caso o procedimento falhe em qualquer um desses pilares, a cobrança torna-se frágil. Por exemplo, o art. 591 estabelece deveres essenciais na emissão do documento, como a entrega de cópia com recibo ao consumidor e a devida informação sobre o direito de solicitar perícia metrológica. Se essas garantias são violadas, o consumidor possui elementos fundamentais para questionar a legitimidade do débito.

## A perícia e o prazo de resposta

Quando há a retirada do medidor para análise, os arts. 592 e 250 da Resolução 1.000/2021 asseguram direitos cruciais. O lacre deve ser preservado no ato da retirada e o consumidor tem o direito de acompanhar a perícia em laboratório. O relatório de inspeção deve ser apresentado pela distribuidora em até 30 dias contados da solicitação do consumidor. É recomendável consultar a notificação recebida para conferir o prazo específico destinado à manifestação do consumidor.

## O cálculo e o erro sobre o período de cobrança

Um dos pontos mais sensíveis em cobranças de recuperação de consumo é a definição do período de irregularidade. O art. 596 determina que, caso o período não seja tecnicamente identificável, a cobrança deve se limitar a 6 ciclos anteriores à constatação. O erro comum das distribuidoras é aplicar o teto máximo de 36 ciclos de forma automática, sem a devida demonstração técnica. O consumidor deve estar atento, pois o teto de 36 ciclos não é uma regra geral de cobrança, mas uma limitação temporal para casos devidamente justificados.

Ademais, conforme o art. 595, a metodologia de cálculo deve respeitar critérios rigorosos estabelecidos pela regulação. Qualquer divergência nestes critérios fundamenta a impugnação do valor cobrado.

## Como proceder diante de uma cobrança indevida

Se o valor faturado for superior ao consumo real, o art. 323 da Resolução 1.000/2021 prevê a revisão de até 60 ciclos e a possibilidade de devolução em dobro do valor recebido indevidamente. É fundamental que o consumidor não deixe de pagar as faturas correntes de energia, pois a contestação administrativa incide exclusivamente sobre o débito retroativo referente à recuperação de consumo.

Ao receber uma notificação, verifique atentamente os prazos para interposição de recurso administrativo junto à distribuidora constantes no documento. Caso a empresa insista na negativação de um débito que está sendo contestado de forma fundamentada e dentro dos trâmites administrativos, o consumidor pode buscar os órgãos de proteção ao consumidor ou o Poder Judiciário para impedir a restrição de crédito.

No CheckMulta, é possível enviar o documento de notificação de recuperação de consumo para análise técnica sobre eventuais falhas que possam fundamentar uma contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "cobranca-por-recuperacao-o-criterio-da-media-de-consumo",
    titulo: "Cobrança por Recuperação: O Critério da Média de Consumo",
    descricao: "Entenda como a média dos três maiores consumos deve ser aplicada na recuperação de energia. Veja grátis o que falta no TOI.",
    categoria: "Cálculo e Período",
    tempoLeitura: "4 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    imagemUrl: "/blog/energia/cobranca-por-recuperacao-o-criterio-da-media-de-consumo.jpg",
    palavrasChave: ["TOI cobrança irregular", "recuperação de consumo energia", "cálculo média consumo", "notificação irregularidade energia"],
    conteudo: `## A complexidade do cálculo de recuperação de energia

Receber uma notificação de recuperação de consumo de energia elétrica é uma situação que exige atenção imediata. Muitas vezes, o consumidor é surpreendido por valores expressivos, baseados em critérios técnicos que nem sempre são compreendidos. É fundamental entender que esse cálculo deve seguir estritas determinações normativas estabelecidas pela ANEEL.

## O critério de cálculo da receita a recuperar

Conforme estabelece o art. 595 da Resolução ANEEL nº 1.000/2021, a distribuidora deve seguir critérios específicos para estimar o valor do débito. Este procedimento não é arbitrário e deve observar as seguintes premissas:

- A cobrança deve ser precedida pelas providências cumulativas de caracterização da irregularidade previstas no art. 590.
- A aplicação de critérios de cálculo é uma alternativa técnica que visa estimar o consumo que deixou de ser faturado, desde que o período de duração da irregularidade seja corretamente identificado.

## A delimitação do período de irregularidade

É comum que as distribuidoras apliquem o teto máximo de cobrança por padrão. Contudo, o art. 596 da Resolução ANEEL nº 1.000/2021 estabelece que o período de duração da irregularidade deve ser determinado tecnicamente. Na ausência de elementos que comprovem a data exata do início da irregularidade, o limite de cobrança é de apenas 6 ciclos, conforme o inciso II e § 1º do art. 596. O teto de 36 ciclos previsto no § 3º do art. 591 é apenas um limite máximo global e não um período automático de cobrança. A falha em demonstrar tecnicamente o período correto pode ser um ponto relevante a ser arguido em contestações.

## Procedimentos obrigatórios e segurança jurídica

Para que a cobrança de recuperação seja válida, a distribuidora deve cumprir rigorosamente os deveres de transparência. O art. 591 determina que o consumidor tem o direito de receber o documento de inspeção com recibo e de ser informado sobre o direito à perícia metrológica. Caso o medidor seja retirado para análise em laboratório, deve ser assegurada a possibilidade de acompanhamento, observando-se o art. 592 e o art. 250, com o relatório técnico emitido em até 30 dias contados da solicitação.

Caso o consumidor identifique erros no cálculo ou no período cobrado, o art. 323 da mesma resolução prevê a possibilidade de revisão do faturamento em até 60 ciclos, com a devida correção em caso de cobrança indevida, o que reforça a importância da verificação detalhada da notificação recebida.

## Como proceder diante de uma notificação

Diante de uma notificação de irregularidade, é recomendável organizar toda a documentação recebida. O Código de Defesa do Consumidor ampara o consumidor diante de sua vulnerabilidade técnica frente à concessionária. É importante verificar na notificação recebida qual o prazo disponível para a apresentação de contestação.

Em relação às faturas mensais, o consumidor deve manter o pagamento regular das contas de consumo corrente, uma vez que a contestação se refere exclusivamente ao débito retroativo apresentado pela distribuidora. Disputas administrativas visam avaliar a legitimidade dos valores retroativos, sendo prudente buscar a análise de um profissional para verificar se a cobrança apresenta falhas que fundamentem uma contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "cobranca-de-36-meses-de-energia-quando-o-prazo-e-aplicado-incorretamente",
    titulo: "Cobrança de 36 meses de energia: quando o prazo é aplicado incorretamente",
    descricao: "Recebeu uma cobrança de 36 meses por irregularidade? Entenda por que o período pode estar errado e como analisar seu caso gratuitamente no CheckMulta.",
    categoria: "Cálculo e Período",
    tempoLeitura: "5 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["cobrança retroativa energia", "TOI irregularidade energia", "recuperação de consumo 36 meses", "contestação TOI energia"],
    conteudo: `## A complexidade do cálculo retroativo de energia

Quando uma distribuidora de energia elétrica identifica uma irregularidade no medidor, como uma falha técnica ou uma suposta intervenção, ela emite um Termo de Ocorrência e Inspeção (TOI) ou uma notificação de recuperação de consumo. Frequentemente, o consumidor é surpreendido com uma fatura que abrange um longo período de retroatividade. No entanto, é fundamental compreender que o prazo de 36 meses não é uma regra automática de aplicação em todos os casos.

A legislação do setor elétrico, especificamente a Resolução ANEEL nº 1.000/2021, estabelece critérios técnicos rigorosos para que a distribuidora possa cobrar por consumos não faturados. O período de 36 ciclos é apenas o teto máximo permitido, e não o padrão aplicável a qualquer situação de irregularidade.

## O que a norma diz sobre o início da irregularidade

O ponto central em notificações de recuperação de consumo é a necessidade de demonstração técnica fundamentada sobre a data em que a irregularidade começou. Conforme o art. 596 da Resolução ANEEL nº 1.000/2021, o período de duração da irregularidade deve ser determinado por critérios técnicos ou por meio do histórico de consumo do consumidor.

Quando a distribuidora não consegue comprovar o momento exato em que o consumo deixou de ser registrado corretamente, o mesmo art. 596 impõe um limite muito mais restrito: a cobrança fica limitada a apenas 6 ciclos anteriores à data da constatação da irregularidade. Portanto, a cobrança de 36 ciclos sem a devida prova técnica do início da falha é uma prática que pode ser questionada administrativamente.

## A importância dos procedimentos formais

Para que uma cobrança de recuperação de consumo seja legítima, a distribuidora deve seguir um rito rigoroso. O art. 590 da Resolução ANEEL nº 1.000/2021 estabelece as providências cumulativas de caracterização da irregularidade que devem ser adotadas.

Além disso, o art. 591 da Resolução ANEEL nº 1.000/2021 impõe deveres específicos na emissão do TOI, como a entrega de via ao consumidor mediante recibo e a informação clara sobre o direito de solicitar perícia metrológica. Caso o consumidor deseje questionar o medidor, os arts. 592 e 250 da mesma Resolução asseguram a realização de perícia em laboratório, observando o prazo de 30 dias contados da solicitação. Se a empresa falha em seguir esses ritos, a integridade do processo de cobrança pode ser questionada.

## Direitos do consumidor na contestação

Além da questão do período, o art. 595 da Resolução ANEEL nº 1.000/2021 define os critérios para o cálculo da receita a recuperar. É importante destacar que o Código de Defesa do Consumidor ampara o usuário, especialmente diante da assimetria técnica entre o consumidor e a distribuidora de energia. Caso se identifique um faturamento a maior por erro da concessionária, o art. 323 da Resolução ANEEL nº 1.000/2021 prevê a possibilidade de revisão do faturamento em até 60 ciclos, com a devida devolução de valores, inclusive em dobro.

## Como proceder diante de uma cobrança alta

Se você recebeu uma notificação de recuperação, é importante analisar o documento. Verifique se a distribuidora comprovou tecnicamente a origem da irregularidade. Caso a cobrança pareça arbitrária ou sem fundamentação temporal, o caminho é elaborar uma contestação administrativa detalhada, observando o prazo estipulado na notificação recebida.

Lembre-se de que a contestação foca no débito retroativo apresentado. É recomendável manter o pagamento das faturas de consumo corrente em dia para evitar riscos de suspensão do fornecimento, enquanto o processo de questionamento administrativo sobre a recuperação de consumo tramita junto à distribuidora.

É possível buscar auxílio profissional para analisar se a notificação apresenta falhas capazes de fundamentar uma contestação robusta.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "pericia-do-medidor-o-prazo-de-30-dias-para-o-relatorio-da-distribuidora",
    titulo: "Perícia do Medidor: O prazo de 30 dias para o relatório da distribuidora",
    descricao: "Entenda o prazo legal de 30 dias para o relatório de inspeção do medidor após um TOI e como contestar cobranças indevidas de energia. Veja grátis o que falta no seu TOI.",
    categoria: "Perícia do Medidor",
    tempoLeitura: "5 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["prazo relatório perícia medidor", "contestação TOI energia", "recuperação de consumo energia", "irregularidade medidor"],
    conteudo: `## O que é o relatório de inspeção e por que ele importa

Ao receber um Termo de Ocorrência e Inspeção (TOI) ou uma notificação de recuperação de consumo, o consumidor se depara com um processo técnico complexo. A distribuidora de energia elétrica, ao suspeitar de irregularidades no medidor, realiza a substituição do aparelho e o envia para perícia. O relatório técnico resultante dessa análise é o documento que fundamenta, ou não, a cobrança retroativa enviada posteriormente.

É fundamental compreender que a emissão desse relatório está sujeita a prazos e procedimentos rigorosos previstos na Resolução ANEEL nº 1.000/2021. O descumprimento dessas regras pode fragilizar a legalidade da cobrança imposta ao consumidor.

## O prazo legal de 30 dias

Conforme estabelecido pelos arts. 250 e 592 da Resolução ANEEL nº 1.000/2021, o relatório de perícia do medidor em laboratório deve ser emitido em até 30 dias contados da solicitação do consumidor. É um erro comum acreditar que este prazo conta a partir de outra data; a contagem é específica e vinculada ao pedido formal da perícia.

Caso a distribuidora ultrapasse esse período sem apresentar o laudo técnico conclusivo, a validade da prova material pode ser questionada. O direito do consumidor de acompanhar o processo reforça a necessidade de transparência e o cumprimento estrito desses prazos.

## A falha na demonstração do período da irregularidade

Um dos pontos críticos nas notificações de recuperação de consumo é a determinação do período em que a suposta irregularidade ocorreu. Muitas distribuidoras aplicam o teto máximo de 36 ciclos, previsto no art. 596, como se este fosse o período padrão de cobrança. Contudo, o art. 596 estabelece que, quando o período de duração da irregularidade não é identificável por meio técnico ou histórico de consumo, a cobrança deve se limitar a 6 ciclos anteriores à constatação, sendo 36 ciclos apenas o teto máximo legal.

A imposição do teto sem a devida demonstração técnica pode configurar cobrança indevida. De acordo com o art. 323, faturamentos realizados a maior, independentemente de dolo ou culpa da distribuidora, autorizam a revisão de até 60 ciclos e a possibilidade de devolução em dobro da quantia recebida indevidamente.

## O conjunto probatório exigido

Para que o processo de recuperação seja válido, a distribuidora deve seguir as providências cumulativas de caracterização da irregularidade descritas no art. 590 da Resolução ANEEL nº 1.000/2021. Além disso, nos termos do art. 591, a empresa possui deveres específicos na emissão do TOI, como a entrega do documento com recibo e a informação clara sobre o direito à perícia metrológica.

Os critérios de cálculo da receita a recuperar devem observar estritamente o disposto no art. 595. Se esses passos não forem seguidos, a base probatória da empresa torna-se insuficiente. O Código de Defesa do Consumidor, aplicado à relação entre o usuário e a concessionária, prevê a proteção do consumidor contra práticas abusivas, cabendo à distribuidora demonstrar, de forma inequívoca e dentro dos prazos regulamentares, a veracidade da irregularidade apontada.

## Como proceder diante da cobrança

Se você recebeu um TOI ou uma notificação de cobrança, não negligencie o prazo para apresentar a sua defesa. O documento enviado pela distribuidora contém informações sobre o prazo para a contestação administrativa, que deve ser verificado diretamente na notificação recebida. Mantenha o pagamento das suas faturas mensais de consumo regular para evitar a interrupção do fornecimento, enquanto discute a legitimidade do débito retroativo.

No CheckMulta, você pode enviar o TOI ou a notificação de recuperação de consumo e receber uma análise que aponta se a cobrança apresenta falha capaz de fundamentar uma contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "o-prazo-de-30-dias-para-o-relatorio-de-inspecao-do-medidor-de-energia",
    titulo: "O prazo de 30 dias para o relatório de inspeção do medidor de energia",
    descricao: "Entenda o prazo legal de 30 dias para a emissão do relatório de inspeção após o TOI e como contestar cobranças indevidas de recuperação de consumo.",
    categoria: "Perícia do Medidor",
    tempoLeitura: "5 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["TOI energia", "relatório de inspeção medidor", "recuperação de consumo", "contestar cobrança indevida"],
    conteudo: `## A importância do prazo na perícia do medidor

Ao receber um Termo de Ocorrência e Inspeção (TOI) ou uma notificação de recuperação de consumo, o consumidor se vê diante de um procedimento que deve observar estritos ritos regulatórios. Entre os direitos assegurados ao consumidor pela Resolução ANEEL nº 1.000/2021, o controle sobre os prazos e procedimentos da distribuidora é fundamental para a defesa.

Conforme estabelecido nos arts. 592 e 250 da norma, o prazo para conclusão e disponibilização dos resultados da perícia técnica, quando solicitada pelo consumidor, é de 30 dias. Este prazo visa garantir que a análise não se prolongue indefinidamente, reduzindo a incerteza do consumidor sobre o débito que lhe está sendo atribuído.

## O que caracteriza uma inspeção regular?

A regulação impõe um conjunto de procedimentos que a distribuidora deve seguir para que uma cobrança de recuperação de consumo possa ser considerada válida. De acordo com o art. 590, a caracterização da irregularidade exige providências cumulativas, como a correta descrição da ocorrência e a observância do devido processo legal administrativo.

Ademais, o art. 591 estabelece deveres essenciais na emissão do TOI, incluindo a entrega de cópia ao consumidor mediante recibo e a obrigatória informação sobre o direito de solicitar perícia técnica metrológica no equipamento, assegurando transparência desde o início da fiscalização.

## Direitos durante a perícia laboratorial

É dever da distribuidora, ao retirar o medidor, garantir a integridade do equipamento. A empresa deve comunicar previamente ao consumidor a data e o horário em que a perícia ocorrerá no laboratório, conforme arts. 592 e 250. O consumidor possui o direito de acompanhar a perícia, podendo, inclusive, ser acompanhado por um assistente técnico, o que confere maior segurança jurídica ao processo de avaliação.

Caso o relatório final não observe as normas ou se a perícia for realizada sem a observância das regras de comunicação prévia, abre-se a possibilidade de questionamento sobre a validade dos resultados apresentados pela distribuidora.

## Atenção ao cálculo da recuperação de consumo

Um erro comum verificado em cobranças é a aplicação automática de um período de retroatividade excessivo. É importante destacar que os 36 ciclos previstos no art. 596 representam apenas o teto máximo permitido, e não um período de cobrança padrão.

A distribuidora deve demonstrar tecnicamente o período da irregularidade. Caso não haja elementos técnicos que comprovem o início exato do desvio, a cobrança deve ser limitada a 6 ciclos anteriores à constatação (art. 596). O art. 323 complementa que, em casos de faturamento a maior, o consumidor tem direito à revisão de até 60 ciclos e, em situações específicas, à devolução em dobro dos valores pagos indevidamente.

Se você recebeu um TOI e deseja verificar se a cobrança está fundamentada corretamente, é recomendável cautela e análise técnica. A contestação deve ser formalizada dentro do prazo informado na notificação recebida pela distribuidora. Ressalta-se que a contestação foca exclusivamente no débito retroativo, sendo necessário que o consumidor continue quitando as faturas de consumo mensal para evitar a interrupção do fornecimento de energia por inadimplência das faturas correntes.

Para avaliar se a cobrança apresenta possíveis falhas procedimentais, é possível buscar análise técnica especializada para subsidiar a sua defesa administrativa ou judicial.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "toi-sem-informacao-sobre-pericia-no-inmetro-entenda-o-seu-direito",
    titulo: "TOI sem informação sobre perícia no INMETRO: entenda o seu direito",
    descricao: "Recebeu uma notificação de cobrança de energia? Saiba como a ausência de aviso sobre a perícia metrológica pode fragilizar o procedimento da empresa.",
    categoria: "Falhas do TOI",
    tempoLeitura: "5 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["TOI energia eletrica", "cobrança retroativa energia", "perícia medidor INMETRO", "contestação TOI"],
    conteudo: `## A importância da perícia metrológica no procedimento de recuperação de consumo

A emissão de um Termo de Ocorrência e Inspeção (TOI) por parte das distribuidoras de energia elétrica é um procedimento regulado por normas estritas da ANEEL. Quando uma empresa identifica uma irregularidade no medidor, ela deve seguir um rito formal que assegure o contraditório e a ampla defesa do consumidor.

Um dos pilares desse rito é o direito à perícia metrológica. Trata-se da análise técnica do equipamento para verificar se houve, de fato, erro na medição do consumo. A ausência de informação clara sobre esse direito no documento entregue ao consumidor constitui uma falha procedimental.

## O que a norma diz sobre o TOI

Conforme o art. 590 da Resolução ANEEL nº 1.000/2021, o procedimento de recuperação de consumo exige providências cumulativas para a caracterização da irregularidade. 

Mais especificamente, o art. 591 estabelece deveres na emissão do TOI, incluindo a entrega do documento com recibo e a obrigação de informar o consumidor sobre o direito à perícia metrológica. Se o documento entregue no momento da inspeção não apresenta essas informações de forma compreensível, o rito processual pode ser considerado viciado.

## Por que a perícia é fundamental

A perícia realizada garante que a alegação da distribuidora seja confrontada com dados técnicos. Segundo os arts. 592 e 250 da Resolução 1.000/2021, a perícia do medidor deve ocorrer com observância ao prazo de 30 dias contados da solicitação. A omissão dessas providências retira do consumidor a oportunidade de comprovar a integridade de seu equipamento ou de contestar eventuais falhas técnicas da distribuidora.

## O erro comum no cálculo do período de irregularidade

É comum que, ao notificar o consumidor, a distribuidora busque aplicar o teto máximo de cobrança retroativa. No entanto, é fundamental esclarecer que o art. 596 define um período de duração da irregularidade com o limite de 36 ciclos, sendo este apenas o teto máximo. 

Caso não seja possível identificar a data de início da irregularidade, a regra correta é a aplicação de 6 ciclos de cobrança. O desconhecimento dessas normas pode colocar o consumidor em desvantagem, permitindo que valores sejam apurados sem a devida fundamentação técnica exigida, conforme critérios estabelecidos pelo art. 595.

## Como proceder diante de uma cobrança irregular

Caso o documento recebido não tenha cumprido os requisitos de transparência, há fundamentos jurídicos possíveis para questionar a cobrança. O Código de Defesa do Consumidor reforça a necessidade de clareza nas informações prestadas aos clientes. Além disso, o art. 323 da Resolução 1.000/2021 trata da revisão de faturamento em casos de cobrança a maior, possibilitando a revisão de até 60 ciclos e a devolução em dobro de valores pagos indevidamente.

É essencial manter o pagamento das faturas de consumo corrente em dia. A contestação administrativa deve ser focada exclusivamente no débito retroativo apontado no TOI. Verifique na notificação recebida qual é o prazo para apresentação de sua defesa, mantendo a atenção aos termos e datas ali informados. Caso a notificação mencione riscos de suspensão do fornecimento ou negativação, o pedido de suspensão da cobrança durante a análise da contestação é um ponto relevante a ser arguido.

Você pode analisar o TOI ou a notificação de recuperação de consumo recebida para identificar se a cobrança apresenta falhas capazes de fundamentar uma contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "o-prazo-de-30-dias-para-o-relatorio-de-inspecao-do-medidor",
    titulo: "O prazo de 30 dias para o relatório de inspeção do medidor",
    descricao: "Entenda o prazo legal para a emissão do relatório de perícia técnica após o TOI e como a falta desse documento pode impactar sua contestação.",
    categoria: "Perícia do Medidor",
    tempoLeitura: "5 min",
    imagemEmoji: "⚖️",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["prazo relatório perícia medidor", "contestação TOI energia", "recuperação de consumo energia", "irregularidade medidor"],
    conteudo: `## A importância do relatório de perícia no processo de TOI

Quando uma distribuidora de energia elétrica identifica uma suposta irregularidade no medidor, inicia-se um procedimento rigoroso regido pela Resolução ANEEL nº 1.000/2021. Muitas vezes, o consumidor é surpreendido pela emissão de um Termo de Ocorrência e Inspeção (TOI) e, posteriormente, por uma notificação de recuperação de consumo. Um dos pilares fundamentais para a validade dessa cobrança é a correta apuração técnica, que culmina na emissão do relatório de inspeção.

É essencial compreender que, conforme os arts. 592 e 250, o consumidor possui o direito de acompanhar a perícia do medidor em laboratório, devendo ser comunicado previamente sobre a data e o horário. Após a realização desta perícia, a distribuidora tem a obrigação de elaborar um relatório de inspeção. O prazo para a disponibilização deste documento é de 30 dias, contados a partir da data da solicitação da perícia pelo consumidor.

## O que a regulamentação exige

A Resolução ANEEL nº 1.000/2021 estabelece um rito obrigatório para garantir o contraditório e a ampla defesa. Para que uma cobrança de recuperação de consumo seja legítima, a distribuidora deve observar procedimentos cumulativos definidos no art. 590, que tratam das providências para caracterização da irregularidade. Além disso, o art. 591, incisos I e II, bem como seus §§ 1º e 3º, determinam os deveres na emissão do TOI, como a entrega obrigatória com recibo e a informação clara ao consumidor sobre o seu direito à perícia metrológica.

Se a empresa não cumprir esses ritos, ou se o relatório não for apresentado no prazo legal, a integridade da cobrança pode ser questionada. O consumidor, amparado pelo Código de Defesa do Consumidor, tem o direito de exigir que a distribuidora comprove tecnicamente a irregularidade alegada, visto que o ônus da prova recai sobre quem presta o serviço.

## O cálculo da recuperação e o período de cobrança

Um erro recorrente nas notificações de recuperação de consumo é a aplicação automática de um período extenso de faturamento. É fundamental esclarecer que os 36 ciclos previstos no art. 596 representam apenas o teto máximo de cobrança, e não um padrão de aplicação automática. 

Caso o período da irregularidade não possa ser determinado tecnicamente ou pelo histórico do consumidor, a cobrança deve ser limitada a, no máximo, 6 ciclos anteriores à constatação da irregularidade. A tentativa de cobrar o período máximo sem a devida fundamentação técnica é um ponto frequentemente abordado em contestações administrativas.

Além disso, o art. 595 estabelece critérios técnicos para o cálculo da receita a recuperar. O descumprimento desses critérios ou a cobrança de valores indevidos pode ensejar a revisão do débito, inclusive com a possibilidade de devolução em dobro dos valores pagos a maior, conforme prevê o art. 323, que trata da revisão de até 60 ciclos em casos de faturamento incorreto.

## Como proceder diante de uma cobrança

Se você recebeu um TOI ou uma notificação de recuperação de consumo, o primeiro passo é reunir todos os documentos entregues pela distribuidora. Verifique se o relatório de inspeção foi entregue dentro do prazo e se a metodologia de cálculo respeita as normas da ANEEL. Importante: não interrompa o pagamento das suas faturas de consumo mensal para evitar riscos de suspensão do fornecimento por inadimplência; a contestação deve ser formalizada especificamente quanto ao débito retroativo.

O prazo para protocolar a sua contestação deve ser verificado diretamente na notificação recebida, pois este varia conforme as orientações da distribuidora. Em caso de dúvidas sobre a fundamentação técnica ou a necessidade de solicitar uma reanálise, é recomendável buscar uma avaliação profissional do documento.

No CheckMulta, é possível enviar o TOI ou a notificação de recuperação de consumo para obter uma análise técnica que aponte se a cobrança apresenta falhas que possam fundamentar a sua contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "como-ler-e-interpretar-um-termo-de-ocorrencia-e-inspecao-toi",
    titulo: "Como ler e interpretar um Termo de Ocorrência e Inspeção (TOI)",
    descricao: "Recebeu um TOI ou cobrança de energia? Entenda os pontos críticos do documento e o que a norma da ANEEL exige para que a cobrança seja considerada válida.",
    categoria: "Primeiros Passos",
    tempoLeitura: "6 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["como contestar TOI energia", "cálculo recuperação de consumo ANEEL", "o que é termo de ocorrência de inspeção", "fatura irregularidade energia"],
    conteudo: `## Introdução ao Termo de Ocorrência e Inspeção (TOI)

O Termo de Ocorrência e Inspeção, popularmente conhecido pela sigla TOI, é o documento formal por meio do qual a distribuidora de energia elétrica registra a constatação de uma suposta irregularidade na unidade consumidora. Receber este documento, muitas vezes acompanhado de uma notificação de cobrança de recuperação de consumo, gera preocupação imediata devido aos valores elevados.

É fundamental compreender que o TOI não é, por si só, uma sentença definitiva de culpa. Para que a cobrança de um suposto desvio ou irregularidade seja legítima, a distribuidora deve seguir um rigoroso procedimento administrativo estabelecido pela Resolução ANEEL nº 1.000/2021. O desconhecimento dessas regras permite que falhas processuais passem despercebidas, o que pode prejudicar o consumidor.

## O que observar no momento da inspeção

Conforme estabelece o art. 590 da Resolução ANEEL nº 1.000/2021, a distribuidora deve observar as providências cumulativas para caracterização da irregularidade. Isso significa que não basta a emissão de um papel assinado pelo técnico. O processo exige que a distribuidora reúna evidências técnicas e documentais que comprovem a ocorrência do fato. Se a inspeção não observou tais cautelas, a fundamentação da cobrança pode estar fragilizada.

## Deveres formais da distribuidora

O art. 591 da mesma norma define obrigações claras no ato da emissão do TOI, nos termos dos seus incisos I, II e parágrafos 1º e 3º. O consumidor tem o direito de receber uma cópia legível do documento no momento da inspeção, devendo ser colhida a sua assinatura. Caso o documento seja emitido eletronicamente, a distribuidora deve garantir a impressão no local ou o envio com comprovação de entrega.

Além disso, o consumidor deve ser expressamente informado sobre seu direito de solicitar perícia metrológica no medidor. O processo de perícia, previsto nos arts. 592 e 250 da referida norma, exige o acondicionamento do medidor em invólucro específico, lacrado no ato da retirada, devendo a distribuidora assegurar a realização do exame em laboratório com a comunicação prévia ao consumidor, respeitando o prazo de 30 dias contados da solicitação.

## A questão dos cálculos e o período da irregularidade

O ponto que causa maior impacto financeiro é o período da cobrança. O art. 596 da Resolução ANEEL nº 1.000/2021 determina que, quando não for possível identificar o período exato da irregularidade, o cálculo deve ser limitado a 6 ciclos (meses) anteriores à constatação. Embora a norma preveja um teto máximo de 36 ciclos, este não é um valor automático ou padrão. A distribuidora tem o ônus de provar tecnicamente o início da falha. Cobranças baseadas no teto de 36 meses sem evidências técnicas sólidas podem ser objeto de contestação.

Os critérios para o cálculo, descritos no art. 595, envolvem critérios técnicos previstos na norma para a apuração da receita a recuperar. Em caso de faturamento a maior, o consumidor tem o direito de revisar até 60 ciclos anteriores e pleitear a devolução do valor indevidamente pago em dobro, conforme o art. 323.

## Defesa e procedimentos administrativos

Ao contestar uma cobrança retroativa, o consumidor deve verificar o prazo para interposição de recurso estipulado na própria notificação recebida. É importante ressaltar que a contestação não exime o consumidor do pagamento das faturas de energia do mês corrente; o foco deve ser a impugnação do débito retroativo. O pagamento das faturas atuais deve ser mantido para evitar a suspensão do fornecimento por inadimplência.

O Código de Defesa do Consumidor é um pilar fundamental em todo este processo, garantindo o direito à informação clara, à facilitação da defesa e, em muitos casos, a possibilidade de inversão do ônus da prova, uma vez que a distribuidora possui maior capacidade técnica para provar a ocorrência alegada.

Caso tenha recebido um TOI ou notificação de recuperação de consumo, é recomendável analisar a documentação técnica para verificar se o procedimento seguiu as normas vigentes, o que pode servir de base para uma eventual contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "cobranca-sem-pericia-no-medidor-entenda-seus-direitos-e-a-norma",
    imagemUrl: "/blog/energia/cobranca-sem-pericia-no-medidor-entenda-seus-direitos-e-a-norma.jpg",
    titulo: "Cobrança sem perícia no medidor: entenda seus direitos e a norma",
    descricao: "Recebeu uma cobrança de energia sem que seu medidor tenha sido periciado? Entenda o que a Resolução 1.000 da ANEEL diz sobre isso e analise seu documento.",
    categoria: "Perícia do Medidor",
    tempoLeitura: "5 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["TOI sem perícia", "cobrança irregular energia", "recuperação de consumo ANEEL", "contestação termo de ocorrência"],
    conteudo: `## A importância da perícia no processo de recuperação de consumo

Ao receber um Termo de Ocorrência e Inspeção (TOI) ou uma notificação de recuperação de consumo, o consumidor se depara com uma situação técnica complexa. Frequentemente, a distribuidora de energia emite uma cobrança retroativa alegando irregularidades no medidor sem que tenha ocorrido a devida análise laboratorial do equipamento. É fundamental compreender que a legislação vigente, especificamente a Resolução ANEEL nº 1.000/2021, estabelece requisitos rigorosos para que tal cobrança possua validade.

## O procedimento regular segundo a norma

De acordo com o art. 590 da Resolução ANEEL nº 1.000/2021, a caracterização de um procedimento irregular exige que a distribuidora adote uma série de providências cumulativas. Não basta apenas a emissão do documento de inspeção; é necessária a solicitação de verificação ou perícia metrológica e a elaboração de relatório de avaliação técnica. O histórico de consumo e as grandezas elétricas devem ser criteriosamente analisados para fundamentar qualquer cobrança.

Quanto à emissão do TOI, o art. 591, incisos I, II, § 1º e § 3º, determina que a distribuidora deve entregar cópia do termo ao consumidor, mediante recibo, e prestar informações claras sobre o direito de solicitar a perícia metrológica do medidor.

Quando o medidor é retirado, os arts. 592 e 250 da Resolução ANEEL nº 1.000/2021 estabelecem direitos essenciais ao consumidor:

- O lacre deve ser colocado no ato da retirada do equipamento.
- A distribuidora tem o dever de informar previamente a data e o horário da perícia em laboratório.
- O consumidor possui o direito de acompanhar a perícia e de nomear um assistente técnico.
- O relatório de inspeção deve ser disponibilizado em até 30 dias contados da solicitação.

Se o medidor foi removido e a distribuidora não seguiu essas etapas, ou se a cobrança foi emitida sem a realização da perícia técnica necessária para comprovar a suposta irregularidade, há possibilidade de questionamento administrativo.

## Critérios de cálculo e o limite do período de cobrança

Outro ponto que gera insegurança é a definição do período de cobrança. Conforme o art. 596 da Resolução ANEEL nº 1.000/2021, a duração da irregularidade deve ser determinada tecnicamente ou por meio do histórico de consumo. O erro comum observado em notificações é a aplicação automática do prazo máximo.

É importante esclarecer que os 36 ciclos previstos na norma representam apenas o teto máximo de cobrança. Na ausência de demonstração técnica precisa sobre quando a irregularidade teria começado, o período correto a ser considerado é de apenas 6 ciclos anteriores à constatação (art. 596). 

Adicionalmente, os critérios para o cálculo da receita a recuperar devem seguir o disposto no art. 595, que avalia o fator de correção, a média dos três maiores consumos em até 12 ciclos anteriores e a carga instalada ou desviada. Caso identifique faturamento a maior, o consumidor pode buscar a revisão de até 60 ciclos e a devolução em dobro, conforme o art. 323.

## O papel do consumidor na contestação

O Código de Defesa do Consumidor é um pilar importante na defesa contra cobranças abusivas. Como a relação entre distribuidora e consumidor é de consumo, a empresa deve demonstrar a regularidade do procedimento que culminou na cobrança.

Caso você tenha sido notificado, é indispensável observar os prazos estipulados na própria notificação recebida para apresentar sua contestação administrativa. Ressaltamos que a contestação foca no valor retroativo e não dispensa o pagamento das faturas de consumo corrente, sob risco de interrupção do serviço.

Se a sua notificação não cumpriu as exigências de notificação prévia de perícia ou se houve falhas formais na lavratura do termo conforme o art. 591, esses pontos podem ser arguidos em sua defesa. A ausência de perícia pode enfraquecer a legitimidade da cobrança retroativa.

No CheckMulta, você pode enviar o documento de notificação de recuperação de consumo para receber uma análise que aponta se a cobrança apresenta falhas capazes de fundamentar sua contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "notificacao-de-recuperacao-de-consumo-o-que-fazer-ao-receber-um-toi",
    titulo: "Notificação de recuperação de consumo: o que fazer ao receber um TOI",
    descricao: "Recebeu um TOI ou cobrança de energia? Entenda os passos fundamentais para analisar a notificação e exercer seu direito de defesa técnica e administrativa.",
    categoria: "Primeiros Passos",
    tempoLeitura: "6 min",
    imagemEmoji: "⚡",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["TOI energia", "recuperação de consumo", "cobrança retroativa energia", "ANEEL 1000"],
    conteudo: `## Compreendendo a Notificação de Recuperação de Consumo

A recepção de um Termo de Ocorrência e Inspeção (TOI) ou de uma notificação de cobrança retroativa por suposta irregularidade no medidor gera preocupação imediata. É fundamental manter a calma e compreender que a legislação do setor elétrico estabelece critérios rígidos para que essa cobrança seja considerada válida. O procedimento não é um ato automático e deve seguir ritos formais previstos na Resolução ANEEL nº 1.000/2021.

## O Primeiro Passo: A Verificação da Legalidade do Procedimento

O início do processo exige que a distribuidora cumpra as providências cumulativas listadas no art. 590 da Resolução ANEEL nº 1.000/2021. Para que o procedimento tenha validade técnica, a concessionária deve observar as exigências legais de caracterização da irregularidade.

Se os passos formais não forem respeitados, o procedimento pode apresentar vícios que sustentam uma contestação administrativa. Lembre-se que, sob a luz do Código de Defesa do Consumidor, é possível pleitear a inversão do ônus da prova, cabendo à distribuidora demonstrar a regularidade de todo o processo.

## O Direito à Perícia Técnica

O consumidor possui direitos essenciais durante a inspeção do medidor (arts. 592 e 250 da Resolução ANEEL nº 1.000/2021). Caso o medidor seja retirado para análise, a distribuidora deve garantir a integridade do equipamento. O relatório da perícia metrológica deve ser emitido em até 30 dias contados da solicitação.

Além disso, conforme o art. 591, incisos I, II, § 1º e § 3º, é dever da distribuidora emitir o TOI, entregá-lo ao consumidor ou representante mediante recibo, e informar claramente sobre o direito à perícia técnica. A ausência dessas informações pode comprometer a validade do débito.

## Atenção aos Critérios de Cálculo e Período de Irregularidade

Este é o ponto onde ocorrem erros frequentes. Muitas distribuidoras aplicam o teto de 36 ciclos de cobrança retroativa (art. 596). Contudo, é importante destacar que 36 ciclos representam o limite máximo, e não a regra geral. Quando o período de duração da irregularidade não é tecnicamente identificável, a cobrança deve ser limitada a 6 ciclos.

O cálculo da receita a recuperar deve seguir os critérios objetivos do art. 595. Caso o consumidor identifique que o faturamento da conta de luz estava excessivo em relação ao consumo real, ele pode se amparar no art. 323, que prevê a possibilidade de revisão de até 60 ciclos e a eventual devolução de valores cobrados a maior.

## Como Proceder de Forma Segura

1. Analise o prazo para contestação indicado no documento recebido. Não ignore as datas impostas pela concessionária, conferindo a contagem de tempo diretamente na notificação recebida.
2. Verifique se o TOI foi devidamente entregue e se cumpre as exigências formais de notificação.
3. Continue realizando o pagamento das faturas de consumo corrente. A contestação administrativa foca exclusivamente na cobrança retroativa; o inadimplemento das contas do mês pode gerar a interrupção regular do fornecimento por falta de pagamento.
4. Se houver ameaça de corte ou negativação, a contestação administrativa deve incluir o pedido de suspensão da cobrança enquanto o processo de apuração estiver em curso.

No CheckMulta, o consumidor pode enviar o TOI ou a notificação de recuperação de consumo para que seja realizada uma análise que verifique se a cobrança apresenta falhas capazes de fundamentar uma contestação.

---
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`,
  },

  {
    slug: "o-que-e-toi-termo-de-ocorrencia-e-inspecao",
    titulo: "O que é o TOI (Termo de Ocorrência e Inspeção) da conta de luz",
    descricao: "Entenda o documento que a distribuidora emite ao acusar irregularidade no medidor e o que ele precisa conter para ser válido. Veja grátis o que falta no seu TOI.",
    categoria: "Primeiros Passos",
    tempoLeitura: "5 min",
    imagemEmoji: "⚡",
    imagemBg: "from-amber-50 to-yellow-50",
    palavrasChave: ["o que é TOI", "termo de ocorrência e inspeção", "irregularidade medidor energia", "cobrança retroativa luz"],
    conteudo: `## O documento que dá início à cobrança

Quando um técnico da distribuidora inspeciona o medidor de uma unidade consumidora e entende ter encontrado alguma irregularidade, ele lavra um documento chamado Termo de Ocorrência e Inspeção, o TOI. É a partir dele que nasce a cobrança retroativa conhecida como recuperação de consumo.

Muita gente descobre a existência do TOI só quando a fatura chega com um valor muito acima do normal. Outras recebem o papel na hora da inspeção e guardam sem entender o peso do documento. Nos dois casos, vale saber: o TOI não é uma decisão final nem uma prova definitiva. É o registro de uma constatação feita pela própria empresa que vai cobrar.

## O que a norma exige da distribuidora

O procedimento é regulado em âmbito federal pela Resolução Normativa ANEEL nº 1.000/2021, que vale igualmente para todas as distribuidoras do país. O art. 590 da resolução determina que, diante de indício de procedimento irregular, a distribuidora adote um conjunto de providências para caracterizar o fato: emitir o TOI em formulário próprio, solicitar a verificação ou perícia metrológica, elaborar relatório de avaliação técnica quando houver violação do medidor e avaliar o histórico de consumo e as grandezas elétricas.

Repare que não é uma lista de opções. São providências que compõem, em conjunto, a caracterização da irregularidade.

## O que o TOI precisa informar ao consumidor

O art. 591 acrescenta deveres específicos no momento da emissão. A distribuidora deve entregar cópia legível ao consumidor ou a quem acompanhou a inspeção, mediante recibo com assinatura. E deve informar a possibilidade de solicitar verificação ou perícia metrológica junto ao INMETRO ou órgão metrológico delegado, além dos prazos e dos custos envolvidos.

Há ainda uma regra importante para quem não estava em casa. Segundo o parágrafo 3º do mesmo artigo, se houve recusa do recebimento ou se quem acompanhou a inspeção não foi o consumidor, a distribuidora deve enviar a cópia do TOI em até 15 dias da emissão, por meio que permita comprovar o recebimento.

## Por que isso importa para você

Cada uma dessas exigências é um ponto de verificação. Quando o procedimento não observa as formalidades da resolução, os tribunais têm reconhecido que o débito dele decorrente perde sustentação. E o ônus de demonstrar que tudo foi cumprido é da distribuidora, não do consumidor.

## Analise seu TOI gratuitamente

Nossa inteligência artificial lê o seu Termo de Ocorrência e Inspeção e verifica, ponto por ponto, as exigências da Resolução ANEEL nº 1.000/2021. A análise é gratuita e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "recebi-cobranca-retroativa-de-energia-o-que-fazer",
    titulo: "Recebi uma cobrança retroativa de energia: o que fazer agora",
    descricao: "Passo a passo do que fazer ao receber uma fatura de recuperação de consumo, quais documentos reunir e onde protocolar a contestação.",
    categoria: "Primeiros Passos",
    tempoLeitura: "6 min",
    imagemEmoji: "📄",
    imagemBg: "from-sky-50 to-blue-50",
    palavrasChave: ["cobrança retroativa energia", "recuperação de consumo", "conta de luz alta cobrança", "contestar débito distribuidora"],
    conteudo: `## Primeiro: não é hora de pânico, é hora de documento

A cobrança de recuperação de consumo costuma chegar com valores altos e um prazo curto. A reação natural é ligar para a distribuidora e discutir por telefone. O problema é que a discussão informal não deixa rastro e não interrompe nada.

O que muda o jogo é o protocolo formal.

## Reúna estes documentos

Antes de contestar, junte o que você tiver. Cada item vira argumento ou vira prova.

- O TOI, se você recebeu uma cópia na inspeção ou pelo correio.
- A notificação da cobrança, com a memória de cálculo, se houver.
- A fatura em que o valor retroativo foi lançado.
- Suas faturas dos últimos dois anos, para comparar o histórico de consumo.
- Qualquer registro do dia da inspeção: quem estava em casa, se alguém assinou algo, se você recebeu papel.

Esse último ponto costuma ser decisivo e quase ninguém anota na hora.

## Continue pagando as faturas normais

Ponto importante e que gera confusão: a discussão é sobre o débito retroativo, não sobre o seu consumo do mês. Deixar de pagar as faturas correntes enfraquece a sua posição e cria um problema novo. Pague o consumo normal e conteste apenas o valor da recuperação.

## Onde protocolar

O caminho tem degraus, e pular degrau atrapalha.

Comece pela própria distribuidora, pelos canais de atendimento. Guarde o número de protocolo. Sem ele você não consegue demonstrar depois que reclamou. Se a resposta for negativa ou simplesmente não vier, o passo seguinte é a ouvidoria da distribuidora. Depois disso, a ANEEL. A via judicial permanece disponível a qualquer momento.

## O prazo

O prazo para reclamar consta da própria notificação que você recebeu. Confira no documento e, em caso de dúvida, confirme junto à distribuidora. Não deixe para o último dia: uma reclamação protocolada é o que sustenta o pedido de suspensão da cobrança enquanto ela é analisada.

## O que costuma render argumento

Dois grupos de falhas aparecem com frequência. O primeiro é de formalidade: TOI lavrado sem ninguém acompanhando, ausência de informação sobre o direito à perícia, alegação de violação do medidor sem avaliação técnica. O segundo é de cálculo: cobrança de um período longo sem que a distribuidora demonstre quando a irregularidade teria começado.

Vale saber que um TOI formalmente correto pode, ainda assim, ter o valor derrubado pelo segundo grupo.

## Verifique sua cobrança gratuitamente

Envie o TOI, a notificação ou a fatura e receba a análise das duas frentes, formalidade e cálculo, sem custo e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "toi-lavrado-sem-o-consumidor-presente",
    titulo: "TOI lavrado sem o consumidor presente: isso vale?",
    descricao: "Entenda por que a inspeção feita apenas pelos técnicos, sem consumidor nem acompanhante, compromete o contraditório e enfraquece a cobrança.",
    categoria: "Falhas do TOI",
    tempoLeitura: "5 min",
    imagemEmoji: "🚪",
    imagemBg: "from-rose-50 to-red-50",
    palavrasChave: ["TOI sem consumidor presente", "inspeção unilateral medidor", "TOI não assinado", "contraditório recuperação de consumo"],
    conteudo: `## A situação mais comum de todas

Você sai para trabalhar. A distribuidora inspeciona o medidor durante o dia. Semanas depois chega uma cobrança de milhares de reais por uma irregularidade que você não viu constatarem, num equipamento que você não viu abrirem.

Essa situação tem nome técnico: apuração unilateral. E é um dos pontos mais frágeis de uma cobrança de recuperação de consumo.

## O que a norma diz

O art. 590 da Resolução ANEEL nº 1.000/2021 exige que a distribuidora componha um conjunto de evidências para caracterizar o procedimento irregular. Não basta o técnico anotar que encontrou algo: é preciso um encadeamento de providências, e todas elas pressupõem que o consumidor possa participar e se defender.

O art. 591 reforça essa lógica ao exigir a entrega de cópia legível mediante recibo com assinatura do consumidor ou de quem acompanhou a inspeção. A assinatura existe justamente porque a norma pressupõe alguém presente.

## E quando não tem ninguém em casa

A resolução previu isso. O parágrafo 3º do art. 591 estabelece que, em caso de recusa do recebimento do TOI ou se não foi o consumidor quem acompanhou a inspeção, a distribuidora deve enviar a cópia do TOI e as demais informações em até 15 dias da emissão, por modalidade que permita a comprovação do recebimento.

Ou seja: a norma não proíbe a inspeção sem o consumidor. Ela exige que, nesse caso, a comunicação posterior seja feita e comprovada. É aqui que muitos procedimentos falham. A distribuidora afirma ter enviado, mas não apresenta o comprovante de recebimento.

## Como a Justiça tem tratado

Decisões têm considerado que a ausência de comprovação do envio da cópia do TOI caracteriza violação da ampla defesa e do contraditório. E há entendimento de que o TOI lavrado somente pelos inspetores que prestam serviço à distribuidora, sem o consumidor ou seu representante, viola a resolução.

O ponto de fundo é que cabe à distribuidora comprovar que adotou as providências necessárias e assegurou o contraditório. Não ao consumidor provar que nada aconteceu.

## O que verificar no seu caso

Olhe o seu TOI e responda: há assinatura de alguém? Consta identificação de quem acompanhou? Se ninguém assinou, você recebeu depois alguma correspondência com aviso de recebimento? Guardou?

## Analise seu TOI gratuitamente

Nossa análise verifica exatamente esses pontos e cita o trecho do seu documento que fundamenta cada apontamento. Grátis e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "direito-a-pericia-no-medidor-inmetro",
    titulo: "Direito à perícia no medidor: o que a distribuidora precisa te informar",
    descricao: "O TOI deve informar a possibilidade de perícia metrológica no INMETRO, com prazos e custos. Saiba o que fazer quando essa informação não aparece.",
    categoria: "Falhas do TOI",
    tempoLeitura: "5 min",
    imagemEmoji: "🔍",
    imagemBg: "from-violet-50 to-purple-50",
    palavrasChave: ["perícia medidor INMETRO", "perícia metrológica energia", "art 591 REN 1000", "direito perícia TOI"],
    conteudo: `## Um direito que muita gente nem sabe que tem

Quando a distribuidora acusa irregularidade no medidor, o consumidor tem o direito de pedir que o equipamento seja periciado por um órgão externo. Não é favor da empresa: é exigência da norma que ela informe essa possibilidade.

## O que o art. 591 determina

O art. 591 da Resolução ANEEL nº 1.000/2021 estabelece que, ao emitir o TOI, a distribuidora deve informar duas coisas. Primeiro, a possibilidade de solicitação de verificação ou de perícia metrológica junto ao INMETRO ou ao órgão metrológico delegado. Segundo, os prazos, os custos de frete e da verificação ou perícia, e que o consumidor será responsabilizado por esses custos se a irregularidade for comprovada. Sendo vedada a cobrança de outros custos.

Essa segunda parte tem duas leituras que interessam ao consumidor. A informação sobre custo é obrigatória, e a cobrança de qualquer outro valor além de frete e perícia não é permitida.

## Por que a ausência dessa informação pesa

Se o TOI não informa que a perícia existe, o consumidor não exerce um direito que ele nem sabia ter. Isso não é um detalhe de formulário: é a supressão prática de um meio de defesa. O documento que acusa precisa, pela própria norma, apontar o caminho para contestar a acusação.

Quando essa informação falta, o procedimento deixa de observar uma exigência expressa da resolução.

## A discussão sobre quem paga

A norma coloca o custo da perícia com o consumidor se a irregularidade for comprovada. Existe crítica jurídica relevante a esse desenho: quem acusa é a distribuidora, e seria dela o ônus de provar a acusação, inclusive financeiramente. Em processos judiciais, a inversão do ônus da prova em favor do consumidor é discutida com frequência.

Na via administrativa, porém, o texto da resolução é o que se aplica. E vale conhecê-lo antes de decidir se pede a perícia.

## O que olhar no seu documento

Pegue seu TOI e procure qualquer menção a INMETRO, perícia ou verificação metrológica. Procure também a informação de prazos e custos. Se não encontrar nenhuma das duas, você tem um ponto concreto de contestação.

## Verifique seu TOI gratuitamente

A análise aponta se essas informações constam do seu documento e cita o trecho exato. Sem custo e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "cobranca-de-36-meses-de-energia-quando-e-indevida",
    titulo: "Cobrança de 36 meses de energia: quando ela é indevida",
    descricao: "Retroagir a cobrança ao máximo sem demonstrar quando a irregularidade começou é o defeito mais comum. Entenda o limite de 6 ciclos.",
    categoria: "Cálculo e Período",
    tempoLeitura: "6 min",
    imagemEmoji: "📆",
    imagemBg: "from-emerald-50 to-teal-50",
    palavrasChave: ["cobrança 36 meses energia", "período recuperação de consumo", "art 596 REN 1000", "limite 6 ciclos energia"],
    conteudo: `## O defeito mais frequente de todos

Existe uma ideia difundida de que a distribuidora pode cobrar retroativamente 36 meses sempre que constatar irregularidade. Não é assim que a norma funciona, e essa confusão é a origem de boa parte das cobranças excessivas.

## O que o art. 596 determina

O art. 596 da Resolução ANEEL nº 1.000/2021 trata do período de duração da irregularidade. Ele deve ser determinado tecnicamente ou pela análise do histórico de consumo do usuário. Ou seja: a distribuidora precisa demonstrar quando aquilo começou.

E quando não consegue demonstrar? O parágrafo 1º do mesmo artigo responde: a cobrança fica limitada aos 6 ciclos imediatamente anteriores à constatação da irregularidade. Seis meses, não trinta e seis.

Os 36 ciclos são um teto máximo, não um padrão automático.

## Como isso aparece na prática

O caso típico é este: o TOI aponta violação do medidor, a distribuidora aplica o critério de cálculo e simplesmente multiplica pelo maior período possível, sem apontar em que mês o consumo teria caído de forma expressiva, sem análise do histórico, sem justificativa técnica.

Órgãos de defesa do consumidor apontam justamente essa prática, a cobrança retroativa automática de 36 ciclos sem observar os critérios do art. 596, como uma das formas mais comuns de defeito no procedimento.

## Um detalhe que muda tudo

Uma cobrança pode ter TOI impecável e ainda assim cair. Em um caso julgado no Amapá, os ritos do termo foram considerados corretos, mas a cobrança de mais de R$ 30 mil, referente a 33 meses, foi anulada porque o cálculo não observou o limite do artigo que trata do período.

Por isso a análise precisa olhar duas frentes separadas: a formalidade da inspeção e a matemática da cobrança. Quem só verifica a primeira perde metade dos casos.

## Como conferir na sua cobrança

Localize na notificação o período cobrado, em meses ou ciclos. Depois procure, no mesmo documento, a justificativa de quando a irregularidade teria começado. Se o período for maior que seis meses e não houver essa demonstração, você tem um argumento direto.

Vale também olhar o seu próprio histórico de faturas: se não houve queda relevante de consumo no período apontado, isso enfraquece a tese da distribuidora.

## Analise sua cobrança gratuitamente

Nossa análise confere o período cobrado contra os critérios da norma e aponta quando ele não se sustenta. Grátis e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "como-e-calculada-a-recuperacao-de-consumo",
    titulo: "Como é calculada a recuperação de consumo de energia elétrica",
    descricao: "Conheça os critérios de cálculo previstos na norma da ANEEL e por que a ausência de memória de cálculo compromete a cobrança.",
    categoria: "Cálculo e Período",
    tempoLeitura: "6 min",
    imagemEmoji: "🧮",
    imagemBg: "from-slate-50 to-gray-50",
    palavrasChave: ["cálculo recuperação de consumo", "memória de cálculo energia", "art 595 REN 1000", "média dos três maiores consumos"],
    conteudo: `## De onde sai aquele número

A fatura chega com um valor fechado e nenhuma explicação de como se chegou nele. Mas o cálculo não é livre: a norma define critérios específicos, e cada um deles só pode ser usado sob certas condições.

## Os critérios do art. 595

O art. 595 da Resolução ANEEL nº 1.000/2021 estabelece que, comprovado o procedimento irregular, a distribuidora apura a receita a recuperar pela diferença entre o que foi faturado e o que seria devido. Entre os critérios previstos estão:

- Aplicação de fator de correção obtido por inspeção do medidor, **desde que os selos, os lacres, a tampa e a base do medidor estejam intactos**.
- Utilização da média dos três maiores valores de consumo ocorridos em até 12 ciclos completos de medição regular imediatamente anteriores ao início da irregularidade.
- Determinação por meio da carga desviada, quando identificada, ou da carga instalada verificada na constatação.
- Utilização dos valores máximos ocorridos nos 3 ciclos imediatamente posteriores à regularização da medição.

## Onde os cálculos costumam falhar

Repare nas condições. O primeiro critério exige selos, lacres, tampa e base intactos. Se o TOI afirma que o medidor foi violado, esse critério fica comprometido.

O segundo critério exige que a média venha de ciclos de medição **regular**, anteriores ao **início** da irregularidade. Se a distribuidora não determinou quando a irregularidade começou, ela não tem como saber quais ciclos eram regulares. E se ela puxa a média de meses que já estariam dentro do período supostamente irregular, o resultado fica contaminado.

## A memória de cálculo

Tão importante quanto o critério é a demonstração. A notificação deve permitir que o consumidor reproduza a conta: qual critério foi usado, quais valores entraram, por que os demais critérios não foram aplicados.

Sem memória descritiva, o consumidor recebe um número que não pode conferir nem contestar de forma específica. Decisões têm apontado que a ausência de critério objetivo para definir início e duração da irregularidade compromete a mensuração do valor e acaba por anular a fatura de recuperação.

## E se a cobrança foi a maior

Situação diferente, mas relacionada: quando o consumidor foi faturado a maior. O art. 323 da mesma resolução trata do faturamento incorreto e prevê revisão de até 60 ciclos anteriores à constatação, com devolução em dobro da quantia recebida indevidamente, independentemente de dolo ou culpa da distribuidora.

## Analise o cálculo da sua cobrança

Nossa análise verifica qual critério foi aplicado, se as condições dele foram respeitadas e se existe memória de cálculo. Gratuito e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "pericia-do-medidor-em-laboratorio-seus-direitos",
    titulo: "Perícia do medidor em laboratório: quais são os seus direitos",
    descricao: "Lacre na retirada, aviso da data da perícia e direito a assistente técnico. Saiba o que a distribuidora deve cumprir ao levar seu medidor.",
    categoria: "Perícia do Medidor",
    tempoLeitura: "5 min",
    imagemEmoji: "🔧",
    imagemBg: "from-cyan-50 to-sky-50",
    palavrasChave: ["perícia medidor laboratório", "lacre medidor retirada", "assistente técnico perícia energia", "relatório de inspeção 30 dias"],
    conteudo: `## Quando o medidor sai da sua casa

Se a distribuidora retira o medidor para análise em laboratório, um conjunto de garantias passa a valer. Elas existem por um motivo simples: a partir do momento em que o equipamento sai do seu imóvel, ele fica sob a guarda de quem está fazendo a acusação.

## O lacre no ato da retirada

Os arts. 592 e 250 da Resolução ANEEL nº 1.000/2021 estabelecem que a distribuidora deve acondicionar o medidor em invólucro específico e lacrá-lo no ato da retirada do equipamento.

O lacre é a garantia de que o equipamento periciado é o mesmo que saiu da sua casa e que ele não foi manipulado no caminho. Sem esse registro, a cadeia de custódia fica aberta a questionamento.

## O aviso da data da perícia

A distribuidora deve comunicar ao consumidor a data e o horário da realização da avaliação técnica em laboratório, para que ele possa acompanhá-la. E o acompanhamento pode ser feito pessoalmente ou por um assistente técnico contratado pelo consumidor.

Esse é um dos pontos que mais aparece em decisões judiciais. Perícia realizada sem que o consumidor tenha sido comunicado da data é perícia feita sem contraditório. E o resultado dela fica fragilizado como prova.

## O prazo do relatório

Há uma sutileza de contagem que costuma passar batido. O prazo de 30 dias para a distribuidora encaminhar o relatório de inspeção conta a partir da **solicitação**, e não da data acordada para a realização da inspeção. Essa interpretação foi explicitada pela própria ANEEL.

Na prática, isso significa que a distribuidora não pode empurrar o prazo agendando a inspeção para daqui a três meses e só então começar a contar os 30 dias.

## E se o medidor nunca foi periciado

Existe uma situação ainda mais frágil: a alegação de irregularidade sem que o equipamento tenha sido examinado. Se o medidor não foi disponibilizado para exame, não há como afirmar tecnicamente que houve irregularidade. E a cobrança perde a base factual.

## O que verificar

Procure no seu TOI ou na notificação: consta que o medidor foi retirado? Há registro de lacre? Você foi comunicado de alguma data de perícia? Recebeu o relatório?

## Verifique seu caso gratuitamente

A análise cobre a frente da perícia junto com as demais. Grátis e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica.*`,
  },
  {
    slug: "podem-cortar-a-luz-por-debito-de-toi",
    titulo: "Podem cortar a luz por causa de um débito de TOI?",
    descricao: "Entenda a diferença entre o débito de recuperação de consumo e a fatura normal, e o que a jurisprudência diz sobre a suspensão do fornecimento.",
    categoria: "Direitos do Consumidor",
    tempoLeitura: "5 min",
    imagemEmoji: "💡",
    imagemBg: "from-orange-50 to-amber-50",
    palavrasChave: ["corte de energia por TOI", "suspensão fornecimento débito recuperação", "negativação débito energia", "direitos consumidor energia elétrica"],
    conteudo: `## A pergunta que mais assusta

Quem recebe uma cobrança de recuperação de consumo pensa imediatamente na mesma coisa: vão cortar minha luz? O medo é legítimo e costuma ser usado como pressão para o pagamento imediato.

Vale separar as situações.

## Débito de TOI não é fatura de consumo

A fatura mensal cobra a energia que você consumiu naquele mês. O débito de recuperação é uma cobrança retroativa fundada numa acusação de irregularidade. Acusação que está sendo discutida.

Os tribunais têm tratado as duas coisas de forma distinta. Há entendimento firmado de que a concessionária não pode interromper o fornecimento de energia com base em débito originado de TOI emitido irregularmente, e de que o descumprimento das formalidades da Resolução ANEEL nº 1.000/2021 acarreta a nulidade do débito dele decorrente.

## O que isso significa na prática

Significa que a irregularidade formal do procedimento não é um detalhe burocrático: ela atinge a exigibilidade da cobrança e, com ela, a possibilidade de usar o corte como instrumento de pressão.

Significa também que ter uma reclamação protocolada e em análise fortalece a sua posição. É diferente de simplesmente não pagar.

## Continue pagando o consumo normal

Este ponto é decisivo e vale repetir: contestar o retroativo não autoriza deixar de pagar as faturas correntes. O inadimplemento do consumo mensal é outra história, com regras próprias, e enfraquece a sua posição na discussão principal.

Pague o mês. Conteste o retroativo.

## Negativação

O mesmo raciocínio se aplica à inscrição em cadastro de inadimplentes. Ao contestar, um dos pedidos que se costuma formular é justamente a abstenção de negativar e de interromper o fornecimento enquanto a reclamação estiver pendente de resposta.

## O ônus da prova

Vale lembrar de onde parte a discussão: cabe à distribuidora comprovar que adotou as providências necessárias para apurar o consumo não faturado e que assegurou o contraditório e a ampla defesa ao consumidor. Não é o consumidor que precisa provar que não houve irregularidade.

## Verifique sua cobrança gratuitamente

A análise aponta as falhas do procedimento e fundamenta o pedido de suspensão da cobrança. Grátis e sem cadastro.

*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Em casos de valor elevado ou risco iminente de suspensão do fornecimento, a consulta a um advogado é especialmente recomendável.*`,
  },
];

export function getArtigoEnergiaPorSlug(slug: string): ArtigoEnergia | undefined {
  return artigosEnergia.find((a) => a.slug === slug);
}

export function getCategoriasEnergia(): string[] {
  return Array.from(new Set(artigosEnergia.map((a) => a.categoria)));
}

export function getArtigosEnergiaPorCategoria(categoria: string): ArtigoEnergia[] {
  return artigosEnergia.filter((a) => a.categoria === categoria);
}

export function slugifyCategoriaEnergia(categoria: string): string {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
