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
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Dados da imagem ausentes (imageBase64 e mimeType)." });
      }

      const ai = getAIClient();
      
      const prompt = `DIRETRIZES OBRIGATÓRIAS DE INTEGRAÇÃO COM SISTEMA (UI/UX)
Você está se comunicando com um front-end. Siga estas regras com precisão cirúrgica:

1. GATILHOS DE ERRO E BLOQUEIO (RESPONDER APENAS A STRING ABAIXO NESSES CASOS):
- Imagem não é um documento de trânsito: "documento_invalido"
- Imagem muito borrada/ilegível: "imagem_ilegivel"
- Conteúdo impróprio: "erro_seguranca"
- Aviso de DEFERIMENTO prévim: "Boas notícias! Analisamos o seu documento e ele é um aviso oficial de DEFERIMENTO..."

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
  // ROTA: ENTRADA DO MOTOR PREMIUM (GEMINI 2.5 PRO)
  // Ativada apenas após a confirmação do Pix real
  // ==========================================
  app.post("/api/generate-defense", async (req, res) => {
    try {
      const { extractedData } = req.body;
      
      if (!extractedData) {
        return res.status(400).json({ error: "extractedData ausente." });
      }
      
      const ai = getAIClient();
      
      // Prompt com foco em fundamentação jurídica pesada para o modelo Pro executar
      const prompt = `Você é um especialista em Direito Administrativo e Legislação de Trânsito Rodoviário. Sua tarefa é pegar o resumo técnico fornecido e redigir uma Petição de Defesa Prévia impecável, utilizando vocabulário jurídico formal, denso e robusto.

Analise os fatos descritos, identifique a falha material indicada no resumo e aplique a fundamentação legal correta (Constituição Federal, Código de Trânsito Brasileiro - CTB e Resoluções do CONTRAN correspondentes).

Substitua todos os dados variáveis por colchetes explícitos em letras maiúsculas quando os dados não constarem no resumo (ex: [NOME DO CONDUTOR], [RG], [CPF]). Se o dado constar no resumo, preencha-o diretamente.

--- RESUMO DA MULTA FORNECIDO ---
${extractedData}

ESTRUTURA DA PETIÇÃO DE DEFESA (ENTREGUE EXATAMENTE NESTE PADRÃO):

ILUSTRÍSSIMA AUTORIDADE DE TRÂNSITO COGNITANTE DO [ÓRGÃO AUTUADOR]

[NOME DO CONDUTOR], brasileiro(a), [ESTADO CIVIL], [PROFISSÃO], portador da cédula de identidade RG nº [RG] e devidamente inscrito no CPF/MF sob o nº [CPF], residente e domiciliado na [ENDEREÇO COMPLETO], na qualidade de proprietário/condutor do veículo marca/modelo [VEÍCULO], de placa [PLACA] e RENAVAM [RENAVAM], vem, tempestivamente, perante esta Ilustre JARI, com fulcro na Lei nº 9.503/97 (CTB) e Resoluções vigentes do CONTRAN, apresentar

DEFESA PRÉVIA DE AUTUAÇÃO DE TRÂNSITO

em face do Auto de Infração de Trânsito (AIT) nº [AIT], lavrado pela suposta infração capitulada no Artigo [ARTIGO DO CTB] do diploma legal de trânsito, aduzindo, para tanto, as razões fáticas e de direito que abaixo passam a ser articuladas:

1. DOS FATOS
No dia [DATA], às [HORA], no local delimitado como [LOCAL], o veículo de propriedade do Requerente foi objeto de autuação por supostamente [DESCREVA A INFRAÇÃO DE FORMA FORMAL COM BASE NO RESUMO]. Contudo, em estrita análise formal do presente instrumento administrativo, resta evidente a existência de vício insanável que macula sua validade jurídica, conforme restará demonstrado.

2. DO DIREITO E DA FUNDAMENTAÇÃO JURÍDICA
O ato administrativo de autuação de trânsito possui natureza vinculada, exigindo, para sua perfeita eficácia e validade, o estrito cumprimento de todos os requisitos de forma preconizados pelo ordenamento jurídico, em especial o Artigo 280 do Código de Trânsito Brasileiro e os manuais técnicos de fiscalização editados pelo SENATRAN.

No caso sub examine, verifica-se flagrante nulidade material devido à seguinte irregularidade:
[Aqui, você como Gemini Pro deve expandir o diagnóstico simples do resumo. Redija um texto de 2 parágrafos altamente técnicos e aprofundados explicando por que a falta detectada viola os princípios da motivação, da legalidade e da tipicidade estrita do ato administrativo. Cite resoluções pertinentes do CONTRAN se aplicável àquela infração e demonstre que a omissão ou erro do agente/equipamento retira a presunção de legitimidade e veracidade do AIT].

O Artigo 281, parágrafo único, inciso I do CTB é taxativo ao determinar que o auto de infração "será arquivado e seu registro julgado insubsistente se considerado inconsistente ou irregular". Diante da patente desconformidade formal apontada, a anulação do feito é medida de direito que se impõe.

3. DOS PEDIDOS e REQUERIMENTOS
Ante todo o exposto, pugna o Requerente a esta Ilustre Autoridade Administrativa:
a) O recebimento e processamento da presente manifestação defensiva, porquanto preenchidos os requisitos de tempestividade e legitimidade;
b) No mérito, o acolhimento integral das razões expendidas, determinando-se o ARQUIVAMENTO definitivo do Auto de Infração de Trânsito nº [AIT] e a consequente insubsistência de seus efeitos civis e administrativos;
c) Caso ocorra atraso no julgamento monocrático, a concessão de efeito suspensivo nos termos do Artigo 285, §3º do CTB, obstou-se a aplicação de quaisquer penalidades ou restrições prontuárias até decisão final.

Nestes termos, roga por deferimento.
[CIDADE], 09 de junho de 2026.

__________________________________________
[NOME DO CONDUTOR]
Requerente`;

      // CHAMADA OFICIAL DO SEGUNDO MOTOR - GEMINI 2.5 PRO
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.1 } // Temperatura baixa para evitar alucinações jurídicas
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
