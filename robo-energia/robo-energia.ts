/**
 * AGENTE DE ARTIGOS - CheckMulta ENERGIA ELÉTRICA (TOI)
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions) e gera 1 artigo por execução.
 *
 * SEGURANÇA: antes de commitar, o arquivo montado é validado com esbuild.
 * - Se compilar     -> commit direto na main (site atualiza sozinho).
 * - Se NÃO compilar -> abre Pull Request e avisa no log. Nada vai pra main.
 * Assim o site nunca sai do ar por causa de um artigo malformado.
 *
 * Escreve em src/data/artigosEnergia.ts (separado das outras verticais).
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { validarArtigoBlog, gerarComRetry, type ViolacaoDefesa } from "../prompts/validador";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_ARTIGOS = "src/data/artigosEnergia.ts";

// Quantos artigos gerar por execução
const ARTIGOS_POR_EXECUCAO = 1;

// Categorias reais do blog Energia + temas que combinam com cada uma.
// Para adicionar pauta nova, basta acrescentar uma linha aqui.
const PAUTAS: { categoria: string; tema: string }[] = [
  // Primeiros Passos
  { categoria: "Primeiros Passos", tema: "quais documentos reunir antes de contestar um TOI de energia" },
  { categoria: "Primeiros Passos", tema: "por que não se deve pagar a cobrança retroativa de energia antes de analisar o TOI" },
  { categoria: "Primeiros Passos", tema: "como ler e interpretar um Termo de Ocorrência e Inspeção de energia elétrica" },
  { categoria: "Primeiros Passos", tema: "o que fazer ao receber uma notificação de recuperação de consumo" },
  { categoria: "Primeiros Passos", tema: "diferença entre conta de luz alta e cobrança de recuperação de consumo" },

  // Falhas do TOI
  { categoria: "Falhas do TOI", tema: "TOI lavrado sem o consumidor presente e sem acompanhante" },
  { categoria: "Falhas do TOI", tema: "ausência de informação sobre o direito à perícia metrológica no INMETRO" },
  { categoria: "Falhas do TOI", tema: "alegação de violação do medidor sem relatório de avaliação técnica" },
  { categoria: "Falhas do TOI", tema: "TOI sem recibo de entrega assinado pelo consumidor" },
  { categoria: "Falhas do TOI", tema: "distribuidora não comprova envio da cópia do TOI em até 15 dias" },

  // Cálculo e Período
  { categoria: "Cálculo e Período", tema: "cobrança de 36 meses de energia sem demonstrar o início da irregularidade" },
  { categoria: "Cálculo e Período", tema: "limite de 6 ciclos quando o período da irregularidade não é identificável" },
  { categoria: "Cálculo e Período", tema: "ausência de memória de cálculo na notificação de recuperação de consumo" },
  { categoria: "Cálculo e Período", tema: "média dos três maiores consumos aplicada fora dos ciclos regulares" },
  { categoria: "Cálculo e Período", tema: "faturamento a maior e o direito à devolução em dobro" },

  // Perícia do Medidor
  { categoria: "Perícia do Medidor", tema: "lacre do medidor no momento da retirada para perícia" },
  { categoria: "Perícia do Medidor", tema: "direito de acompanhar a perícia do medidor em laboratório" },
  { categoria: "Perícia do Medidor", tema: "prazo de 30 dias para o relatório de inspeção do medidor" },
  { categoria: "Perícia do Medidor", tema: "cobrança sem que o medidor tenha sido efetivamente periciado" },

  // Direitos do Consumidor
  { categoria: "Direitos do Consumidor", tema: "a distribuidora pode cortar a luz por causa de um débito de TOI" },
  { categoria: "Direitos do Consumidor", tema: "negativação por débito de recuperação de consumo em discussão" },
  { categoria: "Direitos do Consumidor", tema: "ônus da prova em processos de recuperação de consumo de energia" },
  { categoria: "Direitos do Consumidor", tema: "diferença entre contestação administrativa e ação judicial contra a distribuidora" },
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
// PASSO A: pega o artigosEnergia.ts atual do GitHub
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
  const prompt = `Você é redator especializado em regulação do setor elétrico e defesa do consumidor, escrevendo para o blog do CheckMulta Energia (serviço que analisa Termos de Ocorrência e Inspeção — TOI — e notificações de recuperação de consumo de energia elétrica, e gera contestações administrativas para o consumidor).

Escreva UM artigo completo sobre: "${tema}".
Categoria: "${categoria}".
Ano atual: 2026.

PÚBLICO-ALVO: consumidores residenciais, comerciais e industriais que receberam um TOI, uma notificação de recuperação de consumo ou uma fatura com cobrança retroativa de energia elétrica. Não são advogados nem engenheiros. São pessoas assustadas com uma cobrança alta e um prazo curto.

REGISTRO: profissional e sóbrio, sem informalidade. Explique conceitos técnicos em linguagem clara, mas sem infantilizar. Nada de gírias, exclamações ou tom publicitário.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois. Formato exato:
{
  "titulo": "título claro e específico, até 70 caracteres",
  "descricao": "meta description de 140-160 caracteres, informativa, terminando com convite a verificar o documento gratuitamente",
  "tempoLeitura": "X min",
  "imagemEmoji": "um único emoji relacionado ao tema",
  "imagemBg": "gradiente Tailwind SUAVE no formato 'from-COR-50 to-COR-50' usando tons claros (ex: from-amber-50 to-orange-50, from-sky-50 to-blue-50, from-emerald-50 to-teal-50, from-violet-50 to-purple-50, from-rose-50 to-pink-50)",
  "palavrasChave": ["3 a 5 palavras-chave de busca que um consumidor cobrado digitaria no Google"],
  "conteudo": "artigo em MARKDOWN, 700-1000 palavras, com títulos ## e listas com hífen. NÃO use aspas duplas dentro do texto (use aspas simples se precisar)."
}

REGRAS JURÍDICAS OBRIGATÓRIAS (críticas — erro aqui compromete a credibilidade do serviço):

CITAÇÃO DE NORMAS — LISTA FECHADA. Você SÓ pode citar número de artigo que esteja nesta lista, da Resolução Normativa ANEEL nº 1.000/2021. Dispositivos seguros, com o conteúdo EXATO de cada um — nunca troque os rótulos:
art. 590 = providências CUMULATIVAS para caracterizar o procedimento irregular (emitir o TOI em formulário próprio; solicitar verificação ou perícia metrológica; elaborar relatório de avaliação técnica quando houver violação do medidor; avaliar histórico de consumo e grandezas elétricas);
art. 591 = deveres na emissão do TOI (entrega de cópia legível mediante recibo assinado; informação sobre o direito de perícia metrológica no INMETRO, com prazos e custos; § 1º permite emissão eletrônica com impressão local ou envio com comprovação de recebimento; § 3º exige envio da cópia em até 15 dias quando houve recusa de recebimento ou quando quem acompanhou não foi o consumidor);
arts. 592 e 250 = perícia do medidor (lacre no ato da retirada; comunicação prévia da data e horário da perícia em laboratório; direito a assistente técnico; relatório de inspeção em até 30 dias contados da SOLICITAÇÃO, não da data da inspeção);
art. 595 = critérios de cálculo da receita a recuperar (fator de correção por inspeção do medidor, desde que selos, lacres, tampa e base estejam intactos; média dos três maiores consumos em até 12 ciclos regulares anteriores ao início da irregularidade; carga desviada ou instalada; valores máximos dos 3 ciclos posteriores à regularização);
art. 596 = período de duração da irregularidade, determinado tecnicamente ou por histórico; § 1º limita a 6 ciclos anteriores à constatação quando o período não é identificável; teto geral de 36 ciclos;
art. 323 = faturamento a maior — revisão de até 60 ciclos e devolução em dobro da quantia recebida indevidamente, independentemente de dolo ou culpa da distribuidora.

ATENÇÃO: os 36 ciclos NÃO são um período automático — são apenas o teto máximo. Sem demonstração técnica do início da irregularidade, o período correto é de 6 ciclos (art. 596, § 1º). Este é o erro mais comum das cobranças e deve ser explicado sempre que o tema tocar em período ou cálculo.

Pode ser citado de forma genérica, sem número de artigo: o Código de Defesa do Consumidor, como fundamento da relação de consumo e da inversão do ônus da prova.

SÚMULA 256 DO TJ-RJ: é entendimento ESTADUAL do Rio de Janeiro (o TOI não ostenta presunção de legitimidade, ainda que subscrito pelo usuário). Só pode ser mencionada em artigo que trate especificamente de consumidores do Rio de Janeiro, e sempre como reforço secundário — nunca como regra nacional. Na dúvida, NÃO mencione.

VOCÊ ESTÁ PROIBIDO DE CITAR: a REN 414/2010, a REN 456/2000, normas técnicas internas de distribuidora, resoluções de agências estaduais de energia, portarias, decretos, ou qualquer outro artigo da REN 1.000/2021 fora da lista acima. Se a norma não está na lista, NÃO cite número — use apenas expressão geral.

PRAZO — NUNCA afirme número específico de dias para protocolar a contestação, para a resposta da distribuidora ou para recorrer à ANEEL. Sempre oriente o leitor a conferir o prazo na própria notificação recebida e, em caso de dúvida, junto à distribuidora.

OUTRAS REGRAS:
- NÃO invente valores de cobrança em reais.
- NUNCA prometa resultado. É PROIBIDO escrever 'o débito será anulado', 'você vai ganhar', 'garantimos'. Use linguagem de possibilidade: 'pode ser arguido na contestação', 'há fundamento para questionar'.
- NÃO confunda energia elétrica com outros temas. Este blog não trata de Procon, multas de trânsito, CTB, DETRAN, Vigilância Sanitária, Corpo de Bombeiros ou órgãos ambientais em nenhuma hipótese.
- NÃO trate como sinônimos 'conta de luz alta' (questão de consumo) e 'cobrança de recuperação de consumo' (questão de procedimento). O produto do CheckMulta trata da segunda.
- SEGURANÇA: nunca oriente o leitor a deixar de pagar as faturas correntes de energia. A contestação é sobre o débito retroativo, não sobre o consumo do mês.
- Quando o tema envolver risco de corte ou negativação, explique que o pedido de suspensão da cobrança é parte da contestação, e não uma garantia automática.

REGRA DO CHAMADO FINAL (CTA):
- Termine com um parágrafo curto convidando o consumidor a verificar o documento gratuitamente no CheckMulta.
- NUNCA escreva 'clique aqui', 'clique no botão' ou similares. O site já tem os botões próprios.
- Exemplo de tom adequado: 'No CheckMulta, você pode enviar o TOI ou a notificação de recuperação de consumo e receber uma análise gratuita que aponta se a cobrança apresenta falha capaz de fundamentar contestação.'

AVISO LEGAL FINAL (obrigatório):
- Depois do CTA, encerre o artigo com uma linha separadora '---' seguida exatamente desta frase em itálico:
*Este conteúdo tem caráter informativo e não constitui consultoria jurídica. Para orientação sobre o seu caso concreto, consulte um advogado.*`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    })
  );

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
  const prompt = `Você é um revisor jurídico sênior especializado em regulação do setor elétrico e defesa do consumidor. Abaixo está um artigo de blog dirigido a consumidores cobrados por recuperação de consumo de energia elétrica. Revise e devolva a versão CORRIGIDA.

Faça o seguinte:
1. CITAÇÃO DE NORMAS: verifique toda citação de artigo, lei ou norma. Só podem permanecer os arts. 590, 591 (incisos I, II, § 1º, § 3º), 592, 250, 595, 596 e 323 da Resolução ANEEL nº 1.000/2021, além do CDC citado de forma genérica sem número. REMOVA qualquer citação da REN 414/2010, da REN 456/2000, de norma técnica de distribuidora, de agência estadual de energia, de portaria, decreto ou de qualquer outro artigo fora dessa lista, substituindo por expressão geral.
1.1. CONFERÊNCIA DE RÓTULO — corrija se o texto atribuir a um artigo conteúdo que não é o dele. Os rótulos corretos são: art. 590 = providências cumulativas de caracterização da irregularidade; art. 591 = deveres na emissão do TOI (entrega com recibo, informação sobre perícia metrológica); arts. 592 e 250 = perícia do medidor em laboratório e prazo de 30 dias contado da solicitação; art. 595 = critérios de cálculo da receita a recuperar; art. 596 = período de duração da irregularidade, com limite de 6 ciclos quando não identificável e teto de 36 ciclos; art. 323 = faturamento a maior, revisão de até 60 ciclos e devolução em dobro. Em especial: se o texto disser que 36 ciclos é o período padrão de cobrança, CORRIJA — é apenas o teto máximo, e sem demonstração do início da irregularidade o correto são 6 ciclos.
2. SÚMULA 256 DO TJ-RJ: se aparecer e o artigo não for especificamente sobre o Rio de Janeiro, REMOVA a menção. Se for sobre o Rio de Janeiro, garanta que apareça só como reforço secundário.
3. PRAZO: se o texto afirmar número específico de dias para contestação ou resposta como se valesse de forma padronizada, corrija para orientar a conferir o prazo na notificação recebida.
4. Remova qualquer promessa de resultado ('será anulado', 'você vai ganhar', 'garantimos'). Substitua por linguagem de possibilidade.
5. Verifique se o texto não confundiu energia elétrica com outro órgão ou tema. Menção a Procon, CTB, DETRAN, radar, Vigilância Sanitária, Corpo de Bombeiros ou órgão ambiental está errada neste contexto e deve ser removida.
6. SEGURANÇA: se o texto sugerir, em qualquer medida, que o consumidor deixe de pagar as faturas correntes de energia, REESCREVA. Essa orientação é perigosa e não pode constar. A contestação é sobre o débito retroativo, não sobre o consumo do mês.
7. Remova qualquer 'clique aqui' ou 'clique no botão', reescrevendo de forma natural.
8. Mantenha o tom profissional e sóbrio, o tamanho, a estrutura em markdown (títulos ##, listas, negrito) e o sentido geral.
9. Preserve a linha separadora '---' e o aviso legal em itálico ao final. Se não existirem, acrescente.
10. NÃO use aspas duplas dentro do texto (use aspas simples se precisar).

Responda APENAS com o texto do artigo revisado em markdown, sem comentários, sem explicações, sem crases, sem nada antes ou depois.

ARTIGO PARA REVISAR:
${conteudo}`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    })
  );

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
  const marcador = "export const artigosEnergia: ArtigoEnergia[] = [";
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
      ? `Novo artigo Energia: ${titulos[0]}`
      : `Novos artigos Energia (${titulos.length})`;

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
  const nomeBranch = `artigos-energia-revisar-${Date.now()}`;

  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, "POST", {
    ref: `refs/heads/${nomeBranch}`,
    sha: baseSha,
  });

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: "Artigos Energia aguardando revisao manual",
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: nomeBranch,
    }
  );

  const pr = await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, "POST", {
    title: "ATENCAO: artigos Energia nao passaram na validacao",
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
): Promise<{ bloco: string; slug: string; titulo: string; violacoesLegais: ViolacaoDefesa[] } | null> {
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

  console.log("  Auditando (segunda camada, em codigo)...");
  const violacoesLegais = validarArtigoBlog(String(artigo.conteudo), "energia", pauta.tema);
  if (violacoesLegais.length > 0) {
    console.log(`  Auditoria reprovou: ${violacoesLegais.map((v) => v.regra).join(", ")}`);
  }

  return { bloco: montarBloco(artigo, slug), slug, titulo: artigo.titulo, violacoesLegais };
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================
async function main() {
  console.log(`Agente Energia iniciado. Meta: ${ARTIGOS_POR_EXECUCAO} artigos.`);

  const { conteudo, sha } = await baixarArtigos();
  const existentes = slugsExistentes(conteudo);
  console.log(`Artigos Energia existentes: ${existentes.size}`);

  let conteudoAcumulado = conteudo;
  const titulosGerados: string[] = [];
  const violacoesTotais: { titulo: string; violacoes: ViolacaoDefesa[] }[] = [];

  for (let i = 1; i <= ARTIGOS_POR_EXECUCAO; i++) {
    console.log(`\n--- Artigo ${i} de ${ARTIGOS_POR_EXECUCAO} ---`);
    try {
      const resultado = await produzirArtigo(existentes);
      if (!resultado) continue;

      conteudoAcumulado = inserirArtigo(conteudoAcumulado, resultado.bloco);
      existentes.add(resultado.slug);
      titulosGerados.push(resultado.titulo);
      if (resultado.violacoesLegais.length > 0) {
        violacoesTotais.push({ titulo: resultado.titulo, violacoes: resultado.violacoesLegais });
      }
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
  const reprovadoNaAuditoria = violacoesTotais.length > 0;

  if (validacao.ok && !reprovadoNaAuditoria) {
    console.log("Validacao OK. Commitando direto na main...");
    await commitarNaMain(conteudoAcumulado, sha, titulosGerados);
    console.log(`Publicado(s) automaticamente ${titulosGerados.length} artigo(s):`);
    titulosGerados.forEach((t) => console.log(`   - ${t}`));
  } else {
    const motivos: string[] = [];
    if (!validacao.ok) {
      console.error("VALIDACAO DE SINTAXE FALHOU.");
      motivos.push(`SINTAXE:\n${validacao.erro}`);
    }
    if (reprovadoNaAuditoria) {
      console.error("AUDITORIA JURIDICA REPROVOU.");
      motivos.push(
        "AUDITORIA JURIDICA:\n" +
          violacoesTotais
            .map((v) => `${v.titulo}: ` + v.violacoes.map((x) => `${x.regra} (${x.detalhe})`).join("; "))
            .join("\n")
      );
    }
    console.error("Nada foi enviado para a main.");
    const url = await abrirPRdeRevisao(conteudoAcumulado, sha, titulosGerados, motivos.join("\n\n"));
    console.log(`Pull Request aberto para revisao manual: ${url}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Agente Energia falhou:", err.message);
  process.exit(1);
});
