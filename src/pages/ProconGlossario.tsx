import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ShieldCheck, Scale, AlertOctagon } from "lucide-react";
import { PRATICAS_ABUSIVAS, SANCOES_PROCON } from "../data/glossarioProcon";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function rastrear(evento: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", evento, params);
  }
}

export default function ProconGlossario() {
  useEffect(() => {
    window.scrollTo(0, 0);

    document.title = "Glossário do Procon: práticas abusivas e sanções do CDC | CheckMulta";

    const setMeta = (nome: string, conteudo: string) => {
      let tag = document.querySelector(`meta[name="${nome}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", nome);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    const desc =
      "O que é cada prática abusiva do art. 39 e cada sanção administrativa do art. 56 do Código de Defesa do Consumidor, explicado em linguagem simples. Consulta gratuita, vale para qualquer Procon do Brasil.";

    setMeta("description", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/procon/glossario");

    return () => {
      document.title = "CheckMulta. Análise de Multas com IA";
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/procon" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/procon" className="hover:text-orange-600">
              Início
            </Link>
            <Link to="/procon/blog" className="hover:text-orange-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-slate-500">
          <Link to="/procon" className="hover:text-orange-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Glossário</span>
        </nav>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
          O que significa cada infração do Código de Defesa do Consumidor
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          O art. 39 do CDC lista as práticas abusivas e o art. 56 lista as sanções que o
          Procon pode aplicar. É lei federal, vale para qualquer Procon do Brasil,
          independentemente do estado ou município. Escolha abaixo o que aparece no seu auto
          de infração.
        </p>

        {/* PRÁTICAS ABUSIVAS */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Práticas abusivas <span className="font-normal text-slate-400">(art. 39 do CDC)</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRATICAS_ABUSIVAS.map((item) => (
              <Link
                key={item.slug}
                to={`/procon/glossario/${item.slug}`}
                onClick={() => rastrear("glossario_procon_item_click", { slug: item.slug })}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
              >
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Inciso {item.inciso}
                </span>
                <span className="block text-sm font-semibold text-slate-800 group-hover:text-orange-700">
                  {item.nome}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* SANÇÕES */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Sanções administrativas <span className="font-normal text-slate-400">(art. 56 do CDC)</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SANCOES_PROCON.map((item) => (
              <Link
                key={item.slug}
                to={`/procon/glossario/${item.slug}`}
                onClick={() => rastrear("glossario_procon_item_click", { slug: item.slug })}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
              >
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Inciso {item.inciso}
                </span>
                <span className="block text-sm font-semibold text-slate-800 group-hover:text-orange-700">
                  {item.nome}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Descubra grátis se o seu auto tem erro
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-slate-600">
            Nossa IA lê o auto de infração do Procon e aponta, de graça, se há falha formal.
            Se não houver, você não paga nada.
          </p>
          <Link
            to="/procon?analisar=1"
            onClick={() => rastrear("cta_glossario_procon_click", { cta_local: "final" })}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-6 border-t border-slate-200 bg-white">
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
            <Link to="/procon" className="text-slate-600 transition hover:text-orange-600">
              Auto de infração do Procon
            </Link>
            <Link to="/procon/blog" className="text-slate-600 transition hover:text-orange-600">
              Blog
            </Link>
            <Link
              to="/multa-de-transito"
              className="text-slate-600 transition hover:text-orange-600"
            >
              Multas de trânsito
            </Link>
          </nav>
          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Rol de práticas abusivas (art. 39) e de sanções administrativas (art. 56) da Lei
            nº 8.078/90 (Código de Defesa do Consumidor).
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia. CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
