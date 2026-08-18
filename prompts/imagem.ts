/**
 * Geração de imagem de capa para artigos de blog (todas as verticais).
 *
 * Pipeline em DOIS passos, os dois grátis:
 *   1. gerarDescricaoVisual: usa o Gemini de TEXTO (gemini-3.1-flash-lite,
 *      o mesmo modelo já usado pra escrever o artigo - tier grátis normal,
 *      sem restrição) pra traduzir o tema (em português, abstrato) numa
 *      cena fotográfica concreta em inglês, já seguindo as regras de
 *      estilo. FLUX não é um modelo de linguagem - ele desenha o que a
 *      descrição diz, então a fidelidade ao tema depende desse passo.
 *   2. gerarImagemArtigoCloudflare: manda essa cena pro Cloudflare Workers
 *      AI (FLUX.1 schnell), que tem cota diária grátis de verdade (10k
 *      neurons/dia, sem cartão).
 *
 * Por que não gerar a imagem direto no Gemini: o tier grátis do Gemini
 * tem cota ZERO pro modelo de imagem (só funciona com faturamento
 * habilitado no projeto, o que exporia TODAS as chamadas do projeto,
 * não só as de imagem) - ver gerarImagemArtigoGemini abaixo, guardada.
 *
 * Filosofia igual à do resto do projeto: isso é decorativo, não jurídico.
 * Se falhar por qualquer motivo, quem chama deve seguir sem imagem — nunca
 * travar a publicação do artigo por causa disto.
 */

import { gerarComRetry } from "./validador";

// Estilo fixo, CURTO de propósito: o FLUX schnell (via Workers AI) parece
// truncar/perder prompt comprido - um teste real com estilo+cena longos
// devolveu foto genérica sem nada do tema. Por isso a cena específica vem
// PRIMEIRO no prompt final (ver gerarImagemArtigoCloudflare) e o estilo
// fica só como uma cauda curta de tags, não frases.
const ESTILO_BASE = `Realistic cinematic editorial photography, natural light, shallow depth of field, cool teal/emerald color grading. No readable text, signs, plates or logos. No person with a clear face looking at camera.`;

export interface PedidoImagemArtigo {
  tema: string;
  categoria: string;
  /** rótulo curto da vertical, ex: "defesa administrativa de trânsito" */
  vertical: string;
}

export interface ImagemGerada {
  bytes: Buffer;
  mimeType: string;
}

// Tipo mínimo do cliente Gemini de texto, só com o que usamos aqui.
interface ClienteGemini {
  models: {
    generateContent: (params: any) => Promise<any>;
  };
}

// ============================================================
// PASSO 1: tema (português, abstrato) -> cena fotográfica concreta
// (inglês), já pensando em evitar texto/placa/rosto de propósito -
// não só "proibir", mas descrever um enquadramento onde isso nem
// apareceria naturalmente.
// ============================================================
export async function gerarDescricaoVisual(
  ai: ClienteGemini,
  pedido: PedidoImagemArtigo
): Promise<string> {
  const prompt = `You are a photo art director briefing a photographer for ONE editorial photo to illustrate a Brazilian legal-defense article.

Tema do artigo (em português): "${pedido.tema}"
Categoria: "${pedido.categoria}"
Contexto/vertical: ${pedido.vertical}

Descreva, em inglês, UMA cena real e concreta que um fotógrafo poderia literalmente fotografar pra ilustrar esse tema especificamente (não uma cena genérica - tem que ser claramente reconhecível como ESSE tema, não outro).

O modelo de imagem que vai ler isso é rápido e barato: ele ignora prompt comprido e perde detalhe se a frase for longa. Por isso:
- UMA frase só, curta (no máximo ~20 palavras em inglês). Sem frase secundária, sem "in the background".
- Um objeto ou ação central só, close-up, fundo desfocado.
- NÃO inclua nenhum objeto que normalmente tem texto escrito nele (placa de trânsito, placa de veículo, faixa, cartaz, tela, papel, documento) - descreva a cena por outro ângulo que não precise desses objetos.
- Se aparecer pessoa, só de costas ou totalmente fora de foco - nunca rosto de frente.

Responda APENAS com a frase da cena em inglês, sem aspas, sem introdução.`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    })
  );

  const cena = (resp.text || "").trim();
  if (!cena) {
    throw new Error("Gemini não devolveu descrição visual (texto vazio).");
  }
  return cena;
}

// ============================================================
// PASSO 2: Cloudflare Workers AI (FLUX.1 [schnell])
// Chamada REST simples (fetch), sem SDK - não precisa de dependência nova.
// ============================================================

export interface CredenciaisCloudflare {
  accountId: string;
  apiToken: string;
}

export async function gerarImagemArtigoCloudflare(
  credenciais: CredenciaisCloudflare,
  cena: string
): Promise<ImagemGerada> {
  const prompt = `${cena} ${ESTILO_BASE}`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${credenciais.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const resp = await gerarComRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credenciais.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps: 8 }),
    });
    const dados = await res.json();
    if (!res.ok || !dados.success) {
      throw new Error(
        `Cloudflare AI erro ${res.status}: ${JSON.stringify(dados.errors || dados)}`
      );
    }
    return dados;
  });

  const base64 = resp.result?.image;
  if (!base64) {
    throw new Error("Cloudflare AI não retornou imagem (sem result.image na resposta).");
  }

  return {
    bytes: Buffer.from(base64, "base64"),
    mimeType: "image/jpeg",
  };
}

// ============================================================
// CAMINHO GUARDADO: Gemini (gemini-3.1-flash-image via generateContent)
// Testado e funcional, mas exige faturamento habilitado no projeto do
// Google (tier grátis tem cota 0 pra modelo de imagem). Não usar a
// família Imagen (imagen-4.0-*): está em desativação em 17/08/2026.
// ============================================================

export async function gerarImagemArtigoGemini(
  ai: ClienteGemini,
  pedido: PedidoImagemArtigo
): Promise<ImagemGerada> {
  const prompt = `${ESTILO_BASE}\n\nSubject of this illustration: an article about "${pedido.tema}", in the context of ${pedido.vertical} (categoria: "${pedido.categoria}"). Depict the situation or object at the center of this theme using the visual rules above.`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        // Sem personGeneration aqui de propósito: esse campo só existe no
        // modo Enterprise/Vertex, e dá erro na Gemini Developer API (que é
        // o modo que este projeto usa). O "sem rosto" fica só na regra de
        // estilo do prompt acima.
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    })
  );

  const partes = resp.candidates?.[0]?.content?.parts || [];
  const parteImagem = partes.find((p: any) => p.inlineData?.data);

  if (!parteImagem) {
    throw new Error("Gemini não retornou imagem (sem inlineData na resposta).");
  }

  return {
    bytes: Buffer.from(parteImagem.inlineData.data, "base64"),
    mimeType: parteImagem.inlineData.mimeType || "image/png",
  };
}
