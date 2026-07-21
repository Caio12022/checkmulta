/**
 * AGENTE DE ARTIGOS - CheckMulta
 * ------------------------------------------------------------
 * Roda 1x por dia (Cron Job na Render).
 * Fluxo: Gemini gera artigo -> valida slug -> valida sintaxe -> abre Pull Request no GitHub.
 * Nunca commita direto na main. Nunca reescreve os artigos existentes.
 * Se algo falhar, ele para e avisa no log. O site nunca é afetado.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================
// CONFIGURAÇÃO - você pode ajustar estas listas quando quiser
// ============================================================

// Repositório
const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_ARTIGOS = "src/data/artigos.ts";

// Cada item liga uma categoria REAL do site a temas que combinam com ela.
// O agente sorteia uma dupla (categoria + tema) desta lista.
const PAUTAS: { categoria: string; tema: string }[] = [
  // Velocidade
  { categoria: "Velocidade", tema: "recurso de multa por excesso de velocidade em rodovia" },
  { categoria: "Velocidade", tema: "margem de tolerância dos radares e como ela afeta a multa" },
  { categoria: "Velocidade", tema: "multa de radar em dia de chuva ou pista molhada" },
  // Comportamento no Trânsito
  { categoria: "Comportamento no Trânsito", tema: "multa por parar sobre a faixa de pedestres" },
  { categoria: "Comportamento no Trânsito", tema: "multa por não dar preferência em rotatória" },
  { categoria: "Comportamento no Trânsito", tema: "multa por trafegar na faixa da esquerda sem ultrapassar" },
  // Estacionamento
  { categoria: "Estacionamento", tema: "multa por estacionar em fila dupla" },
  { categoria: "Estacionamento", tema: "multa por estacionar em frente a garagem" },
  // Equipamentos
  { categoria: "Equipamentos", tema: "multa por triângulo ou extintor vencido ou ausente" },
  { categoria: "Equipamentos", tema: "multa por farol com lâmpada queimada" },
  // CNH e Pontos
  { categoria: "CNH e Pontos", tema: "como consultar os pontos da CNH pelo aplicativo" },
  { categoria: "CNH e Pontos", tema: "o que acontece quando a CNH está próxima do limite de pontos" },
  // Dúvidas Frequentes
  { categoria: "Dúvidas Frequentes", tema: "diferença entre notificação de autuação e de penalidade" },
  { categoria: "Dúvidas Frequentes", tema: "posso dirigir com a multa em recurso" },
  // Processo de Recurso
  { categoria: "Processo de Recurso", tema: "como acompanhar o andamento de um recurso de multa" },
  { categoria: "Processo de Recurso", tema: "o que fazer quando o recurso é indeferido sem justificativa clara" },
  // Motocicletas
  { categoria: "Motocicletas", tema: "multa por escapamento de moto modificado" },
  // Pagamento
  { categoria: "Pagamento", tema: "como emitir a segunda via do boleto da multa" },
  // Jurídico
  { categoria: "Jurídico", tema: "o que é o princípio da presunção de legitimidade do auto de infração" },
];

// ============================================================
// CHAVES (vêm das variáveis de ambiente da Render - NÃO escreva aqui)
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Dentro do GitHub Actions, o próprio GitHub injeta um GITHUB_TOKEN automático.
// Fora dele, usa o token pessoal (GH_PAT) se existir.
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Cria slug: minúsculo, sem acento, espaços viram hífen (igual ao padrão do site)
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

// Chamada à API do GitHub
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

// ============================================================
// PASSO A: pega o arquivo artigos.ts atual do GitHub
// ============================================================
async function baixarArtigos(): Promise<{ conteudo: string; sha: string }> {
  const data = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}?ref=${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  const conteudo = Buffer.from(data.content, "base64").toString("utf-8");
  return { conteudo, sha: data.sha };
}

// Extrai os slugs que já existem (pra não repetir)
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
  const prompt = `Você é redator especialista em Direito de Trânsito brasileiro, escrevendo para o blog do CheckMulta (site que analisa multas e gera defesas).

Escreva UM artigo completo sobre: "${tema}".
Categoria: "${categoria}".
Ano atual: 2026.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois. Formato exato:
{
  "titulo": "título chamativo, até 60 caracteres",
  "descricao": "meta description de 140-160 caracteres, informativa e terminando com uma chamada para analisar a multa grátis",
  "tempoLeitura": "X min",
  "imagemEmoji": "um único emoji relacionado",
  "imagemBg": "um gradiente Tailwind no formato 'from-COR-600 to-COR-800' (ex: from-blue-600 to-blue-800)",
  "palavrasChave": ["3 a 5 palavras-chave de busca"],
  "conteudo": "artigo em MARKDOWN, 600-900 palavras, com títulos ## , listas, negrito. Use linguagem clara. NÃO use aspas duplas dentro do texto (use aspas simples se precisar). Termine com uma seção convidando a analisar a multa grátis no CheckMulta."
}

Regras do conteúdo: seja preciso juridicamente, cite o CTB quando fizer sentido, não invente números de artigos. O texto deve ser útil e original.`;

  const resp = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  let texto = resp.text?.trim() || "";
  // remove crases de markdown se o modelo colocar
  texto = texto.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  const obj = JSON.parse(texto);
  return obj;
}

// ============================================================
// PASSO C: monta o bloco de código TypeScript do artigo novo
// ============================================================
function montarBloco(artigo: any, slug: string): string {
  // escapa crases e ${ dentro do conteúdo (é template string)
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
    conteudo: \`${conteudoSeguro}\`,
    palavrasChave: [${palavras}],
  },
`;
}

// ============================================================
// PASSO D: insere o bloco logo após "export const artigos: Artigo[] = ["
// (cirúrgico: não toca nos artigos existentes)
// ============================================================
function inserirArtigo(conteudoArquivo: string, bloco: string): string {
  const marcador = "export const artigos: Artigo[] = [";
  const pos = conteudoArquivo.indexOf(marcador);
  if (pos === -1) throw new Error("Marcador de início do array não encontrado no arquivo.");
  const insercao = pos + marcador.length;
  return (
    conteudoArquivo.slice(0, insercao) +
    "\n" +
    bloco +
    conteudoArquivo.slice(insercao)
  );
}

// ============================================================
// PASSO E: cria branch + arquivo novo + Pull Request
// ============================================================
async function abrirPR(slug: string, novoConteudo: string, sha: string, titulo: string) {
  // pega o SHA do topo da main
  const ref = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  const baseSha = ref.object.sha;

  const nomeBranch = `artigo-${slug}-${Date.now()}`;

  // cria a branch nova
  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, "POST", {
    ref: `refs/heads/${nomeBranch}`,
    sha: baseSha,
  });

  // atualiza o arquivo na branch nova
  await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CAMINHO_ARTIGOS}`,
    "PUT",
    {
      message: `Novo artigo: ${titulo}`,
      content: Buffer.from(novoConteudo, "utf-8").toString("base64"),
      sha,
      branch: nomeBranch,
    }
  );

  // abre o Pull Request
  const pr = await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, "POST", {
    title: `Novo artigo: ${titulo}`,
    head: nomeBranch,
    base: GITHUB_BRANCH_BASE,
    body: `Artigo gerado automaticamente pelo agente.\n\nSlug: \`${slug}\`\n\nRevise e faça merge se estiver bom.`,
  });

  return pr.html_url;
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================
async function main() {
  console.log("Agente iniciado.");

  // 1. baixa o arquivo atual
  const { conteudo, sha } = await baixarArtigos();
  const existentes = slugsExistentes(conteudo);
  console.log(`Artigos existentes: ${existentes.size}`);

  // 2. escolhe uma pauta (categoria + tema) aleatória
  const pauta = PAUTAS[Math.floor(Math.random() * PAUTAS.length)];
  const tema = pauta.tema;
  const categoria = pauta.categoria;
  console.log(`Tema: ${tema} | Categoria: ${categoria}`);

  // 3. tenta gerar um artigo com slug inédito (até 3 tentativas)
  let artigo: any = null;
  let slug = "";
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    artigo = await gerarArtigo(tema, categoria);
    artigo.categoria = categoria; // garante categoria válida
    slug = slugify(artigo.titulo);
    if (slug && !existentes.has(slug)) break;
    console.log(`Tentativa ${tentativa}: slug repetido ou vazio (${slug}). Tentando de novo.`);
    slug = "";
  }
  if (!slug) throw new Error("Não consegui gerar um slug inédito em 3 tentativas.");

  // 4. valida campos essenciais
  for (const campo of ["titulo", "descricao", "conteudo", "imagemBg", "imagemEmoji"]) {
    if (!artigo[campo] || String(artigo[campo]).trim() === "") {
      throw new Error(`Campo obrigatório vazio: ${campo}`);
    }
  }

  // 5. monta o bloco e insere
  const bloco = montarBloco(artigo, slug);
  const novoConteudo = inserirArtigo(conteudo, bloco);

  // 6. abre o Pull Request
  const url = await abrirPR(slug, novoConteudo, sha, artigo.titulo);
  console.log(`✅ Pull Request criado com sucesso: ${url}`);
}

main().catch((err) => {
  console.error("❌ Agente falhou:", err.message);
  process.exit(1);
});
