/**
 * SCRIPT DE TESTE TEMPORÁRIO - reconfirma a correção do IBAMA (regra
 * trocada de "proibir objeto com texto" pra "exigir desfoque/ângulo" -
 * ver prompts/imagem.ts). Só 1 amostra, pra não estourar a cota diária
 * do Cloudflare de novo. Não comita nada, não mexe na main.
 *
 * Apagar este arquivo (e o workflow _test-imagem-blog.yml) depois de
 * aprovado.
 */

import { GoogleGenAI } from "@google/genai";
import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";
import { gerarDescricaoVisual, gerarImagemArtigoCloudflare } from "../prompts/imagem";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
if (!CLOUDFLARE_ACCOUNT_ID) throw new Error("CLOUDFLARE_ACCOUNT_ID não configurada.");
if (!CLOUDFLARE_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN não configurada.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const amostra = {
  nome: "ibama",
  tema: "embargo de área por suposto desmatamento e como contestar",
  categoria: "Embargo e Interdição",
  vertical: "defesa administrativa de autuações do IBAMA no Brasil",
  motivosVisuais:
    "forests, rural land, dirt roads, rivers, tree stumps, cut logs, environmental agents, rural properties, nature, wildlife",
};

async function main() {
  mkdirSync("preview", { recursive: true });

  console.log(`Vertical: ${amostra.nome} - ${amostra.tema}`);
  const cena = await gerarDescricaoVisual(ai, amostra);
  console.log(`  Cena: ${cena}`);
  const imagem = await gerarImagemArtigoCloudflare(
    { accountId: CLOUDFLARE_ACCOUNT_ID!, apiToken: CLOUDFLARE_API_TOKEN! },
    cena
  );
  const comprimida = await sharp(imagem.bytes)
    .resize({ width: 1280, height: 720, fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const caminho = `preview/${amostra.nome}.jpg`;
  writeFileSync(caminho, comprimida);
  console.log(`  OK: ${caminho} (${(comprimida.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error("Script falhou:", err.message);
  process.exit(1);
});
