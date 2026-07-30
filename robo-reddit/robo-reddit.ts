/**
 * ROBÔ MONITOR DE BACKLINKS - CheckMulta (REDDIT)
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions).
 *
 * O QUE ELE FAZ (sozinho):
 *  1. Busca no Reddit posts recentes com termos sobre multa/recurso.
 *  2. Filtra por relevância (post é pergunta, é recente, não é do próprio autor).
 *  3. Cruza cada post com os artigos do blog (src/data/artigos.ts) por palavra-chave.
 *  4. Gera um rascunho de resposta com Gemini para o post + artigo escolhido.
 *  5. Abre um ISSUE no GitHub com a lista pronta.
 *
 * O QUE ELE **NÃO** FAZ:
 *  - NUNCA posta resposta no Reddit. Postar automático = spam = blacklist do domínio.
 *  - O Caio responde manualmente, pela conta pessoal, usando o rascunho como base.
 *
 * SEGREDOS NECESSÁRIOS (GitHub → Settings → Secrets and variables → Actions):
 *  - REDDIT_CLIENT_ID
 *  - REDDIT_CLIENT_SECRET
 *  - REDDIT_USERNAME       (ex: Check_Multa)
 *  - REDDIT_PASSWORD       (senha da conta do Reddit)
 *  - GEMINI_API_KEY        (a mesma que os outros robôs usam)
 *  - GITHUB_TOKEN          (injetado automaticamente pelo Actions)
 * ------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const SUBREDDITS = [
  "brasil",
  "carros",
  "uber",
  "conselhosdedinheiro",
  "direito",
  "saopaulo",
];

const TERMOS = [
  "recorrer multa",
  "recurso de multa",
  "auto de infração",
  "multa injusta",
  "defesa prévia",
  "NIC multa",
  "notificação de multa",
];

// Só considera posts dos últimos N dias (evita responder coisa velha)
const MAX_IDADE_DIAS = 7;

// Quantos resultados no máximo por termo (evita estourar cota)
const LIMITE_POR_TERMO = 10;

// Caminho do arquivo de artigos (relativo à raiz do repositório)
const CAMINHO_ARTIGOS = path.join("src", "data", "artigos.ts");

const SITE = "https://checkmulta.com.br";

// ============================================================
// TIPOS
// ============================================================

interface Artigo {
  slug: string;
  titulo: string;
  descricao: string;
  palavrasChave: string[];
}

interface PostReddit {
  id: string;
  titulo: string;
  texto: string;
  url: string;
  subreddit: string;
  autor: string;
  criadoEm: number; // epoch segundos
  numComentarios: number;
}

interface Oportunidade {
  post: PostReddit;
  artigo: Artigo;
  pontuacao: number;
  rascunho: string;
}

// ============================================================
// UTILIDADES
// ============================================================

function log(msg: string): void {
  const agora = new Date().toISOString();
  console.log(`[${agora}] ${msg}`);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// LEITURA DOS ARTIGOS (parse do artigos.ts)
// ============================================================

/**
 * Lê src/data/artigos.ts e extrai slug, titulo, descricao e palavrasChave.
 * Não importa o arquivo (é .ts e tem markdown pesado); faz parse por regex
 * simples campo a campo, que é suficiente para o cruzamento.
 */
function lerArtigos(): Artigo[] {
  if (!fs.existsSync(CAMINHO_ARTIGOS)) {
    log(`ERRO: arquivo de artigos não encontrado em ${CAMINHO_ARTIGOS}`);
    return [];
  }

  const conteudo = fs.readFileSync(CAMINHO_ARTIGOS, "utf-8");
  const artigos: Artigo[] = [];

  // Divide em blocos por "slug:" — cada artigo começa com um slug.
  const blocos = conteudo.split(/slug\s*:/);

  for (let i = 1; i < blocos.length; i++) {
    const bloco = "slug:" + blocos[i];

    const slug = extrairString(bloco, "slug");
    const titulo = extrairString(bloco, "titulo");
    const descricao = extrairString(bloco, "descricao");
    const palavras = extrairArray(bloco, "palavrasChave");

    if (slug && titulo) {
      artigos.push({
        slug,
        titulo,
        descricao: descricao || "",
        palavrasChave: palavras,
      });
    }
  }

  return artigos;
}

function extrairString(bloco: string, campo: string): string | null {
  // Casa: campo: "valor"  OU  campo: 'valor'
  const re = new RegExp(campo + '\\s*:\\s*(["\'])((?:\\\\.|(?!\\1).)*)\\1');
  const m = bloco.match(re);
  if (!m) return null;
  return m[2].replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
}

function extrairArray(bloco: string, campo: string): string[] {
  // Casa: campo: [ ... ]
  const re = new RegExp(campo + "\\s*:\\s*\\[([^\\]]*)\\]");
  const m = bloco.match(re);
  if (!m) return [];
  const dentro = m[1];
  const itens: string[] = [];
  const reItem = /(["'])((?:\\.|(?!\1).)*)\1/g;
  let it: RegExpExecArray | null;
  while ((it = reItem.exec(dentro)) !== null) {
    itens.push(it[2].trim());
  }
  return itens;
}

// ============================================================
// AUTENTICAÇÃO E BUSCA NO REDDIT
// ============================================================

async function obterTokenReddit(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID || "";
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || "";
  const username = process.env.REDDIT_USERNAME || "";
  const password = process.env.REDDIT_PASSWORD || "";

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error(
      "Credenciais do Reddit faltando. Configure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME e REDDIT_PASSWORD nos Secrets."
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `checkmulta-monitor/1.0 by ${username}`,
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Falha ao autenticar no Reddit (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Reddit não retornou access_token.");
  }
  return data.access_token;
}

async function buscarNoReddit(
  token: string,
  username: string,
  termo: string,
  subreddit: string
): Promise<PostReddit[]> {
  const q = encodeURIComponent(termo);
  const url =
    `https://oauth.reddit.com/r/${subreddit}/search` +
    `?q=${q}&restrict_sr=1&sort=new&limit=${LIMITE_POR_TERMO}&t=month`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": `checkmulta-monitor/1.0 by ${username}`,
    },
  });

  if (!resp.ok) {
    log(`  aviso: busca falhou em r/${subreddit} "${termo}" (${resp.status})`);
    return [];
  }

  const data = (await resp.json()) as any;
  const children = (data?.data?.children || []) as any[];

  const posts: PostReddit[] = [];
  for (const c of children) {
    const d = c?.data;
    if (!d) continue;
    posts.push({
      id: d.id,
      titulo: d.title || "",
      texto: d.selftext || "",
      url: `https://www.reddit.com${d.permalink}`,
      subreddit: d.subreddit,
      autor: d.author || "",
      criadoEm: d.created_utc || 0,
      numComentarios: d.num_comments || 0,
    });
  }
  return posts;
}

// ============================================================
// FILTRO E CRUZAMENTO
// ============================================================

function postRecente(post: PostReddit): boolean {
  const agoraSeg = Date.now() / 1000;
  const idadeDias = (agoraSeg - post.criadoEm) / 86400;
  return idadeDias <= MAX_IDADE_DIAS;
}

function pareceDuvida(post: PostReddit): boolean {
  const t = normalizar(post.titulo + " " + post.texto);
  // Sinais de que a pessoa está perguntando algo
  const sinais = [
    "como",
    "posso",
    "vale a pena",
    "alguem",
    "duvida",
    "ajuda",
    "recorrer",
    "recurso",
    "o que fazer",
    "consigo",
    "tem como",
    "?",
  ];
  return sinais.some((s) => t.includes(s)) || post.titulo.includes("?");
}

/**
 * Escolhe o artigo mais relevante para um post, por sobreposição de
 * palavras-chave / termos do título. Retorna null se nada bater bem.
 */
function melhorArtigo(
  post: PostReddit,
  artigos: Artigo[]
): { artigo: Artigo; pontuacao: number } | null {
  const textoPost = normalizar(post.titulo + " " + post.texto);
  const palavrasPost = new Set(textoPost.split(" ").filter((w) => w.length > 3));

  let melhor: Artigo | null = null;
  let melhorPontos = 0;

  for (const art of artigos) {
    let pontos = 0;

    // Palavras-chave do artigo que aparecem no post valem mais.
    for (const pc of art.palavrasChave) {
      const pcn = normalizar(pc);
      if (pcn && textoPost.includes(pcn)) {
        pontos += 3;
      }
    }

    // Palavras do título do artigo que aparecem no post.
    const palavrasTitulo = normalizar(art.titulo)
      .split(" ")
      .filter((w) => w.length > 3);
    for (const w of palavrasTitulo) {
      if (palavrasPost.has(w)) {
        pontos += 1;
      }
    }

    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      melhor = art;
    }
  }

  if (!melhor || melhorPontos < 3) return null;
  return { artigo: melhor, pontuacao: melhorPontos };
}

// ============================================================
// GERAÇÃO DO RASCUNHO (GEMINI)
// ============================================================

async function gerarRascunho(
  post: PostReddit,
  artigo: Artigo
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return "(rascunho indisponível — GEMINI_API_KEY não configurada)";
  }

  const linkArtigo = `${SITE}/blog/${artigo.slug}`;

  const prompt = `Você está ajudando a redigir uma RESPOSTA para um post do Reddit brasileiro.
A resposta será postada MANUALMENTE por uma pessoa real (não é um bot).

REGRAS OBRIGATÓRIAS:
- Registro profissional, educado e prestativo. Nada de gíria ou emoji.
- Responda de forma ÚTIL e concreta à dúvida da pessoa PRIMEIRO. Entregue valor real.
- Cite a legislação brasileira aplicável quando fizer sentido (ex.: CTB), sem inventar números de artigo.
- Só mencione o CheckMulta ao final, de forma natural e discreta, como recurso adicional — nunca como propaganda agressiva.
- Inclua o link do artigo UMA vez, de forma orgânica: ${linkArtigo}
- Máximo 3 parágrafos curtos. Escreva em português do Brasil.
- NÃO use "clique aqui". Convide naturalmente (ex.: "há um guia detalhado sobre isso em...").

POST DO REDDIT:
Título: ${post.titulo}
Texto: ${post.texto || "(sem corpo, só o título)"}

ARTIGO DO BLOG QUE RESPONDE A ISSO:
Título: ${artigo.titulo}
Descrição: ${artigo.descricao}
Link: ${linkArtigo}

Escreva APENAS o texto da resposta, pronto para a pessoa revisar e postar.`;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" +
    apiKey;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      log(`  aviso: Gemini falhou (${resp.status}): ${txt.slice(0, 200)}`);
      return "(rascunho indisponível — erro na geração)";
    }

    const data = (await resp.json()) as any;
    const texto =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "(rascunho vazio)";
    return texto.trim();
  } catch (e: any) {
    log(`  aviso: exceção ao gerar rascunho: ${e?.message || e}`);
    return "(rascunho indisponível — exceção na geração)";
  }
}

// ============================================================
// MONTAGEM DO ISSUE (MARKDOWN)
// ============================================================

function montarCorpoIssue(oportunidades: Oportunidade[]): string {
  const data = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (oportunidades.length === 0) {
    return (
      `## Monitor de backlinks — ${data}\n\n` +
      `Nenhuma oportunidade relevante encontrada hoje no Reddit.\n\n` +
      `Isso é normal em dias sem posts novos sobre multas. O robô volta a buscar amanhã.`
    );
  }

  let corpo =
    `## Monitor de backlinks — ${data}\n\n` +
    `**${oportunidades.length}** oportunidade(s) encontrada(s) no Reddit.\n\n` +
    `> Responda **manualmente**, pela sua conta. Use o rascunho como base, mas ajuste com suas palavras. ` +
    `Entregue valor primeiro, link depois. Nunca poste em massa — 1 resposta boa por vez.\n\n` +
    `---\n\n`;

  oportunidades.forEach((op, i) => {
    corpo +=
      `### ${i + 1}. r/${op.post.subreddit} — ${op.post.titulo}\n\n` +
      `- **Pergunta:** ${op.post.url}\n` +
      `- **Artigo que responde:** [${op.artigo.titulo}](${SITE}/blog/${op.artigo.slug})\n` +
      `- **Comentários no post:** ${op.post.numComentarios}\n\n` +
      `**Rascunho de resposta (revise antes de postar):**\n\n` +
      `> ${op.rascunho.replace(/\n/g, "\n> ")}\n\n` +
      `- [ ] Respondido\n\n` +
      `---\n\n`;
  });

  return corpo;
}

async function abrirIssue(titulo: string, corpo: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "Caio12022/checkmulta";

  if (!token) {
    log("AVISO: GITHUB_TOKEN não disponível. Imprimindo issue no log:");
    console.log("\n===== ISSUE =====\n" + corpo + "\n=================\n");
    return;
  }

  const resp = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "checkmulta-monitor",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: titulo,
      body: corpo,
      labels: ["backlinks", "reddit"],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Falha ao abrir issue (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;
  log(`Issue aberta: ${data.html_url}`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  log("Iniciando robô monitor de backlinks (Reddit)...");

  const artigos = lerArtigos();
  log(`Artigos carregados: ${artigos.length}`);
  if (artigos.length === 0) {
    log("Nenhum artigo carregado. Abortando.");
    return;
  }

  const username = process.env.REDDIT_USERNAME || "";
  const token = await obterTokenReddit();
  log("Autenticado no Reddit com sucesso.");

  // Coleta posts, deduplicando por id.
  const vistos = new Set<string>();
  const postsUnicos: PostReddit[] = [];

  for (const sub of SUBREDDITS) {
    for (const termo of TERMOS) {
      const posts = await buscarNoReddit(token, username, termo, sub);
      for (const p of posts) {
        if (vistos.has(p.id)) continue;
        vistos.add(p.id);
        postsUnicos.push(p);
      }
      // Pequena pausa pra respeitar o rate limit do Reddit.
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  log(`Posts únicos coletados: ${postsUnicos.length}`);

  // Filtra e cruza.
  const oportunidades: Oportunidade[] = [];

  for (const post of postsUnicos) {
    if (!postRecente(post)) continue;
    if (!pareceDuvida(post)) continue;

    const match = melhorArtigo(post, artigos);
    if (!match) continue;

    const rascunho = await gerarRascunho(post, match.artigo);
    oportunidades.push({
      post,
      artigo: match.artigo,
      pontuacao: match.pontuacao,
      rascunho,
    });

    // Pausa entre chamadas ao Gemini.
    await new Promise((r) => setTimeout(r, 500));
  }

  // Ordena por relevância (maior pontuação primeiro) e limita a 10 por dia.
  oportunidades.sort((a, b) => b.pontuacao - a.pontuacao);
  const top = oportunidades.slice(0, 10);

  log(`Oportunidades relevantes: ${top.length}`);

  const dataTitulo = new Date().toLocaleDateString("pt-BR");
  const titulo =
    top.length > 0
      ? `[Backlinks] ${top.length} oportunidade(s) no Reddit — ${dataTitulo}`
      : `[Backlinks] Nenhuma oportunidade hoje — ${dataTitulo}`;

  const corpo = montarCorpoIssue(top);
  await abrirIssue(titulo, corpo);

  log("Concluído.");
}

main().catch((e) => {
  log(`ERRO FATAL: ${e?.message || e}`);
  process.exit(1);
});
