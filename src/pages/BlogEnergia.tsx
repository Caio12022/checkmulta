import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Clock, ArrowRight } from "lucide-react";
import {
  artigosEnergia,
  getCategoriasEnergia,
} from "../data/artigosEnergia";
import { selo } from "../data/revisao";

export default function BlogEnergia() {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);

  const categorias = getCategoriasEnergia();

  const artigosFiltrados = categoriaAtiva
    ? artigosEnergia.filter((a) => a.categoria === categoriaAtiva)
    : artigosEnergia;

  useEffect(() => {
    document.title =
      "Blog Energia Elétrica — Defesa de TOI e conta de luz | CheckMulta";

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
      "Guias sobre TOI, recuperação de consumo e contestação de conta de energia: prazos, vícios da autuação e direitos do consumidor perante a distribuidora.";

    setMeta("description", descricao);
    setMeta("og:title", "Blog Energia Elétrica — Defesa de TOI e conta de luz", true);
    setMeta("og:description", descricao, true);
    setMeta("og:url", "https://checkmulta.com.br/energia/blog", true);
    setMeta("og:type", "website", true);
    setMeta("twitter:title", "Blog Energia Elétrica — Defesa de TOI e conta de luz");
    setMeta("twitter:description", descricao);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute(
      "href",
      "https://checkmulta.com.br/energia/blog"
    );

    const schema = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Blog Energia Elétrica — CheckMulta",
      description: descricao,
      url: "https://checkmulta.com.br/energia/blog",
      publisher: {
        "@type": "Organization",
        name: "CheckMulta",
        url: "https://checkmulta.com.br",
      },
    };

    let scriptSchema = document.getElementById("schema-blog-energia");
    if (scriptSchema) scriptSchema.remove();
    scriptSchema = document.createElement("script");
    scriptSchema.setAttribute("type", "application/ld+json");
    scriptSchema.id = "schema-blog-energia";
    scriptSchema.textContent = JSON.stringify(schema);
    document.head.appendChild(scriptSchema);

    return () => {
      const s = document.getElementById("schema-blog-energia");
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/energia" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/energia" className="hover:text-emerald-600">
              Análise gratuita
            </Link>
            <Link to="/energia/blog" className="text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* Capa */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Zap className="h-3.5 w-3.5" />
            Para quem recebeu TOI ou cobrança retroativa
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Blog Energia Elétrica: tudo sobre{" "}
            <span className="text-emerald-600">TOI</span> e conta de luz
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
            Prazo de defesa, cobrança retroativa, vícios do termo e direitos do
            consumidor. Conteúdo fundamentado na REN 1.000/2021 da ANEEL.
          </p>

          <Link
            to="/energia"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Ver se o meu TOI tem falha
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
              onClick={() =>
                setCategoriaAtiva(categoriaAtiva === cat ? null : cat)
              }
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
          {artigosFiltrados.map((artigo) => {
            const dataArtigo = selo(
              (artigo as { dataPublicacao?: string }).dataPublicacao
            );
            return (
              <Link
                key={artigo.slug}
                to={`/energia/blog/${artigo.slug}`}
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

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {artigo.tempoLeitura} de leitura
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <time dateTime={dataArtigo.iso}>{dataArtigo.texto}</time>
                  </div>
                </div>
              </Link>
            );
          })}
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
            Recebeu um TOI ou cobrança retroativa?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            Envie o documento e receba, gratuitamente, a análise que aponta se
            ele tem falha que permite contestação. Se não houver, você não paga
            nada.
          </p>
          <Link
            to="/energia"
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
            <Link to="/multa-de-transito" className="text-slate-600 transition hover:text-emerald-600">
              Multas de trânsito
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
            <Link
              to="/energia"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Conta de luz
            </Link>
            <Link
              to="/ibama"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              IBAMA
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
