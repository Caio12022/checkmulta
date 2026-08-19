/**
 * AGENTE DE ARTIGOS - CheckMulta PROCON
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions) e gera 1 artigo por execução.
 *
 * SEGURANÇA: antes de commitar, o arquivo montado é validado com esbuild.
 * - Se compilar     -> commit direto na main (site atualiza sozinho).
 * - Se NÃO compilar -> abre Pull Request e avisa no log. Nada vai pra main.
 * Assim o site nunca sai do ar por causa de um artigo malformado.
 *
 * Escreve em src/data/artigosProcon.ts (separado do blog de trânsito).
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
const CAMINHO_ARTIGOS = "src/data/artigosProcon.ts";

// Quantos artigos gerar por execução
const ARTIGOS_POR_EXECUCAO = 1;

// Categorias reais do blog Procon + temas que combinam com cada uma.
// Para adicionar pauta nova, basta acrescentar uma linha aqui.
const PAUTAS: { categoria: string; tema: string }[] = [
  // Prazos e Procedimento
  { categoria: "Prazos e Procedimento", tema: "como contar o prazo de defesa a partir da notificação do Procon" },
  { categoria: "Prazos e Procedimento", tema: "o que acontece quando a empresa perde o prazo de defesa no Procon" },
  { categoria: "Prazos e Procedimento", tema: "diferença entre defesa administrativa e recurso no processo do Procon" },
  { categoria: "Prazos e Procedimento", tema: "como funciona o protocolo da defesa administrativa no Procon" },
  { categoria: "Prazos e Procedimento", tema: "notificação por edital do Procon e quando ela é irregular" },

  // Primeiros Passos
  { categoria: "Primeiros Passos", tema: "quais documentos a empresa deve reunir para se defender no Procon" },
  { categoria: "Primeiros Passos", tema: "por que não se deve pagar a multa do Procon antes de analisar o auto" },
  { categoria: "Primeiros Passos", tema: "como ler e interpretar um auto de infração do Procon" },
  { categoria: "Primeiros Passos", tema: "o que a empresa deve fazer ao receber uma reclamação no Procon antes da autuação" },

  // Vícios e Nulidades
  { categoria: "Vícios e Nulidades", tema: "descrição genérica da conduta no auto de infração e por que isso é um vício" },
  { categoria: "Vícios e Nulidades", tema: "ausência de capitulação legal no auto de infração do Procon" },
  { categoria: "Vícios e Nulidades", tema: "erro na identificação da empresa autuada pelo Procon" },
  { categoria: "Vícios e Nulidades", tema: "cerceamento de defesa no processo administrativo do Procon" },
  { categoria: "Vícios e Nulidades", tema: "decisão do Procon sem motivação expressa" },

  // Dosimetria da Multa
  { categoria: "Dosimetria da Multa", tema: "como o Procon calcula o valor da multa aplicada à empresa" },
  { categoria: "Dosimetria da Multa", tema: "tratamento diferenciado para microempresa e empresa de pequeno porte no Procon" },
  { categoria: "Dosimetria da Multa", tema: "multa desproporcional do Procon e como questionar o valor" },
  { categoria: "Dosimetria da Multa", tema: "estimativa de faturamento pelo Procon sem base documental" },

  // Direitos da Empresa
  { categoria: "Direitos da Empresa", tema: "direito da empresa de obter cópia integral do processo administrativo" },
  { categoria: "Direitos da Empresa", tema: "contraditório e ampla defesa no processo sancionador do Procon" },
  { categoria: "Direitos da Empresa", tema: "o que é a audiência de conciliação no Procon e como se preparar" },
];

// ============================================================
// CHAVES (variáveis de ambiente - NÃO escreva aqui)
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// FUNÇÕES AUXILIARES
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
// PASSO A: pega o artigosProcon.ts atual do GitHub
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
  const prompt = `Você é redator especializado em Direito do Consumidor e processo administrativo sancionador, escrevendo para o blog do CheckMulta Procon (serviço que analisa autos de infração do Procon e gera defesas administrativas para empresas autuadas).

Escreva UM artigo completo sobre: "${tema}".
Categoria: "${categoria}".
Ano atual: 2026.

PÚBLICO-ALVO: empresas autuadas pelo Procon. Não são advogados. São donos de negócio, gerentes ou responsáveis administrativos que receberam um auto de infração e não sabem o que fazer.

REGISTRO: profissional e sóbrio, sem informalidade. Explique conceitos técnicos em linguagem clara, mas sem infantilizar. Nada de gírias, exclamações ou tom publicitário.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois. Formato exato:
{
  "titulo": "título claro e específico, até 70 caracteres",
  "descricao": "meta description de 140-160 caracteres, informativa, terminando com convite a verificar o auto gratuitamente",
  "tempoLeitura": "X min",
  "imagemEmoji": "um único emoji relacionado ao tema",
  "imagemBg": "gradiente Tailwind SUAVE no formato 'from-COR-50 to-COR-50' usando tons claros (ex: from-amber-50 to-orange-50, from-sky-50 to-blue-50, from-emerald-50 to-teal-50, from-violet-50 to-purple-50, from-rose-50 to-pink-50)",
  "palavrasChave": ["3 a 5 palavras-chave de busca que uma empresa autuada digitaria no Google"],
  "conteudo": "artigo em MARKDOWN, 700-1000 palavras, com títulos ## e listas com hífen. NÃO use aspas duplas dentro do texto (use aspas simples se precisar)."
}

REGRAS JURÍDICAS OBRIGATÓRIAS (críticas — erro aqui compromete a credibilidade do serviço):
- Base normativa correta: Lei 8.078/90 (Código de Defesa do Consumidor) e Decreto 2.181/97, com alterações do Decreto 10.887/2021.
- DISPOSITIVOS SEGUROS do Decreto 2.181/97, com o conteúdo exato de cada um (use apenas estes, e nunca troque os rótulos): art. 5º = competência dos órgãos para apurar e punir; arts. 24 a 28 = graduação da pena, atenuantes, agravantes, reincidência e fixação da multa; art. 26-A = as atenuantes e agravantes são taxativas; art. 28-A = vedação a valorar o mesmo elemento duas vezes na dosimetria; art. 33 = início do processo administrativo sancionador; art. 33-A = averiguação preliminar; art. 35, inciso I = REQUISITOS OBRIGATÓRIOS DO AUTO DE INFRAÇÃO (local, data e hora; qualificação do autuado; descrição do fato; dispositivo legal infringido; intimação; identificação, assinatura e matrícula do agente; designação do órgão julgador; assinatura do autuado; cientificação para defesa); art. 38-A = fiscalização orientadora e critério de DUPLA VISITA para atividade de risco leve, cuja inobservância implica nulidade do auto (§ 2º), e tratamento diferenciado a ME e EPP (§ 3º); art. 42 = notificação e prazo de defesa; art. 48 = a inobservância de forma só gera nulidade se houver prejuízo para a defesa; art. 49 = recurso em 10 dias, com efeito suspensivo em caso de multa; art. 55 = inscrição em dívida ativa se a multa não for recolhida em 30 dias.
- ATENÇÃO: o Decreto 10.887/2021 REVOGOU a notificação por edital do art. 42. Não escreva que o Procon pode notificar por edital com base na redação atual.
- CITAÇÃO OBRIGATÓRIA QUANDO APLICÁVEL: se o tema do artigo corresponder a um dos DISPOSITIVOS SEGUROS acima, você DEVE citar o número do artigo correspondente, usando exatamente o conteúdo descrito. Por exemplo: um artigo sobre dupla visita DEVE citar "art. 38-A"; um artigo sobre requisitos do auto DEVE citar "art. 35, inciso I"; um artigo sobre prazo de recurso DEVE citar "art. 49". Citar a lei aplicável é o que dá credibilidade ao serviço — não citar quando é possível é uma falha, não uma cautela.
- Fora da lista de DISPOSITIVOS SEGUROS, você SÓ pode citar número específico de artigo, decreto ou lei se tiver CERTEZA absoluta. Na dúvida quanto a um dispositivo que NÃO está na lista, use expressão geral: 'o Código de Defesa do Consumidor prevê', 'a legislação aplicável estabelece', 'as normas do processo administrativo determinam'.
- É melhor um texto sem número de artigo do que um texto com número errado — mas isso vale apenas para dispositivos fora da lista segura. Para os DISPOSITIVOS SEGUROS, a citação correta é sempre possível e sempre esperada.
- NUNCA afirme prazo específico de defesa em dias. O prazo varia por Procon: o Decreto federal 2.181/97 prevê 20 dias, mas Procons estaduais podem adotar prazo próprio (o Procon-SP adota 15 dias, com base na Lei Estadual 10.177/98). Sempre oriente o leitor a conferir o prazo indicado no próprio auto de infração.
- NÃO invente valores de multa em reais, jurisprudência, súmulas ou nomes de resoluções.
- NUNCA prometa resultado. É PROIBIDO escrever 'sua multa será anulada', 'você vai ganhar', 'garantimos'. Use linguagem de possibilidade: 'pode ser arguido em defesa', 'há fundamento para questionar', 'abre margem para discussão'.
- NÃO confunda o Procon com órgãos de trânsito. Este blog não trata de multas de trânsito, CTB, DETRAN, radar ou CNH em nenhuma hipótese.

REGRA DO CHAMADO FINAL (CTA):
- Termine com um parágrafo curto convidando a empresa a verificar o auto gratuitamente no CheckMulta.
- NUNCA escreva 'clique aqui', 'clique no botão' ou similares. O site já tem os botões próprios.
- Exemplo de tom adequado: 'No CheckMulta, você pode enviar o auto de infração do Procon e receber uma análise gratuita que aponta se a autuação apresenta vício formal.'

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
  const prompt = `Você é um revisor jurídico sênior especializado em Direito do Consumidor e processo administrativo sancionador. Abaixo está um artigo de blog dirigido a empresas autuadas pelo Procon. Revise e devolva a versão CORRIGIDA.

DISPOSITIVOS SEGUROS do Decreto 2.181/97, com o conteúdo exato de cada um (use apenas estes, e nunca troque os rótulos): art. 5º = competência dos órgãos para apurar e punir; arts. 24 a 28 = graduação da pena, atenuantes, agravantes, reincidência e fixação da multa; art. 26-A = as atenuantes e agravantes são taxativas; art. 28-A = vedação a valorar o mesmo elemento duas vezes na dosimetria; art. 33 = início do processo administrativo sancionador; art. 33-A = averiguação preliminar; art. 35, inciso I = REQUISITOS OBRIGATÓRIOS DO AUTO DE INFRAÇÃO (local, data e hora; qualificação do autuado; descrição do fato; dispositivo legal infringido; intimação; identificação, assinatura e matrícula do agente; designação do órgão julgador; assinatura do autuado; cientificação para defesa); art. 38-A = fiscalização orientadora e critério de DUPLA VISITA para atividade de risco leve, cuja inobservância implica nulidade do auto (§ 2º), e tratamento diferenciado a ME e EPP (§ 3º); art. 42 = notificação e prazo de defesa, sem edital (revogado pelo Decreto 10.887/2021); art. 48 = a inobservância de forma só gera nulidade se houver prejuízo para a defesa; art. 49 = recurso em 10 dias, com efeito suspensivo em caso de multa; art. 55 = inscrição em dívida ativa se a multa não for recolhida em 30 dias.

Faça o seguinte:
1. CITAÇÃO ONDE FALTA: se o artigo aborda um tema coberto por um dos DISPOSITIVOS SEGUROS acima mas ainda NÃO cita o número do artigo correspondente, INSIRA a citação correta no ponto do texto onde o tema é tratado, usando exatamente o conteúdo descrito. Não force uma citação em tema que não bate com nenhum dispositivo da lista — apenas complete onde o tema corresponde e a citação falta.
2. Verifique TODA citação de artigo, lei, decreto, prazo, valor em reais ou percentual já existente no texto. Se estiver errada OU se não corresponder a nenhum dos DISPOSITIVOS SEGUROS e você não tiver certeza absoluta, REMOVA o número específico e substitua por expressão geral ('a legislação prevê', 'o Código de Defesa do Consumidor estabelece', 'dentro do prazo indicado no auto'). Melhor genérico e correto do que específico e errado.
3. ATENÇÃO ESPECIAL AO PRAZO: se o texto afirmar um número específico de dias para defesa como se valesse para todos os Procons, corrija. O prazo varia: o Decreto federal 2.181/97 prevê 20 dias, mas Procons estaduais podem ter prazo próprio (Procon-SP adota 15 dias). O texto deve orientar a conferir o prazo no próprio auto.
4. Remova qualquer promessa de resultado ('será anulada', 'você vai ganhar', 'garantimos'). Substitua por linguagem de possibilidade.
5. Verifique se o texto não confundiu Procon com órgão de trânsito. Qualquer menção a CTB, DETRAN, radar, CNH, placa ou condutor está errada neste contexto e deve ser removida.
6. Remova qualquer 'clique aqui' ou 'clique no botão', reescrevendo de forma natural.
7. Mantenha o tom profissional e sóbrio, o tamanho, a estrutura em markdown (títulos ##, listas, negrito) e o sentido geral.
8. Preserve a linha separadora '---' e o aviso legal em itálico ao final. Se não existirem, acrescente.
9. NÃO use aspas duplas dentro do texto (use aspas simples se precisar).

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
  const marcador = "export const artigosProcon: ArtigoProcon[] = [";
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
      ? `Novo artigo Procon: ${titulos[0]}`
      : `Novos artigos Procon (${titulos.length})`;

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
  const nomeBranch = `artigos-procon-revisar-${Date.now()}`;

  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, "POST", {
    ref: `refs/heads/${nomeBranch}`,
    sha: baseSha,
  });

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: "Artigos Procon aguardando revisao manual",
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: nomeBranch,
    }
  );

  const pr = await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, "POST", {
    title: "ATENCAO: artigos Procon nao passaram na validacao",
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
  existentes: Set<string>,
  pautaForcada?: { categoria: string; tema: string }
): Promise<{ bloco: string; slug: string; titulo: string; pauta: { categoria: string; tema: string }; violacoesLegais: ViolacaoDefesa[] } | null> {
  const pauta = pautaForcada || PAUTAS[Math.floor(Math.random() * PAUTAS.length)];
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
  const violacoesLegais = validarArtigoBlog(String(artigo.conteudo), "procon", `${pauta.categoria} ${pauta.tema}`);
  if (violacoesLegais.length > 0) {
    console.log(`  Auditoria reprovou: ${violacoesLegais.map((v) => v.regra).join(", ")}`);
  }

  return { bloco: montarBloco(artigo, slug), slug, titulo: artigo.titulo, pauta, violacoesLegais };
}

// ============================================================
// Produz um artigo com retentativa: se a auditoria reprovar, tenta de novo
// antes de desistir. O modelo varia entre execuções mesmo com o mesmo
// prompt, então repetir o MESMO tema já resolve boa parte das reprovações.
// Se persistir, troca de tema — sinal de que o problema é o tema colidindo
// com alguma regra, não sorte de rodada. Máximo de 3 tentativas no total,
// para não estourar a cota diária do Gemini tentando emplacar um artigo só.
// ============================================================
async function produzirArtigoComRetentativas(existentes: Set<string>) {
  const MAX_TENTATIVAS = 3;
  let ultimoResultado: Awaited<ReturnType<typeof produzirArtigo>> = null;
  let pautaAnterior: { categoria: string; tema: string } | undefined;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const pautaForcada = tentativa === 2 ? pautaAnterior : undefined;
    const resultado = await produzirArtigo(existentes, pautaForcada);
    if (!resultado) continue;

    ultimoResultado = resultado;
    pautaAnterior = resultado.pauta;

    if (resultado.violacoesLegais.length === 0) {
      if (tentativa > 1) console.log(`  Aprovado na tentativa ${tentativa}.`);
      return resultado;
    }

    const proxima = tentativa === 1 ? "repetindo o mesmo tema" : tentativa === 2 ? "trocando de tema" : null;
    console.log(
      `  Tentativa ${tentativa} reprovada na auditoria.` +
        (proxima ? ` Tentando de novo (${proxima}).` : " Desistindo, vai para revisao manual.")
    );
    if (tentativa < MAX_TENTATIVAS) await esperar(4000);
  }

  return ultimoResultado;
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================
async function main() {
  console.log(`Agente Procon iniciado. Meta: ${ARTIGOS_POR_EXECUCAO} artigos.`);

  const { conteudo, sha } = await baixarArtigos();
  const existentes = slugsExistentes(conteudo);
  console.log(`Artigos Procon existentes: ${existentes.size}`);

  let conteudoAcumulado = conteudo;
  const titulosGerados: string[] = [];
  const violacoesTotais: { titulo: string; violacoes: ViolacaoDefesa[] }[] = [];

  for (let i = 1; i <= ARTIGOS_POR_EXECUCAO; i++) {
    console.log(`\n--- Artigo ${i} de ${ARTIGOS_POR_EXECUCAO} ---`);
    try {
      const resultado = await produzirArtigoComRetentativas(existentes);
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
  console.error("Agente Procon falhou:", err.message);
  process.exit(1);
});
