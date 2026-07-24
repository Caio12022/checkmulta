import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Clock, ArrowRight } from "lucide-react";
import {
  artigosProcon,
  getCategoriasProcon,
  slugifyCategoriaProcon,
} from "../data/artigosProcon";

export default function BlogProcon() {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);

  const categorias = getCategoriasProcon();

  const artigosFiltrados = categoriaAtiva
    ? artigosProcon.filter((a) => a.categoria === categoriaAtiva)
    : artigosProcon;

  useEffect(() => {
    document.title =
      "Blog Procon — Defesa de auto de infração para empresas | CheckMulta";

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const descricao =
      "Guias sobre auto de infração do Procon: prazos, vícios formais, defesa administrativa e direitos da empresa autuada. Fundamentado no CDC e no Decreto 2.181/97.";

    setMeta("description", descricao);
    setMeta("og:title", "Blog Procon — Defesa de auto de infração para empresas", true);
    setMeta("og:description", descricao, true);
    setMeta("og:url", "https://checkmulta.com.br/procon/blog", true);
    setMeta("og:type", "website", true);
    setMeta("twitter:title", "Blog Procon — Defesa de auto de infração para empresas");
    setMeta("twitter:description", descricao);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/procon/blog");

    const schema = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Blog Procon — CheckMulta",
      description: descricao,
      url: "https://checkmulta.com.br/procon/blog",
      publisher: {
        "@type": "Organization",
        name: "CheckMulta",
        url: "https://checkmulta.com.br",
      },
    };

    let scriptSchema = document.getElementById("schema-blog-procon");
    if (scriptSchema) scriptSchema.remove();
    scriptSchema = document.createElement("script");
    scriptSchema.setAttribute("type", "application/ld+json");
    scriptSchema.id = "schema-blog-procon";
    scriptSchema.textContent = JSON.stringify(schema);
    document.head.appendChild(scriptSchema);

    return () => {
      const s = document.getElementById("schema-blog-procon");
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho */}
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
            <Link to="/procon" className="hover:text-emerald-600">
              Análise gratuita
            </Link>
            <Link to="/procon/blog" className="text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* Capa */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Building2 className="h-3.5 w-3.5" />
            Para empresas autuadas
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Blog Procon: tudo sobre{" "}
            <span className="text-emerald-600">auto de infração</span> e defesa
            administrativa
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
            Prazos, vícios formais, procedimento e direitos da empresa autuada.
            Conteúdo fundamentado no Código de Defesa do Consumidor e no Decreto
            2.181/97.
          </p>

          <Link
            to="/procon"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Ver se dá para recorrer da minha multa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Filtro de categorias */}
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              categoriaAtiva === null
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos os artigos
          </button>

          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                categoriaAtiva === cat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de artigos */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artigosFiltrados.map((artigo) => (
            <Link
              key={artigo.slug}
              to={`/procon/blog/${artigo.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md"
            >
              <div
                className={`flex h-32 items-center justify-center bg-gradient-to-br ${artigo.imagemBg}`}
              >
                <span className="text-4xl opacity-60">{artigo.imagemEmoji}</span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
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
          ))}
        </div>

        {artigosFiltrados.length === 0 && (
          <p className="py-12 text-center text-slate-500">
            Nenhum artigo nesta categoria ainda.
          </p>
        )}
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Sua empresa foi multada pelo Procon?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            Envie o auto de infração e receba, gratuitamente, a análise que
            aponta se há falha que permite recorrer. Se não houver, você não paga
            nada.
          </p>
          <Link
            to="/procon"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar grátis agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Rodapé */}
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
            <Link to="/procon" className="text-slate-600 transition hover:text-emerald-600">
              Procon
            </Link>
            <Link to="/vigilancia-sanitaria" className="text-slate-600 transition hover:text-emerald-600">
              Vigilância Sanitária
            </Link>
          </nav>

          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-slate-500">
            O conteúdo deste blog tem caráter informativo e não constitui
            consultoria jurídica. O CheckMulta não representa clientes
            juridicamente. Para orientação sobre o seu caso concreto, consulte um
            advogado.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
