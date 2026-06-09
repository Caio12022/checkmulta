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
  // ROTA: RADAR DE PAGAMENTO (VERIFICA SE PAGOU)
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

  // ==========================================
  // ROTA: ANALISAR MULTA (MOTOR ECONÔMICO - FLASH LITE)
  // ==========================================
  app.post("/api/analyze-ticket", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Dados da imagem ausentes (imageBase64)." });
      }

      const ai = getAIClient();
      
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

3. ESTRUTURA DA RESPOSTA (GATILHO COMERCIAL DE ALTA CONVERSÃO):
ATENÇÃO: A SUA RESPOSTA DEVE SER ÚNICA.

-> CENÁRIO REJEIÇÃO: Se a multa NÃO se encaixar em NENHUMA das regras de viabilidade acima:
Você DEVE ABORTAR e responder EXATAMENTE E APENAS: "rejeição_tipo_b | [Nome da Infração]". 

-> CENÁRIO SUCESSO (GATILHO DE VENDA BLINDADO): Se a multa tiver uma brecha, responda EXATAMENTE neste formato (DADOS EXTRAÍDOS OBRIGATORIAMENTE EM PRIMEIRO LUGAR):

- STATUS DA ANÁLISE: Sucesso - Brecha Encontrada

DADOS EXTRAÍDOS DO SEU AUTO:
Número do AIT: [Extrair ou deixar colchete se não tiver]
Placa: [Extrair]
Renavam: [Extrair]
Data: [Extrair]
Hora: [Extrair]
Local exato: [Extrair]
Órgão Autuador: [Extrair]
Nome: [Extrair]

DIAGNÓSTICO TÉCNICO DA IRREGULARIDADE:
[Explique aqui o erro de forma extremamente formal, técnica e jurídica, citando os artigos do CTB aplicáveis, mas NUNCA diga de forma simples ou mastigada o que o usuário deve escrever ou qual foi o texto que o agente esqueceu. Use termos como: "Constatada desconformidade formal insanável na lavratura do ato administrativo por inobservância de requisitos imperativos de fundamentação previstos no Artigo 280 do CTB e diretrizes obrigatórias do Manual Brasileiro de Fiscalização de Trânsito, gerando nulidade absoluta do procedimento por vício de forma."]

- VIABILIDADE DO RECURSO: Alta. O descumprimento das formalidades obrigatórias retira a presunção de legitimidade da autuação, tornando o arquivamento do auto impositivo nos termos da legislação vigente.

REGRA DE OURO: Pare a resposta na linha da viabilidade. Não dê instruções de correção.`;

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
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted") || err.message.includes("quota"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // ==========================================
  // ROTA: GERAÇÃO DA PETIÇÃO COMPLETA (MOTOR ESTÁVEL FLASH LITE)
  // ==========================================
  app.post("/api/generate-defense", async (req, res) => {
    try {
      const { extractedData } = req.body;
      
      if (!extractedData) {
        return res.status(400).json({ error: "extractedData ausente." });
      }
      
      const ai = getAIClient();
      
      const prompt = `Você é um redator jurídico sênior especialista em Direito Administrativo de Trânsito. Sua tarefa é pegar o resumo fornecido e estruturar uma Defesa Prévia extremamente formal, robusta e técnica.

--- REGRAS DE PREENCHIMENTO OBRIGATÓRIO (CRÍTICO) ---
Você NÃO pode deixar colchetes genéricos como [INFRAÇÃO], [LOCAL], [DATA], [HORA], [PLACA], [AIT] ou [ÓRGÃO AUTUADOR] vazios se a informação existir no resumo abaixo.
- Substitua a tag [INFRAÇÃO] pela descrição exata da infração encontrada (ex: Dirigir veículo segurando ou manuseando telefone celular).
- Substitua [AIT], [PLACA], [DATA], [HORA] e [ÓRGÃO AUTUADOR] pelos dados correspondentes extraídos.
- Mantenha com colchetes APENAS as informações pessoais que não constam no papel: [RG], [CPF], [ESTADO CIVIL], [PROFISSÃO], [VEÍCULO] e [ENDEREÇO COMPLETO].

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

      // USANDO O MODELO FLASH LITE QUE É SEGURO, ESTÁVEL E FUNCIONA SEMPRE
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0 } // Travado no zero criatividade
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
