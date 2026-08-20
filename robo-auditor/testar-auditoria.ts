/**
 * BATERIA DO AUDITOR DE IMAGEM.
 *
 * Confere as duas coisas que o auditor promete detectar, usando imagens
 * reais já geradas (guardadas em fixtures/) e ZERO cota do Cloudflare -
 * só chamadas de visão, que são grátis.
 *
 * Casos:
 *   1. imagem ruim + título certo  -> tem que REPROVAR (texto quebrado)
 *   2. imagem boa  + título certo  -> tem que APROVAR
 *   3. imagem boa  + título de OUTRO assunto -> tem que REPROVAR
 *      (esse é o caso que prova que a checagem de correlação funciona,
 *      e não que o modelo só aprova tudo que não tem texto)
 *
 * RODAR SEMPRE que mexer no prompt de auditoria (auditarImagem, em
 * prompts/imagem.ts). O defeito que esta bateria pegou na primeira
 * execução foi calibragem: o auditor reprovava imagem boa por causa de
 * letreiro de loja ao fundo. Auditor rígido demais é caro - ele
 * regenera imagem boa e, se a segunda também reprovar, apaga uma capa
 * que estava ok.
 *
 * Dispare pelo workflow "Teste do auditor de imagem" (Actions).
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { auditarImagem, imagemAprovada } from "../prompts/imagem";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const TITULO_IBAMA = "Embargo de área por suposto desmatamento: como contestar";
const TITULO_PROCON = "Multa desproporcional do Procon: como questionar o valor";

const CASOS = [
  {
    nome: "imagem ruim (placa EMBARGOO) + titulo do IBAMA",
    arquivo: "fixtures/ruim-ibama.jpg",
    titulo: TITULO_IBAMA,
    esperado: false,
    porque: "tem placa grande e nitida com texto errado",
  },
  {
    nome: "imagem boa (loja com papelada) + titulo do Procon",
    arquivo: "fixtures/boa-procon.jpg",
    titulo: TITULO_PROCON,
    esperado: true,
    porque: "combina com o titulo e nao tem texto em destaque",
  },
  {
    nome: "imagem boa do Procon + titulo do IBAMA (cruzado)",
    arquivo: "fixtures/boa-procon.jpg",
    titulo: TITULO_IBAMA,
    esperado: false,
    porque: "loja nao tem nada a ver com desmatamento",
  },
];

async function main() {
  let falhas = 0;

  for (const caso of CASOS) {
    console.log(`\n--- ${caso.nome}`);
    console.log(`    Titulo: ${caso.titulo}`);
    const bytes = readFileSync(caso.arquivo);

    const veredicto = await auditarImagem(ai, { bytes, mimeType: "image/jpeg" }, caso.titulo);
    const aprovada = imagemAprovada(veredicto);

    console.log(
      `    Veredicto: relacionada=${veredicto.relacionada} textoQuebrado=${veredicto.textoQuebrado}`
    );
    console.log(`    Motivo: ${veredicto.motivo}`);

    if (aprovada === caso.esperado) {
      console.log(`    OK (esperava ${caso.esperado ? "aprovar" : "reprovar"}: ${caso.porque})`);
    } else {
      console.log(
        `    FALHOU: esperava ${caso.esperado ? "APROVAR" : "REPROVAR"} (${caso.porque}), veio ${aprovada ? "aprovada" : "reprovada"}`
      );
      falhas++;
    }
  }

  console.log(falhas === 0 ? "\nTODOS OS CASOS PASSARAM" : `\n${falhas} CASO(S) FALHARAM`);
  if (falhas > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Teste falhou:", err.message);
  process.exit(1);
});
