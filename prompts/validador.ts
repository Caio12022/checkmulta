/**
 * VALIDADOR — trava determinística contra alucinação.
 *
 * Este arquivo NÃO usa IA. É código puro que confere a saída do modelo
 * antes de ela chegar ao usuário. Regra central: o que não puder ser
 * conferido contra o texto do próprio documento é descartado.
 *
 * Usado pelas três verticais (trânsito, Procon, Vigilância Sanitária).
 */

// ============================================================
// 1. NORMALIZAÇÃO
// ============================================================

/** Remove acentos, pontuação e caixa, para comparação tolerante. */
export function normalizar(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras com peso semântico (descarta artigos, preposições e ruído curto). */
function palavrasRelevantes(texto: string): string[] {
  const VAZIAS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na",
    "nos", "nas", "um", "uma", "por", "para", "com", "que", "ao", "aos", "se",
    "sem", "sob", "ou", "the", "of",
  ]);
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length >= 3 && !VAZIAS.has(p));
}

// ============================================================
// 2. CONFERÊNCIA DE TRECHO CONTRA A TRANSCRIÇÃO
// ============================================================

/**
 * Confere se o trecho citado pelo modelo realmente existe no documento.
 *
 * Dois testes cumulativos:
 *   COBERTURA — pelo menos 85% das palavras relevantes do trecho aparecem
 *               na transcrição. Pega paráfrase e invenção de conteúdo.
 *   ÂNCORA    — alguma sequência de 4 palavras consecutivas do trecho
 *               aparece literalmente. Pega colagem de palavras soltas.
 *
 * Trechos muito curtos (menos de 4 palavras) exigem correspondência literal.
 */
export function trechoConfere(trecho: string, transcricao: string): boolean {
  const alvo = normalizar(transcricao);
  if (!alvo || alvo.length < 40) return false;

  const palavras = palavrasRelevantes(trecho);
  if (palavras.length === 0) return false;

  if (palavras.length < 4) {
    return alvo.includes(normalizar(trecho));
  }

  const presentes = palavras.filter((p) => alvo.includes(p)).length;
  const cobertura = presentes / palavras.length;
  if (cobertura < 0.85) return false;

  const seq = normalizar(trecho).split(" ").filter(Boolean);
  const janela = Math.min(4, seq.length);
  for (let i = 0; i + janela <= seq.length; i++) {
    if (alvo.includes(seq.slice(i, i + janela).join(" "))) return true;
  }
  return false;
}

/**
 * Confere se valores e datas citados existem no documento.
 * Alucinação numérica (trocar 9.300 por 6.300) é o erro mais perigoso,
 * porque vai direto para a petição paga.
 */
export function numerosConferem(texto: string, transcricao: string): boolean {
  const alvo = normalizar(transcricao);
  const bruto = (texto || "").replace(/\s+/g, " ");

  // Valores monetários: R$ 9.300,00
  const valores = bruto.match(/R\$\s*[\d.]+(?:,\d{2})?/gi) || [];
  for (const v of valores) {
    const digitos = v.replace(/\D/g, "");
    if (!digitos) continue;
    if (!normalizar(alvo).replace(/\s/g, "").includes(digitos)) return false;
  }

  // Datas: 18/02/2026
  const datas = bruto.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [];
  for (const d of datas) {
    const digitos = d.replace(/\D/g, "");
    if (!alvo.replace(/\s/g, "").includes(digitos)) return false;
  }

  return true;
}

// ============================================================
// 3. CITAÇÃO LEGAL — LISTA FECHADA POR VERTICAL
// ============================================================

export type Vertical = "transito" | "procon" | "vigilancia";

/** Diplomas que cada vertical pode citar (identificados pelo número). */
const DIPLOMAS_PERMITIDOS: Record<Vertical, string[]> = {
  transito: ["9503", "9.503"],
  procon: ["8078", "8.078", "2181", "2.181", "10887", "10.887", "123", "13874", "13.874", "9784", "9.784"],
  vigilancia: ["6437", "6.437", "9784", "9.784"],
};

/** Artigos permitidos, quando a vertical trabalha com lista fechada de artigos. */
const ARTIGOS_PERMITIDOS: Partial<Record<Vertical, string[]>> = {
  transito: ["208", "209", "218", "230", "244", "252", "280", "281", "281-a", "282", "285", "286"],
  vigilancia: ["2", "3", "4", "6", "7", "8", "10", "13", "14", "17", "22", "23", "30", "31", "33", "38", "50"],
  // Procon: controle por diploma. O prompt já restringe CDC + Decreto 2.181/97,
  // cujos artigos citáveis são numerosos e legítimos (18, 28, 35, 38-A, 42, 48, 57...).
};

/** Extrai números de lei/decreto mencionados num texto. */
function diplomasCitados(texto: string): string[] {
  const achados: string[] = [];
  const re = /(?:lei|decreto|lei\s+complementar|lc)[^\d]{0,20}(\d{1,3}(?:\.\d{3})*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto || "")) !== null) achados.push(m[1]);
  return achados;
}

/**
 * Tipos de norma que nenhuma vertical pode citar por número: resolução,
 * RDC, portaria, instrução normativa, deliberação, súmula, código estadual
 * ou municipal. Só passam se o número estiver escrito no próprio documento.
 */
const RE_NORMA_PROIBIDA =
  /(resolu[cç][aã]o|\bRDC\b|portaria|instru[cç][aã]o\s+normativa|\bIN\b|delibera[cç][aã]o|s[uú]mula|c[oó]digo\s+(?:sanit[aá]rio|de\s+posturas)|lei\s+(?:estadual|municipal|complementar\s+estadual))[^\d]{0,25}(\d{1,5}(?:[./]\d{1,4})*)/gi;

function normasProibidasCitadas(texto: string): string[] {
  const achados: string[] = [];
  const re = new RegExp(RE_NORMA_PROIBIDA.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto || "")) !== null) achados.push(m[2]);
  return achados;
}

/** Extrai números de artigo mencionados num texto. */
function artigosCitados(texto: string): string[] {
  const achados: string[] = [];
  const re = /art(?:igo|\.)?\s*(\d{1,3}(?:\s*-\s*[A-Za-z])?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto || "")) !== null) {
    achados.push(m[1].replace(/\s/g, "").toLowerCase());
  }
  return achados;
}

/**
 * Confere se a citação legal é permitida.
 * Norma escrita no próprio documento é sempre permitida — nesse caso o
 * modelo apenas repete o que o auto diz.
 */
export function citacaoPermitida(
  baseLegal: string,
  vertical: Vertical,
  transcricao: string
): boolean {
  const texto = baseLegal || "";
  if (!texto.trim()) return true; // sem citação numérica, nada a conferir

  const alvo = normalizar(transcricao).replace(/\s/g, "");

  // Resolução, RDC, portaria, súmula e afins: proibidas salvo se escritas no documento
  for (const n of normasProibidasCitadas(texto)) {
    const limpo = n.replace(/[^\d]/g, "");
    if (limpo && !alvo.includes(limpo)) return false;
  }

  for (const d of diplomasCitados(texto)) {
    const limpo = d.replace(/\./g, "");
    const ok =
      DIPLOMAS_PERMITIDOS[vertical].some((p) => p.replace(/\./g, "") === limpo) ||
      alvo.includes(limpo);
    if (!ok) return false;
  }

  const artigosDaVertical = ARTIGOS_PERMITIDOS[vertical];
  if (artigosDaVertical) {
    for (const a of artigosCitados(texto)) {
      const ok = artigosDaVertical.includes(a) || alvo.includes(a);
      if (!ok) return false;
    }
  }

  return true;
}

// ============================================================
// 4. ACHADO NÃO VERIFICÁVEL NO DOCUMENTO
// ============================================================

/**
 * Alguns achados dependem de informação que NÃO está no auto: se houve
 * visita anterior, se a empresa é ME/EPP, se há reincidência, qual foi a
 * memória de cálculo interna. São hipóteses, não constatações.
 *
 * Esses achados ficam com teto "verificar" e não entram no cálculo da
 * viabilidade — do contrário apareceriam em todo auto e o resultado
 * "sem falha" deixaria de existir.
 */
const MARCAS_NAO_VERIFICAVEL = [
  "dupla visita",
  "visita previa",
  "visita anterior",
  "orientacao previa",
  "reincidencia",
  "microempresa",
  "empresa de pequeno porte",
  "me epp",
  "porte da empresa",
  "porte do estabelecimento",
  "tratamento diferenciado",
  "memoria de calculo",
  "faturamento",
  "condicao economica",
  "antecedentes",
];

export function ehNaoVerificavel(achado: any): boolean {
  const texto = normalizar(
    `${achado?.titulo || ""} ${achado?.explicacao || ""} ${achado?.base_legal || ""}`
  );
  return MARCAS_NAO_VERIFICAVEL.some((m) => texto.includes(m));
}

// ============================================================
// 5. ILEGIBILIDADE — CRITÉRIO OBJETIVO
// ============================================================

/**
 * Substitui o julgamento subjetivo de "impossível de ler". Se o modelo não
 * conseguiu transcrever o documento, ou não extraiu os campos de
 * identificação, o resultado é ilegível — sem discussão.
 *
 * Isso impede o pior erro possível: converter "não consigo ler" em
 * "o campo não existe" e fabricar um vício inexistente.
 */
export function documentoIlegivel(transcricao: string, camposChave: string[]): boolean {
  const t = normalizar(transcricao);
  if (t.length < 180) return true;

  const preenchidos = camposChave.filter((c) => {
    const v = normalizar(c);
    return v.length >= 3 && !v.startsWith("nao ") && v !== "ausente";
  }).length;

  return preenchidos < 2;
}

// ============================================================
// 6. VIABILIDADE RECALCULADA NO SERVIDOR
// ============================================================

export function calcularViabilidade(achados: any[]): "Alta" | "Média" | "Baixa" {
  const contam = achados.filter((a) => !a.__nao_verificavel);
  if (contam.some((a) => a.gravidade === "critico")) return "Alta";
  if (contam.some((a) => a.gravidade === "atencao")) return "Média";
  return "Baixa";
}

// ============================================================
// 7. PIPELINE COMPLETO (Procon e Vigilância — saída JSON)
// ============================================================

export interface ResultadoValidacao {
  ilegivel: boolean;
  parsed: any;
  descartados: number;
}

export function validarAnaliseJSON(
  parsed: any,
  vertical: Vertical
): ResultadoValidacao {
  const transcricao: string = typeof parsed?.transcricao_documento === "string"
    ? parsed.transcricao_documento
    : "";

  const camposChave = [
    parsed?.orgao_emissor,
    parsed?.numero_auto,
    parsed?.empresa_autuada || parsed?.estabelecimento_autuado,
  ].filter((v) => typeof v === "string") as string[];

  if (documentoIlegivel(transcricao, camposChave)) {
    return { ilegivel: true, parsed, descartados: 0 };
  }

  const originais: any[] = Array.isArray(parsed?.achados) ? parsed.achados : [];
  const aprovados: any[] = [];

  for (const a of originais) {
    if (!a || typeof a !== "object") continue;

    const trecho = typeof a.trecho_documento === "string" ? a.trecho_documento : "";
    if (trecho.trim().length === 0) continue;

    // TRAVA 1 — o trecho tem que existir mesmo no documento
    if (!trechoConfere(trecho, transcricao)) continue;

    // TRAVA 2 — valores e datas citados têm que bater com o documento
    if (!numerosConferem(trecho, transcricao)) continue;
    if (!numerosConferem(a.explicacao || "", transcricao)) continue;

    // TRAVA 3 — citação legal dentro da lista fechada da vertical
    if (!citacaoPermitida(a.base_legal || "", vertical, transcricao)) continue;

    // TRAVA 4 — gravidade dentro do vocabulário aceito
    if (!["critico", "atencao", "verificar"].includes(a.gravidade)) {
      a.gravidade = "verificar";
    }

    // TRAVA 5 — achado que depende de informação externa não sustenta viabilidade
    if (ehNaoVerificavel(a)) {
      a.gravidade = "verificar";
      a.__nao_verificavel = true;
    }

    aprovados.push(a);
  }

  parsed.achados = aprovados;
  parsed.quantidade_criticos = aprovados.filter((a) => a.gravidade === "critico").length;
  parsed.quantidade_atencao = aprovados.filter((a) => a.gravidade === "atencao").length;
  parsed.quantidade_verificar = aprovados.filter((a) => a.gravidade === "verificar").length;
  parsed.houve_achado = aprovados.length > 0;
  parsed.viabilidade = calcularViabilidade(aprovados);

  // A transcrição é insumo interno de auditoria. Não vai para o navegador.
  delete parsed.transcricao_documento;
  for (const a of aprovados) delete a.__nao_verificavel;

  return {
    ilegivel: false,
    parsed,
    descartados: originais.length - aprovados.length,
  };
}

// ============================================================
// 8. TRÂNSITO — saída em texto, formato preservado
// ============================================================

const MARCADOR_TRANSCRICAO = "===TRANSCRICAO===";

/** Separa o relatório visível do bloco de transcrição usado na auditoria. */
export function separarTranscricaoTransito(bruto: string): {
  relatorio: string;
  transcricao: string;
} {
  const idx = bruto.indexOf(MARCADOR_TRANSCRICAO);
  if (idx === -1) return { relatorio: bruto.trim(), transcricao: "" };
  return {
    relatorio: bruto.slice(0, idx).trim(),
    transcricao: bruto.slice(idx + MARCADOR_TRANSCRICAO.length).trim(),
  };
}

/** Lê um campo do bloco "DADOS EXTRAÍDOS" do relatório de trânsito. */
export function campoTransito(relatorio: string, rotulo: string): string {
  const re = new RegExp(`${rotulo}\\s*:\\s*(.+)`, "i");
  const m = relatorio.match(re);
  if (!m) return "";
  const v = m[1].trim();
  if (!v || v === "[]" || /^\[.*\]$/.test(v)) return "";
  if (/^(nao informado|ausente|ilegivel|não informado|ilegível|-+)$/i.test(v)) return "";
  return v;
}

/**
 * Auditoria do relatório de trânsito.
 * Retorna "imagem_ilegivel" quando os campos de identificação não puderam
 * ser lidos, ou o relatório limpo quando passa.
 */
export function validarAnaliseTransito(bruto: string): string {
  const { relatorio, transcricao } = separarTranscricaoTransito(bruto);

  // Strings de controle passam direto
  if (/^(documento_invalido|imagem_ilegivel|rejeicao_sem_falha)$/.test(relatorio)) {
    return relatorio;
  }
  if (relatorio.startsWith("rejeicao_fora_escopo")) return relatorio;

  const placa = campoTransito(relatorio, "Placa");
  const data = campoTransito(relatorio, "Data");
  const local = campoTransito(relatorio, "Local exato");

  if (documentoIlegivel(transcricao, [placa, data, local])) {
    return "imagem_ilegivel";
  }

  // Números citados no relatório têm que existir no documento
  if (!numerosConferem(relatorio, transcricao)) {
    return "imagem_ilegivel";
  }

  return relatorio;
}

// ============================================================
// 9. RETRY COM ESPERA (erro 503 / modelo sobrecarregado)
// ============================================================

function sobrecarregado(err: any): boolean {
  const m = `${err?.message || ""} ${err?.status || ""} ${JSON.stringify(err?.error || {})}`;
  return /503|UNAVAILABLE|overloaded|high demand|429|RESOURCE_EXHAUSTED|SERVER_BUSY/i.test(m);
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Repete a chamada quando o Gemini responde 503 (alta demanda).
 * Esperas: 3s, 8s, 20s. Mesma lógica que a tela de trânsito já usava.
 */
export async function gerarComRetry(
  chamada: () => Promise<any>,
  tentativas = 4
): Promise<any> {
  const atrasos = [3000, 8000, 20000];
  let ultimo: any;

  for (let i = 0; i < tentativas; i++) {
    try {
      return await chamada();
    } catch (err: any) {
      ultimo = err;
      if (!sobrecarregado(err) || i === tentativas - 1) throw err;
      console.warn(`Gemini sobrecarregado. Tentativa ${i + 1}/${tentativas}.`);
      await espera(atrasos[Math.min(i, atrasos.length - 1)]);
    }
  }
  throw ultimo;
}
