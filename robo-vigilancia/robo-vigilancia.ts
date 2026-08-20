/**
 * AGENTE DE ARTIGOS - CheckMulta VIGILÂNCIA SANITÁRIA
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions) e gera 1 artigo por execução.
 *
 * SEGURANÇA: antes de commitar, o arquivo montado é validado com esbuild.
 * - Se compilar     -> commit direto na main (site atualiza sozinho).
 * - Se NÃO compilar -> abre Pull Request e avisa no log. Nada vai pra main.
 * Assim o site nunca sai do ar por causa de um artigo malformado.
 *
 * Escreve em src/data/artigosVigilancia.ts (separado das outras verticais).
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { validarArtigoBlog, gerarComRetry, ajustarSeoBlog, type ViolacaoDefesa } from "../prompts/validador";
import {
  gerarDescricaoVisual,
  gerarImagemArtigoCloudflare,
  PERFIS_VERTICAIS,
} from "../prompts/imagem";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_ARTIGOS = "src/data/artigosVigilancia.ts";
// Perfil da vertical (rotulo, familia visual, pasta das imagens):
// definido em prompts/imagem.ts para o robo auditor enxergar o
// mesmo dado que este robo usa ao publicar.
const VERTICAL_CHAVE = "vigilancia";
const PERFIL = PERFIS_VERTICAIS[VERTICAL_CHAVE];
const PASTA_IMAGENS = PERFIL.pastaImagens;

// Quantos artigos gerar por execução
const ARTIGOS_POR_EXECUCAO = 1;

// Categorias reais do blog Vigilancia + temas que combinam com cada uma.
// Para adicionar pauta nova, basta acrescentar uma linha aqui.
const PAUTAS: { categoria: string; tema: string }[] = [
  // Primeiros Passos
  { categoria: "Primeiros Passos", tema: "quais documentos o estabelecimento deve reunir para se defender de um auto sanitário" },
  { categoria: "Primeiros Passos", tema: "por que não se deve pagar a multa sanitária antes de analisar o auto" },
  { categoria: "Primeiros Passos", tema: "como ler e interpretar um auto de infração da Vigilância Sanitária" },
  { categoria: "Primeiros Passos", tema: "o que fazer ao receber um termo de intimação da Vigilância Sanitária" },
  { categoria: "Primeiros Passos", tema: "como se preparar para uma inspeção da Vigilância Sanitária" },

  // Prazos e Procedimento
  { categoria: "Prazos e Procedimento", tema: "como contar o prazo de defesa a partir da intimação sanitária" },
  { categoria: "Prazos e Procedimento", tema: "o que acontece quando o estabelecimento perde o prazo de defesa" },
  { categoria: "Prazos e Procedimento", tema: "diferença entre defesa e recurso no processo administrativo sanitário" },
  { categoria: "Prazos e Procedimento", tema: "como funciona o protocolo da defesa administrativa sanitária" },
  { categoria: "Prazos e Procedimento", tema: "intimação irregular da Vigilância Sanitária e seus efeitos no prazo" },

  // Penalidades
  { categoria: "Penalidades", tema: "quais penalidades a Vigilância Sanitária pode aplicar além da multa" },
  { categoria: "Penalidades", tema: "diferença entre interdição cautelar e interdição como penalidade" },
  { categoria: "Penalidades", tema: "apreensão e inutilização de produtos pela Vigilância Sanitária" },
  { categoria: "Penalidades", tema: "cancelamento de licença sanitária e como reverter" },
  { categoria: "Penalidades", tema: "como pedir reinspeção após regularizar as condições apontadas" },

  // Falhas do Auto
  { categoria: "Falhas do Auto", tema: "descrição genérica da irregularidade no auto sanitário e por que isso é falha" },
  { categoria: "Falhas do Auto", tema: "ausência de indicação da norma violada no auto de infração sanitária" },
  { categoria: "Falhas do Auto", tema: "auto sanitário sem identificação do agente fiscalizador" },
  { categoria: "Falhas do Auto", tema: "interdição total desproporcional e o princípio da proporcionalidade" },
  { categoria: "Falhas do Auto", tema: "multa sanitária sem fundamentação dos critérios de dosimetria" },

  // Boas Práticas
  { categoria: "Boas Práticas", tema: "manual de boas práticas: o que o estabelecimento precisa manter" },
  { categoria: "Boas Práticas", tema: "controle de temperatura e registros que evitam autuação" },
  { categoria: "Boas Práticas", tema: "documentação sanitária que todo estabelecimento de alimentos deve ter em dia" },
  { categoria: "Boas Práticas", tema: "erros comuns que levam estabelecimentos a serem autuados" },
];

// ============================================================
// CHAVES (variáveis de ambiente - NÃO escreva aqui)
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
// Imagem de capa é opcional: se não estiver configurado, o robô segue
// gerando o artigo normalmente, só sem imagem (ver produzirArtigo).
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

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

// Reduz o PNG que o Gemini devolve (pode vir com vários MB) para um JPEG
// leve, do tamanho certo pra um banner de artigo.
async function comprimirImagem(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .resize({ width: 1280, height: 720, fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();
}

// Lições que o robô auditor aprendeu com imagens reprovadas DESTA
// vertical (ver robo-auditor/licoes.json). É assim que o erro que já
// aconteceu deixa de nascer de novo: em vez de gerar torto e depender do
// conserto depois, o gerador já entra sabendo o que evitar.
//
// Se não der pra ler o arquivo, segue sem lição nenhuma - isso é
// melhoria de qualidade, não requisito pra publicar.
async function licoesDaVertical(): Promise<string[]> {
  try {
    const data = await github(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/robo-auditor/licoes.json?ref=${GITHUB_BRANCH_BASE}`,
      "GET"
    );
    const licoes = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    return licoes[VERTICAL_CHAVE] || [];
  } catch {
    return [];
  }
}

// Comita um arquivo binário novo direto na main (mesma API de conteúdo
// usada para o artigosVigilancia.ts, só que sem "sha" - é sempre um
// arquivo novo, nome derivado do slug, que já foi conferido como inédito).
async function commitarImagem(caminho: string, bytes: Buffer, mensagem: string) {
  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${caminho}`, "PUT", {
    message: mensagem.slice(0, 240),
    content: bytes.toString("base64"),
    branch: GITHUB_BRANCH_BASE,
  });
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
// PASSO A: pega o artigosVigilancia.ts atual do GitHub
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
  const prompt = `Você é redator especializado em Direito Sanitário e processo administrativo, escrevendo para o blog do CheckMulta Vigilância Sanitária (serviço que analisa autos de infração da Vigilância Sanitária e gera defesas administrativas para estabelecimentos autuados).

Escreva UM artigo completo sobre: "${tema}".
Categoria: "${categoria}".
Ano atual: 2026.

PÚBLICO-ALVO: estabelecimentos autuados pela Vigilância Sanitária — restaurantes, padarias, mercados, farmácias, clínicas, salões de beleza. Não são advogados. São donos de negócio e responsáveis técnicos que receberam um auto de infração e não sabem o que fazer.

REGISTRO: profissional e sóbrio, sem informalidade. Explique conceitos técnicos em linguagem clara, mas sem infantilizar. Nada de gírias, exclamações ou tom publicitário.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois. Formato exato:
{
  "titulo": "titulo claro e especifico, no MAXIMO 60 caracteres contando espacos (o Google corta o que passa disso)",
  "descricao": "meta description de NO MAXIMO 155 caracteres contando espacos. Comece pela frase que responde a busca. NAO termine com convite generico do tipo 'analise gratis' ou 'verifique gratuitamente' — termine com este fecho exato: O prazo do seu municipio pode ser menor que 15 dias.",
  "tempoLeitura": "X min",
  "imagemEmoji": "um único emoji relacionado ao tema",
  "imagemBg": "gradiente Tailwind SUAVE no formato 'from-COR-50 to-COR-50' usando tons claros (ex: from-amber-50 to-orange-50, from-sky-50 to-blue-50, from-emerald-50 to-teal-50, from-violet-50 to-purple-50, from-rose-50 to-pink-50)",
  "palavrasChave": ["3 a 5 palavras-chave de busca que um estabelecimento autuado digitaria no Google"],
  "conteudo": "artigo em MARKDOWN, 700-1000 palavras, com títulos ## e listas com hífen. NÃO use aspas duplas dentro do texto (use aspas simples se precisar)."
}

REGRAS JURÍDICAS OBRIGATÓRIAS (críticas — erro aqui compromete a credibilidade do serviço):

CITAÇÃO DE NORMAS — LISTA FECHADA. Você SÓ pode citar número de artigo ou lei que esteja nesta lista:
1. Lei Federal nº 6.437/77 (infrações à legislação sanitária federal). Dispositivos seguros, com o conteúdo EXATO de cada um — nunca troque os rótulos:
   art. 2º = rol de penalidades; art. 3º = imputabilidade; art. 4º = classificação em leve, grave ou gravíssima; art. 6º = critérios de graduação da pena; art. 7º = circunstâncias atenuantes; art. 8º = circunstâncias agravantes; art. 10 = rol das infrações sanitárias; art. 13 = requisitos obrigatórios do auto de infração (incisos I a VII); art. 14 = competência para aplicar as penalidades; art. 17 = formas de notificação; art. 22 = prazo de defesa de 15 dias; art. 23, § 4º = interdição cautelar limitada a 90 dias; art. 30 = recurso; art. 33 = prazo de 30 dias para pagamento da multa; art. 38 = prescrição em 5 anos.
   ATENÇÃO: o art. 31 NÃO trata de prazo de defesa (trata do não cabimento de recurso na condenação definitiva de produto). O art. 33 NÃO trata de interdição. O art. 2º NÃO trata de competência.
2. Lei Federal nº 9.784/99 (processo administrativo). Dispositivos seguros: art. 2º e art. 50. SEMPRE escreva "aplicável subsidiariamente", porque esta lei rege o processo federal e sua aplicação a órgãos estaduais e municipais é subsidiária.
3. Princípios gerais, citados pelo nome e SEM número: legalidade, motivação, proporcionalidade, razoabilidade, contraditório, ampla defesa, devido processo legal.

VOCÊ ESTÁ PROIBIDO DE CITAR: códigos sanitários estaduais ou municipais por número, RDC ou Resolução da ANVISA por número, portarias, decretos, instruções normativas, súmulas ou jurisprudência. Se a norma não está nos itens 1 a 3, NÃO cite número — use apenas o nome do princípio ou expressão geral.

PRAZO — NUNCA afirme prazo específico de defesa em dias como se valesse para todos os órgãos. A legislação sanitária é FRAGMENTADA: a Lei 6.437/77 rege o âmbito federal, mas cada estado e cada município tem código sanitário próprio, com prazos que variam. Sempre oriente o leitor a conferir o prazo indicado no próprio auto de infração e, em caso de dúvida, junto ao órgão emissor.

OUTRAS REGRAS:
- NÃO invente valores de multa em reais.
- NUNCA prometa resultado. É PROIBIDO escrever 'o auto será anulado', 'você vai ganhar', 'garantimos'. Use linguagem de possibilidade: 'pode ser arguido em defesa', 'há fundamento para questionar'.
- NÃO confunda a Vigilância Sanitária com outros órgãos. Este blog não trata de Procon, CDC, multas de trânsito, CTB, DETRAN, Corpo de Bombeiros ou órgãos ambientais em nenhuma hipótese.
- SEGURANÇA: em temas que envolvam interdição, NUNCA sugira que o estabelecimento retome a operação antes da liberação oficial do órgão. Isso poderia causar dano à saúde pública e responsabilização do leitor. Oriente sempre a regularizar e requerer reinspeção.
- Quando o tema envolver correção de irregularidade, oriente a documentar a correção (registro fotográfico, notas fiscais, laudos), porque essa documentação é a base do pedido de reinspeção.

REGRA DO CHAMADO FINAL (CTA):
- Termine com um parágrafo curto convidando o estabelecimento a verificar o auto gratuitamente no CheckMulta.
- NUNCA escreva 'clique aqui', 'clique no botão' ou similares. O site já tem os botões próprios.
- Exemplo de tom adequado: 'No CheckMulta, você pode enviar o auto de infração da Vigilância Sanitária e receber uma análise gratuita que aponta se a autuação apresenta falha capaz de fundamentar recurso.'

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

  // Trava de codigo do SEO. O prompt acima ja pede titulo curto e o fecho
  // certo na descricao, mas prompt sozinho nao segura: o modelo varia entre
  // execucoes. Aqui a normalizacao e deterministica -- foi assim que o blog
  // acumulou 126 descricoes terminando na mesma frase generica.
  const seo = ajustarSeoBlog(String(obj.titulo || ""), String(obj.descricao || ""), "vigilancia");
  obj.titulo = seo.titulo;
  obj.descricao = seo.descricao;
  seo.avisos.forEach((a) => console.log(`  SEO: ${a}`));

  return obj;
}

// ============================================================
// PASSO B2: revisão jurídica — o modelo relê e corrige o artigo
// ============================================================
async function revisarArtigo(conteudo: string): Promise<string> {
  const prompt = `Você é um revisor jurídico sênior especializado em Direito Sanitário e processo administrativo. Abaixo está um artigo de blog dirigido a estabelecimentos autuados pela Vigilância Sanitária. Revise e devolva a versão CORRIGIDA.

Faça o seguinte:
1. CITAÇÃO DE NORMAS: verifique toda citação de artigo, lei ou norma. Só podem permanecer: Lei 6.437/77 (arts. 2º, 3º, 4º, 6º, 7º, 8º, 10, 13, 14, 17, 22, 23, 30, 33 e 38), Lei 9.784/99 (arts. 2º e 50, sempre com a ressalva 'aplicável subsidiariamente') e princípios gerais citados pelo nome sem número. REMOVA qualquer citação de código sanitário estadual ou municipal por número, RDC ou Resolução da ANVISA, portaria, decreto, súmula ou jurisprudência, substituindo por expressão geral.
1.1. CONFERÊNCIA DE RÓTULO — corrija se o texto atribuir a um artigo conteúdo que não é o dele. Os rótulos corretos são: art. 2º = rol de penalidades; art. 3º = imputabilidade; art. 4º = classificação leve/grave/gravíssima; art. 6º = graduação da pena; art. 7º = atenuantes; art. 8º = agravantes; art. 10 = rol de infrações; art. 13 = requisitos obrigatórios do auto de infração; art. 14 = competência; art. 17 = formas de notificação; art. 22 = prazo de defesa de 15 dias; art. 23, § 4º = interdição cautelar de no máximo 90 dias; art. 30 = recurso; art. 33 = prazo de 30 dias para pagar a multa; art. 38 = prescrição em 5 anos. Em especial: se o texto disser que o prazo de defesa está no art. 31, CORRIJA para art. 22. Se disser que o art. 33 trata de interdição, CORRIJA. Se disser que o art. 2º trata de competência, CORRIJA para art. 14.
2. PRAZO: se o texto afirmar número específico de dias para defesa como se valesse para todos os órgãos, corrija. A legislação sanitária varia entre União, estados e municípios. O texto deve orientar a conferir o prazo no próprio auto.
3. Remova qualquer promessa de resultado ('será anulado', 'você vai ganhar', 'garantimos'). Substitua por linguagem de possibilidade.
4. Verifique se o texto não confundiu a Vigilância Sanitária com outro órgão. Menção a Procon, CDC, CTB, DETRAN, radar, Corpo de Bombeiros ou órgão ambiental está errada neste contexto e deve ser removida.
5. SEGURANÇA: se o texto sugerir, em qualquer medida, que o estabelecimento retome a operação antes da liberação oficial em caso de interdição, REESCREVA. Essa orientação é perigosa e não pode constar.
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

  const linhaImagem = artigo.imagemUrl
    ? `    imagemUrl: "${String(artigo.imagemUrl).replace(/"/g, "'")}",\n`
    : "";

  return `  {
    slug: "${slug}",
    titulo: "${String(artigo.titulo).replace(/"/g, "'")}",
    descricao: "${String(artigo.descricao).replace(/"/g, "'")}",
    categoria: "${String(artigo.categoria).replace(/"/g, "'")}",
    tempoLeitura: "${String(artigo.tempoLeitura).replace(/"/g, "'")}",
    imagemEmoji: "${artigo.imagemEmoji}",
    imagemBg: "${String(artigo.imagemBg).replace(/"/g, "'")}",
${linhaImagem}    palavrasChave: [${palavras}],
    conteudo: \`${conteudoSeguro}\`,
  },
`;
}

// ============================================================
// PASSO D: insere o bloco logo após a abertura do array
// ============================================================
function inserirArtigo(conteudoArquivo: string, bloco: string): string {
  const marcador = "export const artigosVigilancia: ArtigoVigilancia[] = [";
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
      ? `Novo artigo Vigilancia: ${titulos[0]}`
      : `Novos artigos Vigilancia (${titulos.length})`;

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
  const nomeBranch = `artigos-vigilancia-revisar-${Date.now()}`;

  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, "POST", {
    ref: `refs/heads/${nomeBranch}`,
    sha: baseSha,
  });

  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: "Artigos Vigilancia aguardando revisao manual",
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: nomeBranch,
    }
  );

  const pr = await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, "POST", {
    title: "ATENCAO: artigos Vigilancia nao passaram na validacao",
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
  const violacoesLegais = validarArtigoBlog(String(artigo.conteudo), "vigilancia", pauta.tema);
  if (violacoesLegais.length > 0) {
    console.log(`  Auditoria reprovou: ${violacoesLegais.map((v) => v.regra).join(", ")}`);
  }

  // Imagem de capa é decorativa, não jurídica: só tenta se o texto já
  // passou na auditoria (senão o artigo nem vai pra main hoje), e se
  // falhar por qualquer motivo, o artigo segue sem imagem - nunca trava
  // a publicação por causa disto.
  if (violacoesLegais.length === 0 && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
    try {
      console.log("  Gerando imagem de capa...");
      const cena = await gerarDescricaoVisual(ai, {
        tema: pauta.tema,
        categoria: pauta.categoria,
        vertical: PERFIL.label,
        motivosVisuais: PERFIL.motivosVisuais,
        licoes: await licoesDaVertical(),
      });
      const imagem = await gerarImagemArtigoCloudflare(
        { accountId: CLOUDFLARE_ACCOUNT_ID, apiToken: CLOUDFLARE_API_TOKEN },
        cena
      );
      const comprimida = await comprimirImagem(imagem.bytes);
      const caminhoImagem = `${PASTA_IMAGENS}/${slug}.jpg`;
      await commitarImagem(caminhoImagem, comprimida, `Imagem do artigo: ${artigo.titulo}`);
      artigo.imagemUrl = `/${caminhoImagem.replace(/^public\//, "")}`;
      console.log(`  Imagem publicada: ${artigo.imagemUrl}`);
    } catch (err: any) {
      console.log(`  Nao foi possivel gerar/comitar a imagem (seguindo sem ela): ${err.message}`);
    }
  } else if (violacoesLegais.length === 0) {
    console.log("  Cloudflare nao configurado (CLOUDFLARE_ACCOUNT_ID/API_TOKEN) - seguindo sem imagem.");
  }

  return { bloco: montarBloco(artigo, slug), slug, titulo: artigo.titulo, violacoesLegais };
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================
async function main() {
  console.log(`Agente Vigilancia iniciado. Meta: ${ARTIGOS_POR_EXECUCAO} artigos.`);

  const { conteudo, sha } = await baixarArtigos();
  const existentes = slugsExistentes(conteudo);
  console.log(`Artigos Vigilancia existentes: ${existentes.size}`);

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
  console.error("Agente Vigilancia falhou:", err.message);
  process.exit(1);
});
