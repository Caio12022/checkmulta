import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, ChevronRight, ShieldCheck, X } from "lucide-react";
import {
  infracoes,
  buscarInfracoes,
  calcularValor,
  formatarReal,
  NOMES_GRAVIDADE,
  type Gravidade,
} from "../data/infracoes";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function rastrear(evento: string, params: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", evento, params);
  }
}

const CORES: Record<Gravidade, { texto: string; fundo: string; borda: string }> = {
  leve: { texto: "#15803d", fundo: "#f0fdf4", borda: "#bbf7d0" },
  media: { texto: "#a16207", fundo: "#fefce8", borda: "#fef08a" },
  grave: { texto: "#c2410c", fundo: "#fff7ed", borda: "#fed7aa" },
  gravissima: { texto: "#b91c1c", fundo: "#fef2f2", borda: "#fecaca" },
  especial: { texto: "#475569", fundo: "#f8fafc", borda: "#e2e8f0" },
};

const ORDEM_GRAVIDADE: Gravidade[] = ["gravissima", "grave", "media", "leve", "especial"];

// Códigos frequentes, conferidos contra a tabela oficial.
const DESTAQUES = ["7471", "7463", "7455", "5045", "5169", "5185", "7030", "5673"];

function tituloCurto(descricao: string, limite = 80): string {
  const corte = descricao.split(/\s+-\s+|\s+e\s+(?=[A-ZÀ-Ú])/)[0].trim();
  return corte.length > limite ? corte.slice(0, limite).trim() + "…" : corte;
}

export default function ConsultaInfracao() {
  const [termo, setTermo] = useState("");
  const [filtro, setFiltro] = useState<Gravidade | "todas">("todas");

  useEffect(() => {
    window.scrollTo(0, 0);

    document.title =
      "Consulta de código de infração de trânsito: valor e pontos | CheckMulta";

    const setMeta = (nome: string, conteudo: string) => {
      let tag = document.querySelector(`meta[name="${nome}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", nome);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    const setOG = (prop: string, conteudo: string) => {
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    const desc =
      "Digite o código do seu auto de infração e veja na hora o valor da multa, os pontos na CNH, a gravidade e o artigo do CTB. Tabela oficial da SENATRAN, consulta gratuita.";

    setMeta("description", desc);
    setMeta(
      "keywords",
      "código de infração, consulta código multa, tabela de infrações CTB, valor da multa, pontos na CNH, enquadramento auto de infração"
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/infracao");

    setOG("og:title", "Consulta de código de infração de trânsito | CheckMulta");
    setOG("og:description", desc);
    setOG("og:url", "https://checkmulta.com.br/infracao");
    setOG("og:type", "website");

    let schema = document.getElementById("consulta-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "consulta-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Onde encontro o código da infração no auto?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "O código costuma aparecer junto à descrição da infração, num campo com quatro dígitos, às vezes seguido de um dígito de desdobramento. Ele consta tanto no auto de infração quanto na notificação de penalidade.",
          },
        },
        {
          "@type": "Question",
          name: "O valor da multa é igual em todo o Brasil?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. O art. 258 do Código de Trânsito Brasileiro fixa o valor conforme a gravidade da infração, e ele vale em todo o território nacional. O que muda entre estados e municípios é qual órgão aplica a autuação.",
          },
        },
        {
          "@type": "Question",
          name: "Pagar a multa com 40% de desconto tira os pontos da CNH?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Não. O desconto do art. 284 do CTB reduz o valor pago, mas os pontos continuam registrados na habilitação. Apenas o acolhimento de um recurso pode afastar a pontuação.",
          },
        },
        {
          "@type": "Question",
          name: "Todo auto de infração pode ser contestado?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A defesa prévia é um direito do autuado. O que varia é a existência de fundamento: falhas formais no preenchimento do auto, previstas no art. 280 do CTB, são o argumento mais comum.",
          },
        },
      ],
    });

    return () => {
      document.title = "CheckMulta. Análise de Multas com IA";
    };
  }, []);

  const resultados = useMemo(() => {
    const base = termo.trim() ? buscarInfracoes(termo, 300) : infracoes;
    return filtro === "todas" ? base : base.filter((i) => i.gravidade === filtro);
  }, [termo, filtro]);

  const destaques = useMemo(
    () => DESTAQUES.map((c) => infracoes.find((i) => i.codigoUrl === c)).filter(Boolean),
    []
  );

  const contagem = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const g of ORDEM_GRAVIDADE) {
      mapa[g] = infracoes.filter((i) => i.gravidade === g).length;
    }
    return mapa;
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-emerald-600">
              Início
            </Link>
            <Link to="/infracao" className="text-emerald-600">
              Infrações
            </Link>
            <Link to="/blog" className="hover:text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* BUSCA */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <nav className="mb-5 flex items-center gap-1 text-xs text-slate-500">
            <Link to="/" className="hover:text-emerald-600">
              Início
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-400">Infrações</span>
          </nav>

          <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
            Qual é o código da sua multa?
          </h1>
          <p className="mb-7 max-w-2xl text-base leading-relaxed text-slate-600">
            Digite o código que aparece no auto de infração e veja na hora o valor, os
            pontos na CNH e o artigo do CTB que fundamenta a autuação. Você também pode
            buscar pelo que aconteceu, como “velocidade” ou “cnh vencida”.
          </p>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onBlur={() => {
                if (termo.trim().length > 2) {
                  rastrear("busca_infracao", {
                    termo_busca: termo.trim().toLowerCase(),
                    resultados: resultados.length,
                  });
                }
              }}
              placeholder="Ex: 7471 ou velocidade"
              aria-label="Buscar código ou descrição da infração"
              className="w-full rounded-xl border border-slate-300 bg-white py-4 pl-12 pr-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {termo && (
              <button
                onClick={() => setTermo("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* DESTAQUES */}
          {!termo && (
            <div className="mt-6">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Códigos mais consultados
              </span>
              <div className="flex flex-wrap gap-2">
                {destaques.map((d) => (
                  <Link
                    key={d!.slug}
                    to={`/infracao/${d!.slug}`}
                    onClick={() => rastrear("clique_destaque", { infracao_codigo: d!.codigo })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {d!.codigoUrl} · {tituloCurto(d!.descricao, 34)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FILTROS E RESULTADOS */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFiltro("todas")}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
              filtro === "todas"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            Todas ({infracoes.length})
          </button>
          {ORDEM_GRAVIDADE.map((g) => (
            <button
              key={g}
              onClick={() => setFiltro(g)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                filtro === g
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {NOMES_GRAVIDADE[g]} ({contagem[g]})
            </button>
          ))}
        </div>

        <p className="mb-5 text-sm text-slate-500">
          {resultados.length === 0
            ? "Nenhuma infração encontrada."
            : `${resultados.length} ${
                resultados.length === 1 ? "infração encontrada" : "infrações encontradas"
              }`}
        </p>

        {resultados.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="mb-4 text-[15px] leading-relaxed text-slate-600">
              Não encontramos esse código. Confira os dígitos no auto de infração. Ele
              costuma ter quatro números. Se preferir, busque pelo que aconteceu, como
              “estacionar” ou “cinto”.
            </p>
            <button
              onClick={() => {
                setTermo("");
                setFiltro("todas");
              }}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Ver todas as infrações
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {resultados.map((i, idx) => {
              const cor = CORES[i.gravidade];
              const valor = calcularValor(i);
              return (
                <Link
                  key={i.slug}
                  to={`/infracao/${i.slug}`}
                  onClick={() => rastrear("clique_resultado", { infracao_codigo: i.codigo })}
                  className={`group flex items-center gap-4 px-4 py-4 transition hover:bg-emerald-50/50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  } ${idx !== 0 ? "border-t border-slate-100" : ""}`}
                >
                  <span
                    className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-bold tabular-nums"
                    style={{
                      backgroundColor: cor.fundo,
                      color: cor.texto,
                      border: `1px solid ${cor.borda}`,
                    }}
                  >
                    {i.codigoUrl}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-slate-800 group-hover:text-emerald-700">
                      {tituloCurto(i.descricao)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {NOMES_GRAVIDADE[i.gravidade]}
                      {i.infrator === "Condutor" && i.pontos > 0 && ` · ${i.pontos} pontos`}
                      {` · art. ${i.amparoLegal}`}
                    </span>
                  </span>

                  <span className="hidden flex-shrink-0 text-right text-sm font-semibold text-slate-700 sm:block">
                    {valor !== null ? formatarReal(valor) : "—"}
                  </span>

                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-emerald-500" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Encontrou seu código? O próximo passo é conferir o auto
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
            O código estar correto não significa que a autuação esteja. O art. 280 do CTB
            exige uma série de requisitos de preenchimento, e a falta de qualquer um deles
            pode abrir margem para recurso. Nossa IA verifica isso de graça.
          </p>
          <Link
            to="/"
            onClick={() => rastrear("cta_infracao_click", { cta_local: "consulta_final" })}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CONTEXTO / FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-5 text-xl font-bold text-slate-900 sm:text-[22px]">
          Perguntas frequentes
        </h2>
        <div className="space-y-3">
          {[
            {
              p: "Onde encontro o código da infração no auto?",
              r: "O código costuma aparecer junto à descrição da infração, num campo com quatro dígitos, às vezes seguido de um dígito de desdobramento. Ele consta tanto no auto de infração quanto na notificação de penalidade.",
            },
            {
              p: "O valor da multa é igual em todo o Brasil?",
              r: "Sim. O art. 258 do Código de Trânsito Brasileiro fixa o valor conforme a gravidade da infração, e ele vale em todo o território nacional. O que muda entre estados e municípios é qual órgão aplica a autuação.",
            },
            {
              p: "Pagar a multa com 40% de desconto tira os pontos da CNH?",
              r: "Não. O desconto do art. 284 do CTB reduz o valor pago, mas os pontos continuam registrados na habilitação. Apenas o acolhimento de um recurso pode afastar a pontuação.",
            },
            {
              p: "Todo auto de infração pode ser contestado?",
              r: "A defesa prévia é um direito do autuado. O que varia é a existência de fundamento: falhas formais no preenchimento do auto, previstas no art. 280 do CTB, são o argumento mais comum.",
            },
          ].map((f, i) => (
            <details
              key={i}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15.5px] font-semibold text-slate-800 hover:text-emerald-700">
                {f.p}
                <span className="ml-3 flex-shrink-0 text-lg text-emerald-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-4 text-[15.5px] leading-relaxed text-slate-600">
                {f.r}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
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
            <Link to="/" className="text-slate-600 transition hover:text-emerald-600">
              Multas de trânsito
            </Link>
            <Link to="/blog" className="text-slate-600 transition hover:text-emerald-600">
              Blog
            </Link>
            <Link to="/procon" className="text-slate-600 transition hover:text-emerald-600">
              Procon
            </Link>
            <Link
              to="/vigilancia-sanitaria"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Vigilância Sanitária
            </Link>
          </nav>

          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Dados de código, descrição e enquadramento extraídos da Tabela de Código de
            Infrações RENAINF, publicada pela SENATRAN. Valores conforme o art. 258 do CTB.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia. CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
