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
const ESTILO_BASE = `Realistic cinematic editorial photography, natural light, shallow depth of field, cool teal/emerald color grading. No readable text, signs, plates, screens or logos.`;

export interface PedidoImagemArtigo {
  tema: string;
  categoria: string;
  /** rótulo curto da vertical, ex: "defesa administrativa de trânsito" */
  vertical: string;
  /**
   * "Família visual" fixa da vertical (motivos/objetos/cenários típicos),
   * em inglês - ex: "roads, highways, cars, speed cameras, traffic stops".
   * Dá uma identidade reconhecível entre os artigos da mesma vertical,
   * em vez de cada imagem vir de um lugar diferente. Vem de
   * PERFIS_VERTICAIS abaixo. Opcional: sem isso, a cena sai só do
   * tema/categoria, sem essa "cola" entre os artigos.
   */
  motivosVisuais?: string;
  /**
   * Lições aprendidas pelo robô auditor: coisas que JÁ deram errado nesta
   * vertical e não devem se repetir (ver robo-auditor/licoes.json).
   *
   * São só restrições negativas ("evite X"), nunca exemplos positivos
   * ("faça igual a Y"): exemplo positivo faria toda imagem da vertical
   * convergir pra mesma cena, que é exatamente o defeito que a gente já
   * corrigiu uma vez aqui (tudo virava "guarda abordando motorista").
   * Restrição negativa tira uma opção ruim sem estreitar o resto.
   */
  licoes?: string[];
}

/**
 * Perfil de cada vertical, em UM lugar só.
 *
 * Fica aqui (e não em cada robô) porque dois consumidores precisam dos
 * mesmos dados: o robô que publica o artigo e o robô auditor, que relê a
 * imagem publicada e regenera as reprovadas. Se cada um tivesse a sua
 * cópia, as duas envelheceriam separadas - defeito que o CLAUDE.md deste
 * projeto já documenta como recorrente.
 */
export interface PerfilVertical {
  /** contexto em português, entra no prompt de descrição da cena */
  label: string;
  /** "família visual" da vertical, em inglês */
  motivosVisuais: string;
  /** onde as imagens desta vertical moram no repo */
  pastaImagens: string;
  /** arquivo de dados dos artigos desta vertical */
  caminhoArtigos: string;
}

export const PERFIS_VERTICAIS: Record<string, PerfilVertical> = {
  transito: {
    label: "defesa administrativa de multas de trânsito no Brasil",
    motivosVisuais:
      "roads, highways, parking lots, asphalt, streetlights, dashboards, car mirrors, garages, motorcycles, urban streets, night driving, traffic police officers, radar cameras, document checks at the car window",
    pastaImagens: "public/blog/transito",
    caminhoArtigos: "src/data/artigos.ts",
  },
  procon: {
    label: "defesa administrativa de autuações do Procon no Brasil (empresas autuadas)",
    motivosVisuais:
      "retail stores, shop counters, product shelves, invoices, cash registers, small business storefronts, office desks, customer service, consumer goods",
    pastaImagens: "public/blog/procon",
    caminhoArtigos: "src/data/artigosProcon.ts",
  },
  vigilancia: {
    label:
      "defesa administrativa de autuações de vigilância sanitária no Brasil (estabelecimentos autuados)",
    motivosVisuais:
      "commercial kitchens, restaurants, food storage, refrigerators, food packaging, hygiene, gloves, health inspection, restaurant counters",
    pastaImagens: "public/blog/vigilancia",
    caminhoArtigos: "src/data/artigosVigilancia.ts",
  },
  energia: {
    label: "defesa administrativa de autuações de energia elétrica (TOI) no Brasil",
    motivosVisuais:
      "power lines, utility poles, electricity meters, electrical panels, substations, transformers, residential meter boxes, wiring, technicians",
    pastaImagens: "public/blog/energia",
    caminhoArtigos: "src/data/artigosEnergia.ts",
  },
  ibama: {
    label: "defesa administrativa de autuações do IBAMA no Brasil",
    motivosVisuais:
      "forests, rural land, dirt roads, rivers, tree stumps, cut logs, environmental agents, rural properties, nature, wildlife",
    pastaImagens: "public/blog/ibama",
    caminhoArtigos: "src/data/artigosIbama.ts",
  },
};

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
// (inglês), já pensando em evitar texto/placa de propósito - não só
// "proibir", mas descrever um enquadramento onde isso nem apareceria
// naturalmente. Rosto de pessoa pode aparecer normalmente (é gente
// genérica gerada por IA, não pessoa real - não precisa esconder).
// ============================================================
export async function gerarDescricaoVisual(
  ai: ClienteGemini,
  pedido: PedidoImagemArtigo
): Promise<string> {
  const linhaLicoes =
    pedido.licoes && pedido.licoes.length > 0
      ? `\nJá deu errado nesta vertical antes (o auditor de imagem reprovou) - NÃO repita:\n${pedido.licoes
          .map((l) => `- ${l}`)
          .join("\n")}\n`
      : "";

  const linhaMotivos = pedido.motivosVisuais
    ? `\nFamília visual desta vertical (só pano de fundo/clima - tipo de lugar, objetos comuns, paleta - NÃO é um roteiro de cena fixo, não repita sempre a mesma ação): ${pedido.motivosVisuais}\n`
    : "";

  const prompt = `You are a photo art director briefing a photographer for ONE editorial photo to illustrate a Brazilian legal-defense article.

Tema do artigo (em português): "${pedido.tema}"
Categoria: "${pedido.categoria}"
Contexto/vertical: ${pedido.vertical}
${linhaMotivos}${linhaLicoes}
Descreva, em inglês, UMA cena real e concreta que um fotógrafo poderia literalmente fotografar pra ilustrar esse tema especificamente. A cena tem que comunicar o tema sozinha, sem legenda - alguém olhando a foto tem que reconhecer do que se trata. Evite símbolos vagos/indiretos (ex: só um sapato no chão) quando o tema pede pra mostrar a coisa em si (ex: a área desmatada, as árvores cortadas, o veículo, o radar). Fique à vontade pra imaginar a cena natural do tema - gente, viatura, pátio, documento, o que fizer sentido - sem sair do assunto do artigo.

IMPORTANTE: a cena de "guarda abordando motorista" é ótima e bem-vinda quando o tema É sobre isso (parada, radar, fiscalização, autuação, princípio jurídico sobre a validade da multa) - não evite ela nesses casos. Mas NÃO é o padrão pra todo tema: escolha a cena que representa especificamente CADA tema. Estacionamento mostra o carro estacionado errado, CNH mostra algo de carteira/pontuação, pagamento mostra algo de boleto/pagamento, equipamento mostra o equipamento em si. Varie a cena conforme o tema pede, em vez de repetir sempre a mesma.

O modelo de imagem que vai ler isso é rápido e barato: ele ignora prompt comprido e perde detalhe se a frase for longa. Por isso:
- UMA frase só, curta (no máximo ~20 palavras em inglês). Sem frase secundária, sem "in the background".
- Pode ser um close-up OU um plano mais aberto (paisagem/ambiente/ação) - escolha o que deixar o tema mais óbvio.
- Objetos com texto (placa, cartaz, documento, tela, carimbo, faixa/fita) PODEM aparecer se o tema pedir - o problema não é o objeto, é texto nítido e legível em primeiro plano (o modelo escreve palavra errada/grudada, e isso é o que fica com cara de quebrado). Se um desses objetos aparecer, ele tem que estar desfocado, em ângulo, cortado ou pequeno/ao fundo - nunca nítido, de frente e ocupando boa parte do quadro.

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
// AUDITORIA: relê a imagem publicada e diz se ela serve
//
// Usa o Gemini de TEXTO com entrada de imagem (visão). Isso é importante:
// LER imagem cai na cota grátis normal, quem tem cota zero no tier grátis
// é só GERAR imagem. Por isso dá pra auditar todas as imagens todo dia de
// graça, e gastar a cota do Cloudflare só nas poucas que precisam ser
// refeitas.
// ============================================================

export interface VeredictoImagem {
  /** a imagem tem relação reconhecível com o título do artigo? */
  relacionada: boolean;
  /** tem texto legível/quebrado dominando a imagem? */
  textoQuebrado: boolean;
  /** explicação curta, para o log */
  motivo: string;
}

export async function auditarImagem(
  ai: ClienteGemini,
  imagem: { bytes: Buffer; mimeType: string },
  titulo: string
): Promise<VeredictoImagem> {
  const prompt = `Você audita a imagem de capa de um artigo de blog jurídico brasileiro. Olhe a imagem e responda sobre ela.

Título do artigo: "${titulo}"

Avalie DOIS pontos, com rigor calibrado (não é pra ser purista, é pra pegar o que ficaria feio no site):

1. relacionada: a imagem tem relação reconhecível com o assunto do título? Não precisa ser literal nem perfeita - basta que alguém que leia o título e veja a imagem entenda que combinam (mesmo assunto/contexto). Só marque false se a imagem for claramente de outro assunto, ou tão genérica que não diz nada.

2. textoQuebrado: existe um ELEMENTO DE TEXTO PRINCIPAL na imagem, com palavras erradas ou embaralhadas?

   A pergunta não é "aparece texto errado em algum lugar?" - foto gerada por IA quase sempre tem alguma rabisco de letra por aí, e isso passa despercebido pelo leitor. A pergunta é: existe um objeto escrito que é PROTAGONISTA da imagem e está com o texto errado?

   Responda true SÓ se o texto errado estiver em algo que é assunto central ou primeiro plano - uma placa grande no meio da foto, um carimbo atravessando a imagem, uma faixa/fita escrita cruzando o quadro, um cartaz em foco ocupando boa parte da cena. É aquele texto que a pessoa lê sem querer, logo de cara.

   Responda false para texto de ambiente, mesmo que esteja errado: letreiro de loja ao fundo, placa de rua distante, rótulo de produto na prateleira, tela de celular, etiqueta pequena, texto desfocado, cortado ou na periferia do quadro. Nada disso incomoda quem olha a foto.

   Na dúvida, responda false: reprovar imagem boa custa caro (ela é regenerada ou apagada à toa), aprovar uma imagem com um rabisco de letra no fundo não custa quase nada.

Responda APENAS com um objeto JSON válido, sem markdown, sem crases:
{"relacionada": true/false, "textoQuebrado": true/false, "motivo": "uma frase curta em português explicando"}`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: imagem.mimeType || "image/jpeg",
            data: imagem.bytes.toString("base64"),
          },
        },
      ],
    })
  );

  let texto = (resp.text || "").trim();
  texto = texto
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const obj = JSON.parse(texto);

  // Se o modelo devolver algo fora do formato, tratar como APROVADA.
  // Auditoria é uma rede de segurança opcional: em caso de dúvida ela não
  // pode derrubar uma imagem que talvez esteja boa.
  return {
    relacionada: obj.relacionada !== false,
    textoQuebrado: obj.textoQuebrado === true,
    motivo: String(obj.motivo || "").slice(0, 300),
  };
}

export function imagemAprovada(v: VeredictoImagem): boolean {
  return v.relacionada && !v.textoQuebrado;
}

export interface ResultadoCapa {
  /** bytes já comprimidos (1280x720 jpeg), prontos pra commitar - ou null se nenhuma tentativa passou */
  aprovada: Buffer | null;
  /** motivo da auditoria: da aprovação, ou da última reprovação se nenhuma passou */
  motivo?: string;
}

/**
 * Gera e audita a capa de um artigo, tentando até `tentativas` vezes até
 * uma imagem passar na auditoria. Artigo já publicado não pode piorar, então
 * só publica se aprovar - diferente do robô de artigo novo, que publica
 * primeiro e conserta depois (ver robo-auditor.ts).
 *
 * Compartilhada entre gerar-manual.ts (backfill sob demanda, artigo
 * escolhido a dedo) e robo-backfill.ts (backfill automático, sorteando
 * artigos sem imagem) - mesma regra em código só uma vez, não duas cópias
 * que envelhecem separadas (defeito já documentado no CLAUDE.md).
 *
 * Erro de cota esgotada sobe pra quem chamou decidir (normalmente: parar
 * de processar o resto da fila).
 *
 * `comprimir` fica a cargo de quem chama (em vez deste módulo importar
 * `sharp` direto): prompts/ não tem node_modules próprio, e cada robô já
 * roda dentro da sua própria pasta (robo-auditor/, robo/ etc.), cada uma
 * com o `sharp` instalado localmente - importar aqui quebraria a
 * resolução de módulo do Node (sobe a árvore a partir de prompts/, não
 * acha o node_modules do robô que chamou).
 */
export async function gerarEAuditarCapa(
  ai: ClienteGemini,
  credenciaisCloudflare: CredenciaisCloudflare,
  pedido: PedidoImagemArtigo,
  titulo: string,
  tentativas: number,
  comprimir: (bytesOriginais: Buffer) => Promise<Buffer>
): Promise<ResultadoCapa> {
  let ultimoMotivo: string | undefined;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const cena = await gerarDescricaoVisual(ai, pedido);
    console.log(`    [${tentativa}] Cena: ${cena}`);

    const imagem = await gerarImagemArtigoCloudflare(credenciaisCloudflare, cena);
    const comprimida = await comprimir(imagem.bytes);

    const veredicto = await auditarImagem(ai, { bytes: comprimida, mimeType: "image/jpeg" }, titulo);
    if (imagemAprovada(veredicto)) {
      console.log(`    [${tentativa}] APROVADA: ${veredicto.motivo}`);
      return { aprovada: comprimida, motivo: veredicto.motivo };
    }
    console.log(`    [${tentativa}] reprovada: ${veredicto.motivo}`);
    ultimoMotivo = veredicto.motivo;
  }

  return { aprovada: null, motivo: ultimoMotivo };
}

/**
 * Transforma um motivo de reprovação numa instrução curta de "evite X",
 * que volta pro gerador de cena como lição (ver PedidoImagemArtigo.licoes).
 *
 * É aqui que o auditor deixa de só corrigir imagem e passa a ensinar: o
 * defeito que se repete (fita/placa escrita no tema de embargo, por
 * exemplo) vira uma regra que o gerador passa a respeitar sozinho, em vez
 * de errar de novo todo dia e depender do conserto depois.
 */
export async function resumirLicao(
  ai: ClienteGemini,
  motivo: string,
  titulo: string
): Promise<string | null> {
  const prompt = `Um gerador de imagem produziu uma capa ruim para um artigo, e o auditor reprovou.

Título do artigo: "${titulo}"
Motivo da reprovação: "${motivo}"

Escreva UMA instrução curta em inglês, no imperativo, dizendo o que o gerador deve EVITAR pra não repetir esse erro em outros artigos da mesma área. Tem que ser uma restrição específica e reaproveitável (ex: "avoid isolation tape or official signs with writing as the main subject"), não um conselho genérico (ex: "make better images").

Se o motivo for pontual demais pra virar regra reaproveitável, responda exatamente: NENHUMA

Responda só a instrução em inglês, sem aspas, sem explicação.`;

  const resp = await gerarComRetry(() =>
    ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt })
  );

  const licao = (resp.text || "").trim().replace(/^["']|["']$/g, "");
  if (!licao || /^NENHUMA$/i.test(licao) || licao.length > 200) return null;
  return licao;
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
