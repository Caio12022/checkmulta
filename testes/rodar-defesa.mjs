/**
 * EXECUTOR DA BATERIA DE DEFESA
 * -----------------------------
 * A bateria de análise cobre `/api/analyze-*`, que é a parte gratuita. Esta
 * cobre `/api/generate-defense-*`, que é a parte PAGA — a peça que a pessoa
 * imprime, protocola e eventualmente mostra a um advogado.
 *
 * Por que existe separada: a entrada não é um documento, é a ANÁLISE já
 * auditada. Isso muda o teste de lugar. O documento é dado do usuário e passa
 * por desconfiança; a análise é saída nossa, e o prompt de defesa a trata como
 * entrada confiável. Se sobrar texto plantado dentro de um achado fraco, ele
 * chega à etapa paga sem nenhum filtro pelo caminho.
 *
 * As asserções não são escritas aqui: usam validarDefesa() de
 * prompts/validador.ts, a MESMA função que o servidor pode usar como trava.
 * Regra duplicada em duas camadas foi o defeito que mais se repetiu neste
 * projeto, e um teste que reimplementa a regra envelhece separado dela.
 *
 * Uso:
 *   node testes/rodar-defesa.mjs             -> todas as verticais com defesa/
 *   node testes/rodar-defesa.mjs ibama       -> só a indicada
 *
 * Requer o servidor no ar e `npm run build` feito (a função validada vem de
 * dist/validador.cjs).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PAUSA_MS = Number(process.env.PAUSA_MS || 4000);
const REPETICOES = Math.max(1, Number(process.env.REPETICOES || 1));

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* O validador é TypeScript e o servidor o consome compilado. Aqui usamos o
   mesmo bundle que o build gera, em vez de reescrever as regras em JS. */
const require = createRequire(import.meta.url);
const CAMINHO_VALIDADOR = join(RAIZ, "dist", "validador.cjs");
if (!existsSync(CAMINHO_VALIDADOR)) {
  console.error(`Falta ${CAMINHO_VALIDADOR}. Rode "npm run build" antes da bateria.`);
  process.exit(1);
}
const { validarDefesa } = require(CAMINHO_VALIDADOR);

function verticaisComDefesa() {
  return readdirSync(AQUI, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(AQUI, d.name, "defesa", "casos.json")))
    .map((d) => d.name);
}

async function gerarDefesa(rota, entrada, campoEntrada) {
  const resposta = await fetch(`${BASE_URL}${rota}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [campoEntrada || "analise"]: entrada }),
  });
  const corpo = await resposta.json().catch(() => ({}));
  return { status: resposta.status, corpo };
}

/**
 * Confere a peça gerada. Devolve lista de divergências; vazia = aprovado.
 */
function conferir(espera, corpo, status, vertical, entrada) {
  const problemas = [];

  if (status !== 200) {
    problemas.push(`HTTP ${status}: ${JSON.stringify(corpo).slice(0, 160)}`);
    return problemas;
  }

  const peca = corpo.result;
  if (typeof peca !== "string" || peca.trim().length === 0) {
    problemas.push("a rota não devolveu texto de peça");
    return problemas;
  }

  /* Peça curta demais não é peça. Sem este piso, uma resposta como "não é
     possível gerar a defesa" passaria em todas as outras asserções, que são
     todas de ausência — e o caso ficaria verde sem produto nenhum. */
  if (typeof espera.tamanho_min === "number" && peca.length < espera.tamanho_min) {
    problemas.push(
      `peça curta demais: ${peca.length} caracteres, mínimo esperado ${espera.tamanho_min}`
    );
  }

  if (espera.sem_violacao) {
    for (const v of validarDefesa(peca, vertical, entrada)) {
      problemas.push(`${v.regra}: ${v.detalhe}`);
      if (process.env.DEBUG_CITACAO && v.regra === "citacao_fora_da_lista") {
        problemas.push(`PEÇA COMPLETA:\n${peca}`);
      }
    }
  }

  const t = peca.toLowerCase();
  for (const marca of espera.contem || []) {
    if (!t.includes(String(marca).toLowerCase())) {
      problemas.push(`a peça deveria conter "${marca}" e não contém`);
    }
  }
  for (const marca of espera.nao_contem || []) {
    if (t.includes(String(marca).toLowerCase())) {
      problemas.push(`a peça NÃO deveria conter "${marca}", mas contém`);
    }
  }

  return problemas;
}

async function rodarVertical(vertical) {
  const dir = join(AQUI, vertical, "defesa");
  const manifesto = JSON.parse(readFileSync(join(dir, "casos.json"), "utf-8"));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`DEFESA: ${vertical.toUpperCase()}  (${manifesto.casos.length} casos)`);
  console.log("=".repeat(70));

  const falhas = [];

  for (const caso of manifesto.casos) {
    const bruto = readFileSync(join(dir, caso.arquivo), "utf-8");
    /* Trânsito é a única vertical cuja análise é texto corrido; as outras
       mandam o objeto da análise. O manifesto declara qual é o caso. */
    const entrada = caso.arquivo.endsWith(".json") ? JSON.parse(bruto) : bruto;

    const problemasDoCaso = [];

    for (let tentativa = 1; tentativa <= REPETICOES; tentativa++) {
      let resposta;
      try {
        resposta = await gerarDefesa(manifesto.rota, entrada, manifesto.campo_entrada);
      } catch (err) {
        problemasDoCaso.push(`execução ${tentativa}: falha de rede: ${err.message}`);
        await esperar(PAUSA_MS);
        continue;
      }

      const problemas = conferir(caso.espera, resposta.corpo, resposta.status, vertical, entrada);
      for (const p of problemas) {
        problemasDoCaso.push(REPETICOES > 1 ? `execução ${tentativa}: ${p}` : p);
      }

      await esperar(PAUSA_MS);
    }

    const sufixo = REPETICOES > 1 ? ` (${REPETICOES} execuções)` : "";
    if (problemasDoCaso.length === 0) {
      console.log(`  [OK]    ${caso.arquivo}${sufixo}`);
    } else {
      console.log(`  [FALHA] ${caso.arquivo}${sufixo}`);
      console.log(`          objetivo: ${caso.objetivo}`);
      for (const p of problemasDoCaso) console.log(`          -> ${p}`);
      falhas.push(caso);
    }
  }

  return falhas;
}

async function main() {
  const alvo = (process.argv[2] || "").trim().toLowerCase();
  const disponiveis = verticaisComDefesa();

  if (disponiveis.length === 0) {
    console.error("Nenhuma vertical com defesa/casos.json encontrada em testes/.");
    process.exit(1);
  }

  const verticais = alvo ? [alvo] : disponiveis;

  let totalCasos = 0;
  let totalFalhas = 0;

  for (const v of verticais) {
    if (!existsSync(join(AQUI, v, "defesa", "casos.json"))) {
      console.error(`Vertical "${v}" não tem defesa/casos.json.`);
      console.error(`Disponíveis: ${disponiveis.join(", ")}`);
      process.exit(1);
    }
    const manifesto = JSON.parse(readFileSync(join(AQUI, v, "defesa", "casos.json"), "utf-8"));
    totalCasos += manifesto.casos.length;
    totalFalhas += (await rodarVertical(v)).length;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESULTADO (defesa): ${totalCasos - totalFalhas} de ${totalCasos} casos aprovados`);
  console.log("=".repeat(70));

  process.exit(totalFalhas > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Bateria de defesa falhou:", err);
  process.exit(1);
});
