/**
 * ROBÔ AUDITOR DE IMAGEM - CheckMulta (todas as verticais)
 * ------------------------------------------------------------
 * Roda 1x por dia (GitHub Actions), depois dos robôs de artigo.
 *
 * POR QUE ELE EXISTE: a imagem de capa é gerada por um modelo rápido e
 * grátis (FLUX schnell), que às vezes erra - desenha uma cena que não
 * combina com o título, ou escreve texto quebrado bem visível (placa,
 * carimbo, faixa). Um humano olhando pegaria na hora; o robô que publica
 * o artigo não olha o que gerou. Este aqui olha.
 *
 * COMO ELE É BARATO: auditar usa o Gemini de TEXTO com entrada de imagem
 * (visão), que cai na cota grátis normal. Quem tem cota zero no tier
 * grátis é só GERAR imagem. Então dá pra reler todas as imagens todo dia
 * de graça, e gastar a cota do Cloudflare só nas poucas reprovadas.
 *
 * O QUE ELE FAZ com uma imagem reprovada:
 *   1. regenera (mesmo pipeline do robô de artigo, usando o TÍTULO como
 *      tema) e substitui o arquivo, mantendo o mesmo caminho;
 *   2. reaudita a nova. Se a nova também reprovar, remove o imagemUrl do
 *      artigo - a página cai no emoji, que é o visual antigo e sempre
 *      funciona. Melhor sem imagem do que com imagem ruim.
 *
 * SEGURANÇA: só mexe em imagem e no campo imagemUrl. Nunca toca no texto
 * do artigo. Antes de commitar qualquer .ts, valida com esbuild - se não
 * compilar, não commita (mesma trava dos outros robôs).
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import {
  auditarImagem,
  gerarDescricaoVisual,
  gerarImagemArtigoCloudflare,
  imagemAprovada,
  PERFIS_VERTICAIS,
  resumirLicao,
  type VeredictoImagem,
} from "../prompts/imagem";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const GITHUB_OWNER = "Caio12022";
const GITHUB_REPO = "checkmulta";
const GITHUB_BRANCH_BASE = "main";
const CAMINHO_ESTADO = "robo-auditor/auditadas.json";
// Lições que o auditor ensina de volta pro gerador (lidas pelos robôs
// de artigo antes de criar a cena da próxima imagem).
const CAMINHO_LICOES = "robo-auditor/licoes.json";
// Relatório legível: o que passou, o que não passou e por quê.
const CAMINHO_RELATORIO = "robo-auditor/RELATORIO.md";
// Quantas lições guardar por vertical (as mais recentes). Curto de
// propósito: prompt comprido demais perde eficácia.
const LICOES_POR_VERTICAL = 6;

// Quantas imagens auditar por execução. Auditar é grátis (visão), mas
// não faz sentido reler o acervo inteiro todo dia - as novas entram no
// topo da lista e as antigas já auditadas ficam registradas no estado.
const AUDITORIAS_POR_EXECUCAO = 12;

// Quantas imagens regenerar por execução. ESTE é o número que protege a
// cota do Cloudflare (10k neurons/dia, ~20-50 imagens). Os 5 robôs de
// artigo já gastam 5/dia; deixar 3 aqui mantém folga larga.
const REGENERACOES_POR_EXECUCAO = 3;

// Janela de busca dos campos do artigo a partir do slug. Os campos de
// cabeçalho (titulo, categoria, imagemUrl) vêm todos antes do conteudo,
// que é um markdown longo - então esta janela nunca alcança o artigo
// seguinte.
const JANELA_CABECALHO = 1200;

// ============================================================
// CHAVES (variáveis de ambiente - NÃO escreva aqui)
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN não configurado.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// TIPOS
// ============================================================

interface ArtigoComImagem {
  vertical: string;
  slug: string;
  titulo: string;
  categoria: string;
  /** caminho no repo, ex: public/blog/transito/slug.jpg */
  caminhoImagem: string;
}

type Resultado = "aprovada" | "substituida" | "removida";

interface RegistroAuditoria {
  resultado: Resultado;
  data: string;
  titulo: string;
  motivo: string;
}

type Estado = Record<string, RegistroAuditoria>;
type Licoes = Record<string, string[]>;

/**
 * Chave do estado: inclui a vertical de propósito.
 *
 * Cada robô só confere slug repetido DENTRO da própria vertical, então
 * nada impede Procon e Vigilância de gerarem o mesmo slug um dia (os
 * temas se parecem: "prazo de defesa", "documentos necessários"...).
 * Com a chave só no slug, um marcaria o outro como já auditado.
 */
function chaveEstado(artigo: { vertical: string; slug: string }): string {
  return `${artigo.vertical}/${artigo.slug}`;
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

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

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function baixarArquivo(caminho: string): Promise<{ conteudo: string; sha: string }> {
  const data = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${caminho}?ref=${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  return { conteudo: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
}

async function baixarImagem(caminho: string): Promise<{ bytes: Buffer; sha: string }> {
  const data = await github(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${caminho}?ref=${GITHUB_BRANCH_BASE}`,
    "GET"
  );
  return { bytes: Buffer.from(data.content, "base64"), sha: data.sha };
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

// Mesma trava dos outros robôs: se o .ts montado não compilar, não vai
// pra main.
function validarSintaxe(conteudo: string): { ok: boolean; erro?: string } {
  const caminhoTemp = join(tmpdir(), `validar-auditor-${Date.now()}.ts`);
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
// LEITURA DOS ARTIGOS
// ============================================================

/**
 * Extrai os artigos que TÊM imagem de um arquivo de dados.
 *
 * Lê por janela a partir de cada slug em vez de tentar fatiar o array em
 * blocos: o campo conteudo é um template literal com markdown, que pode
 * conter chaves e quebras de linha e quebraria um fatiamento ingênuo.
 */
function extrairArtigosComImagem(conteudoArquivo: string, vertical: string): ArtigoComImagem[] {
  const encontrados: ArtigoComImagem[] = [];
  const regexSlug = /slug:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;

  while ((m = regexSlug.exec(conteudoArquivo)) !== null) {
    const janela = conteudoArquivo.slice(m.index, m.index + JANELA_CABECALHO);
    const imagemUrl = janela.match(/imagemUrl:\s*"([^"]+)"/)?.[1];
    const titulo = janela.match(/titulo:\s*"([^"]+)"/)?.[1];
    const categoria = janela.match(/categoria:\s*"([^"]+)"/)?.[1];

    // Artigo antigo, sem imagem: não é trabalho do auditor.
    if (!imagemUrl || !titulo) continue;

    encontrados.push({
      vertical,
      slug: m[1],
      titulo,
      categoria: categoria || "",
      caminhoImagem: `public${imagemUrl}`,
    });
  }

  return encontrados;
}

/** Remove a linha imagemUrl de UM artigo, deixando o resto intacto. */
function removerImagemUrl(conteudoArquivo: string, slug: string): string | null {
  const pos = conteudoArquivo.indexOf(`slug: "${slug}"`);
  if (pos === -1) return null;

  const fim = pos + JANELA_CABECALHO;
  const janela = conteudoArquivo.slice(pos, fim);
  const janelaLimpa = janela.replace(/\n\s*imagemUrl:\s*"[^"]*",/, "");
  if (janelaLimpa === janela) return null;

  return conteudoArquivo.slice(0, pos) + janelaLimpa + conteudoArquivo.slice(fim);
}

// ============================================================
// REGENERAÇÃO
// ============================================================

async function regenerarImagem(artigo: ArtigoComImagem, licoes: string[]): Promise<Buffer> {
  const perfil = PERFIS_VERTICAIS[artigo.vertical];
  const cena = await gerarDescricaoVisual(ai, {
    // O título é o que o leitor vê ao lado da imagem, então é ele que
    // precisa combinar - não a pauta original que gerou o artigo.
    tema: artigo.titulo,
    categoria: artigo.categoria,
    vertical: perfil.label,
    motivosVisuais: perfil.motivosVisuais,
    // A regeneração já entra sabendo o que não deu certo antes.
    licoes,
  });
  console.log(`    Nova cena: ${cena}`);

  const imagem = await gerarImagemArtigoCloudflare(
    { accountId: CLOUDFLARE_ACCOUNT_ID!, apiToken: CLOUDFLARE_API_TOKEN! },
    cena
  );
  return sharp(imagem.bytes)
    .resize({ width: 1280, height: 720, fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  console.log(`Auditor de imagem iniciado (${hoje}).`);

  // 1. estado (quem já foi auditado) e lições (o que já deu errado)
  let estado: Estado = {};
  let shaEstado: string | undefined;
  try {
    const arquivo = await baixarArquivo(CAMINHO_ESTADO);
    estado = JSON.parse(arquivo.conteudo);
    shaEstado = arquivo.sha;
  } catch {
    console.log("Sem estado anterior - primeira execucao.");
  }

  let licoes: Licoes = {};
  let shaLicoes: string | undefined;
  try {
    const arquivo = await baixarArquivo(CAMINHO_LICOES);
    licoes = JSON.parse(arquivo.conteudo);
    shaLicoes = arquivo.sha;
  } catch {
    console.log("Sem licoes anteriores.");
  }
  let licoesMudaram = false;

  // 2. todos os artigos com imagem, de todas as verticais
  const arquivos = new Map<string, { conteudo: string; sha: string }>();
  let candidatos: ArtigoComImagem[] = [];

  for (const [vertical, perfil] of Object.entries(PERFIS_VERTICAIS)) {
    try {
      const arquivo = await baixarArquivo(perfil.caminhoArtigos);
      arquivos.set(vertical, arquivo);
      const comImagem = extrairArtigosComImagem(arquivo.conteudo, vertical);
      candidatos = candidatos.concat(comImagem);
      console.log(`${vertical}: ${comImagem.length} artigo(s) com imagem.`);
    } catch (err: any) {
      console.error(`${vertical}: nao consegui ler os artigos (${err.message}). Pulando.`);
    }
  }

  // 3. fila: só quem ainda não foi auditado (os novos ficam no topo do
  //    arquivo, então a ordem natural já prioriza o que acabou de sair)
  const fila = candidatos.filter((a) => !estado[chaveEstado(a)]).slice(0, AUDITORIAS_POR_EXECUCAO);

  if (fila.length === 0) {
    console.log("Nada novo para auditar. Encerrando.");
    return;
  }
  console.log(`\n${fila.length} imagem(ns) na fila de auditoria.`);

  const podeRegenerar = Boolean(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN);
  if (!podeRegenerar) {
    console.log("Cloudflare nao configurado - vou auditar e so reportar, sem regenerar.");
  }

  let regeneracoesUsadas = 0;
  const resumo: string[] = [];

  for (const artigo of fila) {
    console.log(`\n--- ${artigo.vertical}/${artigo.slug}`);
    console.log(`    Titulo: ${artigo.titulo}`);

    try {
      const { bytes, sha } = await baixarImagem(artigo.caminhoImagem);
      const veredicto: VeredictoImagem = await auditarImagem(
        ai,
        { bytes, mimeType: "image/jpeg" },
        artigo.titulo
      );

      if (imagemAprovada(veredicto)) {
        console.log(`    APROVADA: ${veredicto.motivo}`);
        estado[chaveEstado(artigo)] = {
          resultado: "aprovada",
          data: hoje,
          titulo: artigo.titulo,
          motivo: veredicto.motivo,
        };
        continue;
      }

      console.log(
        `    REPROVADA (relacionada=${veredicto.relacionada}, textoQuebrado=${veredicto.textoQuebrado}): ${veredicto.motivo}`
      );

      // Vira lição pro gerador, mesmo que não dê pra regenerar agora:
      // é o que impede o mesmo erro de nascer de novo amanhã.
      try {
        const licao = await resumirLicao(ai, veredicto.motivo, artigo.titulo);
        const daVertical = licoes[artigo.vertical] || [];
        if (licao && !daVertical.includes(licao)) {
          licoes[artigo.vertical] = [...daVertical, licao].slice(-LICOES_POR_VERTICAL);
          licoesMudaram = true;
          console.log(`    Licao aprendida: ${licao}`);
        }
      } catch (err: any) {
        console.log(`    (nao consegui extrair licao: ${err.message})`);
      }

      // Sem orçamento de regeneração: deixa como está e NÃO registra no
      // estado, pra tentar de novo amanhã com cota nova.
      if (!podeRegenerar || regeneracoesUsadas >= REGENERACOES_POR_EXECUCAO) {
        console.log("    Sem orcamento de regeneracao nesta execucao - fica para a proxima.");
        continue;
      }

      regeneracoesUsadas++;
      console.log(`    Regenerando (${regeneracoesUsadas}/${REGENERACOES_POR_EXECUCAO})...`);
      const nova = await regenerarImagem(artigo, licoes[artigo.vertical] || []);

      const veredictoNovo = await auditarImagem(
        ai,
        { bytes: nova, mimeType: "image/jpeg" },
        artigo.titulo
      );

      if (imagemAprovada(veredictoNovo)) {
        await commitarArquivo(
          artigo.caminhoImagem,
          nova,
          `Auditoria de imagem: substitui capa de ${artigo.slug}`,
          sha
        );
        console.log(`    SUBSTITUIDA: ${veredictoNovo.motivo}`);
        estado[chaveEstado(artigo)] = {
          resultado: "substituida",
          data: hoje,
          titulo: artigo.titulo,
          motivo: `${veredicto.motivo} -> ${veredictoNovo.motivo}`,
        };
        resumo.push(`substituida: ${artigo.vertical}/${artigo.slug}`);
        continue;
      }

      // Segunda tentativa também ruim: melhor sem imagem do que com
      // imagem ruim. Tira o imagemUrl e a página volta pro emoji.
      console.log(`    Nova tambem reprovou (${veredictoNovo.motivo}). Removendo a imagem do artigo.`);
      const arquivo = arquivos.get(artigo.vertical);
      if (!arquivo) throw new Error("arquivo da vertical nao carregado");

      const novoConteudo = removerImagemUrl(arquivo.conteudo, artigo.slug);
      if (!novoConteudo) throw new Error("nao encontrei a linha imagemUrl para remover");

      const validacao = validarSintaxe(novoConteudo);
      if (!validacao.ok) {
        throw new Error(`arquivo nao compila apos remocao: ${validacao.erro}`);
      }

      const perfil = PERFIS_VERTICAIS[artigo.vertical];
      await commitarArquivo(
        perfil.caminhoArtigos,
        novoConteudo,
        `Auditoria de imagem: remove capa reprovada de ${artigo.slug}`,
        arquivo.sha
      );
      // O arquivo mudou na main: atualiza o cache local para o próximo
      // artigo da mesma vertical não commitar por cima com sha velho.
      const atualizado = await baixarArquivo(perfil.caminhoArtigos);
      arquivos.set(artigo.vertical, atualizado);

      estado[chaveEstado(artigo)] = {
        resultado: "removida",
        data: hoje,
        titulo: artigo.titulo,
        motivo: `${veredicto.motivo} | regenerada tambem reprovou: ${veredictoNovo.motivo}`,
      };
      resumo.push(`removida: ${artigo.vertical}/${artigo.slug}`);
    } catch (err: any) {
      // Falha em UMA imagem não pode derrubar a auditoria das outras.
      console.error(`    Falhou: ${err.message}`);
    }

    await esperar(2000);
  }

  // 4. grava o estado
  const conteudoEstado = JSON.stringify(estado, null, 2) + "\n";
  await commitarArquivo(
    CAMINHO_ESTADO,
    conteudoEstado,
    `Auditoria de imagem: ${fila.length} verificada(s), ${resumo.length} corrigida(s)`,
    shaEstado
  );

  // 5. grava as lições, se alguma nova apareceu
  if (licoesMudaram) {
    await commitarArquivo(
      CAMINHO_LICOES,
      JSON.stringify(licoes, null, 2) + "\n",
      "Auditoria de imagem: novas licoes para o gerador",
      shaLicoes
    );
  }

  // 6. relatório legível (é onde dá pra ver o que passou e o que não)
  try {
    const anterior = await baixarArquivo(CAMINHO_RELATORIO).catch(() => null);
    await commitarArquivo(
      CAMINHO_RELATORIO,
      montarRelatorio(estado, licoes, hoje),
      "Auditoria de imagem: atualiza relatorio",
      anterior?.sha
    );
  } catch (err: any) {
    console.error(`Nao consegui gravar o relatorio: ${err.message}`);
  }

  console.log(`\nAuditoria concluida. ${fila.length} verificada(s).`);
  if (resumo.length > 0) {
    resumo.forEach((l) => console.log(`   - ${l}`));
  } else {
    console.log("   Nenhuma correcao necessaria.");
  }
}

/**
 * Relatório em markdown, pra dar pra olhar no GitHub pelo celular e
 * entender o que a auditoria está aprovando e reprovando - sem precisar
 * abrir log de Actions nem ler JSON cru.
 */
function montarRelatorio(estado: Estado, licoes: Licoes, hoje: string): string {
  const registros = Object.entries(estado);
  const conta = (r: Resultado) => registros.filter(([, v]) => v.resultado === r).length;

  const linhas: string[] = [
    "# Auditoria de imagem do blog",
    "",
    `Gerado automaticamente pelo robô auditor. Última execução: **${hoje}**.`,
    "",
    "## Resumo",
    "",
    `- Imagens verificadas: **${registros.length}**`,
    `- Aprovadas de primeira: **${conta("aprovada")}**`,
    `- Substituídas (a primeira era ruim, a nova passou): **${conta("substituida")}**`,
    `- Removidas (duas tentativas ruins - artigo ficou sem capa): **${conta("removida")}**`,
    "",
  ];

  const licoesVerticais = Object.entries(licoes).filter(([, l]) => l.length > 0);
  if (licoesVerticais.length > 0) {
    linhas.push(
      "## O que o gerador já aprendeu",
      "",
      "Erros que se repetiram viraram regra: o gerador de imagem recebe estas",
      "instruções antes de criar a próxima cena, então não erra de novo do",
      "mesmo jeito.",
      ""
    );
    for (const [vertical, lista] of licoesVerticais) {
      linhas.push(`**${vertical}**`, "");
      lista.forEach((l) => linhas.push(`- ${l}`));
      linhas.push("");
    }
  }

  // Só os que precisaram de conserto: é o que interessa olhar.
  const problemas = registros.filter(([, v]) => v.resultado !== "aprovada");
  if (problemas.length > 0) {
    linhas.push(
      "## Imagens que precisaram de conserto",
      "",
      "| artigo | o que aconteceu | motivo |",
      "| --- | --- | --- |"
    );
    for (const [chave, v] of problemas.slice(-30).reverse()) {
      const motivo = v.motivo.replace(/\|/g, "/").slice(0, 160);
      linhas.push(`| \`${chave}\` | ${v.resultado} | ${motivo} |`);
    }
    linhas.push("");
  }

  const aprovadas = registros.filter(([, v]) => v.resultado === "aprovada");
  if (aprovadas.length > 0) {
    linhas.push(
      "## Últimas aprovadas",
      "",
      "| artigo | leitura do auditor |",
      "| --- | --- |"
    );
    for (const [chave, v] of aprovadas.slice(-15).reverse()) {
      const motivo = v.motivo.replace(/\|/g, "/").slice(0, 160);
      linhas.push(`| \`${chave}\` | ${motivo} |`);
    }
    linhas.push("");
  }

  return linhas.join("\n");
}

main().catch((err) => {
  console.error("Auditor falhou:", err.message);
  process.exit(1);
});
