// Chamadas para ação contextuais e discretas, adaptadas por categoria.
// Inseridas no meio do artigo, parecendo uma dica natural do conteúdo.

const ctaPadrao = "Não sabe se a sua multa tem erro que pode anulá-la? Nossa IA analisa o seu auto de infração gratuitamente em 60 segundos.";

const ctasPorCategoria: Record<string, string> = {
  "Velocidade": "Não sabe se o radar que te multou estava calibrado ou dentro do prazo de aferição? Nossa IA verifica isso no seu auto de infração, de graça.",
  "Multa de Radar": "Não sabe se o radar que te multou estava calibrado ou dentro do prazo de aferição? Nossa IA verifica isso no seu auto de infração, de graça.",
  "Estacionamento": "Quer saber se a sua multa de estacionamento tem algum vício formal que a anula? Nossa IA analisa isso gratuitamente em segundos.",
  "CNH e Pontos": "Está perto do limite de pontos e precisa cancelar uma multa? Nossa IA verifica se o seu auto de infração tem erro que permite o recurso.",
  "DETRAN": "Antes de montar seu recurso no DETRAN, veja se o seu auto de infração tem algum vício formal. Nossa IA analisa isso de graça em 60 segundos.",
  "Equipamentos": "Não sabe se a autuação do seu equipamento foi feita corretamente? Nossa IA cruza o seu auto com o CTB e aponta possíveis erros, gratuitamente.",
  "Comportamento no Trânsito": "Acha que essa multa foi injusta? Nossa IA analisa o seu auto de infração e identifica se há erro formal que permita o recurso, de graça.",
  "Processo de Recurso": "Antes de recorrer, descubra se o seu auto de infração tem um vício formal que fortalece a sua defesa. Nossa IA faz essa análise gratuitamente.",
  "Pagamento": "Antes de pagar, vale conferir se a sua multa tem algum erro que permita cancelá-la. Nossa IA analisa o seu auto de infração de graça.",
  "Motocicletas": "Recebeu uma multa na moto e achou injusta? Nossa IA verifica se o seu auto de infração tem erro formal que permita o recurso, gratuitamente.",
  "Compra e Venda": "Comprou ou vendeu um veículo e apareceram multas? Nossa IA analisa se esses autos de infração têm vícios que permitem contestação, de graça.",
  "Dúvidas Frequentes": "Ficou com dúvida se a sua multa específica pode ser contestada? Nossa IA analisa o seu auto de infração gratuitamente e responde na hora.",
  "Direitos do Motorista": "Conhecer seus direitos é o primeiro passo. O segundo é agir: nossa IA verifica gratuitamente se a sua multa tem erro que permite o recurso.",
  "Casos Especiais": "Seu caso tem alguma particularidade? Nossa IA analisa o seu auto de infração e identifica se há base para recurso, gratuitamente.",
  "Infrações Graves": "Multas graves têm consequências sérias — por isso vale checar se há erro formal. Nossa IA analisa o seu auto de infração de graça.",
};

export function getCtaContextual(categoria: string): string {
  return ctasPorCategoria[categoria] || ctaPadrao;
}
