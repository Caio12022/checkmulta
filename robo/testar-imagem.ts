/**
 * SCRIPT DE TESTE TEMPORÁRIO - valida se, tirando a ação "abordagem" da
 * família visual, as cenas ficam mais específicas/variadas por categoria
 * em vez de sempre convergir pro mesmo clichê. Não comita nada, não mexe
 * na main.
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

const MOTIVOS_VISUAIS_TRANSITO =
  "roads, highways, parking lots, asphalt, streetlights, dashboards, car mirrors, garages, motorcycles, urban streets, night driving";

const AMOSTRAS = [
  {
    tema: "multa por estacionar em frente a garagem",
    categoria: "Estacionamento",
    vertical: "defesa administrativa de multas de trânsito no Brasil",
    motivosVisuais: MOTIVOS_VISUAIS_TRANSITO,
  },
  {
    tema: "como consultar os pontos da CNH pelo aplicativo",
    categoria: "CNH e Pontos",
    vertical: "defesa administrativa de multas de trânsito no Brasil",
    motivosVisuais: MOTIVOS_VISUAIS_TRANSITO,
  },
  {
    tema: "como emitir a segunda via do boleto da multa",
    categoria: "Pagamento",
    vertical: "defesa administrativa de multas de trânsito no Brasil",
    motivosVisuais: MOTIVOS_VISUAIS_TRANSITO,
  },
];

async function main() {
  mkdirSync("preview", { recursive: true });

  for (const [i, amostra] of AMOSTRAS.entries()) {
    console.log(`Amostra ${i + 1}/${AMOSTRAS.length}: ${amostra.tema}`);
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
      const caminho = `preview/amostra-${i + 1}.jpg`;
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
