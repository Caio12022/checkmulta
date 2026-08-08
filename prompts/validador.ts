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

export type Vertical = "transito" | "procon" | "vigilancia" | "energia" | "ibama";

/** Diplomas que cada vertical pode citar (identificados pelo número). */
const DIPLOMAS_PERMITIDOS: Record<Vertical, string[]> = {
  transito: ["9503", "9.503"],
  procon: ["8078", "8.078", "2181", "2.181", "10887", "10.887", "123", "13874", "13.874", "9784", "9.784"],
  vigilancia: ["6437", "6.437", "9784", "9.784"],
  /* Energia: REN 1.000/2021 da ANEEL é resolução — o prompt cita por nome, não
     por número. Restam CDC (subsidiário) e Lei 9.784/99. */
  energia: ["8078", "8.078", "9784", "9.784"],
  /* IBAMA: Decreto 6.514/2008 (base), Lei 9.605/98 (crimes/sanções ambientais),
     LC 140/2011 (competência) e Lei 9.784/99 (processo administrativo). */
  ibama: ["6514", "6.514", "9605", "9.605", "140", "9784", "9.784", "12651", "12.651"],
};

/** Artigos permitidos, quando a vertical trabalha com lista fechada de artigos. */
const ARTIGOS_PERMITIDOS: Partial<Record<Vertical, string[]>> = {
  transito: ["208", "209", "218", "230", "244", "252", "280", "281", "281-a", "282", "285", "286"],
  vigilancia: ["2", "3", "4", "6", "7", "8", "10", "13", "14", "17", "22", "23", "30", "31", "33", "38", "50"],
  // Procon: controle por diploma. O prompt já restringe CDC + Decreto 2.181/97,
  // cujos artigos citáveis são numerosos e legítimos (18, 28, 35, 38-A, 42, 48, 57...).

  /* IBAMA — lista fechada, espelha o catálogo de padrões P1 a P6 do prompt.
     Decreto 6.514/2008: 21 (prescrição), 22, 96, 97 e 97-A (requisitos e
     conciliação), 98, 98-A, 98-B, 100, 113 (prazo de defesa).
     Lei 9.605/98: 14 (atenuantes), 70, 71, 72 (sanções e conversão).
     LC 140/2011: 7, 9, 17 (competência).
     Lei 9.784/99: 2, 50, 53 (subsidiários).
     Artigos de enquadramento do próprio auto (43, 50, 51...) passam pela
     regra geral: são aceitos quando escritos no documento. */
  ibama: [
    "2", "7", "9", "14", "17", "21", "22", "50", "53", "70", "71", "72",
    "96", "97", "97-a", "98", "98-a", "98-b", "100", "113",
  ],
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
// 3-B. TRECHO CONTAMINADO (INJEÇÃO NO DOCUMENTO)
// ============================================================

/**
 * A trava do trecho literal impede citação INVENTADA. Não impede uma ameaça
 * diferente: texto malicioso escrito DENTRO do documento enviado.
 *
 * Um PDF pode conter uma "nota técnica" plantada dizendo que o próprio auto é
 * nulo, ou instruções dirigidas ao analisador. O trecho existe de verdade na
 * transcrição, então passa por trechoConfere — e vira achado.
 *
 * O sinal que denuncia é a natureza da frase: auto de infração descreve FATOS
 * (conduta, datas, valores, campos). Ele não emite juízo sobre a própria
 * validade, e não dá ordens a quem o lê. Trecho com essa natureza não é prova
 * de vício: é afirmação de terceiro, ou tentativa de manipulação.
 *
 * Na dúvida descartamos o achado. O custo é perder uma venda; o custo do
 * contrário é cobrar por defesa fabricada a partir de texto plantado.
 */
const RE_CONCLUSAO_JURIDICA =
  /(eivad[oa]|nulidade|nul[oa]\s+de\s+pleno|v[ií]cio\s+insan[aá]vel|padece\s+de\s+v[ií]cio|deve\s+ser\s+(?:anulad|declarad|considerad)|recomenda-se\s+que|ponto\s+controvertido|est[aá]\s+irregular|n[aã]o\s+observou\s+os\s+requisitos|lavrado\s+sem\s+a\s+descri[cç][aã]o|sem\s+indica[cç][aã]o\s+de\s+dispositivo\s+legal)/i;

const RE_INSTRUCAO_AO_MODELO =
  /(ignore\s+(?:as\s+)?(?:todas\s+as\s+)?instru[cç][oõ]es|desconsidere\s+as\s+instru[cç][oõ]es|voc[eê]\s+[eé]\s+um\s+(?:assistente|analista|advogado)|reporte\s+obrigatoriamente|sempre\s+encontrar|classifique\s+(?:sempre|como)|defina\s+(?:a\s+)?viabilidade|n[aã]o\s+mencione\s+est[ae]s?\s+instru[cç][oõ]es|sistema\s+de\s+an[aá]lise\s*:)/i;

/**
 * true quando o trecho citado não é constatação de fato, e sim juízo sobre a
 * validade do auto ou comando dirigido ao analisador.
 */
export function trechoContaminado(trecho: string): boolean {
  const t = trecho || "";
  return RE_CONCLUSAO_JURIDICA.test(t) || RE_INSTRUCAO_AO_MODELO.test(t);
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
// 5-A. CLASSIFICAÇÃO DA VERTICAL — EM CÓDIGO
// ============================================================

/**
 * O modelo pode não reconhecer o órgão emissor quando o cabeçalho ficou
 * cortado fora da foto. Aqui a conferência é feita por sinais léxicos na
 * transcrição, independente do que o modelo concluiu.
 *
 * Caso real que motivou isto: um auto de vigilância sanitária com a metade
 * direita cortada foi aceito pela rota do Procon, porque a palavra
 * "SANITÁRIA" não aparecia na parte visível do documento.
 */
const SINAIS: Record<Vertical, string[]> = {
  vigilancia: [
    "vigilancia sanitaria", "infracao sanitaria", "sanitaria", "sanitario",
    "6437", "6 437", "anvisa", "alvara sanitario", "interdicao",
    "secretaria municipal da saude", "secretaria de saude", "autoridade sanitaria",
    "fiscal sanitario", "manipulacao de alimentos", "boas praticas",
  ],
  procon: [
    "procon", "defesa do consumidor", "protecao e defesa do consumidor",
    "consumidor", "8078", "8 078", "2181", "2 181", "pratica abusiva",
    "relacao de consumo", "codigo de defesa do consumidor", "fornecedor",
  ],
  transito: [
    "ctb", "9503", "9 503", "detran", "renavam", "placa", "condutor",
    "codigo de transito", "auto de infracao de transito", "ait",
    "agente da autoridade de transito", "velocidade", "cnh", "veiculo",
  ],
  energia: [
    "toi", "termo de ocorrencia", "irregularidade", "aneel", "distribuidora",
    "unidade consumidora", "medidor", "recuperacao de consumo", "kwh",
    "energia eletrica", "conta de luz", "faturamento", "ren 1000", "ren 1.000",
  ],
  ibama: [
    "ibama", "instituto brasileiro do meio ambiente", "ambiental", "6514",
    "6 514", "auto de infracao ambiental", "vegetacao nativa", "desmat",
    "area de preservacao permanente", "app", "reserva legal", "fauna",
    "licenciamento ambiental", "analista ambiental", "9605", "9 605",
  ],
};

function pontuar(transcricao: string, vertical: Vertical): number {
  const t = normalizar(transcricao);
  const compacto = t.replace(/\s/g, "");
  return SINAIS[vertical].filter((s) => {
    const n = normalizar(s);
    return t.includes(n) || compacto.includes(n.replace(/\s/g, ""));
  }).length;
}

export type ResultadoVertical = "ok" | "outra_vertical" | "indefinido";

/**
 * Confere se o documento transcrito pertence à vertical da rota chamada.
 * "outra_vertical" e "indefinido" viram documento_invalido: na dúvida,
 * rejeita, que é a mesma regra já adotada nos prompts.
 */
export function conferirVertical(
  transcricao: string,
  esperada: Vertical
): ResultadoVertical {
  const meus = pontuar(transcricao, esperada);
  const outras: Vertical[] = (["transito", "procon", "vigilancia"] as Vertical[])
    .filter((v) => v !== esperada);

  const maiorOutra = Math.max(...outras.map((v) => pontuar(transcricao, v)));

  if (meus === 0) return "indefinido";
  if (maiorOutra > meus) return "outra_vertical";
  return "ok";
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

  // Documento com muitos campos marcados como ilegíveis não sustenta análise
  const marcadores = (transcricao.match(/\[ILEGIVEL\]/gi) || []).length;
  if (marcadores >= 3) return true;

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
  invalido: boolean;
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

  /* Cada vertical batizou os campos de identificação à sua maneira. Procon e
     Vigilância usam orgao_emissor / empresa_autuada; IBAMA usa orgao_autuante /
     autuado; Energia usa distribuidora. Aceitamos todos os apelidos para que a
     trava de legibilidade funcione igual em qualquer rota. */
  const camposChave = [
    parsed?.orgao_emissor || parsed?.orgao_autuante || parsed?.distribuidora,
    parsed?.numero_auto,
    parsed?.empresa_autuada || parsed?.estabelecimento_autuado || parsed?.autuado,
  ].filter((v) => typeof v === "string") as string[];

  // ORDEM DAS TRAVAS (a ordem importa):
  // 1º legibilidade — se não deu para ler, não se decide mais nada
  if (documentoIlegivel(transcricao, camposChave)) {
    return { ilegivel: true, invalido: false, parsed, descartados: 0 };
  }

  // 2º vertical — só depois de ler é que se pergunta de que órgão é o documento
  if (conferirVertical(transcricao, vertical) !== "ok") {
    return { ilegivel: false, invalido: true, parsed, descartados: 0 };
  }

  const originais: any[] = Array.isArray(parsed?.achados) ? parsed.achados : [];
  const aprovados: any[] = [];

  for (const a of originais) {
    if (!a || typeof a !== "object") continue;

    const trecho = typeof a.trecho_documento === "string" ? a.trecho_documento : "";
    if (trecho.trim().length === 0) continue;

    // TRAVA 1 — o trecho tem que existir mesmo no documento
    if (!trechoConfere(trecho, transcricao)) continue;

    // TRAVA 1-B — o trecho existe, mas é juízo plantado ou ordem ao modelo?
    // Fato objetivo sustenta achado; opinião escrita no documento, não.
    if (trechoContaminado(trecho)) continue;

    // TRAVA 2 — valores e datas citados têm que bater com o documento
    if (!numerosConferem(trecho, transcricao)) continue;
    if (!numerosConferem(a.explicacao || "", transcricao)) continue;

    // TRAVA 3 — citação legal dentro da lista fechada da vertical.
    // O campo mudou de nome entre verticais: base_legal em Procon/Vigilância,
    // dispositivo no IBAMA. Conferimos os dois, e também a explicação, porque
    // é comum a citação aparecer no corpo do texto e não no campo próprio.
    const citacao = [a.base_legal, a.dispositivo, a.explicacao]
      .filter((v: any) => typeof v === "string")
      .join(" ");
    if (!citacaoPermitida(citacao, vertical, transcricao)) continue;

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
    invalido: false,
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

  // 1º legibilidade
  if (documentoIlegivel(transcricao, [placa, data, local])) {
    return "imagem_ilegivel";
  }

  // 2º vertical: auto do Procon ou da vigilância não é analisado aqui
  if (conferirVertical(transcricao, "transito") !== "ok") {
    return "documento_invalido";
  }

  // Números citados no relatório têm que existir no documento
  if (!numerosConferem(relatorio, transcricao)) {
    return "imagem_ilegivel";
  }

  // COERÊNCIA: relatório que nega a existência de falha não pode
  // ser apresentado como se tivesse encontrado uma.
  if (relatorioNegaFalha(relatorio)) {
    return "rejeicao_sem_falha";
  }

  // PRAZO: alegação aritmeticamente falsa não sustenta o relatório sozinha.
  if (alegacaoDePrazoEhFalsa(relatorio) && !temOutroVicio(relatorio)) {
    return "rejeicao_sem_falha";
  }

  return relatorio;
}


// ============================================================
// 8-A. TRÂNSITO — COERÊNCIA DO RELATÓRIO
// ============================================================

/**
 * O relatório de trânsito é texto corrido, então o modelo consegue se
 * contradizer: afirmar que o auto está correto e, ao mesmo tempo, entregar
 * um relatório de falha. Aconteceu no caso 01.
 *
 * Se o texto diz que não há irregularidade, o resultado correto é
 * rejeicao_sem_falha — que a tela já sabe exibir.
 */
const FRASES_SEM_FALHA = [
  "nao foram identificadas irregularidades",
  "nao foram identificadas falhas",
  "nao foi identificada irregularidade",
  "nao foram encontradas irregularidades",
  "nao ha irregularidade",
  "nao ha falha",
  "nenhuma irregularidade",
  "nenhuma falha",
  "apresenta todos os requisitos",
  "contem todos os requisitos",
  "atende a todos os requisitos",
  "todos os campos obrigatorios estao preenchidos",
  "esta formalmente regular",
  "nao apresenta vicio",
  "sem vicio formal",
];

export function relatorioNegaFalha(relatorio: string): boolean {
  const t = normalizar(relatorio);
  return FRASES_SEM_FALHA.some((f) => t.includes(normalizar(f)));
}

/**
 * Falso positivo de prazo (caso 02): o modelo alegou prazo insuficiente
 * num auto que concedia 34 dias, quando o mínimo é 30. A conta é
 * verificável, então é feita aqui.
 *
 * Retorna true quando a alegação de prazo curto está ERRADA.
 */
export function alegacaoDePrazoEhFalsa(relatorio: string): boolean {
  const t = normalizar(relatorio);

  const falaDePrazo =
    t.includes("prazo") &&
    (t.includes("30 dias") || t.includes("trinta dias") ||
     t.includes("inferior") || t.includes("insuficiente") ||
     t.includes("exiguo") || t.includes("menor"));
  if (!falaDePrazo) return false;

  // Só interessam as datas citadas na parte que discute o prazo. As datas do
  // bloco de dados extraídos (data da infração, por exemplo) contaminariam a conta.
  const corte = relatorio.search(/O QUE ENCONTRAMOS|DIAGN[ÓO]STICO/i);
  const trechoPrazo = corte === -1 ? relatorio : relatorio.slice(corte);

  const datas = (trechoPrazo.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g) || []).map((d) => {
    const [dia, mes, ano] = d.split("/").map(Number);
    return new Date(ano, mes - 1, dia).getTime();
  });
  if (datas.length < 2) return false;

  const dias = (Math.max(...datas) - Math.min(...datas)) / 86400000;
  return dias >= 30;
}

/**
 * Indícios de vício concreto no texto. Serve para não apagar um relatório
 * legítimo só porque a parte do prazo estava errada.
 */
const INDICIOS_DE_VICIO = [
  "ausencia", "ausente", "nao consta", "nao ha identificacao", "falta",
  "em branco", "nao informado", "nao identificado", "ilegivel",
  "divergencia", "divergente", "generico", "generica", "incompleto",
  "incompleta", "sem assinatura", "sem identificacao", "sem matricula",
  "nao preenchido", "omissao",
];

function temOutroVicio(relatorio: string): boolean {
  const t = normalizar(relatorio);
  return INDICIOS_DE_VICIO.some((i) => t.includes(normalizar(i)));
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
