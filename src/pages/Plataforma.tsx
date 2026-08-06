import { useEffect } from "react";
import { ChevronDown, AlertTriangle, AlertCircle, Check } from "lucide-react";
import { VERTICAIS, FERRAMENTAS } from "../data/verticais";

/**
 * Home institucional do CheckMulta (home-mãe).
 *
 * Papel: apresentar a plataforma como um todo e distribuir o visitante para
 * a vertical correta. Não analisa documento nem processa pagamento — cada
 * vertical continua responsável pelo próprio funil.
 *
 * SEO: esta página mira termos do CONJUNTO ("auto de infração", "defesa
 * administrativa", "recebi uma notificação"). Termos específicos de cada
 * vertical pertencem à landing da vertical — nunca duplicar aqui.
 *
 * Indexação: os itens usam <details>/<summary> nativos. O texto fica sempre
 * presente no HTML, mesmo com o item fechado.
 *
 * Estrutura: triagem por órgão no topo (distribui o visitante em um clique),
 * seguida da demonstração do documento marcado (mostra o produto sem explicar),
 * e então as áreas em cartões.
 *
 * Todos os textos das áreas vêm de src/data/verticais.ts. Vertical nova
 * aparece aqui sozinha, sem editar este arquivo — exceto o rótulo curto do
 * órgão na triagem, definido em ORGAOS logo abaixo.
 */

/** Rótulo curto do órgão e da lei, usado apenas na triagem do topo. */
const ORGAOS: Record<string, { orgao: string; lei: string }> = {
  transito: { orgao: "Detran, PRF, agente municipal", lei: "CTB" },
  procon: { orgao: "Procon", lei: "CDC" },
  vigilancia: { orgao: "Vigilância Sanitária", lei: "Lei 6.437/77" },
  energia: { orgao: "Distribuidora de energia", lei: "REN 1.000/2021" },
  ibama: { orgao: "Ibama", lei: "Decreto 6.514/08" },
};

const PASSOS = [
  {
    numero: "01",
    titulo: "Envie o documento",
    texto:
      "Fotografe ou anexe o auto de infração, a notificação ou o termo que você recebeu. Não é preciso criar conta.",
  },
  {
    numero: "02",
    titulo: "Receba a análise",
    texto:
      "O documento é lido à luz da legislação aplicável ao órgão que autuou. O resultado aponta, com o trecho citado, onde há falha formal.",
  },
  {
    numero: "03",
    titulo: "Obtenha a defesa",
    texto:
      "Havendo fundamento, entregamos a peça redigida e pronta para protocolo. Se não houver falha, dizemos isso com clareza e nada é cobrado.",
  },
];

const FAQ = [
  {
    pergunta: "O que é um auto de infração?",
    resposta:
      "É o documento pelo qual um órgão público formaliza a acusação de que alguém descumpriu uma norma. Ele dá início ao processo administrativo e abre o prazo para defesa. Vale para trânsito, consumo, vigilância sanitária, meio ambiente e demais áreas fiscalizadas.",
  },
  {
    pergunta: "Recebi uma notificação. Quanto tempo tenho para me defender?",
    resposta:
      "O prazo varia conforme o órgão e costuma ser contado a partir da ciência da autuação. Cada área tem regra própria, e o prazo é fatal: uma vez perdido, a penalidade se consolida. Por isso a orientação é analisar o documento assim que ele chega.",
  },
  {
    pergunta: "Vale a pena recorrer mesmo tendo cometido a irregularidade?",
    resposta:
      "Em muitos casos, sim. A defesa administrativa não discute apenas o fato: discute se o órgão observou as formalidades exigidas por lei ao lavrar o auto. Descrição genérica, ausência de dispositivo legal, falha na notificação e erro na dosimetria comprometem a autuação independentemente do mérito.",
  },
  {
    pergunta: "É preciso contratar advogado?",
    resposta:
      "Na esfera administrativa, não. A defesa pode ser apresentada pelo próprio interessado ou por seu representante legal. Nossa atuação é informativa e instrumental: analisamos o documento e entregamos a peça. Não representamos ninguém em juízo.",
  },
  {
    pergunta: "Quanto custa?",
    resposta:
      "A análise é gratuita em todas as áreas. A cobrança ocorre apenas quando há falha identificada e você decide gerar a defesa. O valor varia conforme a área e o porte da penalidade.",
  },
  {
    pergunta: "Como sei que não é golpe?",
    resposta:
      "O CheckMulta é operado pela CheckMulta Tecnologia, CNPJ 63.524.338/0001-62. A análise é entregue antes de qualquer cobrança e o pagamento é processado por PIX via Mercado Pago. Não pedimos senha de portal de órgão público nem dados bancários.",
  },
];

const TITULO =
  "CheckMulta — Defesa de autos de infração e notificações administrativas";
const DESCRICAO =
  "Recebeu um auto de infração ou uma notificação de órgão público? Analisamos o documento gratuitamente e apontamos se há falha que permite recorrer. Trânsito, Procon, Vigilância Sanitária, energia elétrica e meio ambiente.";
const CANONICAL = "https://checkmulta.com.br/plataforma";

export default function Plataforma() {
  useEffect(() => {
    document.title = TITULO;

    const setMeta = (attr: "name" | "property", chave: string, valor: string) => {
      let el = document.querySelector(`meta[${attr}="${chave}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, chave);
        document.head.appendChild(el);
      }
      el.setAttribute("content", valor);
    };

    setMeta("name", "description", DESCRICAO);
    setMeta("property", "og:title", TITULO);
    setMeta("property", "og:description", DESCRICAO);
    setMeta("property", "og:url", CANONICAL);

    /* ------------------------------------------------------------------
       PROVISORIO — REMOVER NO PASSO 3

       Enquanto esta pagina vive em /plataforma, ela nao pode ser indexada:
       seria conteudo concorrendo com a raiz. Quando ela assumir a raiz do
       dominio, apagar a linha do robots logo abaixo.
    ------------------------------------------------------------------ */
    setMeta("name", "robots", "noindex, follow");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", CANONICAL);

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    });
    document.head.appendChild(schema);

    return () => {
      schema.remove();
      const r = document.querySelector('meta[name="robots"]');
      if (r) r.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ---------------------------------------------------------------- */}
      {/* Cabecalho                                                         */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a
            href="/plataforma"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Check<span className="text-emerald-700">Multa</span>
          </a>
          <nav className="flex items-center gap-5 text-xs font-medium text-slate-500 sm:text-sm">
            <a href="#areas" className="transition-colors hover:text-emerald-700">
              Áreas
            </a>
            <a href="/blog" className="transition-colors hover:text-emerald-700">
              Blog
            </a>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Triagem                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
          </p>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Quem te autuou?
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Escolha o órgão, envie o documento e receba a análise gratuita.
            Apontamos, com o trecho citado, se existe falha formal que permita
            recorrer.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {VERTICAIS.map((v) => {
              const o = ORGAOS[v.id];
              return (
                <a
                  key={v.id}
                  href={v.href}
                  className="group flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
                >
                  <span
                    className="h-8 w-1 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: v.cor.faixa }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 group-hover:text-emerald-800">
                      {o ? o.orgao : v.titulo}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] tracking-wide text-slate-400">
                      {o ? o.lei : v.baseLegal}
                    </span>
                  </span>
                </a>
              );
            })}

            <a
              href="#areas"
              className="flex items-center gap-4 rounded-lg border border-dashed border-slate-300 p-4 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="h-8 w-1 flex-shrink-0 rounded-full bg-slate-200" />
              <span>
                <span className="block text-sm font-medium text-slate-600">
                  Não sei quem me autuou
                </span>
                <span className="mt-0.5 block font-mono text-[11px] tracking-wide text-slate-400">
                  Ver todas as áreas
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Demonstracao: documento marcado                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
              O que você recebe
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
              Todo auto tem forma. Quando a forma falha, ele cai.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              A análise percorre o documento campo a campo e devolve cada
              apontamento com o trecho citado e o dispositivo legal
              correspondente. Nada de parecer genérico: você vê exatamente onde
              está o problema e por quê.
            </p>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Se não houver falha, dizemos isso com clareza e nada é cobrado.
            </p>
          </div>

          {/* Peca de demonstracao. Conteudo ilustrativo. */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-slate-400">
              Auto de infração nº 4471-B
            </p>

            <div className="space-y-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  Local da infração
                </p>
                <p className="mt-1 inline-block rounded bg-red-50 px-2 py-1 text-sm font-medium text-red-800">
                  Av. Principal, s/n
                </p>
                <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Sem numeração ou ponto de referência. Descrição genérica
                  impede a identificação do local.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  Agente autuador
                </p>
                <p className="mt-1 inline-block rounded bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800">
                  Matrícula ilegível
                </p>
                <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Identificação do agente comprometida. Ponto de atenção.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  Data da notificação
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  14/03/2026
                </p>
                <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Dentro do prazo legal. Sem falha neste campo.
                </p>
              </div>
            </div>

            <p className="mt-6 border-t border-slate-100 pt-5 text-xs leading-relaxed text-slate-500">
              Exemplo ilustrativo. Cada área é analisada segundo a legislação do
              órgão que autuou.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Areas atendidas                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section id="areas" className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Áreas atendidas
          </p>
          <h2 className="mb-4 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Cada órgão tem uma lei. Cada lei tem um agente.
          </h2>
          <p className="mb-12 max-w-2xl text-base leading-relaxed text-slate-600">
            Não usamos a mesma análise para tudo. Abra a área correspondente ao
            documento que você recebeu para ver tudo o que cobrimos.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            {VERTICAIS.map((v) => (
              <details
                key={v.id}
                className="group overflow-hidden rounded-xl border border-slate-200 transition-colors hover:border-slate-300"
              >
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: v.cor.faixa }}
                />

                <summary className="cursor-pointer list-none p-6 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className="font-mono text-[11px] uppercase tracking-widest"
                        style={{ color: v.cor.texto }}
                      >
                        {v.publico}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                        {v.titulo}
                      </h3>
                    </div>
                    <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-slate-300 transition-transform duration-300 group-open:rotate-180" />
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {v.resumo}
                  </p>

                  {/* Previa: o que costuma falhar nesta area */}
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    O que costuma falhar aqui
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {v.especialidades.slice(0, 3).map((e) => (
                      <li
                        key={e.texto}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span
                          className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: v.cor.faixa }}
                        />
                        {e.texto}
                      </li>
                    ))}
                  </ul>
                </summary>

                <div className="px-6 pb-6">
                  <p className="border-t border-slate-100 pt-5 text-sm leading-relaxed text-slate-700">
                    {v.detalhe}
                  </p>

                  <p className="mb-3 mt-6 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    Todas as situações analisadas
                  </p>
                  <ul className="space-y-2">
                    {v.especialidades.map((e) => (
                      <li key={e.texto} className="text-sm leading-relaxed">
                        {e.href ? (
                          <a
                            href={e.href}
                            className="text-slate-600 underline decoration-slate-200 underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-700"
                          >
                            {e.texto}
                          </a>
                        ) : (
                          <span className="text-slate-600">{e.texto}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-wide text-slate-400">
                    {v.baseLegal}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-5">
                    <a
                      href={v.href}
                      className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                    >
                      {v.botao}
                    </a>
                    {v.hrefBlog ? (
                      <a
                        href={v.hrefBlog}
                        className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-emerald-700"
                      >
                        Ler os artigos
                      </a>
                    ) : null}
                  </div>

                  <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    Análise gratuita · defesa {v.preco}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Processo                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Processo
          </p>
          <h2 className="mb-12 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Três etapas, nessa ordem.
          </h2>

          <ol className="grid gap-8 sm:grid-cols-3">
            {PASSOS.map((p) => (
              <li key={p.numero} className="border-t border-slate-900 pt-5">
                <span className="font-mono text-sm tracking-widest text-emerald-700">
                  {p.numero}
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {p.texto}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Ferramentas                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Ferramentas gratuitas
          </p>
          <h2 className="mb-12 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Consulte antes de precisar recorrer.
          </h2>

          <div className="grid gap-10 sm:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <div key={f.id} className="border-t border-slate-900 pt-5">
                <h3 className="text-base font-semibold tracking-tight text-slate-900">
                  {f.titulo}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  {f.resumo}
                </p>
                <a
                  href={f.href}
                  className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-4 transition-colors hover:decoration-emerald-700"
                >
                  {f.botao}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Perguntas frequentes                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Perguntas frequentes
          </p>
          <h2 className="mb-12 max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            O que costuma gerar dúvida.
          </h2>

          <div className="max-w-3xl border-t border-slate-200">
            {FAQ.map((f) => (
              <details
                key={f.pergunta}
                className="group border-b border-slate-200"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-base font-medium text-slate-900 transition-colors hover:text-emerald-700 [&::-webkit-details-marker]:hidden">
                  {f.pergunta}
                  <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-relaxed text-slate-600">
                  {f.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Rodape                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 sm:grid-cols-4">
            <div>
              <span className="text-base font-semibold tracking-tight text-white">
                Check<span className="text-emerald-400">Multa</span>
              </span>
              <p className="mt-4 font-mono text-[11px] uppercase leading-relaxed tracking-widest text-slate-500">
                Defesa administrativa
                <br />
                em cinco áreas
              </p>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                Áreas
              </p>
              <ul className="space-y-3 text-sm">
                {VERTICAIS.map((v) => (
                  <li key={v.id}>
                    <a
                      href={v.href}
                      className="transition-colors hover:text-emerald-400"
                    >
                      {v.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                Ferramentas
              </p>
              <ul className="space-y-3 text-sm">
                {FERRAMENTAS.map((f) => (
                  <li key={f.id}>
                    <a
                      href={f.href}
                      className="transition-colors hover:text-emerald-400"
                    >
                      {f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                Conteúdo
              </p>
              <ul className="space-y-3 text-sm">
                {VERTICAIS.filter((v) => v.hrefBlog).map((v) => (
                  <li key={v.id}>
                    <a
                      href={v.hrefBlog}
                      className="transition-colors hover:text-emerald-400"
                    >
                      {v.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 border-t border-slate-800 pt-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
              CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
            </p>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-slate-500">
              O CheckMulta presta serviço de análise documental e elaboração de
              peça administrativa. Não realiza representação judicial nem
              substitui a orientação de advogado. As análises são geradas a
              partir da legislação federal aplicável a cada órgão e não
              constituem garantia de resultado.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
