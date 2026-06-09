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
  // ROTA: GERAR PIX DE TESTE (R$ 1,00)
  // ==========================================
  app.post("/api/create-payment", async (req, res) => {
    try {
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Render." });
      }

      const { email } = req.body;

      const paymentData = {
        body: {
          transaction_amount: 1.00,
          description: "Criação de Recurso - CheckMulta",
          payment_method_id: "pix",
          payer: {
            email: email || "cliente@checkmulta.com.br",
          },
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
      console.error("Erro ao criar pagamento no Mercado Pago:", err);
      res.status(500).json({ error: err.message || "Erro interno ao gerar o Pix." });
    }
  });

  // ==========================================
  // ROTA NOVA: RADAR DE PAGAMENTO (VERIFICA SE PAGOU)
  // ==========================================
  app.get("/api/check-payment/:id", async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      if (!paymentId) {
        return res.status(400).json({ error: "ID inválido" });
      }
      
      const payment = await paymentClient.get({ id: paymentId });
      res.json({ status: payment.status });
    } catch (err: any) {
      console.error("Erro ao checar pagamento:", err);
      res.status(500).json({ error: "Erro interno ao verificar Pix" });
    }
  });

  app.post("/api/analyze-ticket", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Dados da imagem ausentes (imageBase64 e mimeType)." });
      }

      const ai = getAIClient();
      
      const today = new Date();
      const pd = String(today.getDate()).padStart(2, '0');
      const pm = String(today.getMonth() + 1).padStart(2, '0');
      const pY = today.getFullYear();
      
      const prompt = `DIRETRIZES OBRIGATÓRIAS DE INTEGRAÇÃO COM SISTEMA (UI/UX)
Você está se comunicando com um front-end. Siga estas regras com precisão cirúrgica:

1. GATILHOS DE ERRO E BLOQUEIO (RESPONDER APENAS A STRING ABAIXO NESSES CASOS):
- Imagem não é um documento de trânsito: "documento_invalido"
- Imagem muito borrada/ilegível: "imagem_ilegivel"
- Conteúdo impróprio: "erro_seguranca"
- Aviso de DEFERIMENTO prévio: "Boas notícias! Analisamos o seu documento e ele é um aviso oficial de DEFERIMENTO..."

2. AUDITORIA LÓGICA DE TRÂNSITO (REGRAS DE PARETO):
Você atua como um auditor técnico. Sua decisão baseia-se 100% na verificação da imagem contra estas regras:

[EXCEÇÃO DE ALTA COMPLEXIDADE]
- LEI SECA/BAFÔMETRO (Art 165/165-A): Responda APENAS "rejeição_tipo_a | Lei Seca"

[REGRAS DE VIABILIDADE - SE ACHAR UMA DESSAS, A MULTA TEM BRECHA]
0. PRAZO DECADENCIAL: Data de Expedição da Notificação excedeu 30 dias da Data da Infração.
1. VELOCIDADE: INMETRO da imagem vencido (mais de 12 meses da data da infração).
2. ESTACIONAMENTO PROIBIDO: Observações vazias ou genéricas ("estacionado irregularmente") sem especificar a placa R-6a.
3. SINAL VERMELHO: Autuação de madrugada (22h-05h) onde o agente cita área de risco nas observações.
4. CELULAR OU CINTO: Autuação sem abordagem SEM que o agente justifique nas observações o motivo de não ter parado o veículo.
5. CONVERSÃO PROIBIDA: Observação vazia ou genérica (ex: "fluxo intenso") sem descrever a placa ou pintura de proibição (Art. 280, §2º CTB).
6. RODÍZIO (SP): Isenção anotada na foto ou erro de leitura ótica evidente.
7. PELÍCULA/PNEU: Autuação "em movimento" anotada, sem abordagem para medição física obrigatória.

3. ESTRUTURA DA RESPOSTA (GATILHO COMERCIAL):
ATENÇÃO EXTRA: A SUA RESPOSTA DEVE SER ÚNICA.

-> CENÁRIO REJEIÇÃO: Se a multa NÃO se encaixar em NENHUMA das regras de viabilidade acima (estiver preenchida perfeitamente):
Você DEVE ABORTAR e responder EXATAMENTE E APENAS: "rejeição_tipo_b | [Nome da Infração]". 

-> CENÁRIO SUCESSO: Se a multa tiver PELO MENOS UMA brecha das regras acima, responda EXATAMENTE neste formato (sem gerar petição aqui):

- STATUS DA ANÁLISE: Sucesso - Brecha Encontrada
- INFRAÇÃO DETECTADA: [Nome e código da infração]
- A BRECHA LEGAL ENCONTRADA: [Explique de forma direta e técnica qual foi a falha baseada nas regras de Pareto. Ex: "O agente falhou ao deixar o campo de observações vazio sem justificar a falta de abordagem..."]
- VIABILIDADE DO RECURSO: Alta. Com base no Código de Trânsito Brasileiro e nas Resoluções do CONTRAN, esta falha formal torna o Auto de Infração inconsistente e irregular, sendo passível de nulidade se a tese correta for protocolada.

DADOS EXTRAÍDOS OBRIGATÓRIOS:
Número do AIT: [Extrair ou deixar colchete se não tiver]
Placa: [Extrair]
Renavam: [Extrair]
Data: [Extrair]
Hora: [Extrair]
Local exato: [Extrair]
Órgão Autuador: [Extrair]
Nome: [Extrair]

REGRA DE OURO: Pare a resposta nos dados extraídos.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: imageBase64, mimeType: mimeType } },
              { text: prompt }
            ]
          }
        ],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in analyze-ticket:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted") || err.message.includes("quota"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/generate-defense", async (req, res) => {
    try {
      const { extractedData } = req.body;
      
      if (!extractedData) {
        return res.status(400).json({ error: "extractedData ausente." });
      }
      
      const ai = getAIClient();
      const prompt = `Você é um mero assistente de formatação jurídica. Sua ÚNICA tarefa é preencher o gabarito abaixo com os dados fornecidos em "RESUMO DA MULTA".
NÃO analise a viabilidade. NÃO recuse. NÃO invente interpretações. Apenas pegue a brecha descrita no resumo e preencha a petição. 
Se um dado não constar no resumo, mantenha o colchete intacto (ex: [HORA]). NUNCA copie textos como "[NÃO DETECTADO]".

--- RESUMO DA MULTA ---
${extractedData}

GABARITO DA PETIÇÃO DE DEFESA:
ILUSTRÍSSIMA AUTORIDADE DE TRÂNSITO - [ÓRGÃO AUTUADOR]

[NOME DO CONDUTOR], brasileiro(a), [ESTADO CIVIL], [PROFISSÃO], portador do RG nº [RG] e inscrito no CPF sob o nº [CPF], residente e domiciliado em [ENDEREÇO COMPLETO], proprietário/condutor do veículo de placa [PLACA], RENAVAM [RENAVAM], vem, tempestivamente, à presença de Vossa Senhoria, com fulcro no art. 281, inciso I, do Código de Trânsito Brasileiro (CTB), apresentar

DEFESA PRÉVIA

em face do Auto de Infração de Trânsito nº [AIT], lavrado em [DATA], pelos fatos e fundamentos a seguir expostos:

1. DOS FATOS E DO DIREITO
O requerente foi autuado em [DATA], às [HORA], no local [LOCAL], por suposta infração descrita como: [INFRAÇÃO].

Ocorre que a autuação é manifestamente nula. Conforme análise técnica da notificação, a falha consiste em: [COPIE AQUI A EXPLICAÇÃO DA BRECHA QUE ESTÁ NO RESUMO DA MULTA ACIMA].

Considerando que o procedimento não atendeu aos critérios estabelecidos pela legislação vigente, a prova obtida carece de eficácia e presunção de veracidade. Nos termos do Artigo 281, inciso I, do CTB, a autoridade de trânsito é obrigada a arquivar o auto de infração quando este for considerado inconsistente ou irregular.

2. DOS PEDIDOS
Ante o exposto, requer:
a) O acolhimento da presente Defesa Prévia para que seja determinado o cancelamento e o arquivamento do Auto de Infração nº [AIT];
b) Requer-se, sob pena de cerceamento de defesa, que a Autoridade de Trânsito anexe aos autos a cópia integral de laudos, imagens e relatórios pertinentes à infração.

Nestes termos, pede deferimento.
[CIDADE], 08 de junho de 2026.

__________________________________________
[NOME DO CONDUTOR]
[CPF]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in generate-defense:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted") || err.message.includes("quota"))) {
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
