/**
 * Geração de imagem de capa para artigos de blog (todas as verticais).
 *
 * Usa o mesmo cliente @google/genai que os robôs já usam para texto, só que
 * chamando um modelo de imagem (gemini-3.1-flash-image, via generateContent
 * com responseModalities: ["IMAGE"]). Não usar a família Imagen
 * (imagen-4.0-*): está em desativação em 17/08/2026.
 *
 * Filosofia igual à do resto do projeto: isso é decorativo, não jurídico.
 * Se falhar por qualquer motivo, quem chama deve seguir sem imagem — nunca
 * travar a publicação do artigo por causa disto.
 */

import { gerarComRetry } from "./validador";

// Tipo mínimo do cliente, só com o que usamos aqui - evita depender do
// @google/genai a partir de prompts/ (que é importado por vários robôs,
// cada um com seu próprio node_modules; ver prompts/validador.ts, que
// pelo mesmo motivo não importa nada externo).
interface ClienteGemini {
  models: {
    generateContent: (params: any) => Promise<any>;
  };
}

// Estilo fixo, para os artigos terem "cara de uma coisa só" mesmo gerados
// em dias e verticais diferentes. Cores batem com a paleta do site
// (emerald para destaque, slate para neutro).
const ESTILO_BASE = `Flat, modern editorial illustration in a minimalist geometric style, made for a serious Brazilian legal/administrative-defense website (tone similar to an editorial illustration for a law or government-services blog, not a cartoon, not photorealistic).

Strict rules:
- NO readable text, letters, numbers, signs, license plates or logos anywhere in the image.
- NO human faces or realistic people. If a person appears, render it only as a simple faceless silhouette or flat shape.
- Wide banner composition, single clear visual metaphor for the subject, generous negative space, subject placed off-center (rule of thirds).
- Color palette: emerald green (#059669), slate gray-blue (#334155, #64748b), white/off-white background. Calm, trustworthy, institutional. Avoid bright primary colors, avoid clutter.
- Style reference: flat vector illustration, soft shadows, subtle gradients, generous whitespace — like an illustration for a fintech or legal-tech blog.`;

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

export async function gerarImagemArtigo(
  ai: ClienteGemini,
  pedido: PedidoImagemArtigo
): Promise<ImagemGerada> {
  const prompt = `${ESTILO_BASE}

Subject of this illustration: an article about "${pedido.tema}", in the context of ${pedido.vertical} (categoria: "${pedido.categoria}"). Depict the situation or object at the center of this theme using the visual metaphor rules above.`;

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
