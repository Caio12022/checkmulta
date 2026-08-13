import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, ChevronRight, ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import {
  buscarItemProconPorSlug,
  PRATICAS_ABUSIVAS,
  SANCOES_PROCON,
  type ItemProcon,
} from "../data/glossarioProcon";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function rastrearCTA(local: string, slug: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "cta_glossario_procon_click", { cta_local: local, item_slug: slug });
  }
}

export default function ProconGlossarioDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const item = buscarItemProconPorSlug(slug || "");

  const url = item ? `https://checkmulta.com.br/procon/glossario/${item.slug}` : "";
  const rotuloTipo = item?.tipo === "sancao" ? "Sanção administrativa" : "Prática abusiva";
  const artigo = item?.tipo === "sancao" ? "56" : "39";

  const descricaoMeta = item
    ? `Art. ${artigo}, inciso ${item.inciso}, do CDC: ${item.nome}. ${item.explicacao} Veja grátis se o seu auto de infração do Procon tem erro formal.`
    : "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!item) return;

    const tituloPagina = `${item.nome} (art. ${artigo}, ${item.inciso}, do CDC) | CheckMulta`;
    document.title = tituloPagina;

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

    setMeta("description", descricaoMeta);
    setMeta(
      "keywords",
      `art ${artigo} CDC, art. ${artigo} inciso ${item.inciso}, ${item.nome.toLowerCase()}, código de defesa do consumidor, procon`
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    setOG("og:title", tituloPagina);
    setOG("og:description", descricaoMeta);
    setOG("og:url", url);
    setOG("og:type", "article");

    let schema = document.getElementById("glossario-procon-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "glossario-procon-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: item.nome,
      description: item.explicacao,
      url: url,
      inDefinedTermSet: {
        "@type": "DefinedTermSet",
        name: "Código de Defesa do Consumidor (Lei 8.078/90)",
      },
    });

    return () => {
      document.title = "CheckMulta. Análise de Multas com IA";
    };
  }, [item, url, descricaoMeta, artigo]);

  if (slug && !item) {
    return <Navigate to="/procon/glossario" replace />;
  }
  if (!item) return null;

  const relacionados = (item.tipo === "sancao" ? SANCOES_PROCON : PRATICAS_ABUSIVAS)
    .filter((i) => i.slug !== item.slug)
    .slice(0, 4);

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
            <Link to="/procon/glossario" className="hover:text-orange-600">
              Glossário
            </Link>
            <Link to="/procon/blog" className="hover:text-orange-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* BARRA DE URGÊNCIA */}
      <div className="border-b border-orange-100 bg-orange-50">
        <div className="mx-auto max-w-3xl px-4 py-2.5 text-center text-[13px] text-orange-800">
          Recebeu um auto de infração do Procon?{" "}
          <Link to="/procon" className="font-semibold underline">
            Analise grátis agora
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link to="/procon" className="hover:text-orange-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/procon/glossario" className="hover:text-orange-600">
            Glossário
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">{item.nome}</span>
        </nav>

        {/* CABEÇALHO */}
        <div className="mb-8 border-l-4 border-orange-500 pl-5">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            {rotuloTipo} · art. {artigo}, {item.inciso}, do CDC
          </span>
          <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[32px] sm:leading-[1.2]">
            {item.nome}
          </h1>
          <p className="text-base leading-relaxed text-slate-600">{item.explicacao}</p>
        </div>

        {/* TEXTO OFICIAL */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Texto oficial da lei</h2>
          <blockquote className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-700">
            "{item.textoOficial}"
            <footer className="mt-2 text-xs text-slate-500">
              Fonte: art. {artigo}, inciso {item.inciso}, da Lei nº 8.078/90 (Código de Defesa
              do Consumidor)
            </footer>
          </blockquote>
        </section>

        {/* EXEMPLO (só práticas abusivas) */}
        {item.exemplo && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Exemplo prático</h2>
            <p className="text-[16.5px] leading-[1.75] text-slate-700">{item.exemplo}</p>
          </section>
        )}

        {/* O QUE FAZER (só sanções) */}
        {item.oQueFazer && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">O que verificar</h2>
            <p className="text-[16.5px] leading-[1.75] text-slate-700">{item.oQueFazer}</p>
          </section>
        )}

        {/* CTA PRINCIPAL */}
        <div className="mb-10 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">
              Recebeu um auto de infração do Procon?
            </strong>{" "}
            Nossa IA lê o documento e aponta, de graça, se há falha formal que abre margem
            para recurso, sem prometer resultado e sem cadastro.
          </p>
          <Link
            to="/procon?analisar=1"
            onClick={() => rastrearCTA("principal", item.slug)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar meu auto grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* AVISO */}
        <div className="mb-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Esta página explica o que a lei prevê para essa {item.tipo === "sancao" ? "sanção" : "prática"}.
            {" "}Ela não analisa o seu caso específico. {item.tipo === "sancao" ? "O valor da multa e as demais sanções aplicáveis" : "Se a conduta descrita realmente ocorreu, e se ela caracteriza infração"} dependem dos fatos e são avaliados caso a caso.
          </p>
        </div>

        {/* RELACIONADOS */}
        {relacionados.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Outras {item.tipo === "sancao" ? "sanções" : "práticas abusivas"} do CDC
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relacionados.map((r) => (
                <Link
                  key={r.slug}
                  to={`/procon/glossario/${r.slug}`}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
                >
                  <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Inciso {r.inciso}
                    </span>
                    <span className="block text-sm font-semibold text-slate-800 group-hover:text-orange-700">
                      {r.nome}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-5">
              <Link
                to="/procon/glossario"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Ver o glossário completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        )}
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
            <Link
              to="/procon/glossario"
              className="text-slate-600 transition hover:text-orange-600"
            >
              Glossário
            </Link>
            <Link to="/procon/blog" className="text-slate-600 transition hover:text-orange-600">
              Blog
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
