// Mapa de links internos: quando um termo aparece no texto de um artigo,
// vira link para o artigo correspondente (melhora SEO e navegação).
// A ordem importa: termos mais específicos e longos primeiro.

export interface LinkInterno {
  termo: string;   // texto a procurar (case-insensitive)
  slug: string;    // artigo de destino
}

export const linksInternos: LinkInterno[] = [
  // Termos jurídicos específicos
  { termo: "Art. 280 do CTB", slug: "artigo-280-ctb-o-que-e" },
  { termo: "Artigo 280 do CTB", slug: "artigo-280-ctb-o-que-e" },
  { termo: "MBFT", slug: "mbft-manual-fiscalizacao-transito" },
  { termo: "Manual Brasileiro de Fiscalização", slug: "mbft-manual-fiscalizacao-transito" },

  // Processo de recurso
  { termo: "defesa prévia", slug: "defesa-previa-multa-o-que-e-como-fazer" },
  { termo: "JARI", slug: "jari-o-que-e-como-funciona" },
  { termo: "Indicação de Condutor", slug: "fui-multado-mas-nao-estava-dirigindo" },

  // CNH e pontos
  { termo: "suspensão da CNH", slug: "multa-de-transito-suspende-cnh" },
  { termo: "sistema de pontos", slug: "pontuacao-cnh-como-funciona-sistema" },
  { termo: "curso de reciclagem", slug: "como-cancelar-pontos-curso-reciclagem" },
  { termo: "CNH provisória", slug: "cnh-definitiva-x-provisoria-multa" },

  // Tipos de multa
  { termo: "excesso de velocidade", slug: "multa-alta-velocidade-como-recorrer" },
  { termo: "bafômetro", slug: "multa-transito-dirigir-alcool" },
  { termo: "Lei Seca", slug: "multa-transito-dirigir-alcool" },
  { termo: "velocidade média", slug: "multa-velocidade-media-como-funciona" },
  { termo: "zona azul", slug: "multa-estacionamento-zona-azul" },
  { termo: "rodízio", slug: "multa-rodizio-municipal-como-recorrer" },
  { termo: "lombada eletrônica", slug: "multa-lombada-eletronica-como-recorrer" },
  { termo: "cadeirinha", slug: "multa-crianca-sem-cadeirinha" },

  // Pagamento e financeiro
  { termo: "SNE", slug: "multa-transito-como-pagar-com-desconto" },
  { termo: "Sistema de Notificação Eletrônica", slug: "multa-transito-como-pagar-com-desconto" },
  { termo: "dívida ativa", slug: "multa-transito-prescreve" },
  { termo: "parcelamento", slug: "multa-parcelamento-como-funciona" },

  // Prazos e prescrição
  { termo: "prescrição", slug: "multa-transito-prescreve" },
  { termo: "Comunicação de Venda", slug: "multa-nao-transferida-comprador" },

  // Radar e equipamentos
  { termo: "aferição INMETRO", slug: "multa-alta-velocidade-como-recorrer" },
  { termo: "radar portátil", slug: "multa-radar-fixo-versus-portatil" },
  { termo: "radar educativo", slug: "multa-radar-educativo-nao-gera-multa" },
];

// Aplica links internos ao HTML de um parágrafo.
// Só linka a PRIMEIRA ocorrência de cada termo em todo o artigo (controle via Set global por render).
// slugAtual evita auto-link (artigo linkando para si mesmo).
export function aplicarLinksInternos(
  html: string,
  slugAtual: string,
  jaUsados: Set<string>
): string {
  let resultado = html;

  for (const link of linksInternos) {
    if (link.slug === slugAtual) continue; // não linka para si mesmo
    if (jaUsados.has(link.slug)) continue;  // já linkou para esse artigo

    // Regex que encontra o termo com fronteira de palavra, evitando quebrar tags
    const escapado = link.termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b(${escapado})\\b`, "i");

    // Só aplica se o termo NÃO estiver dentro de uma tag <a> já existente
    const match = resultado.match(regex);
    if (match && match.index !== undefined) {
      // Verifica se não está dentro de uma tag HTML (entre < e >)
      const antes = resultado.slice(0, match.index);
      const aberturaTag = antes.lastIndexOf("<");
      const fechamentoTag = antes.lastIndexOf(">");
      const dentroDeTag = aberturaTag > fechamentoTag;

      if (!dentroDeTag) {
        resultado =
          resultado.slice(0, match.index) +
          `<a href="/blog/${link.slug}" class="text-blue-600 font-bold hover:underline">${match[1]}</a>` +
          resultado.slice(match.index + match[1].length);
        jaUsados.add(link.slug);
      }
    }
  }

  return resultado;
}
