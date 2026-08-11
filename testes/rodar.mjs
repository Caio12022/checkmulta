/**
 * EXECUTOR DA BATERIA DE TESTES DE ANÁLISE
 * ----------------------------------------
 * Envia cada auto de teste para a rota real da vertical e compara o
 * resultado com o esperado declarado em casos.json.
 *
 * Testa através do HTTP, e não chamando o Gemini direto, de propósito:
 * assim o teste cobre também a camada de código (validador, recusas,
 * parsing) e não só a obediência do modelo ao prompt.
 *
 * Uso:
 *   node testes/rodar.mjs             -> roda todas as verticais com casos
 *   node testes/rodar.mjs ibama       -> roda só a vertical indicada
 *
 * Requer o servidor rodando em BASE_URL (padrão http://localhost:3000)
 * e a GEMINI_API_KEY configurada para ele.
 *
 * Sai com código 1 se qualquer caso falhar, para reprovar o workflow.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/* Pausa entre chamadas. A análise é uma chamada de IA por caso; sem
   intervalo, dez casos seguidos podem esbarrar em limite de taxa e
   reprovar por 429 — o que seria um falso negativo do teste, não um
   defeito do prompt. */
const PAUSA_MS = Number(process.env.PAUSA_MS || 4000);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Datas relativas nos documentos de teste.
 *
 * Os autos usam marcadores como {{HOJE-5}} (cinco dias atrás), {{HOJE+7}}
 * (daqui a sete dias) e {{HOJE}}, substituídos por dd/mm/aaaa no momento
 * da execução.
 *
 * Sem isso a bateria apodrece: uma data escrita fixa envelhece a cada dia,
 * e um auto que hoje está no prazo passa a estar vencido daqui a alguns
 * meses. Foi exatamente o que aconteceu — um auto "limpo" começou a
 * acusar prazo expirado meses depois de escrito, e a falha parecia do
 * sistema quando era do próprio teste.
 *
 * Datas ABSOLUTAS continuam válidas quando o que importa é o intervalo
 * entre duas datas do próprio documento, e não a distância até hoje —
 * é o caso da prescrição, onde se compara o fato com a lavratura.
 */
function aplicarDatas(texto) {
  return texto.replace(/\{\{HOJE(?:([+-])(\d+))?\}\}/g, (_, sinal, dias) => {
    const d = new Date();
    if (dias) d.setDate(d.getDate() + (sinal === "+" ? 1 : -1) * Number(dias));
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  });
}

function verticaisDisponiveis() {
  return readdirSync(AQUI, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(AQUI, d.name, "casos.json")))
    .map((d) => d.name);
}

async function analisar(rota, conteudo) {
  const resposta = await fetch(`${BASE_URL}${rota}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64: Buffer.from(conteudo, "utf-8").toString("base64"),
      mimeType: "text/plain",
    }),
  });

  const corpo = await resposta.json().catch(() => ({}));
  return { status: resposta.status, corpo };
}

/**
 * Compara o resultado com o esperado e devolve a lista de divergências.
 * Lista vazia significa caso aprovado.
 */
function conferir(espera, corpo, status) {
  const problemas = [];

  if (status !== 200) {
    problemas.push(`HTTP ${status}: ${JSON.stringify(corpo).slice(0, 160)}`);
    return problemas;
  }

  const resultado = corpo.result;

  if (espera.tipo === "recusa") {
    if (typeof resultado !== "string") {
      problemas.push(`esperava a recusa "${espera.valor}", veio uma análise completa`);
      return problemas;
    }
    if (!resultado.toLowerCase().includes(espera.valor.toLowerCase())) {
      problemas.push(`esperava a recusa "${espera.valor}", veio "${resultado}"`);
    }
    return problemas;
  }

  // A partir daqui, espera-se uma análise em objeto.
  if (typeof resultado === "string") {
    problemas.push(`esperava análise, veio a recusa "${resultado}"`);
    return problemas;
  }
  if (!resultado || typeof resultado !== "object") {
    problemas.push(`resposta sem análise utilizável`);
    return problemas;
  }

  const achados = Array.isArray(resultado.achados) ? resultado.achados : [];
  const criticos = achados.filter((a) => a?.gravidade === "critico");

  if (typeof espera.houve_achado === "boolean") {
    const teve = achados.length > 0;
    if (teve !== espera.houve_achado) {
      problemas.push(
        espera.houve_achado
          ? `esperava achado, veio nenhum`
          : `esperava NENHUM achado, vieram ${achados.length}: ${achados.map((a) => a?.titulo).join(" | ")}`
      );
    }
  }

  if (typeof espera.criticos_min === "number" && criticos.length < espera.criticos_min) {
    problemas.push(`esperava ao menos ${espera.criticos_min} crítico(s), veio ${criticos.length}`);
  }

  if (typeof espera.criticos_max === "number" && criticos.length > espera.criticos_max) {
    problemas.push(
      `esperava no máximo ${espera.criticos_max} crítico(s), vieram ${criticos.length}: ${criticos.map((a) => a?.titulo).join(" | ")}`
    );
  }

  /* Campos da própria análise, e não dos achados. Serve para travas que a
     tela lê direto do JSON — o caso mais importante é "esfera": é por ele
     que Ibama.tsx bloqueia a venda quando o auto é estadual ou municipal.
     Sem conferir isso, um auto estadual poderia sair sem achado nenhum e o
     teste passaria, mesmo com a trava de competência quebrada. */
  if (espera.campos && typeof espera.campos === "object") {
    for (const [campo, valor] of Object.entries(espera.campos)) {
      const obtido = resultado[campo];
      const bate =
        typeof obtido === "string" &&
        obtido.toLowerCase().includes(String(valor).toLowerCase());
      if (!bate) {
        problemas.push(`campo "${campo}": esperava "${valor}", veio "${obtido}"`);
      }
    }
  }

  /* Campos booleanos da análise. Hoje o único é prazo_aparenta_vencido, que
     decide se a oferta aparece — precisa ser conferido nos dois sentidos:
     true no auto vencido (senão vendemos peça intempestiva) e false no auto
     dentro do prazo (senão bloqueamos venda legítima, que é o erro oposto e
     igualmente ruim). */
  if (espera.campos_bool && typeof espera.campos_bool === "object") {
    for (const [campo, valor] of Object.entries(espera.campos_bool)) {
      const obtido = resultado[campo] === true;
      if (obtido !== valor) {
        problemas.push(`campo "${campo}": esperava ${valor}, veio ${resultado[campo]}`);
      }
    }
  }

  if (Array.isArray(espera.blocos_esperados) && espera.blocos_esperados.length > 0) {
    const blocos = new Set(criticos.map((a) => a?.bloco));
    const bateu = espera.blocos_esperados.some((b) => blocos.has(b));
    if (!bateu) {
      problemas.push(
        `esperava crítico no bloco ${espera.blocos_esperados.join(" ou ")}, veio ${[...blocos].join(", ") || "nenhum crítico"}`
      );
    }
  }

  return problemas;
}

async function rodarVertical(vertical) {
  const manifesto = JSON.parse(readFileSync(join(AQUI, vertical, "casos.json"), "utf-8"));
  console.log(`\n${"=".repeat(70)}`);
  console.log(`VERTICAL: ${vertical.toUpperCase()}  (${manifesto.casos.length} casos)`);
  console.log("=".repeat(70));

  const falhas = [];

  for (const caso of manifesto.casos) {
    const conteudo = aplicarDatas(readFileSync(join(AQUI, vertical, caso.arquivo), "utf-8"));

    let resposta;
    try {
      resposta = await analisar(manifesto.rota, conteudo);
    } catch (err) {
      console.log(`  [ERRO] ${caso.arquivo} -> falha de rede: ${err.message}`);
      falhas.push({ ...caso, problemas: [`falha de rede: ${err.message}`] });
      await esperar(PAUSA_MS);
      continue;
    }

    const problemas = conferir(caso.espera, resposta.corpo, resposta.status);

    if (problemas.length === 0) {
      console.log(`  [OK]    ${caso.arquivo}`);
    } else {
      console.log(`  [FALHA] ${caso.arquivo}`);
      console.log(`          objetivo: ${caso.objetivo}`);
      for (const p of problemas) console.log(`          -> ${p}`);
      falhas.push({ ...caso, problemas });
    }

    await esperar(PAUSA_MS);
  }

  return falhas;
}

async function main() {
  /* O nome vem digitado à mão no formulário do workflow, então normalizamos:
     "Ibama", " ibama " e "IBAMA" têm que funcionar igual. Sem isso, o teste
     falha por causa da caixa da letra e parece defeito do prompt. */
  const alvo = (process.argv[2] || "").trim().toLowerCase();
  const disponiveis = verticaisDisponiveis();
  const verticais = alvo ? [alvo] : disponiveis;

  if (disponiveis.length === 0) {
    console.error("Nenhuma vertical com casos.json encontrada em testes/.");
    process.exit(1);
  }

  let totalCasos = 0;
  let totalFalhas = 0;

  for (const v of verticais) {
    if (!existsSync(join(AQUI, v, "casos.json"))) {
      console.error(`Vertical "${v}" não tem casos.json.`);
      console.error(`Disponíveis: ${disponiveis.join(", ")}`);
      process.exit(1);
    }
    const manifesto = JSON.parse(readFileSync(join(AQUI, v, "casos.json"), "utf-8"));
    totalCasos += manifesto.casos.length;
    const falhas = await rodarVertical(v);
    totalFalhas += falhas.length;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESULTADO: ${totalCasos - totalFalhas} de ${totalCasos} casos aprovados`);
  console.log("=".repeat(70));

  process.exit(totalFalhas > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Bateria falhou:", err);
  process.exit(1);
});
