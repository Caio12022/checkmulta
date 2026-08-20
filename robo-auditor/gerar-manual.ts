/**
 * GERAÇÃO MANUAL DE IMAGEM DE CAPA
 * ------------------------------------------------------------
 * Coloca imagem em artigo que JÁ está publicado, sem esperar robô.
 *
 * Serve para dois casos:
 *   - testar/ajustar na hora, num artigo específico;
 *   - backfill: dar capa aos artigos antigos mais acessados, aos poucos.
 *
 * Dispare pelo workflow "Gerar imagem manual" (Actions), escolhendo:
 *   vertical  - transito | procon | vigilancia | energia | ibama
 *   slug      - o slug do artigo (vazio = pega os mais recentes SEM imagem)
 *   quantidade- quantos artigos processar quando o slug está vazio
 *
 * SEGURANÇA: usa o mesmo pipeline dos robôs (mesmo estilo, mesma família
 * visual, mesmas lições aprendidas) e AUDITA antes de publicar - se a
 * imagem sair ruim, ela não vai pro ar e o artigo continua como estava.
 * Isso é diferente do robô de artigo, que publica primeiro e conserta
 * depois: aqui o artigo já está no ar, então não vale piorar.
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { cotaDiariaEsgotada } from "../prompts/validador";
import {
  auditarImagem,
  gerarDescricaoVisual,
  gerarImagemArtigoCloudflare,
  imagemAprovada,
  PERFIS_VERTICAIS,
} from "../prompts/imagem";

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_LICOES = "robo-auditor/licoes.json";
const JANELA_CABECALHO = 1200;

// Quantas tentativas por artigo antes de desistir. A imagem só vai pro ar
// se passar na auditoria, então vale tentar mais de uma vez.
const TENTATIVAS_POR_ARTIGO = 2;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const VERTICAL = (process.env.VERTICAL || "").trim();
const SLUG = (process.env.SLUG || "").trim();
const QUANTIDADE = Math.max(1, Math.min(10, Number(process.env.QUANTIDADE || "1")));

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)
  throw new Error("Credenciais do Cloudflare não configuradas.");
if (!PERFIS_VERTICAIS[VERTICAL])
  throw new Error(
    `Vertical inválida: "${VERTICAL}". Use uma de: ${Object.keys(PERFIS_VERTICAIS).join(", ")}`
  );

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const PERFIL = PERFIS_VERTICAIS[VERTICAL];

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
  const caminhoTemp = join(tmpdir(), `validar-manual-${Date.now()}.ts`);
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
  slug: string;
  titulo: string;
  categoria: string;
}

/** Artigos SEM imagem, na ordem do arquivo (mais recentes primeiro). */
function artigosSemImagem(conteudoArquivo: string): Alvo[] {
  const encontrados: Alvo[] = [];
  const regexSlug = /slug:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = regexSlug.exec(conteudoArquivo)) !== null) {
    const janela = conteudoArquivo.slice(m.index, m.index + JANELA_CABECALHO);
    if (/imagemUrl:\s*"/.test(janela)) continue;
    const titulo = janela.match(/titulo:\s*"([^"]+)"/)?.[1];
    const categoria = janela.match(/categoria:\s*"([^"]+)"/)?.[1] || "";
    if (titulo) encontrados.push({ slug: m[1], titulo, categoria });
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

async function licoesDaVertical(): Promise<string[]> {
  try {
    const arquivo = await baixarArquivo(CAMINHO_LICOES);
    return JSON.parse(arquivo.conteudo)[VERTICAL] || [];
  } catch {
    return [];
  }
}

async function main() {
  console.log(`Geracao manual - vertical: ${VERTICAL}`);

  let arquivo = await baixarArquivo(PERFIL.caminhoArtigos);
  const licoes = await licoesDaVertical();
  if (licoes.length > 0) console.log(`Licoes em uso: ${licoes.length}`);

  let alvos: Alvo[];
  if (SLUG) {
    const semImagem = artigosSemImagem(arquivo.conteudo);
    const alvo = semImagem.find((a) => a.slug === SLUG);
    if (!alvo) {
      throw new Error(
        `Slug "${SLUG}" nao encontrado em ${VERTICAL}, ou o artigo ja tem imagem.`
      );
    }
    alvos = [alvo];
  } else {
    alvos = artigosSemImagem(arquivo.conteudo).slice(0, QUANTIDADE);
    console.log(`Sem slug informado: pegando os ${alvos.length} mais recentes sem imagem.`);
  }

  if (alvos.length === 0) {
    console.log("Nenhum artigo sem imagem nesta vertical. Nada a fazer.");
    return;
  }

  const publicados: string[] = [];

  for (const alvo of alvos) {
    console.log(`\n--- ${alvo.slug}`);
    console.log(`    Titulo: ${alvo.titulo}`);

    let aprovada: Buffer | null = null;

    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_ARTIGO; tentativa++) {
      try {
        const cena = await gerarDescricaoVisual(ai, {
          tema: alvo.titulo,
          categoria: alvo.categoria,
          vertical: PERFIL.label,
          motivosVisuais: PERFIL.motivosVisuais,
          licoes,
        });
        console.log(`    [${tentativa}] Cena: ${cena}`);

        const imagem = await gerarImagemArtigoCloudflare(
          { accountId: CLOUDFLARE_ACCOUNT_ID!, apiToken: CLOUDFLARE_API_TOKEN! },
          cena
        );
        const comprimida = await sharp(imagem.bytes)
          .resize({ width: 1280, height: 720, fit: "cover" })
          .jpeg({ quality: 82 })
          .toBuffer();

        // Artigo já publicado: só troca se a imagem prestar.
        const veredicto = await auditarImagem(
          ai,
          { bytes: comprimida, mimeType: "image/jpeg" },
          alvo.titulo
        );
        if (imagemAprovada(veredicto)) {
          console.log(`    [${tentativa}] APROVADA: ${veredicto.motivo}`);
          aprovada = comprimida;
          break;
        }
        console.log(`    [${tentativa}] reprovada: ${veredicto.motivo}`);
      } catch (err: any) {
        if (cotaDiariaEsgotada(err)) {
          console.error("    Cota diaria do Cloudflare esgotada - parando por aqui.");
          console.error(`    Publicadas antes de acabar: ${publicados.length}`);
          if (publicados.length > 0) publicados.forEach((p) => console.log(`      - ${p}`));
          process.exit(1);
        }
        console.error(`    [${tentativa}] falhou: ${err.message}`);
      }
    }

    if (!aprovada) {
      console.log("    Nenhuma tentativa passou na auditoria - artigo fica sem imagem.");
      continue;
    }

    const caminhoImagem = `${PERFIL.pastaImagens}/${alvo.slug}.jpg`;
    await commitarArquivo(caminhoImagem, aprovada, `Imagem manual: ${alvo.titulo}`);

    const novoConteudo = inserirImagemUrl(
      arquivo.conteudo,
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
      PERFIL.caminhoArtigos,
      novoConteudo,
      `Imagem manual: liga a capa em ${alvo.slug}`,
      arquivo.sha
    );
    // Recarrega para o próximo artigo não commitar com sha velho.
    arquivo = await baixarArquivo(PERFIL.caminhoArtigos);

    console.log(`    Publicada: /${caminhoImagem.replace(/^public\//, "")}`);
    publicados.push(alvo.slug);
  }

  console.log(`\nConcluido. ${publicados.length} imagem(ns) publicada(s).`);
  publicados.forEach((p) => console.log(`   - ${p}`));
}

main().catch((err) => {
  console.error("Geracao manual falhou:", err.message);
  process.exit(1);
});
