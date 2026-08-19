/**
 * SCRIPT DE TESTE TEMPORÁRIO - valida a geração de imagem nas 4
 * verticais novas (Procon, Vigilância, Energia, IBAMA), uma amostra
 * cada, antes de confiar no rollout. Não comita nada, não mexe na main.
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

const AMOSTRAS = [
  {
    nome: "procon",
    tema: "multa desproporcional do Procon e como questionar o valor",
    categoria: "Dosimetria da Multa",
    vertical: "defesa administrativa de autuações do Procon no Brasil (empresas autuadas)",
    motivosVisuais:
      "retail stores, shop counters, product shelves, invoices, cash registers, small business storefronts, office desks, customer service, consumer goods",
  },
  {
    nome: "vigilancia",
    tema: "auto de infração por armazenamento inadequado de alimentos",
    categoria: "Vícios Formais",
    vertical: "defesa administrativa de autuações de vigilância sanitária no Brasil (estabelecimentos autuados)",
    motivosVisuais:
      "commercial kitchens, restaurants, food storage, refrigerators, food packaging, hygiene, gloves, health inspection, restaurant counters",
  },
  {
    nome: "energia",
    tema: "aviso de irregularidade no medidor de energia e o que fazer",
    categoria: "Perícia e Contestação",
    vertical: "defesa administrativa de autuações de energia elétrica (TOI) no Brasil",
    motivosVisuais:
      "power lines, utility poles, electricity meters, electrical panels, substations, transformers, residential meter boxes, wiring, technicians",
  },
  {
    nome: "ibama",
    tema: "embargo de área por suposto desmatamento e como contestar",
    categoria: "Embargo e Interdição",
    vertical: "defesa administrativa de autuações do IBAMA no Brasil",
    motivosVisuais:
      "forests, rural land, dirt roads, rivers, tree stumps, cut logs, environmental agents, rural properties, nature, wildlife",
  },
];

async function main() {
  mkdirSync("preview", { recursive: true });

  for (const amostra of AMOSTRAS) {
    console.log(`Vertical: ${amostra.nome} - ${amostra.tema}`);
    try {
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
    } catch (err: any) {
      console.error(`  Falhou: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error("Script falhou:", err.message);
  process.exit(1);
});
