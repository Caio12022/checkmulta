/**
 * AGENTE DE ARTIGOS - CheckMulta IBAMA (auto de infração ambiental federal)
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions) e gera 1 artigo por execução.
 *
 * SEGURANÇA: antes de commitar, o arquivo montado é validado com esbuild.
 * - Se compilar     -> commit direto na main (site atualiza sozinho).
 * - Se NÃO compilar -> abre Pull Request e avisa no log. Nada vai pra main.
 * Assim o site nunca sai do ar por causa de um artigo malformado.
 *
 * Escreve em src/data/artigosIbama.ts (separado das outras verticais).
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_ARTIGOS = "src/data/artigosIbama.ts";

// Quantos artigos gerar por execução
const ARTIGOS_POR_EXECUCAO = 1;

// Categorias reais do blog Energia + temas que combinam com cada uma.
// Para adicionar pauta nova, basta acrescentar uma linha aqui.
const PAUTAS: { categoria: string; tema: string }[] = [
  // Primeiros Passos
  { categoria: "Primeiros Passos", tema: "quais documentos reunir antes de apresentar defesa contra um auto do IBAMA" },
  { categoria: "Primeiros Passos", tema: "como funciona o processo administrativo sancionador ambiental federal" },
  { categoria: "Primeiros Passos", tema: "como acessar o SEI do IBAMA para protocolar a defesa" },
  { categoria: "Primeiros Passos", tema: "o que significa a audiencia de conciliacao ambiental do IBAMA" },
  { categoria: "Primeiros Passos", tema: "auto de infracao, embargo e apreensao: as diferencas" },

  // Prescricao
  { categoria: "Prescrição", tema: "prescricao de cinco anos para lavratura do auto de infracao ambiental" },
  { categoria: "Prescrição", tema: "prescricao intercorrente de tres anos por processo parado no IBAMA" },
  { categoria: "Prescrição", tema: "como calcular se o auto de infracao ambiental ja prescreveu" },
  { categoria: "Prescrição", tema: "prescricao em infracao ambiental permanente ou continuada" },

  // Vicios do Auto
  { categoria: "Vícios do Auto", tema: "descricao generica da infracao ambiental e ofensa a ampla defesa" },
  { categoria: "Vícios do Auto", tema: "enquadramento legal incorreto no auto de infracao ambiental" },
  { categoria: "Vícios do Auto", tema: "ausencia de laudo de constatacao no auto de infracao do IBAMA" },
  { categoria: "Vícios do Auto", tema: "area sem georreferenciamento e dimensionamento do dano ambiental" },
  { categoria: "Vícios do Auto", tema: "requisitos formais do auto de infracao ambiental segundo o art. 97" },

  // Competencia
  { categoria: "Competência", tema: "diferenca entre auto do IBAMA e auto de orgao ambiental estadual" },
  { categoria: "Competência", tema: "repartição de competencia de fiscalizacao ambiental na LC 140/2011" },
  { categoria: "Competência", tema: "nulidade do auto por incompetencia do orgao autuante" },

  // Alternativas
  { categoria: "Alternativas", tema: "conversao da multa ambiental em servicos de recuperacao" },
  { categoria: "Alternativas", tema: "circunstancias atenuantes da penalidade ambiental" },
  { categoria: "Alternativas", tema: "quando vale a pena a conciliacao ambiental em vez da defesa" },
];

// ============================================================
// CLIENTES
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// UTILITÁRIOS
// ============================================================

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function github(path: string, method: string, body?: object) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub API erro ${res.status}: ${txt}`);
  }
  return res.json();
}

// Pausa entre chamadas, para não estourar a cota da API
function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// VALIDAÇÃO DE SINTAXE — a trava de segurança
// Compila o arquivo montado com esbuild. Se falhar, não commita.
// ============================================================
function validarSintaxe(conteudo: string): { ok: boolean; erro?: string } {
  const caminhoTemp = join(tmpdir(), `validar-artigos-${Date.now()}.ts`);
  try {
    writeFileSync(caminhoTemp, conteudo, "utf-8");
    execSync(`npx --yes esbuild "${caminhoTemp}" --outfile=/dev/null`, {
      stdio: "pipe",
      timeout: 90000,
    });
    return { ok: true };
  } catch (err: any) {
    const saida = err.stderr ? err.stderr.toString() : String(err.message || err);
    return { ok: false, erro: saida.slice(0, 800) };
  } finally {
    try {
      unlinkSync(caminhoTemp);
    } catch {}
  }
}

// ============================================================
// PASSO A: pega o artigosIbama.ts atual do GitHub
// ============================================================
async function baixarArtigos(): Promise<{ conteudo: string; sha: string }> {
  const data = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}?ref=${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  const conteudo = Buffer.from(data.content, "base64").toString("utf-8");
  return { conteudo, sha: data.sha };
}

function slugsExistentes(conteudo: string): Set<string> {
  const set = new Set<string>();
  const regex = /slug:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(conteudo)) !== null) set.add(m[1]);
  return set;
}

// ============================================================
// PASSO B: pede o artigo ao Gemini
// ============================================================
async function gerarArtigo(tema: string, categoria: string) {
  const prompt = `Você é redator especializado em direito ambiental sancionador federal, escrevendo para o blog do CheckMulta IBAMA (serviço que analisa autos de infração ambiental do IBAMA e gera defesas administrativas para o autuado).

Escreva UM artigo completo sobre: "${tema}".
Categoria: "${categoria}".
Ano atual: 2026.

PÚBLICO-ALVO: pessoas físicas e empresas que receberam um auto de infração ambiental do IBAMA. Não são advogados. São pessoas preocupadas com uma multa alta e um prazo correndo.

REGISTRO: profissional e sóbrio, sem informalidade. Explique conceitos técnicos (prescrição, nulidade, competência) em linguagem clara, sem infantilizar. Nada de gírias, exclamações ou tom publicitário.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois. Formato exato:
{
  "titulo": "título claro e específico, até 70 caracteres",
  "descricao": "meta description de 140-160 caracteres, informativa, terminando com convite a analisar o auto gratuitamente",
  "tempoLeitura": "X min",
  "imagemEmoji": "um único emoji relacionado ao tema",
  "imagemBg": "gradiente Tailwind SUAVE no formato from-COR-50 to-COR-50 usando tons claros (ex: from-emerald-50 to-green-50, from-sky-50 to-blue-50, from-amber-50 to-orange-50, from-violet-50 to-purple-50, from-lime-50 to-emerald-50)",
  "palavrasChave": ["3 a 5 palavras-chave de busca que um autuado digitaria no Google"],
  "conteudo": "artigo em MARKDOWN, 700-1000 palavras, com títulos ## e listas com hífen. NÃO use aspas duplas dentro do texto (use aspas simples se precisar)."
}

REGRAS JURÍDICAS OBRIGATÓRIAS (críticas — erro aqui compromete a credibilidade do serviço):

ESTA ANÁLISE É SOMENTE PARA O AUTO FEDERAL DO IBAMA. Autos estaduais (secretarias e institutos estaduais de meio ambiente, com nomes variados por estado) e municipais seguem legislação PRÓPRIA e NÃO podem ser tratados com a norma federal. Quando o tema envolver órgão estadual/municipal, apenas oriente a conferir a norma do órgão emissor — nunca aplique o Decreto 6.514/2008 a eles.

CITAÇÃO DE NORMAS — LISTA FECHADA. Você SÓ pode citar número de artigo que esteja nesta lista, com o conteúdo EXATO de cada um — nunca troque os rótulos:
Decreto nº 6.514/2008:
art. 96 = lavratura do auto com ciência ao autuado, contraditório e ampla defesa;
art. 97 = REQUISITOS FORMAIS do auto (impresso próprio; identificação do autuado; descrição CLARA E OBJETIVA da infração; indicação dos dispositivos infringidos; sem emendas/rasuras que comprometam a validade) — artigo central de nulidade formal;
art. 98 = encaminhamento à unidade e autuação processual;
art. 97-A = audiência de conciliação ambiental na lavratura; o § 1º sobresta a fluência do prazo de defesa pelo agendamento;
art. 100, § 2º = vício insanável impõe nulidade, cabendo novo auto dentro da prescrição;
art. 113 = PRAZO DE DEFESA de VINTE dias contados da ciência da autuação (dispositivo do prazo — NÃO confunda com o art. 96);
art. 21 = prescrição punitiva de CINCO anos da prática do ato, ou da cessação na infração permanente/continuada; § 2º = prescrição INTERCORRENTE de TRÊS anos sem movimentação do processo;
art. 22 = interrupção da prescrição.
Lei nº 9.605/98:
art. 14 = circunstâncias atenuantes;
art. 72, § 4º = conversão da multa simples em serviços de preservação, melhoria e recuperação ambiental.
Lei nº 9.784/99 (subsidiária, sempre com a expressão aplicável subsidiariamente):
art. 53 = a Administração deve anular seus atos eivados de vício de legalidade.
LC nº 140/2011:
art. 7º e art. 17 = repartição de competências de fiscalização; a atuação de ente incompetente enseja nulidade.

ATENÇÃO À PRESCRIÇÃO: cinco anos é para a lavratura (art. 21); três anos é a intercorrente por processo parado (art. 21, § 2º). Não troque os prazos.

ATENÇÃO AO PRAZO DE DEFESA: são vinte dias da ciência (art. 113), MAS pode ficar sobrestado quando há audiência de conciliação (art. 97-A, § 1º). Nunca crave o prazo como definitivo — oriente a conferir no próprio auto.

VOCÊ ESTÁ PROIBIDO DE CITAR: normas estaduais ou municipais, Instruções Normativas estaduais, resoluções CONAMA por número, ou qualquer artigo fora da lista acima. Se a norma não está na lista, NÃO cite número — use apenas expressão geral.

OUTRAS REGRAS:
- NÃO invente valores de multa em reais nem coordenadas.
- NUNCA prometa resultado. É PROIBIDO escrever o auto será anulado, você vai ganhar, garantimos. Use linguagem de possibilidade: pode fundamentar a nulidade, há indício de prescrição.
- NÃO confunda o tema ambiental com outros. Este blog não trata de Procon, multas de trânsito, CTB, DETRAN, Vigilância Sanitária, energia elétrica ou Corpo de Bombeiros em nenhuma hipótese.
- NÃO impute crime ou má-fé ao agente. Trate como vício do procedimento administrativo.
- SEGURANÇA: nunca oriente o leitor a descumprir medida ambiental vigente (embargo, apreensão). A defesa discute a validade do auto, não autoriza desobedecer determinação em vigor.

REGRA DO CHAMADO FINAL (CTA):
- Termine com um parágrafo curto convidando o autuado a analisar o auto gratuitamente no CheckMulta.
- NUNCA escreva clique aqui, clique no botão ou similares. O site já tem os botões próprios.
- Exemplo de tom adequado: No CheckMulta, você pode enviar o auto de infração e receber uma análise gratuita que aponta se ele apresenta falha capaz de fundamentar a defesa.

AVISO LEGAL FINAL (obrigatório):
- Depois do CTA, encerre com uma linha separadora --- seguida exatamente desta frase em itálico:
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`;

  const resp = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  let texto = resp.text?.trim() || "";
  texto = texto
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const obj = JSON.parse(texto);
  return obj;
}

// ============================================================
// PASSO B2: revisão jurídica — o modelo relê e corrige o artigo
// ============================================================
async function revisarArtigo(conteudo: string): Promise<string> {
  const prompt = `Você é um revisor jurídico sênior especializado em direito ambiental sancionador federal. Abaixo está um artigo de blog dirigido a pessoas autuadas pelo IBAMA. Revise e devolva a versão CORRIGIDA.

Faça o seguinte:
1. CITAÇÃO DE NORMAS: só podem permanecer os arts. 96, 97, 98, 97-A, 100 §2º, 113, 21 e §§, 22 do Decreto 6.514/2008; arts. 14 e 72 §4º da Lei 9.605/98; art. 53 da Lei 9.784/99; arts. 7º e 17 da LC 140/2011. REMOVA qualquer norma estadual/municipal, IN estadual, resolução CONAMA por número ou artigo fora dessa lista, substituindo por expressão geral.
1.1. CONFERÊNCIA DE RÓTULO — corrija se o texto atribuir a um artigo conteúdo que não é o dele. Rótulos corretos: art. 96 = lavratura/ciência; art. 97 = requisitos formais do auto; art. 113 = prazo de defesa de 20 dias; art. 21 = prescrição de 5 anos, § 2º intercorrente de 3 anos; art. 72 §4º = conversão em serviços; art. 14 = atenuantes; LC 140 arts. 7º/17 = competência. Em especial: o prazo de defesa é o art. 113, NUNCA o art. 96; e não troque os prazos de prescrição (5 anos lavratura, 3 anos intercorrente).
2. AUTO ESTADUAL/MUNICIPAL: se o texto aplicar o Decreto 6.514/2008 a auto de órgão estadual ou municipal como se fosse federal, corrija, esclarecendo que esses seguem norma própria.
3. PRAZO: se o texto cravar o prazo de defesa como definitivo sem ressalvar o possível sobrestamento pela conciliação (art. 97-A, § 1º), ajuste para orientar a conferir no próprio auto.
4. Remova qualquer promessa de resultado (será anulado, você vai ganhar, garantimos). Substitua por linguagem de possibilidade.
5. Verifique se o texto não confundiu o tema ambiental com outro (Procon, trânsito, energia, vigilância). Menção assim está errada e deve ser removida.
6. SEGURANÇA: se o texto sugerir descumprir embargo, apreensão ou outra medida ambiental vigente, REESCREVA — a defesa discute a validade do auto, não autoriza desobedecer determinação em vigor.
7. Remova qualquer clique aqui ou clique no botão, reescrevendo de forma natural.
8. Mantenha o tom profissional e sóbrio, o tamanho, a estrutura em markdown (títulos ##, listas, negrito) e o sentido geral.
9. Preserve a linha separadora --- e o aviso legal em itálico ao final. Se não existirem, acrescente.
10. NÃO use aspas duplas dentro do texto (use aspas simples se precisar).

Responda APENAS com o texto do artigo revisado em markdown, sem comentários, sem explicações, sem crases, sem nada antes ou depois.

ARTIGO PARA REVISAR:
${conteudo}`;

  const resp = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  let texto = resp.text?.trim() || "";
  texto = texto
    .replace(/^```markdown\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // se a revisão vier vazia ou muito curta, mantém o original (segurança)
  if (texto.length < 200) return conteudo;
  return texto;
}

// ============================================================
// PASSO C: monta o bloco TypeScript do artigo novo
// ============================================================
function montarBloco(artigo: any, slug: string): string {
  const conteudoSeguro = String(artigo.conteudo)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

  const palavras = (artigo.palavrasChave || [])
    .map((p: string) => `"${String(p).replace(/"/g, "'")}"`)
    .join(", ");

  return `  {
    slug: "${slug}",
    titulo: "${String(artigo.titulo).replace(/"/g, "'")}",
    descricao: "${String(artigo.descricao).replace(/"/g, "'")}",
    categoria: "${String(artigo.categoria).replace(/"/g, "'")}",
    tempoLeitura: "${String(artigo.tempoLeitura).replace(/"/g, "'")}",
    imagemEmoji: "${artigo.imagemEmoji}",
    imagemBg: "${String(artigo.imagemBg).replace(/"/g, "'")}",
    palavrasChave: [${palavras}],
    conteudo: \`${conteudoSeguro}\`,
  },
`;
}

// ============================================================
// PASSO D: insere o bloco logo após a abertura do array
// ============================================================
function inserirArtigo(conteudoArquivo: string, bloco: string): string {
  const marcador = "export const artigosIbama: ArtigoIbama[] = [";
  const pos = conteudoArquivo.indexOf(marcador);
  if (pos === -1)
    throw new Error("Marcador de início do array não encontrado no arquivo.");
  const insercao = pos + marcador.length;
  return (
    conteudoArquivo.slice(0, insercao) +
    "\n" +
    bloco +
    conteudoArquivo.slice(insercao)
  );
}

// ============================================================
// PASSO E1: commit direto na main (caminho normal, se a validação passou)
// ============================================================
async function commitarNaMain(novoConteudo: string, sha: string, titulos: string[]) {
  const mensagem =
    titulos.length === 1
      ? `Novo artigo IBAMA: ${titulos[0]}`
      : `Novos artigos IBAMA (${titulos.length})`;

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: mensagem.slice(0, 240),
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: GITHUB_BRANCH_BASE,
    }
  );
}

// ============================================================
// PASSO E2: abre PR (fallback, só quando a validação falha)
// ============================================================
async function abrirPRdeRevisao(
  novoConteudo: string,
  sha: string,
  titulos: string[],
  motivo: string
) {
  const ref = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  const baseSha = ref.object.sha;
  const nomeBranch = `artigos-ibama-revisar-${Date.now()}`;

  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, "POST", {
    ref: `refs/heads/${nomeBranch}`,
    sha: baseSha,
  });

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: "Artigos IBAMA aguardando revisao manual",
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: nomeBranch,
    }
  );

  const pr = await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, "POST", {
    title: "ATENCAO: artigos IBAMA nao passaram na validacao",
    head: nomeBranch,
    base: GITHUB_BRANCH_BASE,
    body:
      "O robo gerou os artigos abaixo, mas o arquivo montado NAO passou na validacao de sintaxe. Por seguranca, nada foi enviado para a main.\n\nArtigos: " +
      titulos.join(", ") +
      "\n\nMotivo:\n```\n" +
      motivo +
      "\n```\n\nRevise antes de fazer merge.",
  });

  return pr.html_url;
}

// ============================================================
// Produz UM artigo completo (geração + revisão) e devolve o bloco
// ============================================================
async function produzirArtigo(
  existentes: Set<string>
): Promise<{ bloco: string; slug: string; titulo: string } | null> {
  const pauta = PAUTAS[Math.floor(Math.random() * PAUTAS.length)];
  console.log(`  Tema: ${pauta.tema}`);
  console.log(`  Categoria: ${pauta.categoria}`);

  let artigo: any = null;
  let slug = "";

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    artigo = await gerarArtigo(pauta.tema, pauta.categoria);
    artigo.categoria = pauta.categoria;
    slug = slugify(artigo.titulo);
    if (slug && !existentes.has(slug)) break;
    console.log(`  Tentativa ${tentativa}: slug repetido (${slug}). Tentando de novo.`);
    slug = "";
  }

  if (!slug) {
    console.log("  Nao consegui slug inedito em 3 tentativas. Pulando este artigo.");
    return null;
  }

  for (const campo of ["titulo", "descricao", "conteudo", "imagemBg", "imagemEmoji"]) {
    if (!artigo[campo] || String(artigo[campo]).trim() === "") {
      console.log(`  Campo obrigatorio vazio (${campo}). Pulando este artigo.`);
      return null;
    }
  }

  console.log("  Revisando (checagem juridica)...");
  artigo.conteudo = await revisarArtigo(String(artigo.conteudo));

  return { bloco: montarBloco(artigo, slug), slug, titulo: artigo.titulo };
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================
async function main() {
  console.log(`Agente IBAMA iniciado. Meta: ${ARTIGOS_POR_EXECUCAO} artigos.`);

  const { conteudo, sha } = await baixarArtigos();
  const existentes = slugsExistentes(conteudo);
  console.log(`Artigos Energia existentes: ${existentes.size}`);

  let conteudoAcumulado = conteudo;
  const titulosGerados: string[] = [];

  for (let i = 1; i <= ARTIGOS_POR_EXECUCAO; i++) {
    console.log(`\n--- Artigo ${i} de ${ARTIGOS_POR_EXECUCAO} ---`);
    try {
      const resultado = await produzirArtigo(existentes);
      if (!resultado) continue;

      conteudoAcumulado = inserirArtigo(conteudoAcumulado, resultado.bloco);
      existentes.add(resultado.slug);
      titulosGerados.push(resultado.titulo);
      console.log(`  OK: ${resultado.titulo}`);
    } catch (err: any) {
      console.error(`  Falhou: ${err.message}. Seguindo para o proximo.`);
    }

    if (i < ARTIGOS_POR_EXECUCAO) await esperar(4000);
  }

  if (titulosGerados.length === 0) {
    throw new Error("Nenhum artigo foi gerado com sucesso nesta execucao.");
  }

  console.log(`\n${titulosGerados.length} artigo(s) montado(s). Validando sintaxe...`);
  const validacao = validarSintaxe(conteudoAcumulado);

  if (validacao.ok) {
    console.log("Validacao OK. Commitando direto na main...");
    await commitarNaMain(conteudoAcumulado, sha, titulosGerados);
    console.log(`Publicado(s) automaticamente ${titulosGerados.length} artigo(s):`);
    titulosGerados.forEach((t) => console.log(`   - ${t}`));
  } else {
    console.error("VALIDACAO FALHOU. Nada foi enviado para a main.");
    console.error(validacao.erro);
    const url = await abrirPRdeRevisao(conteudoAcumulado, sha, titulosGerados, validacao.erro || "");
    console.log(`Pull Request aberto para revisao manual: ${url}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Agente IBAMA falhou:", err.message);
  process.exit(1);
});
