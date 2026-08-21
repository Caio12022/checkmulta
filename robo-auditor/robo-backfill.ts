/**
 * ROBÔ DE BACKFILL DE IMAGEM
 * ------------------------------------------------------------
 * Dá capa aos artigos antigos que ainda não têm imagem, aos poucos e sem
 * intervenção manual. Roda 1x por dia (cron), sorteando artigos SEM
 * imagem entre as 5 verticais - não é ordem de criação nem "os mais
 * acessados primeiro", é aleatório de propósito: sem isso, o backfill
 * andaria sempre pela mesma ponta do arquivo (os mais antigos de uma só
 * vertical) e demoraria muito pra cobrir o resto.
 *
 * Meta diária: QUANTIDADE_PADRAO artigos (config abaixo). Ver CLAUDE.md,
 * seção "Cota do Cloudflare para imagem", para a conta completa de por que
 * o número é esse - resumo: cada artigo aqui pode custar ATÉ 2 chamadas
 * (TENTATIVAS_POR_ARTIGO), não 1, e esse robô roda por último no dia (21h)
 * de propósito - se ele bater na cota, não atrapalha nada prioritário, o
 * artigo só volta pro sorteio de amanhã.
 *
 * SEGURANÇA: mesmo princípio do gerar-manual.ts - artigo já publicado não
 * pode piorar, então a imagem só vai pro ar se passar na auditoria
 * (gerarEAuditarCapa, compartilhada com o gerador manual). Se nenhuma
 * tentativa passar, o artigo simplesmente continua sem imagem e entra de
 * novo no sorteio de outro dia.
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { cotaDiariaEsgotada } from "../prompts/validador";
import { gerarEAuditarCapa, PERFIS_VERTICAIS } from "../prompts/imagem";

const comprimir = (bytes: Buffer) =>
  sharp(bytes).resize({ width: 1280, height: 720, fit: "cover" }).jpeg({ quality: 82 }).toBuffer();

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_LICOES = "robo-auditor/licoes.json";
const JANELA_CABECALHO = 1200;

// Quantas tentativas por artigo antes de desistir dele (mesma regra do
// gerar-manual.ts: publicado precisa aprovar, não só publicar).
const TENTATIVAS_POR_ARTIGO = 2;

// Meta diária. Caio pediu pra acelerar depois de ver a cota real (~14-18/dia)
// - subiu de 4 pra 6, não mais que isso: com até 2 tentativas por artigo,
// 6 já é até 12 chamadas no pior caso, some com o resto do dia (ver
// CLAUDE.md) e chega perto do teto. Ajustável via workflow_dispatch sem
// mexer no código, e para revisar depois de alguns dias de dado real.
const QUANTIDADE_PADRAO = 6;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const QUANTIDADE = Math.max(1, Math.min(10, Number(process.env.QUANTIDADE || QUANTIDADE_PADRAO)));

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)
  throw new Error("Credenciais do Cloudflare não configuradas.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

async function baixarArquivo(caminho: string): Promise<{ conteudo: string; sha: string }> {
  const data = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${caminho}?ref=${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  return { conteudo: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
}

async function commitarArquivo(
  caminho: string,
  conteudo: Buffer | string,
  mensagem: string,
  sha?: string
) {
  const bytes = typeof conteudo === "string" ? Buffer.from(conteudo, "utf-8") : conteudo;
  await github(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${caminho}`, "PUT", {
    message: mensagem.slice(0, 240),
    content: bytes.toString("base64"),
    branch: GITHUB_BRANCH_BASE,
    ...(sha ? { sha } : {}),
  });
}

function validarSintaxe(conteudo: string): { ok: boolean; erro?: string } {
  const caminhoTemp = join(tmpdir(), `validar-backfill-${Date.now()}.ts`);
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

interface Alvo {
  vertical: string;
  slug: string;
  titulo: string;
  categoria: string;
}

/** Artigos SEM imagem numa vertical, na ordem do arquivo. */
function artigosSemImagem(conteudoArquivo: string, vertical: string): Alvo[] {
  const encontrados: Alvo[] = [];
  const regexSlug = /slug:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = regexSlug.exec(conteudoArquivo)) !== null) {
    const janela = conteudoArquivo.slice(m.index, m.index + JANELA_CABECALHO);
    if (/imagemUrl:\s*"/.test(janela)) continue;
    const titulo = janela.match(/titulo:\s*"([^"]+)"/)?.[1];
    const categoria = janela.match(/categoria:\s*"([^"]+)"/)?.[1] || "";
    if (titulo) encontrados.push({ vertical, slug: m[1], titulo, categoria });
  }
  return encontrados;
}

/** Insere a linha imagemUrl logo depois do slug do artigo. */
function inserirImagemUrl(conteudoArquivo: string, slug: string, url: string): string | null {
  const marcador = `slug: "${slug}",\n`;
  const pos = conteudoArquivo.indexOf(marcador);
  if (pos === -1) return null;
  const janela = conteudoArquivo.slice(pos, pos + JANELA_CABECALHO);
  if (/imagemUrl:\s*"/.test(janela)) return null; // já tem imagem
  const insercao = pos + marcador.length;
  return (
    conteudoArquivo.slice(0, insercao) +
    `    imagemUrl: "${url}",\n` +
    conteudoArquivo.slice(insercao)
  );
}

/** Sorteio simples (Fisher-Yates), pra não sempre pegar sempre a mesma ponta do array. */
function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function main() {
  console.log(`Backfill de imagem - meta: ${QUANTIDADE} artigo(s).`);

  let licoesPorVertical: Record<string, string[]> = {};
  try {
    const arquivoLicoes = await baixarArquivo(CAMINHO_LICOES);
    licoesPorVertical = JSON.parse(arquivoLicoes.conteudo);
  } catch {
    console.log("Sem licoes anteriores.");
  }

  // Cache por vertical: conteúdo + sha do arquivo de artigos, recarregado
  // depois de cada commit pra não subir com sha velho.
  const arquivos: Record<string, { conteudo: string; sha: string }> = {};
  const verticais = Object.keys(PERFIS_VERTICAIS);

  const pool: Alvo[] = [];
  for (const vertical of verticais) {
    const perfil = PERFIS_VERTICAIS[vertical];
    const arquivo = await baixarArquivo(perfil.caminhoArtigos);
    arquivos[vertical] = arquivo;
    const semImagem = artigosSemImagem(arquivo.conteudo, vertical);
    console.log(`${vertical}: ${semImagem.length} artigo(s) sem imagem.`);
    pool.push(...semImagem);
  }

  if (pool.length === 0) {
    console.log("\nTodos os artigos já têm imagem. Nada a fazer.");
    return;
  }

  const alvos = embaralhar(pool).slice(0, QUANTIDADE);
  console.log(`\n${alvos.length} artigo(s) sorteado(s) de um total de ${pool.length} sem imagem.`);

  const publicados: string[] = [];
  const semAprovacao: string[] = [];
  let cotaAcabou = false;

  for (const alvo of alvos) {
    console.log(`\n--- ${alvo.vertical}/${alvo.slug}`);
    console.log(`    Titulo: ${alvo.titulo}`);

    const perfil = PERFIS_VERTICAIS[alvo.vertical];
    const licoes = licoesPorVertical[alvo.vertical] || [];

    let resultado: Awaited<ReturnType<typeof gerarEAuditarCapa>>;
    try {
      resultado = await gerarEAuditarCapa(
        ai,
        { accountId: CLOUDFLARE_ACCOUNT_ID!, apiToken: CLOUDFLARE_API_TOKEN! },
        {
          tema: alvo.titulo,
          categoria: alvo.categoria,
          vertical: perfil.label,
          motivosVisuais: perfil.motivosVisuais,
          licoes,
        },
        alvo.titulo,
        TENTATIVAS_POR_ARTIGO,
        comprimir
      );
    } catch (err: any) {
      if (cotaDiariaEsgotada(err)) {
        console.error("    Cota diaria do Cloudflare esgotada - parando por aqui.");
        cotaAcabou = true;
        break;
      }
      console.error(`    Falhou: ${err.message}`);
      continue;
    }

    if (!resultado.aprovada) {
      console.log("    Nenhuma tentativa passou na auditoria - artigo fica sem imagem por hoje.");
      semAprovacao.push(`${alvo.vertical}/${alvo.slug}`);
      continue;
    }

    const caminhoImagem = `${perfil.pastaImagens}/${alvo.slug}.jpg`;
    await commitarArquivo(caminhoImagem, resultado.aprovada, `Backfill de imagem: ${alvo.titulo}`);

    const arquivoAtual = arquivos[alvo.vertical];
    const novoConteudo = inserirImagemUrl(
      arquivoAtual.conteudo,
      alvo.slug,
      `/${caminhoImagem.replace(/^public\//, "")}`
    );
    if (!novoConteudo) {
      console.error("    Nao consegui inserir o imagemUrl - imagem ficou orfa.");
      continue;
    }

    const validacao = validarSintaxe(novoConteudo);
    if (!validacao.ok) {
      console.error(`    Arquivo nao compila apos a insercao: ${validacao.erro}`);
      continue;
    }

    await commitarArquivo(
      perfil.caminhoArtigos,
      novoConteudo,
      `Backfill de imagem: liga a capa em ${alvo.slug}`,
      arquivoAtual.sha
    );
    // Recarrega essa vertical para o próximo artigo dela não commitar com sha velho.
    arquivos[alvo.vertical] = await baixarArquivo(perfil.caminhoArtigos);

    console.log(`    Publicada: /${caminhoImagem.replace(/^public\//, "")}`);
    publicados.push(`${alvo.vertical}/${alvo.slug}`);
  }

  console.log(`\nConcluido. ${publicados.length} imagem(ns) publicada(s).`);
  publicados.forEach((p) => console.log(`   - ${p}`));
  if (semAprovacao.length > 0) {
    console.log(`${semAprovacao.length} nao aprovada(s) na auditoria (voltam pro sorteio depois):`);
    semAprovacao.forEach((p) => console.log(`   - ${p}`));
  }
  if (cotaAcabou) {
    console.log("Parou por cota - o resto do sorteio de hoje fica pro proximo dia.");
  }
}

main().catch((err) => {
  console.error("Backfill falhou:", err.message);
  process.exit(1);
});
