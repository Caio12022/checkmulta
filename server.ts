import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { artigos } from "./src/data/artigos";

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

// ==========================================
// SEO SERVER-SIDE: meta tags corretas por rota
// ==========================================
const BASE_URL = "https://checkmulta.com.br";

function esc(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugifyCategoria(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface MetaInfo {
  title: string;
  description: string;
  url: string;
}

function getMetaParaRota(pathname: string): MetaInfo {
  // Home (padrão)
  const home: MetaInfo = {
    title: "Sua multa dá pra recorrer? Descubra grátis com IA | CheckMulta",
    description: "Sua multa pode ter um erro formal que abre margem pra recurso. Nossa IA verifica grátis em 60s e entrega a petição pronta. Sem cadastro, sem advogado.",
    url: `${BASE_URL}/`,
  };

  if (pathname === "/" || pathname === "") return home;

  // Procon (landing da vertical B2B)
  if (pathname === "/procon" || pathname === "/procon/") {
    return {
      title: "Auto de infração do Procon: analise grátis os vícios da autuação | CheckMulta",
      description: "Sua empresa foi autuada pelo Procon? Nossa IA verifica grátis se o auto tem vício formal e entrega a defesa administrativa fundamentada no CDC e no Decreto 2.181/97.",
      url: `${BASE_URL}/procon`,
    };
  }

  // Blog (listagem)
  if (pathname === "/blog" || pathname === "/blog/") {
    return {
      title: "Blog CheckMulta — Tudo sobre Multas de Trânsito",
      description: "Guias práticos sobre como recorrer de multas, prazos, pontos na CNH e seus direitos como condutor. Analise sua multa grátis com nossa IA.",
      url: `${BASE_URL}/blog`,
    };
  }

  // Página de categoria: /blog/categoria/:categoria
  const matchCategoria = pathname.match(/^\/blog\/categoria\/([^/]+)\/?$/);
  if (matchCategoria) {
    const slugCat = matchCategoria[1];
    const artigoDaCat = artigos.find((a) => slugifyCategoria(a.categoria) === slugCat);
    const nomeCat = artigoDaCat ? artigoDaCat.categoria : "Categoria";
    return {
      title: `${nomeCat} — Blog CheckMulta`,
      description: `Artigos sobre ${nomeCat}: guias práticos sobre multas de trânsito, recursos e seus direitos. Analise sua multa grátis com nossa IA.`,
      url: `${BASE_URL}/blog/categoria/${slugCat}`,
    };
  }

  // Artigo: /blog/:slug
  const matchArtigo = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (matchArtigo) {
    const slug = matchArtigo[1];
    const artigo = artigos.find((a) => a.slug === slug);
    if (artigo) {
      return {
        title: `${artigo.titulo} | CheckMulta`,
        description: artigo.descricao,
        url: `${BASE_URL}/blog/${artigo.slug}`,
      };
    }
  }

  // Rota desconhecida: usa a home
  return home;
}

function injetarMeta(html: string, meta: MetaInfo): string {
  const title = esc(meta.title);
  const desc = esc(meta.description);
  const url = meta.url;

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${desc}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${desc}"`);
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));

  // ==========================================
  // ROTA: GERAR PIX (MERCADO PAGO)
  // Aceita valor variável. Padrão 19.90 (CheckMulta trânsito).
  // Procon usa 99.00, enviado pelo front.
  // ==========================================
  app.post("/api/create-payment", async (req, res) => {
    try {
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado." });
      }
      const { email, valor, descricao } = req.body;

      // Valores permitidos (trava de segurança: impede manipulação pelo cliente)
      const VALORES_PERMITIDOS = [19.90, 99.00];
      const valorFinal = VALORES_PERMITIDOS.includes(Number(valor)) ? Number(valor) : 19.90;

      const paymentData = {
        body: {
          transaction_amount: valorFinal,
          description: descricao || "Criação de Recurso - CheckMulta",
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
  // Diagnóstico DOSADO: mostra qual campo falhou e que é grave (a "pista"),
  // mas NÃO entrega a tese jurídica articulada (isso é o produto pago).
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

REGRA DE OURO 2: CASOS FORA DO ESCOPO (retorne APENAS a string indicada, sem mais nada)
- LEI SECA / BAFÔMETRO (Art 165 ou 165-A): retorne APENAS → rejeicao_fora_escopo|Lei Seca / Bafômetro (Art. 165)
- DIREÇÃO PERIGOSA / RACHA (Art 173 ou 308): retorne APENAS → rejeicao_fora_escopo|Direção Perigosa ou Racha (Art. 173/308)
- HOMICÍDIO / LESÃO CULPOSA NO TRÂNSITO (Art 302 ou 303 do CTB): retorne APENAS → rejeicao_fora_escopo|Acidente com vítima (Art. 302/303)
- Qualquer infração penal de trânsito (que exija processo judicial, não apenas administrativo): retorne APENAS → rejeicao_fora_escopo|Infração penal de trânsito

REGRA DE OURO 2.1: HONESTIDADE ABSOLUTA — PROIBIDO INVENTAR ERROS
Você SÓ pode apontar um erro que você REALMENTE vê no documento.
- Se um campo ESTÁ preenchido, você está PROIBIDO de dizer que está faltando.
- Se o INMETRO está presente e válido, você NÃO pode dizer que falta.
- Se o local está descrito, você NÃO pode dizer que falta.
- NUNCA invente falha para gerar relatório de sucesso. É uma violação grave e proibida.
Analise campo por campo de forma factual. Aponte APENAS o que de fato está ausente, incompleto, ilegível ou irregular.

REGRA DE OURO 3: MULTA SEM NENHUMA FALHA REAL
Se após análise honesta você NÃO encontrou NENHUMA falha formal real no documento, retorne APENAS a exata string:
rejeicao_sem_falha

REGRA DE OURO 4: AUDITORIA COM NÍVEL DE VIABILIDADE (quando houver falha real)
Se encontrou falha real, gere o relatório completo classificando a viabilidade honestamente:
- ALTA: erro formal claro e grave (local ausente de verdade, INMETRO vencido de verdade, observações em branco de verdade). Caso forte.
- MÉDIA: há um ângulo questionável mas discutível. Argumento possível, não garantido.
- BAIXA: falha mínima ou teórica. Caso fraco, mas existe margem. O cliente decide se tenta.
IMPORTANTE: Mesmo viabilidade BAIXA gera relatório completo. Não rejeite — o cliente decide. Seja honesto no nível.
Gere o relatório MESMO SE O PRAZO ESTIVER VENCIDO (multas de 2025 ou anteriores).

Responda EXATAMENTE neste formato quando houver falha:

- STATUS DA ANÁLISE: Sucesso - Análise Concluída

DADOS EXTRAÍDOS DO SEU AUTO:
Número do AIT: [Extrair ou colchete se ausente]
Placa: [Extrair]
Renavam: [Extrair]
Data: [Extrair]
Hora: [Extrair]
Local exato: [Extrair]
Órgão Autuador: [Extrair]
Nome: [Extrair]

O QUE ENCONTRAMOS NA SUA MULTA:
[REGRA DE DOSAGEM:
Escreva 2 a 3 frases curtas, linguagem SIMPLES, que qualquer leigo entenda.
DEVE: nomear o campo que falhou (que você REALMENTE viu), dizer por que é problema.
Se MÉDIA ou BAIXA: seja honesto que as chances são menores.
NÃO PODE: citar artigos/incisos, escrever tese jurídica, usar juridiquês.
Tom: amigo que entende explicando, não advogado escrevendo petição.]

- VIABILIDADE DO RECURSO: [APENAS uma palavra: Alta, Média ou Baixa]

[MARCADOR DE VENCIMENTO]:
Após TODO o relatório acima, se a multa for de 2025 ou anterior ou prazo já passou, escreva na última linha APENAS: rejeicao_prazo_expirado
Se o prazo estiver em dia, não escreva esta string.`;

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

  // ==========================================
  // ROTA: ANALISAR AUTO DE INFRAÇÃO DO PROCON (GRÁTIS)
  // Aceita PDF ou imagem. Retorna JSON com os vícios encontrados.
  // Regra central: só aponta vício se copiar o trecho do documento.
  // ==========================================
  app.post("/api/analyze-procon", async (req, res) => {
    try {
      const { fileBase64, mimeType = "application/pdf" } = req.body;
      if (!fileBase64) return res.status(400).json({ error: "Documento ausente." });

      const ai = getAIClient();

      const prompt = `Você é um analista especializado em processo administrativo sancionador do Sistema Nacional de Defesa do Consumidor. Sua função é ler o auto de infração do Procon enviado por uma empresa autuada e identificar vícios formais e materiais que possam ser arguidos em defesa administrativa.

Base normativa: Lei 8.078/90 (CDC) e Decreto 2.181/97, com as alterações do Decreto 10.887/2021.
ANO ATUAL: 2026.

===========================================================
REGRA DE OURO 1 — VALIDAÇÃO ABSOLUTA DO DOCUMENTO
Antes de qualquer análise, verifique se o documento é REALMENTE um auto de infração, notificação ou decisão emitida por um PROCON (órgão de proteção e defesa do consumidor).

RETORNE APENAS a string "documento_invalido", sem mais nada, se o documento for QUALQUER UMA destas coisas:
- Foto aleatória, paisagem, pessoa, tela preta, print de conversa, nota fiscal, contrato
- AUTO DE INFRAÇÃO DE TRÂNSITO (DETRAN, DEMUTRAN, CET, PRF, radar, AIT, placa, RENAVAM, CTB, condutor, velocidade)
- Auto da VIGILÂNCIA SANITÁRIA
- Auto AMBIENTAL (IBAMA, secretaria de meio ambiente)
- Auto do CORPO DE BOMBEIROS (AVCB)
- Auto de FISCALIZAÇÃO MUNICIPAL, posturas, obras ou alvará
- Auto TRABALHISTA (Ministério do Trabalho)
- Qualquer autuação de órgão que NÃO seja o Procon

ATENÇÃO: o simples fato de ser um "auto de infração" NÃO basta. Ele PRECISA ser do Procon. Se o documento cita CTB, placa de veículo, RENAVAM, condutor, radar ou velocidade, é de TRÂNSITO — retorne documento_invalido.

Se você não tiver CERTEZA de que o documento é do Procon, retorne documento_invalido. Na dúvida, rejeite.

- Se for do Procon mas estiver ilegível, retorne APENAS: documento_ilegivel

===========================================================
REGRA ABSOLUTA 1 — CITAÇÃO OBRIGATÓRIA
Você SÓ pode apontar um vício se conseguir copiar, palavra por palavra, o trecho exato do documento que o demonstra.
- Se não encontrar trecho que sustente o vício, NÃO aponte o vício.
- É PROIBIDO citar norma, artigo ou conclusão sem antes ter um trecho real copiado do documento.
- A ausência de um elemento também é vício (ex: auto sem capitulação legal). Nesse caso, copie o trecho da seção onde o elemento deveria constar e explique o que falta. Nunca afirme ausência sem ter lido o documento inteiro.
- Se um campo ESTÁ preenchido, você está PROIBIDO de dizer que falta.
- NUNCA invente vício para gerar resultado positivo. É violação grave.
- Na dúvida entre apontar e não apontar, NÃO aponte.

REGRA ABSOLUTA 2 — PRAZO
Você NUNCA informa prazo de defesa por conta própria. O prazo varia conforme o Procon emissor:
- Decreto federal 2.181/97, art. 42: 20 dias.
- Procons estaduais podem adotar prazo próprio. O Procon-SP adota 15 dias (Lei Estadual 10.177/98).
Procedimento:
1. Procure o prazo indicado no documento. Se encontrar, informe exatamente o que está escrito.
2. Se NÃO encontrar, escreva: "Confira o prazo de defesa indicado no seu auto de infração ou junto ao Procon emissor. O Decreto federal 2.181/97 prevê 20 dias, mas há Procons estaduais com prazo próprio — o Procon-SP, por exemplo, adota 15 dias."
3. NUNCA afirme prazo específico que não esteja escrito no documento.

===========================================================
VÍCIOS A PROCURAR — 16 pontos

NOTIFICAÇÃO
1. Notificação por edital sem esgotamento de diligências (empresa com endereço certo). Art. 42, §2º, Dec. 2.181/97. CRÍTICO.
2. Ausência de notificação pessoal do julgamento (decisão só em diário oficial havendo endereço conhecido). CRÍTICO.
3. Prazo de defesa concedido inferior ao previsto na norma aplicável. ATENÇÃO ESPECIAL: o art. 42 do Decreto 2.181/97 prevê 20 dias. Se o auto conceder prazo MENOR que 20 dias (ex: 10 ou 15 dias), você DEVE apontar este vício, copiando o trecho onde o prazo aparece. Não trate o prazo curto como legítimo só porque está escrito no documento — o prazo escrito no auto é justamente o que se questiona. Exceção: se o auto for de Procon do Estado de São Paulo, o prazo de 15 dias tem base na Lei Estadual 10.177/98 e NÃO é vício; nesse caso, aponte apenas se for menor que 15. CRÍTICO.

COMPETÊNCIA
4. Órgão ou agente sem atribuição (Procon fora da competência territorial ou material). Art. 5º, Dec. 2.181/97. CRÍTICO.
5. Ausência de identificação ou assinatura do agente autuante. ATENÇÃO.

DESCRIÇÃO DA CONDUTA
6. Conduta descrita de forma genérica (não indica prática, consumidor, data ou circunstância). CRÍTICO.
7. Ausência de capitulação legal (não indica qual dispositivo do CDC foi violado). CRÍTICO.
8. Divergência entre conduta descrita e dispositivo capitulado. CRÍTICO.

DOSIMETRIA
9. Multa sem fundamentação dos critérios legais (gravidade, vantagem auferida, condição econômica). Art. 57, CDC + arts. 24 a 28, Dec. 2.181/97. CRÍTICO.
10. Desconsideração do porte da empresa (ME/EPP sem tratamento diferenciado, Dec. 10.887/2021). ATENÇÃO.
11. Multa desproporcional à lesão (art. 33, §4º, Dec. 2.181/97). ATENÇÃO.
12. Estimativa incorreta da condição econômica (faturamento presumido sem base documental; impugnável com documentos contábeis). ATENÇÃO.

PROCESSO
13. Ausência de investigação preliminar quando cabível (art. 33, §1º). VERIFICAR.
14. Cerceamento do contraditório (provas negadas sem motivação, documentos não juntados). CRÍTICO.
15. Decisão sem motivação expressa. CRÍTICO.
16. Vícios formais do auto (ausência de data, local, número de processo, qualificação do autuado, rasuras não ressalvadas). ATENÇÃO.

===========================================================
COMO ESCREVER
- Registro profissional e sóbrio. A leitora é uma empresa autuada, não um advogado.
- Explique o vício em linguagem clara e só depois cite a base normativa.
- Linguagem de POSSIBILIDADE, nunca de garantia. Escreva "há indício de vício que pode ser arguido em defesa". JAMAIS escreva "sua multa será anulada" ou "você vai ganhar".
- Não prometa resultado. Não estime probabilidade de êxito.
- Você informa e instrumentaliza. Não representa ninguém juridicamente.

===========================================================
FORMATO DA RESPOSTA
Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem marcação de código:

{
  "resumo": "Uma a duas frases sobre o estado geral do auto analisado.",
  "orgao_emissor": "Nome do Procon que emitiu, extraído do documento.",
  "numero_auto": "Número do AUTO DE INFRAÇÃO, extraído do documento. Atenção: é diferente do número do processo administrativo. Normalmente aparece no título, no formato 000000/ANO. Se não houver, use string vazia.",
  "numero_processo": "Número do PROCESSO ADMINISTRATIVO, extraído do documento. Atenção: é diferente do número do auto de infração. Se não houver, use string vazia.",
  "empresa_autuada": "Razão social da empresa, extraída do documento.",
  "prazo_identificado": "O prazo copiado do documento, ou a orientação padrão da REGRA 2.",
  "achados": [
    {
      "titulo": "Nome curto do vício",
      "gravidade": "critico",
      "trecho_documento": "Trecho copiado palavra por palavra. OBRIGATÓRIO, não pode ser vazio.",
      "explicacao": "Explicação clara do vício e por que pode ser arguido.",
      "base_legal": "Ex: Art. 42, §2º, do Decreto 2.181/97"
    }
  ],
  "quantidade_criticos": 0,
  "quantidade_atencao": 0,
  "quantidade_verificar": 0,
  "houve_achado": true
}

Regras do JSON:
- "gravidade" só aceita: "critico", "atencao" ou "verificar".
- Se não encontrar nenhum vício: "achados" vazio, "houve_achado": false, e explique no resumo que não foram identificados vícios formais entre os pontos verificados.
- Todo achado DEVE ter "trecho_documento" preenchido com texto real do documento.
- Os contadores devem corresponder à quantidade real de achados de cada gravidade.
- Campos não encontrados no documento: use string vazia "".
- NUNCA confunda "numero_auto" com "numero_processo". São campos distintos do documento. Se só um deles existir, preencha esse e deixe o outro vazio.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { role: "user", parts: [{ inlineData: { data: fileBase64, mimeType: mimeType } }, { text: prompt }] }
        ],
        config: { temperature: 0.0 }
      });

      let resultText = (response.text || "").trim();

      // Casos de rejeição direta
      if (resultText === "documento_invalido" || resultText === "documento_ilegivel") {
        return res.json({ result: resultText });
      }

      // Limpa possíveis cercas de código
      resultText = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any;
      try {
        parsed = JSON.parse(resultText);
      } catch {
        console.error("Falha ao parsear JSON do Procon:", resultText.slice(0, 500));
        return res.status(500).json({ error: "Falha ao processar a análise. Tente novamente." });
      }

      // TRAVA DE SEGURANÇA: descarta qualquer achado sem trecho copiado do documento.
      // É a aplicação prática da regra de citação obrigatória.
      if (Array.isArray(parsed.achados)) {
        parsed.achados = parsed.achados.filter(
          (a: any) => a && typeof a.trecho_documento === "string" && a.trecho_documento.trim().length > 0
        );
      } else {
        parsed.achados = [];
      }

      // Recalcula os contadores no servidor (não confia no que o modelo devolveu)
      parsed.quantidade_criticos = parsed.achados.filter((a: any) => a.gravidade === "critico").length;
      parsed.quantidade_atencao = parsed.achados.filter((a: any) => a.gravidade === "atencao").length;
      parsed.quantidade_verificar = parsed.achados.filter((a: any) => a.gravidade === "verificar").length;
      parsed.houve_achado = parsed.achados.length > 0;

      res.json({ result: parsed });
    } catch (err: any) {
      console.error("API Error in analyze-procon:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // ==========================================
  // ROTA: GERAR DEFESA ADMINISTRATIVA DO PROCON (PAGO)
  // ==========================================
  app.post("/api/generate-defense-procon", async (req, res) => {
    try {
      const { analise } = req.body;
      if (!analise) return res.status(400).json({ error: "analise ausente." });

      const ai = getAIClient();

      const dados = typeof analise === "string" ? analise : JSON.stringify(analise, null, 2);

      const prompt = `Você é um redator especializado em defesa administrativa perante órgãos de proteção e defesa do consumidor. Redija uma DEFESA ADMINISTRATIVA formal a partir da análise fornecida.

--- ANÁLISE DO AUTO DE INFRAÇÃO ---
${dados}

--- REGRAS OBRIGATÓRIAS ---
1. Fundamente APENAS nos vícios listados na análise. É PROIBIDO inventar vício que não conste ali.
2. Para cada vício, cite o trecho do documento que consta no campo "trecho_documento" e a base legal indicada.
3. Use linguagem de possibilidade e requerimento, nunca de garantia de resultado.
4. Mantenha entre colchetes os dados que não constam na análise: [CNPJ], [ENDEREÇO COMPLETO], [NOME DO REPRESENTANTE LEGAL], [CARGO], [CIDADE].
6. NÚMEROS: use o campo "numero_auto" sempre que a peça se referir ao Auto de Infração, e o campo "numero_processo" apenas no cabeçalho do processo administrativo. NUNCA use o número do processo no lugar do número do auto. Se "numero_auto" estiver vazio, escreva [NÚMERO DO AUTO] entre colchetes.
5. NÃO afirme prazo específico. Use a informação do campo "prazo_identificado".

--- ESTRUTURA DA PEÇA ---

ILUSTRÍSSIMO(A) SENHOR(A) DIRETOR(A) DO [ÓRGÃO EMISSOR]

Processo Administrativo nº [NÚMERO DO PROCESSO]

[RAZÃO SOCIAL DA EMPRESA], pessoa jurídica de direito privado, inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO COMPLETO], neste ato representada por [NOME DO REPRESENTANTE LEGAL], [CARGO], vem, respeitosamente, perante Vossa Senhoria, apresentar

DEFESA ADMINISTRATIVA

em face do Auto de Infração nº [NÚMERO], pelas razões de fato e de direito a seguir expostas.

I — DA TEMPESTIVIDADE
[Parágrafo sobre a apresentação da defesa dentro do prazo, referindo-se ao prazo indicado no auto de infração e ao art. 42 do Decreto 2.181/97, sem afirmar número de dias que não conste no documento.]

II — DOS FATOS
[Resumo objetivo da autuação conforme descrita no auto.]

III — DAS PRELIMINARES
[Para cada vício de gravidade "critico" da análise, redija uma subseção numerada. Cada subseção deve: nomear o vício, transcrever entre aspas o trecho do documento, explicar tecnicamente por que configura vício, e citar a base legal. Requerer ao final a nulidade do auto.]

IV — DO MÉRITO
[Para cada vício de gravidade "atencao" ou "verificar", redija uma subseção. Mesma estrutura: trecho, explicação, base legal. Inclua aqui os argumentos de dosimetria, requerendo subsidiariamente a redução da penalidade.]

V — DOS PEDIDOS
Ante o exposto, requer:
a) O acolhimento das preliminares arguidas, com a declaração de nulidade do Auto de Infração nº [NÚMERO] e o consequente arquivamento do processo administrativo;
b) Subsidiariamente, caso superadas as preliminares, o acolhimento das razões de mérito para afastar a penalidade aplicada;
c) Subsidiariamente, a redução do valor da multa, em observância aos critérios do art. 57 da Lei 8.078/90 e dos arts. 24 a 28 do Decreto 2.181/97, considerando a condição econômica da autuada e a proporcionalidade da sanção;
d) A produção de prova documental superveniente, bem como a juntada de cópia integral do processo administrativo, sob pena de cerceamento de defesa;
e) Que todas as intimações sejam dirigidas ao endereço constante desta peça.

Nestes termos, pede deferimento.

[CIDADE], [DATA].

_______________________________________
[RAZÃO SOCIAL DA EMPRESA]
[NOME DO REPRESENTANTE LEGAL] — [CARGO]

---

AVISO IMPORTANTE
Este documento é material informativo produzido por inteligência artificial a partir do auto de infração enviado. Não constitui consultoria jurídica nem representação processual. Confira o prazo e a forma de protocolo junto ao Procon emissor antes de apresentar sua defesa — alguns órgãos exigem protocolo presencial ou por via postal e não aceitam envio eletrônico. Para casos de maior complexidade ou valor, recomenda-se a consulta a um advogado.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in generate-defense-procon:", err);
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

    // Carrega o index.html uma vez na memória
    const indexHtmlPath = path.join(distPath, "index.html");
    let indexHtml = "";
    try {
      indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    } catch (e) {
      console.error("Não foi possível ler dist/index.html:", e);
    }

    app.use(express.static(distPath, { index: false }));

    // SEO: injeta meta tags corretas por rota antes de enviar o HTML
    app.get("*", (req, res) => {
      if (!indexHtml) {
        return res.sendFile(indexHtmlPath);
      }
      const meta = getMetaParaRota(req.path);
      const html = injetarMeta(indexHtml, meta);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
