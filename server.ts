import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { artigos } from "./src/data/artigos";
import { artigosProcon } from "./src/data/artigosProcon";
import { artigosVigilancia } from "./src/data/artigosVigilancia";
import { infracoes, calcularValor, formatarReal, NOMES_GRAVIDADE } from "./src/data/infracoes";
import { PROMPT_ANALYZE_TICKET, promptGenerateDefense } from "./prompts/transito";
import { PROMPT_ANALYZE_PROCON, promptGenerateDefenseProcon } from "./prompts/procon";
import { PROMPT_ANALYZE_VIGILANCIA, promptGenerateDefenseVigilancia } from "./prompts/vigilancia";
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
function tituloCurtoInfracao(descricao: string): string {
  const corte = descricao.split(/\s+-\s+|\s+e\s+(?=[A-ZÀ-Ú])/)[0].trim();
  return corte.length > 90 ? corte.slice(0, 90).trim() + "…" : corte;
}

function metaSimulador(pathname: string): MetaInfo | null {
  if (pathname !== "/simulador-pontos" && pathname !== "/simulador-pontos/") return null;
  return {
    title: "Simulador de pontos na CNH: veja se você está perto da suspensão | CheckMulta",
    description:
      "Some suas multas dos últimos 12 meses e descubra quantos pontos faltam para a suspensão da CNH. O limite muda conforme as infrações gravíssimas: 20, 30 ou 40 pontos. Simulação gratuita.",
    url: `${BASE_URL}/simulador-pontos`,
  };
}

function metaInfracao(pathname: string): MetaInfo | null {
  if (pathname === "/infracao" || pathname === "/infracao/") {
    return {
      title: "Consulta de código de infração de trânsito: valor e pontos | CheckMulta",
      description:
        "Digite o código do seu auto de infração e veja na hora o valor da multa, os pontos na CNH, a gravidade e o artigo do CTB. Tabela oficial da SENATRAN, consulta gratuita.",
      url: `${BASE_URL}/infracao`,
    };
  }

  const m = pathname.match(/^\/infracao\/([^/]+)\/?$/);
  if (!m) return null;

  const param = decodeURIComponent(m[1]).toLowerCase();
  const infracao =
    infracoes.find((i) => i.slug === param) ||
    infracoes.find((i) => i.codigoUrl === param) ||
    infracoes.find((i) => i.codigo === param.replace(/-.*$/, ""));

  if (!infracao) return null;

  const titulo = tituloCurtoInfracao(infracao.descricao);
  const valor = calcularValor(infracao);
  const descricao =
    valor !== null
      ? `Código ${infracao.codigo}: ${titulo}. Infração ${NOMES_GRAVIDADE[
          infracao.gravidade
        ].toLowerCase()}, multa de ${formatarReal(valor)} e ${infracao.pontos} ponto${
          infracao.pontos === 1 ? "" : "s"
        } na CNH. Veja se o auto tem erro formal e analise grátis.`
      : `Código ${infracao.codigo}: ${titulo}. Entenda o enquadramento no art. ${infracao.amparoLegal} do CTB e analise seu auto de infração grátis.`;

  return {
    title: `Código ${infracao.codigo} — ${titulo} | CheckMulta`,
    description: descricao,
    url: `${BASE_URL}/infracao/${infracao.slug}`,
  };
}

function getMetaParaRota(pathname: string): MetaInfo {
  // Home (padrão)
  const home: MetaInfo = {
    title: "Sua multa dá pra recorrer? Descubra grátis com IA | CheckMulta",
    description: "Sua multa pode ter um erro formal que abre margem pra recurso. Nossa IA verifica grátis em 60s e entrega a petição pronta. Sem cadastro, sem advogado.",
    url: `${BASE_URL}/`,
  };

  if (pathname === "/" || pathname === "") return home;
  const metaInfra = metaInfracao(pathname);
  if (metaInfra) return metaInfra;
  const metaSim = metaSimulador(pathname);
  if (metaSim) return metaSim;

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
 
  const urls: { loc: string; priority: string; changefreq: string }[] = [];

  // Home e landings
  urls.push({ loc: `${BASE_URL}/`, priority: "1.0", changefreq: "weekly" });
  urls.push({ loc: `${BASE_URL}/procon`, priority: "0.9", changefreq: "weekly" });

  urls.push({ loc: `${BASE_URL}/vigilancia-sanitaria`, priority: "0.9", changefreq: "weekly" });

  // Listagens de blog
  urls.push({ loc: `${BASE_URL}/blog`, priority: "0.8", changefreq: "daily" });
  urls.push({ loc: `${BASE_URL}/procon/blog`, priority: "0.8", changefreq: "daily" });

  urls.push({ loc: `${BASE_URL}/vigilancia-sanitaria/blog`, priority: "0.8", changefreq: "daily" });

// Simulador de pontos
  urls.push({ loc: `${BASE_URL}/simulador-pontos`, priority: "0.9", changefreq: "monthly" });
  
  // Consulta de infrações
  urls.push({ loc: `${BASE_URL}/infracao`, priority: "0.9", changefreq: "monthly" });
  infracoes.forEach((i) => {
    urls.push({
      loc: `${BASE_URL}/infracao/${i.slug}`,
      priority: "0.6",
      changefreq: "yearly",
    });
  });
  
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
        `  <url>\n    <loc>${u.loc}</loc>\n        <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
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
      const VALORES_PERMITIDOS = [19.90, 39.90, 79.00, 99.00];
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

      const prompt = PROMPT_ANALYZE_TICKET;

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

const prompt = promptGenerateDefense(extractedData);

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

const prompt = PROMPT_ANALYZE_PROCON;

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

const prompt = promptGenerateDefenseProcon(dados);

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

const prompt = PROMPT_ANALYZE_VIGILANCIA;

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

const prompt = promptGenerateDefenseVigilancia(dados);

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
