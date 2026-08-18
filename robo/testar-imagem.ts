/**
 * SCRIPT DE TESTE TEMPORÁRIO - gera algumas imagens de amostra usando
 * prompts/imagem.ts (caminho Cloudflare) e salva localmente, para eu ver
 * o estilo antes de ligar isso pra valer no robo.ts. Não comita nada,
 * não mexe na main.
 *
 * Apagar este arquivo (e o workflow _test-imagem-blog.yml) depois de
 * aprovado o estilo.
 */

import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";
import { gerarImagemArtigoCloudflare } from "../prompts/imagem";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_ACCOUNT_ID) throw new Error("CLOUDFLARE_ACCOUNT_ID não configurada.");
if (!CLOUDFLARE_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN não configurada.");

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
      const imagem = await gerarImagemArtigoCloudflare(
        { accountId: CLOUDFLARE_ACCOUNT_ID!, apiToken: CLOUDFLARE_API_TOKEN! },
        {
          tema: amostra.tema,
          categoria: amostra.categoria,
          vertical: "defesa administrativa de multas de trânsito no Brasil",
        }
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
