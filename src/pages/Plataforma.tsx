import { useEffect, useState } from "react";
import {
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Check,
  Menu,
  X,
  MessageSquare,
  ShieldCheck,
  Lock,
  Timer,
  Car,
  Scale,
  Droplet,
  Zap,
  Leaf,
  HelpCircle,
} from "lucide-react";
import { VERTICAIS, FERRAMENTAS } from "../data/verticais";
import ComoFuncionaScroll from "../components/ComoFuncionaScroll";
import HeroFluxo from "../components/HeroFluxo";

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

/**
 * Rótulos da triagem do topo.
 *
 * Regra de escrita: em cima a língua da pessoa (quem mandou o papel e o que
 * é esse papel), embaixo a lei. Quem chega aqui raramente sabe que o
 * documento se chama "auto de infração" — sabe que "levou uma multa do
 * Procon". O termo jurídico aparece depois, como prova de fundamento.
 */
const ORGAOS: Record<string, { orgao: string; oque: string; lei: string }> = {
  transito: {
    orgao: "Detran, PRF ou prefeitura",
    oque: "Multa de trânsito",
    lei: "CTB",
  },
  procon: {
    orgao: "Procon",
    oque: "Multa por reclamação de cliente",
    lei: "CDC",
  },
  vigilancia: {
    orgao: "Vigilância Sanitária",
    oque: "Auto de infração ou interdição",
    lei: "Lei 6.437/77",
  },
  energia: {
    orgao: "Companhia de luz",
    oque: "Cobrança retroativa de energia",
    lei: "REN 1.000/2021",
  },
  ibama: {
    orgao: "Ibama",
    oque: "Multa ambiental",
    lei: "Decreto 6.514/08",
  },
};

/** Ícone de cada vertical na grade de triagem. */
const ICONES_ORGAO: Record<string, React.ComponentType<{ className?: string }>> = {
  transito: Car,
  procon: Scale,
  vigilancia: Droplet,
  energia: Zap,
  ibama: Leaf,
};

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
  "CheckMulta. Defesa de autos de infração e notificações administrativas";
const DESCRICAO =
  "Recebeu um auto de infração ou uma notificação de órgão público? Analisamos o documento gratuitamente e apontamos se há falha que permite recorrer. Trânsito, Procon, Vigilância Sanitária, energia elétrica e meio ambiente.";
const CANONICAL = "https://checkmulta.com.br/";
const ORIGEM = "https://checkmulta.com.br";

export default function Plataforma() {
  const [menuAberto, setMenuAberto] = useState(false);

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
          url: CANONICAL,
          logo: {
            "@type": "ImageObject",
            url: `${ORIGEM}/checkmulta-logo.webp`,
          },
          taxID: "63.524.338/0001-62",
          vatID: "63.524.338/0001-62",
          description: DESCRICAO,
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
    <div className="min-h-screen bg-white text-stone-900 antialiased">
      {/* ---------------------------------------------------------------- */}
      {/* Cabecalho                                                         */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </a>

          <nav className="hidden items-center gap-5 text-sm font-medium text-stone-600 lg:flex">
            <a href="#areas" className="transition hover:text-emerald-600">
              Áreas
            </a>
            <a href="#como-funciona" className="transition hover:text-emerald-600">
              Como funciona
            </a>
            <a href="#ferramentas" className="transition hover:text-emerald-600">
              Ferramentas
            </a>
            <a href="#duvidas" className="transition hover:text-emerald-600">
              Dúvidas
            </a>
            <a href="/multa-de-transito/blog" className="transition hover:text-emerald-600">
              Blog
            </a>
            <a
              href="https://wa.me/5513996485501"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              Suporte
            </a>
          </nav>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex rounded-lg p-2 text-stone-600 transition hover:bg-stone-50 hover:text-emerald-600 lg:hidden"
            aria-label="Menu"
          >
            {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {menuAberto ? (
            <div className="absolute left-0 top-full z-50 flex w-full flex-col space-y-2 border-b border-stone-200 bg-white p-4 shadow-lg lg:hidden">
              <a
                href="#areas"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Áreas
              </a>
              <a
                href="#como-funciona"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Como funciona
              </a>
              <a
                href="#ferramentas"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Ferramentas
              </a>
              <a
                href="#duvidas"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Dúvidas
              </a>
              <a
                href="/multa-de-transito/blog"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Blog
              </a>
              <a
                href="https://wa.me/5513996485501"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuAberto(false)}
                className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-3 text-left font-semibold text-emerald-700 transition"
              >
                <span>Central de suporte</span>
                <MessageSquare className="h-4 w-4" />
              </a>
            </div>
          ) : null}
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Abertura animada (inspirada no hero do auxia.io)                  */}
      {/* ---------------------------------------------------------------- */}
      <HeroFluxo />

      {/* ---------------------------------------------------------------- */}
      {/* Triagem                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-stone-200">
        {/* Fundo hexagonal sutil — decorativo, não interativo */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-stone-200"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hex-pattern"
              width="56"
              height="97"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(1)"
            >
              <path
                d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z M28 64 L56 80 L56 112 L28 128 L0 112 L0 80 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>

        <div className="relative mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-stone-400">
            CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
          </p>

          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Quem te <span className="text-emerald-600">autuou?</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Escolha o órgão, envie o documento e receba a análise gratuita.
            Apontamos, com o trecho citado, se existe falha formal que permita
            recorrer.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-600">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Análise gratuita
            </span>
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" /> Sem cadastro
            </span>
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-600" /> Resultado imediato
            </span>
          </div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
            {VERTICAIS.map((v) => {
              const o = ORGAOS[v.id];
              const Icone = ICONES_ORGAO[v.id];
              return (
                <a
                  key={v.id}
                  href={v.href}
                  className="group flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-5 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
                >
                  <span
                    className="h-12 w-1 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: v.cor.faixa }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-stone-900 group-hover:text-emerald-800">
                      {o ? o.orgao : v.titulo}
                    </span>
                    <span className="mt-1 block text-sm text-stone-600">
                      {o ? o.oque : v.resumo}
                    </span>
                    <span className="mt-1 block font-mono text-xs tracking-wide text-stone-400">
                      {o ? o.lei : v.baseLegal}
                    </span>
                  </span>
                  {Icone ? (
                    <Icone className="h-8 w-8 flex-shrink-0 text-stone-300 transition-colors group-hover:text-emerald-600" />
                  ) : null}
                </a>
              );
            })}

            <a
              href="#areas"
              className="flex items-center gap-4 rounded-lg border border-dashed border-stone-300 bg-white p-5 transition-colors hover:border-stone-400 hover:bg-stone-50"
            >
              <span className="h-12 w-1 flex-shrink-0 rounded-full bg-stone-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-stone-700">
                  Não sei quem me multou
                </span>
                <span className="mt-1 block text-sm text-stone-600">
                  Ver todas as áreas e descobrir
                </span>
              </span>
              <HelpCircle className="h-8 w-8 flex-shrink-0 text-stone-300" />
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Demonstracao: documento marcado                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-stone-400">
              O que você recebe
            </p>
            <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-3xl">
              Toda multa tem regras para ser aplicada. Quando o órgão erra, ela
              pode ser <span className="text-emerald-600">derrubada</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-stone-600">
              Nós lemos o seu documento linha por linha e apontamos cada erro
              que encontramos, em português claro, dizendo qual regra foi
              descumprida e por que aquilo é um problema.
            </p>
            <p className="mt-5 text-base leading-relaxed text-stone-600">
              Se não houver erro nenhum, a gente fala isso na cara e não cobra
              nada.
            </p>
          </div>

          {/* Peca de demonstracao. Conteudo ilustrativo. */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-stone-400">
              Exemplo de análise
            </p>

            <div className="space-y-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">
                  Onde a multa foi aplicada
                </p>
                <p className="mt-1 inline-block rounded bg-red-50 px-2 py-1 text-sm font-medium text-red-800">
                  Av. Principal, s/n
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  O endereço está incompleto. Sem número nem ponto de
                  referência, não dá para saber onde a multa foi aplicada. E
                  isso é motivo de anulação.
                </p>
              </div>

              <div className="border-t border-stone-100 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">
                  Quem aplicou
                </p>
                <p className="mt-1 inline-block rounded bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800">
                  Matrícula ilegível
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Não dá para identificar o agente que aplicou a multa. Sozinho
                  não derruba, mas reforça a defesa.
                </p>
              </div>

              <div className="border-t border-stone-100 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">
                  Quando você foi avisado
                </p>
                <p className="mt-1 text-sm font-medium text-stone-900">
                  14/03/2026
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-stone-500">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  O aviso chegou dentro do prazo. Aqui está tudo certo, e a
                  gente diz isso também.
                </p>
              </div>
            </div>

            <p className="mt-6 border-t border-stone-100 pt-5 text-xs leading-relaxed text-stone-500">
              Exemplo ilustrativo. Cada área é analisada segundo a lei do órgão
              que aplicou a multa.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Areas atendidas                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section id="areas" className="border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
            Áreas atendidas
          </p>
          <h2 className="font-display mx-auto mb-4 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Cada órgão tem uma lei. Cada lei tem um <span className="text-emerald-600">agente</span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-stone-600">
            Não usamos a mesma análise para tudo. Abra a área correspondente ao
            documento que você recebeu para ver tudo o que cobrimos.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            {VERTICAIS.map((v) => (
              <details
                key={v.id}
                className="group overflow-hidden rounded-xl border border-stone-200 transition-colors hover:border-stone-300"
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
                      <h3 className="font-display mt-2 text-lg font-semibold tracking-tight text-stone-900">
                        {v.titulo}
                      </h3>
                    </div>
                    <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-stone-300 transition-transform duration-300 group-open:rotate-180" />
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {v.resumo}
                  </p>

                  {/* Previa: o que costuma falhar nesta area */}
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-stone-400">
                    O que costuma falhar aqui
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {v.especialidades.slice(0, 3).map((e) => (
                      <li
                        key={e.texto}
                        className="flex items-start gap-2 text-sm text-stone-600"
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
                  <p className="border-t border-stone-100 pt-5 text-sm leading-relaxed text-stone-700">
                    {v.detalhe}
                  </p>

                  <p className="mb-3 mt-6 font-mono text-[11px] uppercase tracking-widest text-stone-400">
                    Todas as situações analisadas
                  </p>
                  <ul className="space-y-2">
                    {v.especialidades.map((e) => (
                      <li key={e.texto} className="text-sm leading-relaxed">
                        {e.href ? (
                          <a
                            href={e.href}
                            className="text-stone-600 underline decoration-stone-200 underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-700"
                          >
                            {e.texto}
                          </a>
                        ) : (
                          <span className="text-stone-600">{e.texto}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-wide text-stone-400">
                    {v.baseLegal}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-stone-100 pt-5">
                    <a
                      href={v.href}
                      className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                    >
                      {v.botao}
                    </a>
                    {v.hrefBlog ? (
                      <a
                        href={v.hrefBlog}
                        className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-emerald-700"
                      >
                        Ler os artigos
                      </a>
                    ) : null}
                  </div>

                  <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-stone-400">
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
      <ComoFuncionaScroll />

      {/* ---------------------------------------------------------------- */}
      {/* Ferramentas                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section id="ferramentas" className="border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
            Ferramentas gratuitas
          </p>
          <h2 className="font-display mx-auto mb-12 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Consulte antes de precisar <span className="text-emerald-600">recorrer</span>
          </h2>

          <div className="grid gap-10 sm:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <div key={f.id} className="border-t border-stone-900 pt-5">
                <h3 className="font-display text-base font-semibold tracking-tight text-stone-900">
                  {f.titulo}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
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
      <section id="duvidas" className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
            Perguntas frequentes
          </p>
          <h2 className="font-display mx-auto mb-12 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            O que costuma gerar <span className="text-emerald-600">dúvida</span>
          </h2>

          <div className="mx-auto max-w-3xl border-t border-stone-200">
            {FAQ.map((f) => (
              <details
                key={f.pergunta}
                className="group border-b border-stone-200"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-base font-medium text-stone-900 transition-colors hover:text-emerald-700 [&::-webkit-details-marker]:hidden">
                  {f.pergunta}
                  <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-stone-300 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-relaxed text-stone-600">
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
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <div className="mb-6 flex items-center justify-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-12 w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 md:h-16"
            />
          </div>

          <nav className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
            {VERTICAIS.map((v) => (
              <a
                key={v.id}
                href={v.href}
                className="text-stone-600 transition hover:text-emerald-600"
              >
                {v.titulo}
              </a>
            ))}
          </nav>

          <nav className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-500">
            {FERRAMENTAS.map((f) => (
              <a
                key={f.id}
                href={f.href}
                className="transition hover:text-emerald-600"
              >
                {f.titulo}
              </a>
            ))}
            <a href="/multa-de-transito/blog" className="transition hover:text-emerald-600">
              Blog
            </a>
          </nav>

          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-stone-500">
            <strong className="font-semibold text-stone-700">
              Transparência e privacidade:
            </strong>{" "}
            o CheckMulta presta serviço de análise documental e elaboração de
            peça administrativa, com base na legislação federal aplicável a cada
            órgão. Não prestamos consultoria jurídica nem representação, e a
            decisão sobre a defesa cabe sempre ao órgão autuador. Não exigimos
            cadastro e não armazenamos o seu documento.
          </p>

          <p className="mt-4 text-xs text-stone-400">
            CheckMulta Tecnologia. CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
