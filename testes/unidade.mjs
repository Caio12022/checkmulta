/**
 * TESTES DE UNIDADE DO VALIDADOR
 * ------------------------------
 * As duas outras baterias chamam o Gemini: custam cota, levam minutos e não
 * podem rodar a cada push. Esta não chama IA nenhuma — testa direto as funções
 * puras de prompts/validador.ts, que são a camada de código do produto.
 *
 * Serve para o que as baterias de IA não dão conta:
 *   - roda em segundos, então pode ser trava de todo push;
 *   - é determinística, então uma falha aqui é sempre defeito, nunca variação
 *     do modelo;
 *   - cobre os DOIS lados de cada trava. Trava que só é testada pelo lado do
 *     "pegou o ruim" vira restritiva demais sem ninguém perceber, e trava
 *     restritiva demais mata caso legítimo — erro pior que a ausência dela, e
 *     que já custou correção neste projeto.
 *
 * Uso: node testes/unidade.mjs   (exige npm run build antes)
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const CAMINHO = join(RAIZ, "dist", "validador.cjs");

if (!existsSync(CAMINHO)) {
  console.error(`Falta ${CAMINHO}. Rode "npm run build" antes.`);
  process.exit(1);
}

const V = require(CAMINHO);

let passou = 0;
const falhas = [];

function teste(nome, fn) {
  try {
    fn();
    passou++;
  } catch (err) {
    falhas.push({ nome, erro: err.message });
  }
}

function ok(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

// ============================================================
// ehAvisoDeCorte — o aviso de corte tem que ser pego, e o TOI
// que apenas MENCIONA suspensão não pode ser
// ============================================================

teste("aviso de corte: título com suspensão do fornecimento é pego", () => {
  const doc = `COMPANHIA PARANAENSE DE ENERGIA
AVISO DE SUSPENSAO DO FORNECIMENTO DE ENERGIA ELETRICA
UNIDADE CONSUMIDORA: 5.220.114-8`;
  ok(V.ehAvisoDeCorte(doc), "deveria reconhecer o aviso de corte");
});

teste("aviso de corte: TOI que só menciona suspensão no corpo NÃO é pego", () => {
  const doc = `COMPANHIA DE ELETRICIDADE DE SAO PAULO
TERMO DE OCORRENCIA E INSPECAO - TOI N 884.221/2026
UNIDADE CONSUMIDORA: 4.112.887-0
TITULAR: Marcos Antonio Ribeiro
INSPECAO ACOMPANHADA PELO TITULAR. MEDIDOR LACRADO.
OBSERVACAO: o nao pagamento do debito podera acarretar a suspensao do
fornecimento nos termos da regulamentacao vigente.`;
  ok(!V.ehAvisoDeCorte(doc), "TOI legítimo não pode ser recusado por escopo");
});

// ============================================================
// cotaDiariaEsgotada x sobrecarregado — 429 cobre dois casos
// que exigem tratamento oposto
// ============================================================

const erroCotaDia = {
  status: 429,
  message: JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      details: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
    },
  }),
};
const erroCotaMinuto = {
  status: 429,
  message: JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      details: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }],
    },
  }),
};
const erroPico = {
  status: 503,
  message: JSON.stringify({
    error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" },
  }),
};

teste("cota do dia é reconhecida", () => {
  ok(V.cotaDiariaEsgotada(erroCotaDia), "deveria reconhecer cota diária");
});

teste("cota do dia NÃO gera retry (esperar não resolve)", () => {
  ok(!V.sobrecarregado(erroCotaDia), "cota diária não pode entrar no retry");
});

teste("cota por minuto GERA retry (passa sozinha em segundos)", () => {
  ok(V.sobrecarregado(erroCotaMinuto), "cota por minuto deve ser repetida");
  ok(!V.cotaDiariaEsgotada(erroCotaMinuto), "cota por minuto não é cota diária");
});

teste("pico 503 gera retry", () => {
  ok(V.sobrecarregado(erroPico), "503 de alta demanda deve ser repetido");
  ok(!V.cotaDiariaEsgotada(erroPico), "503 não é cota");
});

// ============================================================
// validarDefesa — os quatro tipos de violação, e a contraprova
// de cada um (o texto legítimo que não pode ser acusado)
// ============================================================

const analiseFormal = {
  achados: [
    {
      titulo: "Descricao generica da conduta",
      bloco: "formalidade",
      gravidade: "critico",
      dispositivo: "art. 97 do Decreto 6.514/2008",
      explicacao: "A descricao do fato nao indica a conduta concreta.",
    },
  ],
};

const analisePrescricao = {
  achados: [
    {
      titulo: "Prescricao da pretensao punitiva",
      bloco: "prescricao",
      gravidade: "critico",
      dispositivo: "art. 21 do Decreto 6.514/2008",
      explicacao: "Passaram-se mais de cinco anos entre a cessacao e a lavratura.",
    },
  ],
};

const pecaLimpa = `O art. 97 do Decreto 6.514/2008 exige a descricao do fato. A ausencia
desses elementos configura vicio formal que compromete o contraditorio, aplicando-se
subsidiariamente o art. 53 da Lei 9.784/99. Requer-se o acolhimento da defesa.`;

function regras(violacoes) {
  return violacoes.map((v) => v.regra);
}

teste("peça limpa não gera violação", () => {
  const v = V.validarDefesa(pecaLimpa, "ibama", analiseFormal);
  ok(v.length === 0, `peça legítima acusada: ${regras(v).join(", ")}`);
});

teste("promessa de resultado é pega", () => {
  const v = V.validarDefesa("Diante disso, o auto sera certamente anulado.", "ibama", analiseFormal);
  ok(regras(v).includes("promessa_de_resultado"), "deveria pegar a promessa");
});

teste("afirmar que o auto NÃO observou a norma é permitido", () => {
  const v = V.validarDefesa(
    "O auto nao observou o disposto no art. 97 do Decreto 6.514/2008.",
    "ibama",
    analiseFormal
  );
  ok(!regras(v).includes("promessa_de_resultado"), "linguagem de possibilidade é permitida");
});

teste("adjetivo forte em vício sanável é pego", () => {
  const v = V.validarDefesa(
    "O auto padece de vicio insanavel, configurando nulidade absoluta.",
    "ibama",
    analiseFormal
  );
  ok(regras(v).includes("adjetivo_exagerado"), "art. 97 é sanável, adjetivo não cabe");
});

teste("adjetivo forte em prescrição é PERMITIDO (contraprova)", () => {
  const v = V.validarDefesa(
    "Trata-se de vicio insanavel, pois a pretensao punitiva ja estava prescrita.",
    "ibama",
    analisePrescricao
  );
  ok(!regras(v).includes("adjetivo_exagerado"), "em prescrição não há o que convalidar");
});

teste("adjetivo forte cabe no Procon mesmo sem campo bloco", () => {
  /* Procon e Vigilância descrevem o achado sem "bloco". Olhar só o bloco
     reprovaria toda peça legítima de prescrição nessas duas verticais. */
  const analise = {
    achados: [
      {
        titulo: "Prescricao da pretensao punitiva",
        gravidade: "critico",
        base_legal: "Art. 28 do Decreto 2.181/97",
        explicacao: "Mais de cinco anos entre o fato e a apuracao.",
      },
    ],
  };
  const v = V.validarDefesa(
    "Trata-se de vicio insanavel, pois a pretensao ja estava prescrita.",
    "procon",
    analise
  );
  ok(!regras(v).includes("adjetivo_exagerado"), "prescrição no Procon também admite o adjetivo");
});

teste("citação fora da lista fechada é pega", () => {
  const v = V.validarDefesa(
    "A autuacao contraria a Resolucao CONAMA 237/1997 e a Lei Estadual 12.300/2006.",
    "ibama",
    analiseFormal
  );
  ok(regras(v).includes("citacao_fora_da_lista"), "CONAMA e lei estadual estão fora da lista");
});

teste("imputação ao agente é pega mesmo com palavra no meio", () => {
  /* "agente autuante agiu com má-fé": a primeira versão do regex exigia
     "agente agiu" colado e deixava passar. */
  const v = V.validarDefesa(
    "O agente autuante agiu com ma-fe ao lavrar o auto sem vistoria.",
    "ibama",
    analiseFormal
  );
  ok(regras(v).includes("imputacao_ao_agente"), "deveria pegar a imputação");
});

teste("descrever o erro do agente sem imputar má-fé é permitido", () => {
  const v = V.validarDefesa(
    "O agente autuante deixou de preencher o campo de descricao do fato.",
    "ibama",
    analiseFormal
  );
  ok(!regras(v).includes("imputacao_ao_agente"), "apontar a falha não é acusar de má-fé");
});

// ============================================================
// DIPLOMAS_PERMITIDOS do trânsito — as duas citações que a
// bateria de defesa provou faltarem, e a contraprova
// ============================================================

/* Trânsito é a única vertical cuja análise é texto corrido, não objeto. */
const analiseTransitoPrescricao = `RELATORIO DE ANALISE - AUTO DE INFRACAO DE TRANSITO
Enquadramento: art. 218, inciso I, do CTB
Falha 1 - Notificacao da autuacao expedida fora do prazo do art. 281 do CTB,
o que caracteriza a decadencia do direito de autuar.`;

teste("trânsito: Decreto 20.910/32 é citação legítima em prescrição", () => {
  /* Faltava na lista: o caso de contraprova de prescrição da bateria de defesa
     reprovava SEMPRE, e não por variação do modelo. */
  const v = V.validarDefesa(
    "Aplica-se o Decreto 20.910/32, que fixa em cinco anos a prescricao contra a Fazenda Publica.",
    "transito",
    analiseTransitoPrescricao
  );
  ok(!regras(v).includes("citacao_fora_da_lista"), "20.910/32 é a base da prescrição quinquenal");
});

teste("trânsito: Lei 14.304/2022 é citação legítima (renumerou o art. 281 do CTB)", () => {
  /* A lei renumerou o parágrafo único do art. 281 para §1º, vigente desde
     23/08/2022 — confirmado por pesquisa. A peça cita ao justificar a
     numeração do dispositivo, e a citação é correta, não alucinação. */
  const v = V.validarDefesa(
    "O art. 281, § 1º, inciso II, do CTB, na redacao dada pela Lei 14.304/2022, determina o arquivamento.",
    "transito",
    analiseTransitoPrescricao
  );
  ok(!regras(v).includes("citacao_fora_da_lista"), "a renumeração do art. 281 é real e citável");
});

teste("trânsito: diploma fora da lista continua sendo pego (contraprova)", () => {
  /* O lado que impede o conserto de virar abertura da lista inteira. A Lei
     14.599/2023 aplicada a pedágio foi alucinação real, corrigida nos artigos
     já publicados. */
  const v = V.validarDefesa(
    "A autuacao contraria a Lei 14.599/2023 e a Resolucao CONTRAN 396/2011.",
    "transito",
    analiseTransitoPrescricao
  );
  ok(regras(v).includes("citacao_fora_da_lista"), "diploma fora da lista tem que reprovar");
});

// ============================================================
// documentoIlegivel — os dois lados
// ============================================================

teste("documento sem campos-chave é ilegível", () => {
  ok(V.documentoIlegivel("texto curto demais", []), "sem campos não sustenta análise");
});

teste("documento com campos preenchidos NÃO é ilegível", () => {
  const transcricao = "AUTO DE INFRACAO ".repeat(30);
  ok(
    !V.documentoIlegivel(transcricao, ["IBAMA", "AI 7712345/2026", "Joao Batista"]),
    "documento legível não pode ser recusado"
  );
});

// ============================================================
// RESULTADO
// ============================================================

console.log(`\n${"=".repeat(70)}`);
if (falhas.length === 0) {
  console.log(`UNIDADE: ${passou} de ${passou} testes aprovados`);
} else {
  for (const f of falhas) {
    console.log(`  [FALHA] ${f.nome}`);
    console.log(`          -> ${f.erro}`);
  }
  console.log(`UNIDADE: ${passou} de ${passou + falhas.length} testes aprovados`);
}
console.log("=".repeat(70));

process.exit(falhas.length > 0 ? 1 : 0);
