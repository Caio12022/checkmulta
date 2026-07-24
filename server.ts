import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { artigos } from "./src/data/artigos";
import { artigosProcon } from "./src/data/artigosProcon";
import { artigosVigilancia } from "./src/data/artigosVigilancia";

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

  // Vigilância Sanitária (landing)
  if (pathname === "/vigilancia-sanitaria" || pathname === "/vigilancia-sanitaria/") {
    return {
      title: "Auto de infração da Vigilância Sanitária: veja se dá para recorrer | CheckMulta",
      description: "Seu estabelecimento foi autuado pela Vigilância Sanitária? Nossa IA verifica grátis se o auto tem falha e entrega a defesa administrativa pronta para protocolo.",
      url: `${BASE_URL}/vigilancia-sanitaria`,
    };
  }

  // Blog Vigilância Sanitária (listagem)
  if (pathname === "/vigilancia-sanitaria/blog" || pathname === "/vigilancia-sanitaria/blog/") {
    return {
      title: "Blog Vigilância Sanitária — Defesa de auto de infração | CheckMulta",
      description: "Guias sobre auto de infração da Vigilância Sanitária: prazos, interdição, defesa administrativa e direitos do estabelecimento autuado.",
      url: `${BASE_URL}/vigilancia-sanitaria/blog`,
    };
  }

  // Artigo da Vigilância: /vigilancia-sanitaria/blog/:slug
  const matchArtigoVig = pathname.match(/^\/vigilancia-sanitaria\/blog\/([^/]+)\/?$/);
  if (matchArtigoVig) {
    const slugVig = matchArtigoVig[1];
    const artigoVig = artigosVigilancia.find((a) => a.slug === slugVig);
    if (artigoVig) {
      return {
        title: `${artigoVig.titulo} | CheckMulta`,
        description: artigoVig.descricao,
        url: `${BASE_URL}/vigilancia-sanitaria/blog/${artigoVig.slug}`,
      };
    }
  }

  // Blog Procon (listagem)
  if (pathname === "/procon/blog" || pathname === "/procon/blog/") {
    return {
      title: "Blog Procon — Defesa de auto de infração para empresas | CheckMulta",
      description: "Guias sobre auto de infração do Procon: prazos, vícios formais, defesa administrativa e direitos da empresa autuada. Fundamentado no CDC e no Decreto 2.181/97.",
      url: `${BASE_URL}/procon/blog`,
    };
  }

  // Artigo do Procon: /procon/blog/:slug
  const matchArtigoProcon = pathname.match(/^\/procon\/blog\/([^/]+)\/?$/);
  if (matchArtigoProcon) {
    const slugProcon = matchArtigoProcon[1];
    const artigoProcon = artigosProcon.find((a) => a.slug === slugProcon);
    if (artigoProcon) {
      return {
        title: `${artigoProcon.titulo} | CheckMulta Procon`,
        description: artigoProcon.descricao,
        url: `${BASE_URL}/procon/blog/${artigoProcon.slug}`,
      };
    }
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

// ==========================================
// SITEMAP DINÂMICO
// Gerado a partir dos artigos reais, a cada requisição.
// Nunca desatualiza: quando os robôs publicam, o sitemap já reflete.
// ==========================================
function gerarSitemap(): string {
  const hoje = new Date().toISOString().split("T")[0];
  const urls: { loc: string; priority: string; changefreq: string }[] = [];

  // Home e landings
  urls.push({ loc: `${BASE_URL}/`, priority: "1.0", changefreq: "weekly" });
  urls.push({ loc: `${BASE_URL}/procon`, priority: "0.9", changefreq: "weekly" });

  urls.push({ loc: `${BASE_URL}/vigilancia-sanitaria`, priority: "0.9", changefreq: "weekly" });

  // Listagens de blog
  urls.push({ loc: `${BASE_URL}/blog`, priority: "0.8", changefreq: "daily" });
  urls.push({ loc: `${BASE_URL}/procon/blog`, priority: "0.8", changefreq: "daily" });

  urls.push({ loc: `${BASE_URL}/vigilancia-sanitaria/blog`, priority: "0.8", changefreq: "daily" });

  // Categorias do blog de trânsito (sem repetir)
  const categorias = new Set(artigos.map((a) => slugifyCategoria(a.categoria)));
  categorias.forEach((slug) => {
    urls.push({
      loc: `${BASE_URL}/blog/categoria/${slug}`,
      priority: "0.6",
      changefreq: "weekly",
    });
  });

  // Artigos de trânsito
  artigos.forEach((a) => {
    urls.push({
      loc: `${BASE_URL}/blog/${a.slug}`,
      priority: "0.7",
      changefreq: "monthly",
    });
  });

  // Artigos do Procon
  artigosProcon.forEach((a) => {
    urls.push({
      loc: `${BASE_URL}/procon/blog/${a.slug}`,
      priority: "0.7",
      changefreq: "monthly",
    });
  });

  // Artigos da Vigilância Sanitária
  artigosVigilancia.forEach((a) => {
    urls.push({
      loc: `${BASE_URL}/vigilancia-sanitaria/blog/${a.slug}`,
      priority: "0.7",
      changefreq: "monthly",
    });
  });

  const corpo = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${hoje}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>`;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));

  // ==========================================
  // SITEMAP E ROBOTS (dinâmicos)
  // Declarados antes do static, para terem prioridade sobre arquivos em /public
  // ==========================================
  app.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(gerarSitemap());
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  });

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
      const VALORES_PERMITIDOS = [19.90, 79.00, 99.00];
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

REGRA DE OURO 2.2: EVASÃO DE PEDÁGIO EM FREE FLOW (pedágio sem cancela)
Se o auto for de EVASÃO DE PEDÁGIO (Art. 209-A do CTB) em sistema de LIVRE PASSAGEM / FREE FLOW — identificável por menções a "free flow", "livre passagem", "pórtico", "sem cancela", "tarifa de pedágio não paga" ou "Art. 209-A" —, retorne APENAS a string:
rejeicao_fora_escopo|Evasão de pedágio em free flow

MOTIVO (não escreva isto na resposta, é apenas seu contexto): a Deliberação CONTRAN nº 277/2026 suspendeu a aplicação dessas multas e abriu prazo até 16 de novembro de 2026 para o motorista regularizar a tarifa sem multa e sem pontos na CNH. Nesse cenário, elaborar recurso é desnecessário — o caminho correto é pagar a tarifa dentro do prazo. Não faz sentido cobrar por uma petição que o usuário não precisa.

ATENÇÃO: esta regra vale para autuações por NÃO PAGAMENTO da tarifa. Se o auto for de outra infração ocorrida em rodovia com pedágio (excesso de velocidade em pórtico, por exemplo), NÃO se aplica — analise normalmente.

REGRA DE OURO 2.1: HONESTIDADE ABSOLUTA — PROIBIDO INVENTAR ERROS
Você SÓ pode apontar um erro que você REALMENTE vê no documento.
- Se um campo ESTÁ preenchido, você está PROIBIDO de dizer que está faltando.
- Se o INMETRO está presente e válido, você NÃO pode dizer que falta.
- Se o local está descrito, você NÃO pode dizer que falta.
- NUNCA invente falha para gerar relatório de sucesso. É uma violação grave e proibida.
Analise campo por campo de forma factual. Aponte APENAS o que de fato está ausente, incompleto, ilegível ou irregular.

REGRA DE OURO 2.5: CITAÇÃO DE NORMAS (lista fechada)
Você SÓ pode citar número de artigo, lei ou resolução que esteja na lista abaixo. Fora dela, use apenas o nome do princípio ou expressão geral.

VOCÊ PODE CITAR:
1. Código de Trânsito Brasileiro (Lei 9.503/97). Dispositivos seguros: art. 208 e 209 (avanço de sinal e transposição), art. 218 (velocidade), art. 230 (equipamentos e documentação), art. 244 (motocicletas), art. 252 (condução irregular), art. 280 (requisitos do auto de infração), art. 281 e 282 (julgamento e notificação), art. 285 e 286 (recurso à JARI).
2. Manual Brasileiro de Fiscalização de Trânsito (MBFT), citado pelo nome, sem número de item.
3. Princípios gerais, citados pelo nome e sem número: legalidade, motivação, proporcionalidade, razoabilidade, contraditório, ampla defesa, devido processo legal, presunção de legitimidade.
4. Qualquer norma cujo número esteja ESCRITO no próprio documento analisado — aí você apenas repete o que o auto diz.

VOCÊ ESTÁ PROIBIDO DE CITAR:
- Resolução CONTRAN por número, salvo se estiver escrita no documento.
- Portaria, deliberação ou instrução normativa por número.
- Leis estaduais ou municipais de trânsito.
- Súmulas, jurisprudência ou precedentes.

REGRA DE FECHAMENTO: se a norma que você quer citar não estiver nos itens 1 a 4, NÃO cite número nenhum. É melhor fundamentar em princípio correto do que em artigo inventado.

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
COMO CLASSIFICAR A GRAVIDADE (critério obrigatório)

A gravidade NÃO é escolha livre. Aplique este teste, nesta ordem:

"critico" — use APENAS se a falha, sozinha, comprometeria a validade do ato ou impediria o exercício da defesa. Pergunte: sem corrigir isso, o processo poderia seguir? Se a resposta é não, é crítico.
Exemplos do que É crítico:
- Intimação nula ou entregue a quem não representa o estabelecimento
- Ausência TOTAL de indicação da norma violada
- Irregularidade descrita de forma tão vaga que o autuado não sabe do que se defende
- Interdição total sem qualquer justificativa para não adotar a parcial
- Decisão sem nenhuma motivação
- Prazo de defesa menor que o previsto na norma citada no próprio auto

"atencao" — use quando a falha enfraquece o ato e é argumentável, mas o processo ainda se sustenta e a defesa é possível.
Exemplos do que É atenção:
- Ausência de assinatura ou matrícula do agente, estando o restante completo
- Divergência menor entre a conduta descrita e a norma citada
- Desconsideração do porte do estabelecimento na dosimetria
- Ausência de registro fotográfico onde ele seria esperado

"verificar" — use quando há imprecisão ou omissão de detalhe, mas o ato está substancialmente correto e a falha é discutível.
Exemplos do que É verificar:
- Fundamentação da multa presente, porém sem memória de cálculo detalhada
- Menção genérica a "antecedentes" ou "circunstâncias" sem especificá-los
- Pequenas omissões de dado secundário que não prejudicam a compreensão
- Imprecisão de redação que não gera dúvida sobre o que se imputa

TESTE DE CALIBRAGEM — aplique antes de fechar a classificação:
Se o auto descreve a irregularidade de forma concreta, indica a norma violada, identifica o agente e concede prazo, então ele NÃO tem falha crítica, por mais que a dosimetria seja pouco detalhada. Nesse cenário a classificação correta é "atencao" ou "verificar".

É ERRO GRAVE classificar como "critico" uma falha que é apenas de detalhamento. Se tudo for crítico, a classificação perde utilidade para o leitor. Na dúvida entre dois níveis, escolha SEMPRE o menor.

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


  // ==========================================
  // ROTA: ANALISAR AUTO DA VIGILÂNCIA SANITÁRIA (GRÁTIS)
  // Aceita PDF ou imagem. Retorna JSON com as falhas encontradas.
  // Regra central: só aponta falha se copiar o trecho do documento.
  // ==========================================
  app.post("/api/analyze-vigilancia", async (req, res) => {
    try {
      const { fileBase64, mimeType = "application/pdf" } = req.body;
      if (!fileBase64) return res.status(400).json({ error: "Documento ausente." });

      const ai = getAIClient();

      const prompt = `Você é um analista especializado em processo administrativo sanitário brasileiro. Sua função é ler o auto de infração da Vigilância Sanitária enviado por um estabelecimento autuado e identificar falhas formais que possam ser arguidas em defesa administrativa.

Base normativa: Lei Federal nº 6.437/77 e princípios gerais do processo administrativo.
ANO ATUAL: 2026.

===========================================================
REGRA DE OURO 1 — VALIDAÇÃO ABSOLUTA DO DOCUMENTO
Antes de qualquer análise, verifique se o documento é REALMENTE um auto de infração, termo de intimação, termo de interdição ou decisão emitida por órgão de VIGILÂNCIA SANITÁRIA (municipal, estadual ou ANVISA).

RETORNE APENAS a string "documento_invalido", sem mais nada, se o documento for QUALQUER UMA destas coisas:
- Foto aleatória, paisagem, pessoa, tela preta, print de conversa, nota fiscal, contrato, cardápio
- AUTO DE INFRAÇÃO DE TRÂNSITO (DETRAN, radar, AIT, placa, RENAVAM, CTB, condutor, velocidade)
- Auto do PROCON ou de órgão de defesa do consumidor
- Auto AMBIENTAL (IBAMA, secretaria de meio ambiente)
- Auto do CORPO DE BOMBEIROS (AVCB)
- Auto TRABALHISTA (Ministério do Trabalho)
- Auto de FISCALIZAÇÃO TRIBUTÁRIA ou de posturas municipais sem natureza sanitária
- Alvará, licença ou certificado (documento que NÃO é autuação)
- Qualquer autuação de órgão que NÃO seja de vigilância sanitária

ATENÇÃO: o simples fato de ser um "auto de infração" NÃO basta. Ele PRECISA ser sanitário. Se o documento cita CTB, placa de veículo, RENAVAM, condutor ou radar, é de TRÂNSITO — retorne documento_invalido. Se cita relação de consumo, CDC ou Decreto 2.181/97, é do PROCON — retorne documento_invalido.

Se você não tiver CERTEZA de que o documento é de vigilância sanitária, retorne documento_invalido. Na dúvida, rejeite.

- Se for sanitário mas estiver ilegível, retorne APENAS: documento_ilegivel

===========================================================
REGRA ABSOLUTA 1 — CITAÇÃO OBRIGATÓRIA
Você SÓ pode apontar uma falha se conseguir copiar, palavra por palavra, o trecho exato do documento que a demonstra.
- Se não encontrar trecho que sustente a falha, NÃO aponte a falha.
- É PROIBIDO citar norma, artigo ou conclusão sem antes ter um trecho real copiado do documento.
- A ausência de um elemento também é falha (ex: auto sem indicação da norma violada). Nesse caso, copie o trecho da seção onde o elemento deveria constar e explique o que falta. Nunca afirme ausência sem ter lido o documento inteiro.
- Se um campo ESTÁ preenchido, você está PROIBIDO de dizer que falta.
- NUNCA invente falha para gerar resultado positivo. É violação grave.
- Na dúvida entre apontar e não apontar, NÃO aponte.

REGRA ABSOLUTA 2 — PRAZO
Você NUNCA informa prazo de defesa por conta própria. A legislação sanitária brasileira é FRAGMENTADA: a Lei Federal 6.437/77 rege as infrações sanitárias federais, mas cada estado e cada município possui código sanitário próprio, com prazos que variam.
Procedimento:
1. Procure o prazo indicado no documento. Se encontrar, informe exatamente o que está escrito.
2. Se NÃO encontrar, escreva: "Confira o prazo de defesa indicado no seu auto de infração ou junto ao órgão de vigilância sanitária emissor. A legislação sanitária varia entre União, estados e municípios."
3. NUNCA afirme prazo específico que não esteja escrito no documento.

REGRA ABSOLUTA 3 — CITAÇÃO DE NORMAS (lista fechada)
A legislação sanitária é fragmentada e você NÃO tem como saber qual código municipal ou estadual se aplica. Por isso existe uma LISTA FECHADA do que você pode citar.

VOCÊ PODE CITAR APENAS:
1. Lei Federal nº 6.437/77 — infrações à legislação sanitária federal. Dispositivos seguros: art. 2º (competência), art. 3º e 4º (dosimetria e circunstâncias), art. 10 (infrações), art. 31 (prazo de defesa), art. 33 (interdição).
2. Lei Federal nº 9.784/99 — processo administrativo. Dispositivos seguros: art. 2º (princípios da Administração), art. 50 (dever de motivar os atos). SEMPRE acrescente a ressalva "aplicável subsidiariamente", porque esta lei rege o processo administrativo federal e sua aplicação a órgãos estaduais e municipais é subsidiária.
3. Princípios gerais, citados pelo nome e sem número de artigo: legalidade, motivação, proporcionalidade, razoabilidade, contraditório, ampla defesa, devido processo legal.
4. Qualquer norma cujo número esteja ESCRITO no próprio documento analisado — nesse caso você está apenas repetindo o que o auto diz.

VOCÊ ESTÁ PROIBIDO DE CITAR:
- Códigos sanitários estaduais ou municipais por número.
- RDC ou Resolução da ANVISA por número.
- Portarias, decretos ou instruções normativas por número.
- Qualquer lei federal que não seja a 6.437/77 ou a 9.784/99.
- Súmulas, jurisprudência ou precedentes.

REGRA DE FECHAMENTO: se a norma que você quer citar não estiver na lista dos itens 1 a 4 acima, NÃO cite número nenhum. Use apenas o nome do princípio aplicável. É melhor fundamentar em princípio correto do que em artigo inventado.

===========================================================
FALHAS A PROCURAR

INTIMAÇÃO E NOTIFICAÇÃO
1. Intimação entregue a pessoa sem poderes de representação do estabelecimento. CRÍTICO.
2. Intimação enviada a endereço divergente do cadastro, sem comprovação de recebimento. CRÍTICO.
3. Ausência de notificação da decisão, havendo endereço conhecido. CRÍTICO.
4. Prazo de defesa concedido inferior ao previsto na norma indicada no próprio documento. CRÍTICO.

COMPETÊNCIA E IDENTIFICAÇÃO
5. Ausência de identificação ou assinatura do agente fiscalizador. ATENÇÃO.
6. Atuação de órgão fora de sua competência territorial. CRÍTICO.

DESCRIÇÃO DA IRREGULARIDADE
7. Irregularidade descrita de forma genérica, sem indicar o que foi concretamente constatado (ex: apenas "condições inadequadas de higiene" sem detalhar). CRÍTICO.
8. Ausência de indicação da norma sanitária violada. CRÍTICO.
9. Divergência entre a irregularidade descrita e a norma indicada. CRÍTICO.
10. Ausência de registro fotográfico ou de coleta de amostra quando o auto se refere a produto ou condição que exigiria comprovação. ATENÇÃO.

PROPORCIONALIDADE E DOSIMETRIA
11. Interdição total quando a interdição parcial (de setor, equipamento ou lote) seria suficiente, sem justificativa para a medida ampla. CRÍTICO.
12. Ausência de fundamentação dos critérios que levaram ao valor da multa ou à escolha da penalidade. CRÍTICO.
13. Desconsideração do porte do estabelecimento na dosimetria. ATENÇÃO.
14. Penalidade manifestamente desproporcional à irregularidade descrita. ATENÇÃO.

PROCEDIMENTO
15. Autuação direta quando o documento indica que havia previsão de termo de intimação com prazo prévio para regularização. ATENÇÃO.
16. Cerceamento do contraditório: provas negadas sem motivação, ausência de documentos essenciais no processo. CRÍTICO.
17. Decisão sem motivação expressa. CRÍTICO.
18. Falhas formais do auto: ausência de data, hora, local, número do processo, qualificação completa do autuado, ou rasuras não ressalvadas. ATENÇÃO.

===========================================================
COMO ESCREVER
- Registro profissional e sóbrio. A leitora é uma empresa autuada, não um advogado.
- Explique a falha em linguagem clara e só depois cite a base normativa.
- Linguagem de POSSIBILIDADE, nunca de garantia. Escreva "há indício de falha que pode ser arguida em defesa". JAMAIS escreva "o auto será anulado" ou "você vai ganhar".
- Não prometa resultado. Não estime probabilidade de êxito.
- Você informa e instrumentaliza. Não representa ninguém juridicamente.
- ATENÇÃO ESPECIAL: em casos de interdição, NUNCA sugira que o estabelecimento volte a operar antes da liberação oficial. Isso poderia causar dano à saúde pública e responsabilização criminal do autuado.

===========================================================
FORMATO DA RESPOSTA
Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem marcação de código:

{
  "resumo": "Uma a duas frases sobre o estado geral do auto analisado.",
  "orgao_emissor": "Nome do órgão de vigilância sanitária que emitiu, extraído do documento.",
  "numero_auto": "Número do AUTO DE INFRAÇÃO, extraído do documento. Se não houver, use string vazia.",
  "numero_processo": "Número do PROCESSO ADMINISTRATIVO, extraído do documento. É diferente do número do auto. Se não houver, use string vazia.",
  "empresa_autuada": "Razão social ou nome do estabelecimento, extraído do documento.",
  "prazo_identificado": "O prazo copiado do documento, ou a orientação padrão da REGRA 2.",
  "achados": [
    {
      "titulo": "Nome curto da falha",
      "gravidade": "critico",
      "trecho_documento": "Trecho copiado palavra por palavra. OBRIGATÓRIO, não pode ser vazio.",
      "explicacao": "Explicação clara da falha e por que pode ser arguida.",
      "base_legal": "Ex: Lei 6.437/77 ou 'princípio da motivação do ato administrativo'. Se não tiver certeza da norma, use o princípio geral."
    }
  ],
  "quantidade_criticos": 0,
  "quantidade_atencao": 0,
  "quantidade_verificar": 0,
  "houve_achado": true
}

Regras do JSON:
- "gravidade" só aceita: "critico", "atencao" ou "verificar".
- Se não encontrar nenhuma falha: "achados" vazio, "houve_achado": false, e explique no resumo que não foram identificadas falhas formais entre os pontos verificados.
- Todo achado DEVE ter "trecho_documento" preenchido com texto real do documento.
- Os contadores devem corresponder à quantidade real de achados de cada gravidade.
- Campos não encontrados no documento: use string vazia "".
- NUNCA confunda "numero_auto" com "numero_processo".`;

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
        console.error("Falha ao parsear JSON da Vigilância:", resultText.slice(0, 500));
        return res.status(500).json({ error: "Falha ao processar a análise. Tente novamente." });
      }

      // TRAVA DE SEGURANÇA: descarta qualquer achado sem trecho copiado do documento.
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
      console.error("API Error in analyze-vigilancia:", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        return res.status(429).json({ error: "SERVER_BUSY" });
      }
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // ==========================================
  // ROTA: GERAR DEFESA DA VIGILÂNCIA SANITÁRIA (PAGO)
  // ==========================================
  app.post("/api/generate-defense-vigilancia", async (req, res) => {
    try {
      const { analise } = req.body;
      if (!analise) return res.status(400).json({ error: "analise ausente." });

      const ai = getAIClient();

      const dados = typeof analise === "string" ? analise : JSON.stringify(analise, null, 2);

      const prompt = `Você é um redator especializado em defesa administrativa perante órgãos de vigilância sanitária. Redija uma DEFESA ADMINISTRATIVA formal a partir da análise fornecida.

--- ANÁLISE DO AUTO DE INFRAÇÃO ---
${dados}

--- REGRAS OBRIGATÓRIAS ---
1. Fundamente APENAS nas falhas listadas na análise. É PROIBIDO inventar falha que não conste ali.
2. Para cada falha, cite o trecho do documento que consta no campo "trecho_documento" e a base legal indicada.
3. Use linguagem de possibilidade e requerimento, nunca de garantia de resultado.
4. Mantenha entre colchetes os dados que não constam na análise: [CNPJ], [ENDEREÇO COMPLETO], [NOME DO REPRESENTANTE LEGAL], [CARGO], [CIDADE].
5. NÃO afirme prazo específico. Use a informação do campo "prazo_identificado".
6. NÚMEROS: use "numero_auto" ao se referir ao Auto de Infração e "numero_processo" apenas no cabeçalho do processo administrativo. Se "numero_auto" estiver vazio, escreva [NÚMERO DO AUTO].
7. CITAÇÃO DE NORMAS: você pode citar a Lei Federal 6.437/77 e princípios gerais do processo administrativo. NÃO invente números de códigos sanitários estaduais ou municipais, nem RDC da ANVISA — salvo se constarem na análise fornecida.
8. Se a análise mencionar interdição, a peça NUNCA deve sugerir retomada da operação antes da liberação oficial pelo órgão.

--- ESTRUTURA DA PEÇA ---

ILUSTRÍSSIMO(A) SENHOR(A) AUTORIDADE SANITÁRIA DO [ÓRGÃO EMISSOR]

Processo Administrativo nº [NÚMERO DO PROCESSO]

[RAZÃO SOCIAL DO ESTABELECIMENTO], pessoa jurídica de direito privado, inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO COMPLETO], neste ato representada por [NOME DO REPRESENTANTE LEGAL], [CARGO], vem, respeitosamente, perante Vossa Senhoria, apresentar

DEFESA ADMINISTRATIVA

em face do Auto de Infração nº [NÚMERO], pelas razões de fato e de direito a seguir expostas.

I — DA TEMPESTIVIDADE
[Parágrafo sobre a apresentação da defesa dentro do prazo, referindo-se ao prazo indicado no auto de infração, sem afirmar número de dias que não conste no documento.]

II — DOS FATOS
[Resumo objetivo da autuação conforme descrita no auto.]

III — DAS PRELIMINARES
[Para cada falha de gravidade "critico" da análise, redija uma subseção numerada. Cada subseção deve: nomear a falha, transcrever entre aspas o trecho do documento, explicar tecnicamente por que configura vício do ato administrativo, e citar a base legal ou o princípio aplicável. Requerer ao final a nulidade do auto.]

IV — DO MÉRITO
[Para cada falha de gravidade "atencao" ou "verificar", redija uma subseção. Mesma estrutura: trecho, explicação, base legal. Inclua aqui os argumentos de proporcionalidade e dosimetria, requerendo subsidiariamente a redução ou substituição da penalidade.]

V — DAS PROVIDÊNCIAS ADOTADAS
[Seção com espaço para o estabelecimento descrever as correções já realizadas. Use marcadores entre colchetes para o autuado preencher, por exemplo: [DESCREVER AS CORREÇÕES REALIZADAS E ANEXAR COMPROVANTES: notas fiscais de reforma, laudos de dedetização, registros fotográficos, certificados de limpeza de reservatório].]

VI — DOS PEDIDOS
Ante o exposto, requer:
a) O acolhimento das preliminares arguidas, com a declaração de nulidade do Auto de Infração nº [NÚMERO] e o consequente arquivamento do processo administrativo;
b) Subsidiariamente, caso superadas as preliminares, o acolhimento das razões de mérito para afastar a penalidade aplicada;
c) Subsidiariamente, a substituição ou redução da penalidade, em observância aos princípios da proporcionalidade e da razoabilidade, considerando as providências já adotadas pelo estabelecimento;
d) A realização de reinspeção, a fim de que seja constatada a regularização das condições apontadas;
e) A produção de prova documental superveniente, bem como a juntada de cópia integral do processo administrativo, sob pena de cerceamento de defesa;
f) Que todas as intimações sejam dirigidas ao endereço constante desta peça.

Nestes termos, pede deferimento.

[CIDADE], [DATA].

_______________________________________
[RAZÃO SOCIAL DO ESTABELECIMENTO]
[NOME DO REPRESENTANTE LEGAL] — [CARGO]

---

AVISO IMPORTANTE
Este documento é material informativo produzido por inteligência artificial a partir do auto de infração enviado. Não constitui consultoria jurídica nem representação processual. Confira o prazo e a forma de protocolo junto ao órgão de vigilância sanitária emissor antes de apresentar sua defesa. Em caso de interdição, não retome a operação antes da liberação oficial do órgão. Para casos de maior complexidade, risco de cancelamento de licença ou valor elevado, recomenda-se a consulta a um advogado.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0 }
      });

      const resultText = response.text || "";
      res.json({ result: resultText.trim() });
    } catch (err: any) {
      console.error("API Error in generate-defense-vigilancia:", err);
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
