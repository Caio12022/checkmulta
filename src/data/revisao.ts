/**
 * Data de revisao do conteudo — fonte unica para todas as verticais.
 *
 * Por que este arquivo existe
 * ---------------------------
 * Os artigos foram escritos sem registro de data de publicacao. Inventar
 * essas datas seria colocar informacao falsa no ar e no dado estruturado.
 *
 * O que temos de verdadeiro e verificavel: a auditoria de citacoes legais
 * feita em agosto de 2026, quando cada artigo foi conferido contra a fonte
 * oficial (Planalto, ANEEL, IBAMA) e corrigido quando necessario.
 *
 * Entao o site declara o que de fato aconteceu: conteudo REVISADO naquela
 * data. No schema isso vira dateModified — que e justamente o campo que o
 * Google usa para avaliar frescor.
 *
 * Como manter
 * -----------
 * A cada nova auditoria, atualizar as duas constantes abaixo. Sao os unicos
 * pontos de edicao: todos os posts das cinco verticais leem daqui.
 *
 * Artigos criados pelos robos a partir de agora gravam a propria data de
 * publicacao no campo opcional `dataPublicacao`. Quando presente, ela tem
 * precedencia e o artigo passa a exibir "Publicado em ..." com datePublished
 * real no schema.
 */

/** Data da ultima auditoria de citacoes legais. Formato ISO (schema.org). */
export const REVISAO_ISO = "2026-08-01";

/** Mesma data por extenso, para exibicao ao leitor. */
export const REVISAO_LEGIVEL = "agosto de 2026";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Converte "2026-03-14" em "14 de março de 2026".
 * Retorna null se a string nao for uma data ISO valida — assim um campo
 * malformado gravado por robo nunca quebra a pagina.
 */
export function porExtenso(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

export interface SeloData {
  /** Texto exibido ao leitor, ja pronto. */
  texto: string;
  /** Data ISO correspondente, para o atributo dateTime do <time>. */
  iso: string;
  /** true quando a data e de publicacao real; false quando e revisao. */
  publicacao: boolean;
}

/**
 * Decide o que o artigo mostra.
 *
 * - Com dataPublicacao valida  -> "Publicado em 14 de março de 2026"
 * - Sem dataPublicacao         -> "Conteudo revisado em agosto de 2026"
 */
export function selo(dataPublicacao?: string): SeloData {
  if (dataPublicacao) {
    const extenso = porExtenso(dataPublicacao);
    if (extenso) {
      return {
        texto: `Publicado em ${extenso}`,
        iso: dataPublicacao.trim(),
        publicacao: true,
      };
    }
  }

  return {
    texto: `Conteúdo revisado em ${REVISAO_LEGIVEL}`,
    iso: REVISAO_ISO,
    publicacao: false,
  };
}
