
// FAQs por categoria — usados para exibição e schema FAQPage (SEO)

export interface FaqItem {
  pergunta: string;
  resposta: string;
}

// FAQ padrão — usado quando a categoria não tem FAQ específico
const faqPadrao: FaqItem[] = [
  {
    pergunta: "Quanto tempo tenho para recorrer de uma multa?",
    resposta: "O prazo para apresentar a defesa prévia é de 15 dias a partir do recebimento da notificação de autuação. Já o recurso à JARI tem prazo de 30 dias após o indeferimento da defesa prévia."
  },
  {
    pergunta: "Recorrer da multa suspende os pontos na CNH?",
    resposta: "Sim. Enquanto o recurso está sendo analisado, os pontos não são lançados na sua CNH e o pagamento da multa fica suspenso. Isso vale para todas as instâncias administrativas."
  },
  {
    pergunta: "Preciso de advogado para recorrer de uma multa?",
    resposta: "Não. O recurso de multa é um processo administrativo e qualquer condutor pode protocolar sua própria defesa. Advogado só é recomendável em casos de suspensão da CNH ou recurso judicial."
  }
];

// FAQs específicos por categoria
export const faqsPorCategoria: Record<string, FaqItem[]> = {
  "Velocidade": [
    {
      pergunta: "Como sei se o radar que me multou estava calibrado?",
      resposta: "No auto de infração há o número de série do equipamento. Com ele, você consulta no site do INMETRO ou do IPEM do seu estado se o certificado de aferição estava válido na data da multa. Aferição vencida anula a autuação."
    },
    {
      pergunta: "O que é a margem de erro do radar?",
      resposta: "A lei determina que a velocidade registrada deve descontar a margem de erro do equipamento antes de gerar a multa. Para radares fixos é 5%, e para portáteis é 5% ou 3 km/h (o maior valor)."
    },
    {
      pergunta: "É obrigatório ter placa avisando o radar?",
      resposta: "Sim. A Resolução CONTRAN nº 396 exige sinalização informando a existência do equipamento antes do ponto de medição. A ausência dessa sinalização é vício formal que pode anular a multa."
    }
  ],
  "Estacionamento": [
    {
      pergunta: "Posso recorrer de multa de estacionamento em zona azul?",
      resposta: "Sim. Os erros mais comuns incluem sinalização inadequada da área, agente sem credenciamento visível, equipamento de emissão de comprovante com defeito ou autuação fora do horário de funcionamento da zona azul."
    },
    {
      pergunta: "Multa de estacionamento gera pontos na CNH?",
      resposta: "Depende da infração. Estacionar em local proibido geralmente é infração média (4 pontos), mas parar em vaga de deficiente ou idoso sem direito é infração grave (5 pontos)."
    },
    {
      pergunta: "Como contestar multa de estacionamento irregular?",
      resposta: "Fotografe o local mostrando a sinalização (ou ausência dela), verifique o horário exato da autuação e protocole o recurso no órgão de trânsito municipal dentro do prazo de 15 dias."
    }
  ],
  "CNH e Pontos": [
    {
      pergunta: "Quantos pontos preciso para ter a CNH suspensa?",
      resposta: "O limite é de 20, 30 ou 40 pontos em 12 meses, dependendo do seu perfil. São 20 pontos se você teve infração gravíssima no período, 30 se não teve, e 40 se além disso tem CNH há mais de 2 anos."
    },
    {
      pergunta: "Por quanto tempo os pontos ficam na CNH?",
      resposta: "Os pontos permanecem por 12 meses a partir da data da infração — não da data de pagamento. Após esse período, saem automaticamente do seu prontuário."
    },
    {
      pergunta: "Como faço para tirar pontos da CNH?",
      resposta: "As únicas formas legítimas são: esperar os 12 meses para expiração automática, ou recorrer da multa e ganhar (o cancelamento remove os pontos). Cursos de direção defensiva não removem pontos."
    }
  ],
  "DETRAN": [
    {
      pergunta: "Como recorro de uma multa pelo DETRAN?",
      resposta: "Acesse o portal do DETRAN do seu estado, faça login com CPF, localize a infração pela placa ou número do auto, escolha entre Defesa Prévia ou Recurso à JARI, preencha a petição e protocole dentro do prazo."
    },
    {
      pergunta: "Como sei se a multa é do DETRAN ou da prefeitura?",
      resposta: "No auto de infração há o campo 'órgão autuador'. Multas estaduais são do DETRAN; municipais são de órgãos como CET, BHTrans ou EPTC. Cada um tem portal próprio para recurso."
    },
    {
      pergunta: "Posso recorrer de multa pela internet?",
      resposta: "Sim. A maioria dos DETRANs estaduais permite protocolar defesa prévia e recurso totalmente online pelo portal ou pelo app Carteira Digital de Trânsito, sem precisar ir presencialmente."
    }
  ],
  "Equipamentos": [
    {
      pergunta: "Multa por equipamento obrigatório pode ser contestada?",
      resposta: "Sim. O auto precisa descrever objetivamente qual equipamento estava irregular e como foi verificado. Descrição genérica, ausência de medição técnica ou equipamento de aferição vencido são vícios formais."
    },
    {
      pergunta: "O agente precisa medir tecnicamente a irregularidade?",
      resposta: "Para infrações que dependem de critério objetivo (som, vidro fumê, velocidade), sim — o agente deve registrar a medição com equipamento adequado. Avaliação apenas visual sem instrumento é contestável."
    },
    {
      pergunta: "Como provo que meu equipamento estava regular?",
      resposta: "Guarde certificados do fabricante (como o percentual de transmissão luminosa da película) e notas fiscais de manutenção. Esses documentos servem como contraprova em recursos."
    }
  ],
  "Comportamento no Trânsito": [
    {
      pergunta: "Multa por comportamento no trânsito precisa de descrição detalhada?",
      resposta: "Sim. Infrações como 'conduzir de forma perigosa' ou 'não sinalizar' precisam de descrição específica do comportamento observado, local e circunstâncias. Descrição genérica é vício formal."
    },
    {
      pergunta: "Como contesto multa presenciada por agente?",
      resposta: "Verifique se o agente estava em posição que permitia observar claramente a infração, se a descrição do auto é específica e se há identificação completa do agente. Fotos do local ajudam."
    },
    {
      pergunta: "Sinalização apagada é motivo de recurso?",
      resposta: "Sim. Se a sinalização de solo (faixa contínua, por exemplo) ou as placas estavam apagadas, danificadas ou obstruídas, a responsabilidade pela manutenção é do órgão de trânsito, o que fundamenta o recurso."
    }
  ],
  "Processo de Recurso": [
    {
      pergunta: "O que acontece se minha defesa prévia for negada?",
      resposta: "Você tem 30 dias para recorrer à JARI (Junta Administrativa de Recursos de Infrações), um colegiado independente. Se a JARI também negar, ainda há o CETRAN ou CONTRAN como terceira instância."
    },
    {
      pergunta: "Quanto tempo demora para julgar um recurso?",
      resposta: "Não há prazo fixo em lei. Na prática, varia de 30 a 90 dias dependendo do órgão. Durante todo esse período, os pontos e o pagamento ficam suspensos."
    },
    {
      pergunta: "Posso apresentar argumentos novos na JARI?",
      resposta: "Sim. Na JARI você pode reforçar os argumentos da defesa prévia e adicionar novos que não usou antes. Por ser um colegiado independente, tende a ser mais imparcial que o órgão autuador."
    }
  ],
  "Pagamento": [
    {
      pergunta: "Posso pagar multa com desconto?",
      resposta: "Sim. Aderindo ao SNE (Sistema de Notificação Eletrônica), você paga com 40% de desconto se quitar dentro de 15 dias úteis do recebimento da notificação eletrônica."
    },
    {
      pergunta: "O que acontece se eu não pagar a multa?",
      resposta: "A dívida ganha juros e correção, vai para dívida ativa e bloqueia o licenciamento do veículo. Não gera prisão, mas impede transferência e circulação regular do veículo."
    },
    {
      pergunta: "Multa de trânsito pode ser parcelada?",
      resposta: "Sim, na maioria dos estados é possível parcelar débitos de multa, geralmente em até 60 vezes com valor mínimo por parcela. Consulte as condições no portal do DETRAN do seu estado."
    }
  ],
  "Motocicletas": [
    {
      pergunta: "A multa da moto é do condutor ou do passageiro?",
      resposta: "A responsabilidade recai sobre o condutor, mesmo quando a infração é do passageiro (como não usar capacete). Os pontos vão para a CNH de quem estava dirigindo."
    },
    {
      pergunta: "Câmera consegue identificar a placa da moto?",
      resposta: "Motos têm placa apenas na traseira, então câmeras frontais frequentemente não conseguem identificá-las. Se a imagem não mostra claramente sua placa, é argumento para contestar a autoria."
    },
    {
      pergunta: "Posso contestar multa por 'condução perigosa' na moto?",
      resposta: "Sim, especialmente se a descrição do auto for genérica. O agente precisa descrever objetivamente o comportamento observado — 'conduzia perigosamente' sem detalhes é vício formal."
    }
  ],
  "Compra e Venda": [
    {
      pergunta: "Comprei carro usado com multas — de quem é a responsabilidade?",
      resposta: "A multa (valor financeiro) acompanha o veículo, então você como novo proprietário se torna responsável pelo pagamento. Já os pontos ficam com quem dirigia na época da infração."
    },
    {
      pergunta: "Vendi o carro e as multas continuam no meu nome. O que faço?",
      resposta: "Faça a Comunicação de Venda no portal do DETRAN, informando os dados do comprador e anexando o contrato de venda. A partir do protocolo, novas infrações não são mais sua responsabilidade."
    },
    {
      pergunta: "Posso transferir um veículo com multas pendentes?",
      resposta: "Sim, na maioria dos estados a transferência de propriedade é possível com débitos pendentes. O que fica bloqueado é o licenciamento anual, não a transferência em si."
    }
  ]
};

// Função que retorna o FAQ da categoria ou o padrão
export function getFaq(categoria: string): FaqItem[] {
  return faqsPorCategoria[categoria] || faqPadrao;
}
