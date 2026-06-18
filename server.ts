import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MercadoPagoConfig, Payment } from "mercadopago";

let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});
const paymentClient = new Payment(mpClient);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));

  // ==========================================
  // ROTA: GERAR PIX
  // ==========================================
  app.post("/api/create-payment", async (req, res) => {
    try {
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." });
      }
      const { email } = req.body;
      const paymentData = {
        body: {
          transaction_amount: 19.90, // VALOR OFICIAL DE PRODUÇÃO ATUALIZADO
          description: "Criação de Recurso - CheckMulta",
          payment_method_id: "pix",
          payer: { email: email || "cliente@checkmulta.com.br" },
        },
      };
      const response = await paymentClient.create(paymentData);
      res.json({
        id: response.id,
        status: response.status,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      });
    } catch (err: any) {
      console.error("Erro ao criar pagamento:", err);
      res.status(500).json({ error: err.message || "Erro interno ao gerar o Pix." });
    }
  });

  app.get("/api/check-payment/:id", async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      if (!paymentId) return res.status(400).json({ error: "ID inválido" });
      const payment = await paymentClient.get({ id: paymentId });
      res.json({ status: payment.status });
    } catch (err: any) {
      console.error("Erro ao checar pagamento:", err);
      res.status(500).json({ error: "Erro interno ao verificar Pix" });
    }
  });

  // ==========================================
  // ROTA: ANALISAR MULTA (PROMPT BLINDADO - 2026)
  // Diagnóstico DOSADO + viabilidade honesta (Alta/Média/Baixa).
  // A IA é PROIBIDA de inventar erro que não existe no documento.
  // ==========================================
  app.post("/api/analyze-ticket", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) return res.status(400).json({ error: "Dados da imagem ausentes." });

      const ai = getAIClient();

      const prompt = `Você é um auditor técnico especialista na análise formal de autos de infração de trânsito brasileiros. 
INFORMAÇÃO DE SISTEMA CRÍTICA: O ANO ATUAL É 2026.

-------------------------------------------------------------------------------------------------------
REGRA DE OURO 1: VALIDAÇÃO DO DOCUMENTO E DA IMAGEM
- Se a imagem NÃO for um documento de trânsito oficial brasileiro (ex: foto de retrovisor, paisagem, pessoas, tela preta), PARE TUDO e retorne APENAS a exata string: documento_invalido
- Se a imagem for um documento, mas estiver impossível de ler (borrada/cortada), retorne APENAS: imagem_ilegivel

REGRA DE OURO 2: CASOS INVIÁVEIS (LEI SECA)
- LEI SECA/BAFÔMETRO (Art 165/165-A): Responda APENAS: rejeicao_tipo_a

REGRA DE OURO 2.1: HONESTIDADE ABSOLUTA - VOCÊ NÃO PODE INVENTAR ERROS
Esta é a regra mais importante de todas. Você SÓ pode apontar um erro que você REALMENTE consegue ver no documento.
- Se um campo ESTÁ preenchido no documento, você está PROIBIDO de dizer que ele está faltando ou em branco.
- Se a aferição do INMETRO está presente e válida, você NÃO pode dizer que falta aferição.
- Se o local está descrito, você NÃO pode dizer que falta o local.
- NUNCA invente uma falha para conseguir gerar um relatório de sucesso. Inventar um erro inexistente é uma falha grave e proibida.
Analise o documento campo por campo de forma factual. Aponte APENAS o que de fato está ausente, incompleto, ilegível ou irregular no que está escrito.

REGRA DE OURO 3: AUDITORIA E NÍVEL DE VIABILIDADE (HONESTO)
Se o documento for legível, gere o relatório completo abaixo classificando a viabilidade de forma honesta conforme a força REAL do(s) erro(s) que você encontrou:
- ALTA: erro formal claro e grave (ex: local da infração realmente ausente, INMETRO realmente vencido, observações realmente em branco quando obrigatórias). Caso forte.
- MÉDIA: há um ângulo questionável, mas não é garantido. Existe um argumento possível, porém discutível.
- BAIXA: o documento está praticamente correto. Os erros são mínimos ou apenas teóricos. O caso é fraco, mas existe uma pequena margem de tentativa.
IMPORTANTE: Mesmo quando a viabilidade for BAIXA, gere o relatório completo. NÃO rejeite. O cliente decide se quer tentar. Apenas seja honesto no nível.
Você DEVE gerar o relatório MESMO SE O PRAZO ESTIVER VENCIDO (multas de 2025 para trás ou prazo já ultrapassado).

Responda EXATAMENTE neste formato:

- STATUS DA ANÁLISE: Sucesso - Análise Concluída

DADOS EXTRAÍDOS DO SEU AUTO:
Número do AIT: [Extrair ou deixar colchete se não tiver]
Placa: [Extrair]
Renavam: [Extrair]
Data: [Extrair]
Hora: [Extrair]
Local exato: [Extrair]
Órgão Autuador: [Extrair]
Nome: [Extrair]

O QUE ENCONTRAMOS NA SUA MULTA:
[REGRA CRÍTICA DE DOSAGEM - LEIA COM ATENÇÃO:
Escreva de 2 a 3 frases curtas, em linguagem SIMPLES e direta, que QUALQUER pessoa leiga entenda. 
O objetivo é o condutor entender QUAL é o problema concreto da multa DELE — SEM você ensinar a defesa.

VOCÊ DEVE:
- Nomear o campo ou requisito específico que falhou NA multa dele, e que VOCÊ REALMENTE VIU faltando ou irregular (ex: "faltou o local exato da infração", "o agente deixou o campo de observações em branco", "não há registro de aferição do radar pelo INMETRO").
- Dizer, em uma frase, por que isso é um problema.
- Se a viabilidade for MÉDIA ou BAIXA, seja honesto: diga que o caso tem um ângulo mas não é garantido, ou que é uma tentativa com chance menor.

VOCÊ NÃO PODE:
- NÃO invente erro que não existe (ver REGRA DE OURO 2.1).
- NÃO cite o número de artigos, incisos ou parágrafos do CTB/MBFT (nada de "inciso II do Art. 280"). Essa fundamentação é o produto pago.
- NÃO escreva a tese jurídica, nem argumentação formal, nem o passo a passo de como recorrer.
- NÃO use juridiquês ("desconformidade formal insanável", "presunção de legitimidade", "vício de forma"). Fale como um amigo que entende do assunto explicando pra você.

EXEMPLO DE TOM CORRETO (viabilidade alta):
"Encontramos um problema sério no preenchimento da sua multa: o agente não registrou o local exato onde a infração teria acontecido. Esse é um dado obrigatório, e a falta dele enfraquece a autuação. É exatamente esse tipo de falha que pode ser usado a seu favor."
EXEMPLO DE TOM CORRETO (viabilidade baixa):
"A sua multa está, no geral, bem preenchida e os principais dados estão corretos. O ângulo de defesa aqui é mais limitado, mas ainda existe uma margem de questionamento formal que pode ser tentada. As chances são menores neste caso."]

- VIABILIDADE DO RECURSO: [Escreva APENAS uma palavra: Alta, Média ou Baixa, conforme a força real do caso]

[IMPORTANTE - MARCADOR DE VENCIMENTO]:
Após escrever TODO o relatório acima, avalie a Data da Infração ou o Prazo para Defesa. Se a multa for de anos anteriores a 2026 (ex: 2024, 2025) ou o prazo já tiver passado, pule uma linha no final do seu texto e escreva OBRIGATORIAMENTE a exata string "rejeicao_prazo_expirado" isolada. Se o prazo estiver rigorosamente em dia, não escreva esta string.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { role: "user", parts: [{ inlineData: { data: imageBase64, mimeType: mimeType } }, { text: prompt }] }
        ],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in analyze-ticket:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // ==========================================
  // ROTA: GERAÇÃO DA PETIÇÃO COMPLETA
  // Aqui SIM entra toda a fundamentação jurídica (o produto pago).
  // ==========================================
  app.post("/api/generate-defense", async (req, res) => {
    try {
      const { extractedData } = req.body;
      if (!extractedData) return res.status(400).json({ error: "extractedData ausente." });

      const ai = getAIClient();

      const prompt = `Você é um redator jurídico sênior especialista em Direito Administrativo de Trânsito. Sua tarefa é pegar o resumo fornecido e estruturar uma Defesa Prévia extremamente formal, robusta e técnica.

--- REGRAS DE PREENCHIMENTO OBRIGATÓRIO ---
Substitua os colchetes com os dados do resumo. Mantenha em colchetes APENAS os dados pessoais que não vieram na imagem: [RG], [CPF], [ESTADO CIVIL], [PROFISSÃO], [VEÍCULO], [ENDEREÇO COMPLETO].

--- RESUMO DA MULTA FORNECIDO ---
${extractedData}

GABARITO DA PETIÇÃO DE DEFESA:
ILUSTRÍSSIMA AUTORIDADE DE TRÂNSITO DO [ÓRGÃO AUTUADOR]

[NOME DO CONDUTOR], brasileiro(a), [ESTADO CIVIL], [PROFISSÃO], portador do RG nº [RG] e inscrito no CPF sob o nº [CPF], residente e domiciliado em [ENDEREÇO COMPLETO], na qualidade de proprietário/condutor do veículo de placa [PLACA], RENAVAM [RENAVAM], vem, tempestivamente, perante esta autoridade, apresentar

DEFESA PRÉVIA

em face do Auto de Infração de Trânsito nº [AIT], lavrado em [DATA], pelos fatos e fundamentos jurídicos a seguir expostos:

1. DOS FATOS E DO DIREITO
O requerente foi autuado em [DATA], às [HORA], no local [LOCAL], por suposta infração descrita como: [INFRAÇÃO].

Ocorre que a referida autuação é manifestamente nula por vício de forma insanável. Conforme preconiza o Artigo 280 do Código de Trânsito Brasileiro (CTB) e as diretrizes vinculantes do Manual Brasileiro de Fiscalização de Trânsito (MBFT), o ato administrativo de autuação exige fundamentação e motivação completa por parte do agente fiscalizador. 

No caso em tela, verifica-se flagrante omissão técnica no preenchimento do auto, haja vista que o campo de observações encontra-se desprovido de qualquer elemento descritivo essencial que comprove a dinâmica da infração ou justifique legalmente a ausência de abordagem do veículo. A presunção de legitimidade do ato administrativo não é absoluta e resta mitigada quando a autoridade falha em cumprir os requisitos imperativos de forma estabelecidos em lei, tornando a autuação inconsistente e irregular.

Nos termos do Artigo 281, parágrafo único, inciso I do CTB, a autoridade de trânsito possui o dever de arquivar o auto de infração e julgar seu registro insubsistente sempre que este carecer de regularidade formal.

2. DOS PEDIDOS
Ante o exposto, requer a Vossa Senhoria:
a) O recebimento da presente peça defensiva e, no mérito, seu acolhimento integral para determinar o cancelamento e o arquivamento definitivo do Auto de Infração nº [AIT];
b) A produção de prova documental mediante a juntada de cópia integral do procedimento administrativo pelo órgão autuador, sob pena de cerceamento de defesa.

Nestes termos, pede deferimento.
[CIDADE], 09 de junho de 2026.

__________________________________________
[NOME DO CONDUTOR]
Requerente`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in generate-defense:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
