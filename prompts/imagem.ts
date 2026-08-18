/**
 * Geração de imagem de capa para artigos de blog (todas as verticais).
 *
 * Caminho ativo: Cloudflare Workers AI (modelo FLUX.1 [schnell]), porque
 * tem cota diária grátis de verdade (10.000 neurons/dia, sem cartão) - ao
 * contrário do Gemini, cujo tier grátis tem cota ZERO pra modelo de
 * imagem (só funciona com faturamento habilitado no projeto do Google,
 * o que exporia TODAS as chamadas do projeto, não só as de imagem).
 *
 * gerarImagemArtigoGemini fica pronta e guardada (funciona, foi testada,
 * dá pra religar trocando a chamada em robo.ts) caso um dia o faturamento
 * seja habilitado e valha a pena comparar qualidade.
 *
 * Filosofia igual à do resto do projeto: isso é decorativo, não jurídico.
 * Se falhar por qualquer motivo, quem chama deve seguir sem imagem — nunca
 * travar a publicação do artigo por causa disto.
 */

import { gerarComRetry } from "./validador";

// Estilo fixo, para os artigos terem "cara de uma coisa só" mesmo gerados
// em dias e verticais diferentes. Fotografia editorial realista (não mais
// ilustração flat) - cor com leve tendência pra teal/emerald, sem forçar
// hex literal (foto não pode parecer pintada).
const ESTILO_BASE = `Realistic editorial photography, cinematic and professional, for a serious Brazilian legal/administrative-defense website (tone similar to a photo used in a serious news article or government-services blog - not a cartoon, not a flat illustration, not stock-photo cheesy).

Strict rules:
- NO readable text, letters, numbers, signs, license plates or logos anywhere in the image - blur or angle any signage so nothing is legible.
- NO clearly recognizable human face as the focus. People may appear, but shot from behind, in silhouette, out of focus, cropped, or with face turned away/obscured - never a sharp, identifiable face looking at camera.
- Wide banner composition, natural lighting, shallow depth of field, single clear real-world scene that represents the subject below.
- Color grading: cool, slightly desaturated tones leaning teal/emerald and neutral gray-blue, clean and trustworthy - avoid oversaturated or garish colors.
- Style reference: high-quality editorial/documentary photography, like a photo accompanying a serious Brazilian news article about public administration or law.`;

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

function montarPrompt(pedido: PedidoImagemArtigo): string {
  return `${ESTILO_BASE}

Subject of this illustration: an article about "${pedido.tema}", in the context of ${pedido.vertical} (categoria: "${pedido.categoria}"). Depict the situation or object at the center of this theme using the visual metaphor rules above.`;
}

// ============================================================
// CAMINHO ATIVO: Cloudflare Workers AI (FLUX.1 [schnell])
// Chamada REST simples (fetch), sem SDK - não precisa de dependência nova.
// ============================================================

export interface CredenciaisCloudflare {
  accountId: string;
  apiToken: string;
}

export async function gerarImagemArtigoCloudflare(
  credenciais: CredenciaisCloudflare,
  pedido: PedidoImagemArtigo
): Promise<ImagemGerada> {
  const prompt = montarPrompt(pedido);
  const url = `https://api.cloudflare.com/client/v4/accounts/${credenciais.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const resp = await gerarComRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credenciais.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps: 6 }),
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

interface ClienteGemini {
  models: {
    generateContent: (params: any) => Promise<any>;
  };
}

export async function gerarImagemArtigoGemini(
  ai: ClienteGemini,
  pedido: PedidoImagemArtigo
): Promise<ImagemGerada> {
  const prompt = montarPrompt(pedido);

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
