import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
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
 * Direção visual: registro oficial. Rótulos em fonte monoespaçada na margem,
 * filetes finos, muito espaço em branco, uma única cor de destaque (verde da
 * marca). Sem ilustração, sem gradiente, sem emoji.
 */

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
const CANONICAL = "https://checkmulta.com.br/";
const ORIGEM = "https://checkmulta.com.br";

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

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", CANONICAL);

    /* ------------------------------------------------------------------
       Dados estruturados (JSON-LD)

       Grafo unico com tres entidades ligadas por @id:

       - Organization : identifica a empresa por tras do servico (E-E-A-T).
                        O CNPJ entra como taxID; o nome legal como legalName.
                        Sinal de confianca relevante em conteudo YMYL.
       - WebSite      : associa o dominio a Organization como publisher.
       - FAQPage      : mantem o que ja existia, agora vinculado ao site.
    ------------------------------------------------------------------ */
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${ORIGEM}/#organizacao`,
          name: "CheckMulta",
          legalName: "CheckMulta Tecnologia",
          alternateName: "CheckMulta Tecnologia",
          url: CANONICAL,
          logo: {
            "@type": "ImageObject",
            url: `${ORIGEM}/logo.webp`,
          },
          taxID: "63.524.338/0001-62",
          vatID: "63.524.338/0001-62",
          description:
            "Plataforma de analise de autos de infracao e notificacoes administrativas. Le o documento a luz da legislacao aplicavel ao orgao autuante e aponta falhas formais que permitem recorrer.",
          knowsAbout: [
            "Defesa administrativa",
            "Auto de infracao",
            "Codigo de Transito Brasileiro",
            "Codigo de Defesa do Consumidor",
            "Vigilancia Sanitaria",
            "Infracoes ambientais",
            "Regulacao de energia eletrica",
          ],
          address: {
            "@type": "PostalAddress",
            addressCountry: "BR",
          },
          areaServed: {
            "@type": "Country",
            name: "Brasil",
          },
        },
        {
          "@type": "WebSite",
          "@id": `${ORIGEM}/#site`,
          url: CANONICAL,
          name: "CheckMulta",
          inLanguage: "pt-BR",
          publisher: { "@id": `${ORIGEM}/#organizacao` },
        },
        {
          "@type": "FAQPage",
          "@id": `${CANONICAL}#faq`,
          isPartOf: { "@id": `${ORIGEM}/#site` },
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.pergunta,
            acceptedAnswer: { "@type": "Answer", text: f.resposta },
          })),
        },
      ],
    });
    document.head.appendChild(schema);

    return () => {
      schema.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ---------------------------------------------------------------- */}
      {/* Cabecalho                                                        */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Check<span className="text-emerald-700">Multa</span>
          </a>
          <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-slate-500">
            <a href="#areas" className="transition-colors hover:text-emerald-700">
              Áreas
            </a>
            <a href="#processo" className="transition-colors hover:text-emerald-700">
              Processo
            </a>
            <a href="/blog" className="transition-colors hover:text-emerald-700">
              Blog
            </a>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Abertura                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="mb-8 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Todo auto de infração tem forma.
            <span className="block text-slate-400">
              Quando a forma falha, ele cai.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-600">
            Envie o documento que você recebeu. Analisamos gratuitamente à luz da
            legislação aplicável ao órgão que autuou e apontamos, com o trecho
            citado, se existe falha que permita recorrer.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#areas"
              className="bg-emerald-700 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Escolher a área
            </a>
            <a
              href="#processo"
              className="px-2 py-4 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-emerald-700"
            >
              Ver como funciona
            </a>
          </div>

          <dl className="mt-16 grid max-w-3xl gap-8 border-t border-slate-200 pt-8 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                Análise
              </dt>
              <dd className="mt-2 text-sm text-slate-700">
                Gratuita em todas as áreas, sem cadastro
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                Cobrança
              </dt>
              <dd className="mt-2 text-sm text-slate-700">
                Apenas se houver falha e você quiser a peça
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                Fundamento
              </dt>
              <dd className="mt-2 text-sm text-slate-700">
                Dispositivo legal citado em cada apontamento
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Areas atendidas — registro                                       */}
      {/* ---------------------------------------------------------------- */}
      <section id="areas" className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="mb-14 max-w-2xl">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
              Áreas atendidas
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Cada órgão tem uma lei. Cada lei tem um agente.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Não usamos a mesma análise para tudo. Abra a área correspondente ao
              documento que você recebeu para ver o que cobrimos.
            </p>
          </div>

          <div className="border-t border-slate-200">
            {VERTICAIS.map((v) => (
              <details key={v.id} className="group border-b border-slate-200">
                <summary className="flex cursor-pointer list-none flex-col gap-4 py-8 transition-colors hover:bg-slate-50 sm:flex-row sm:items-start sm:gap-10 [&::-webkit-details-marker]:hidden">
                  {/* Margem: rotulo do registro */}
                  <div className="flex items-center gap-3 sm:w-56 sm:flex-shrink-0 sm:pt-1">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0"
                      style={{ backgroundColor: v.cor.faixa }}
                    />
                    <span className="font-mono text-[11px] uppercase leading-relaxed tracking-widest text-slate-400">
                      {v.publico}
                    </span>
                  </div>

                  {/* Corpo do registro */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      {v.titulo}
                    </h3>
                    <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
                      {v.resumo}
                    </p>
                    <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-wide text-slate-400">
                      {v.baseLegal}
                    </p>
                  </div>

                  <ChevronDown className="hidden h-5 w-5 flex-shrink-0 text-slate-300 transition-transform duration-300 group-open:rotate-180 sm:mt-2 sm:block" />
                </summary>

                {/* Conteudo aberto */}
                <div className="pb-12 sm:pl-[16.5rem]">
                  <p className="max-w-2xl text-base leading-relaxed text-slate-700">
                    {v.detalhe}
                  </p>

                  <p className="mb-4 mt-10 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                    Situações analisadas
                  </p>
                  <ul className="grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-2">
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

                  <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-slate-200 pt-6">
                    <a
                      href={v.href}
                      className="bg-emerald-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
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
                    <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                      Análise gratuita · defesa {v.preco}
                    </span>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Processo                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="processo" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Processo
          </p>
          <h2 className="mb-14 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Três etapas, nessa ordem.
          </h2>

          <ol className="grid gap-px bg-slate-200 sm:grid-cols-3">
            {PASSOS.map((p) => (
              <li key={p.numero} className="bg-slate-50 p-8 sm:p-10">
                <span className="font-mono text-sm tracking-widest text-emerald-700">
                  {p.numero}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
                  {p.titulo}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
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
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Ferramentas gratuitas
          </p>
          <h2 className="mb-14 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Consulte antes de precisar recorrer.
          </h2>

          <div className="grid gap-12 sm:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <div key={f.id} className="border-t border-slate-900 pt-6">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {f.titulo}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  {f.resumo}
                </p>
                <a
                  href={f.href}
                  className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-4 transition-colors hover:decoration-emerald-700"
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
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Perguntas frequentes
          </p>
          <h2 className="mb-14 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            O que costuma gerar dúvida.
          </h2>

          <div className="max-w-3xl border-t border-slate-200">
            {FAQ.map((f) => (
              <details key={f.pergunta} className="group border-b border-slate-200">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-8 py-6 text-base font-medium text-slate-900 transition-colors hover:text-emerald-700 [&::-webkit-details-marker]:hidden">
                  {f.pergunta}
                  <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-7 text-sm leading-relaxed text-slate-600">
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
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 sm:grid-cols-4">
            <div className="sm:col-span-1">
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
              <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-slate-500">
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
              <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-slate-500">
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
              <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-slate-500">
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

          <div className="mt-16 border-t border-slate-800 pt-8">
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
