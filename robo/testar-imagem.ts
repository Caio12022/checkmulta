/**
 * SCRIPT DE TESTE TEMPORÁRIO - gera algumas imagens de amostra usando
 * prompts/imagem.ts e salva localmente, para eu ver o estilo antes de
 * ligar isso pra valer no robo.ts. Não comita nada, não mexe na main.
 *
 * Apagar este arquivo (e o workflow _test-imagem-blog.yml) depois de
 * aprovado o estilo.
 */

import { GoogleGenAI } from "@google/genai";
import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";
import { gerarImagemArtigo } from "../prompts/imagem";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const AMOSTRAS = [
  { tema: "multa por estacionar em fila dupla", categoria: "Estacionamento" },
  { tema: "recurso de multa por excesso de velocidade em rodovia", categoria: "Velocidade" },
  { tema: "multa por não dar preferência em rotatória", categoria: "Comportamento no Trânsito" },
];

async function main() {
  mkdirSync("preview", { recursive: true });

  for (const [i, amostra] of AMOSTRAS.entries()) {
    console.log(`Amostra ${i + 1}/${AMOSTRAS.length}: ${amostra.tema}`);
    try {
      const imagem = await gerarImagemArtigo(ai, {
        tema: amostra.tema,
        categoria: amostra.categoria,
        vertical: "defesa administrativa de multas de trânsito no Brasil",
      });
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
