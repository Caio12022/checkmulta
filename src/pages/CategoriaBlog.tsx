import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock, ArrowLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { artigos } from "../data/artigos";
import { getCorSuave } from "../data/coresSuaves";

// Converte "CNH e Pontos" -> "cnh-e-pontos"
function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function CategoriaBlog() {
  const { categoria } = useParams<{ categoria: string }>();

  const artigosFiltrados = artigos.filter(
    (a) => slugify(a.categoria) === categoria
  );

  const nomeCategoria =
    artigosFiltrados.length > 0 ? artigosFiltrados[0].categoria : "Categoria";

  const cor =
    artigosFiltrados.length > 0
      ? getCorSuave(artigosFiltrados[0].imagemBg)
      : getCorSuave("from-slate-700");

  useEffect(() => {
    const url = `https://checkmulta.com.br/blog/categoria/${categoria}`;
    const descricao = `Artigos sobre ${nomeCategoria} — guias práticos sobre multas de trânsito, recursos e seus direitos como condutor.`;

    document.title = `${nomeCategoria} — Blog CheckMulta`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", descricao);

    // Canonical da página de categoria
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    const setOG = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setOG("og:title", `${nomeCategoria} — Blog CheckMulta`);
    setOG("og:description", descricao);
    setOG("og:url", url);
    setOG("og:type", "website");

    // Schema BreadcrumbList
    let bcScript = document.getElementById("categoria-breadcrumb-schema");
    if (!bcScript) {
      bcScript = document.createElement("script");
      bcScript.setAttribute("type", "application/ld+json");
      bcScript.setAttribute("id", "categoria-breadcrumb-schema");
      document.head.appendChild(bcScript);
    }
    bcScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: "https://checkmulta.com.br/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: "https://checkmulta.com.br/blog",
        },
        { "@type": "ListItem", position: 3, name: nomeCategoria, item: url },
      ],
    });

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
      const s = document.getElementById("categoria-breadcrumb-schema");
      if (s) s.remove();
    };
  }, [nomeCategoria, categoria]);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex h-full w-[180px] items-center md:w-[220px]">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="240"
              height="64"
              className="h-auto w-full origin-left scale-[1.25] object-contain md:scale-[1.35]"
            />
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-emerald-600">
              Início
            </Link>
            <Link to="/blog" className="text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* CAPA */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: cor.fundoBadge,
              color: cor.textoBadge,
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Categoria
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {nomeCategoria}
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
            {artigosFiltrados.length}{" "}
            {artigosFiltrados.length === 1 ? "artigo" : "artigos"} sobre este
            tema
          </p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link to="/" className="hover:text-emerald-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/blog" className="hover:text-emerald-600">
            Blog
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">{nomeCategoria}</span>
        </nav>
      </div>

      {/* GRID DE ARTIGOS */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artigosFiltrados.map((artigo) => {
            const corC = getCorSuave(artigo.imagemBg);
            return (
              <Link
                key={artigo.slug}
                to={`/blog/${artigo.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md"
              >
                <div
                  className="flex h-32 items-center justify-center"
                  style={{ backgroundColor: corC.fundoBadge }}
                >
                  <span className="text-4xl opacity-60">
                    {artigo.imagemEmoji}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <span
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: corC.textoBadge }}
                  >
                    {artigo.categoria}
                  </span>

                  <h2 className="mb-2 text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                    {artigo.titulo}
                  </h2>

                  <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600">
                    {artigo.descricao}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {artigo.tempoLeitura} de leitura
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {artigosFiltrados.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-500">
              Nenhum artigo encontrado nesta categoria.
            </p>
            <Link
              to="/blog"
              className="mt-4 inline-block text-sm font-semibold text-emerald-600 hover:underline"
            >
              Ver todos os artigos
            </Link>
          </div>
        )}

        {artigosFiltrados.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-600"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para todos os artigos
            </Link>
          </div>
        )}
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Tem uma multa para analisar?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            Mais de 400 multas já analisadas. Nossa IA verifica gratuitamente se
            há erro formal que possa anular a autuação.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            ← Voltar ao início
          </Link>

          <p className="mt-5 text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
