/**
 * Reconhecimento de "servidor de IA ocupado", no navegador.
 *
 * Existia a mesma regra escrita em dois lugares que divergiram. O retry do
 * servidor (`sobrecarregado` em prompts/validador.ts) já conhecia 503 e
 * UNAVAILABLE, mas as telas — e os catch das rotas — só olhavam 429,
 * SERVER_BUSY e "exhausted". O Gemini responde 503 "high demand" quando está
 * em pico, e nesse caso o usuário via "erro interno" em vez do aviso de
 * servidor ocupado que já existe pronto.
 *
 * A bateria pegou isso: o Procon estourou as 4 tentativas num pico de demanda
 * e a rota devolveu HTTP 500. Num cliente pagante, seria a tela de erro genérica
 * logo depois do pagamento.
 *
 * Mantém os mesmos termos da versão do servidor. Ao mexer em um, mexer no outro.
 */
const RE_SOBRECARGA =
  /503|UNAVAILABLE|overloaded|high demand|429|RESOURCE_EXHAUSTED|SERVER_BUSY|exhausted/i;

/**
 * Cota diária do projeto esgotada. Diferente de pico de demanda: não passa em
 * segundos, passa na virada do dia. Dizer "aguarde alguns segundos" aqui é
 * mandar a pessoa tentar de novo para receber o mesmo erro.
 */
const RE_COTA_DIARIA = /QUOTA_DIARIA|PerDay|per day|requests per day/i;

function textoDoErro(err: any): string {
  if (!err) return "";
  return typeof err === "string"
    ? err
    : `${err?.message || ""} ${err?.status || ""} ${err?.error || ""}`;
}

export function ehCotaDiaria(err: any): boolean {
  return RE_COTA_DIARIA.test(textoDoErro(err));
}

export function ehSobrecarga(err: any): boolean {
  if (!err) return false;
  if (ehCotaDiaria(err)) return false;
  return RE_SOBRECARGA.test(textoDoErro(err));
}
