import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, ShieldCheck, Search } from "lucide-react";
import { artigos } from "../data/artigos";
import { getCorSuave } from "../data/coresSuaves";

export default function Blog() {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [mostrarTodasCategorias, setMostrarTodasCategorias] = useState(false);

  useEffect(() => {
    document.title = "Blog CheckMulta — Guias sobre Multas de Trânsito no Brasil";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "Guias práticos sobre como recorrer de multas de trânsito, prazos legais, pontos na CNH e seus direitos como condutor."
    );

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, []);

  // Categorias ordenadas por quantidade de artigos
  const categorias = Array.from(new Set(artigos.map((a) => a.categoria))).sort(
    (a, b) =>
      artigos.filter((x) => x.categoria === b).length -
      artigos.filter((x) => x.categoria === a).length
  );

  const artigosFiltrados = artigos.filter((a) => {
    const casaBusca =
      busca === "" ||
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      a.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      a.categoria.toLowerCase().includes(busca.toLowerCase());

    const casaCategoria =
      categoriaAtiva === null || a.categoria === categoriaAtiva;

    return casaBusca && casaCategoria;
  });

  const filtroAtivo = busca !== "" || categoriaAtiva !== null;

  const destaque = artigos[0];
  const corDestaque = getCorSuave(destaque.imagemBg);

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
            <Link to="/blog" className="text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* CAPA */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Guias e informações
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Tudo sobre{" "}
            <span className="text-emerald-600">multas de trânsito</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
            Guias práticos sobre como recorrer, prazos, pontos na CNH e seus
            direitos como condutor.
          </p>

          <div className="relative mx-auto max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar artigos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* FILTRO POR CATEGORIA */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
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

            {(mostrarTodasCategorias ? categorias : categorias.slice(0, 7)).map(
              (cat) => (
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
              )
            )}

            {categorias.length > 7 && (
              <button
                onClick={() => setMostrarTodasCategorias(!mostrarTodasCategorias)}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
              >
                {mostrarTodasCategorias
                  ? "Mostrar menos"
                  : `+${categorias.length - 7} categorias`}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ARTIGO DESTAQUE */}
      {!filtroAtivo && (
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <Link
            to={`/blog/${destaque.slug}`}
            className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="sm:flex">
              <div
                className="flex h-32 items-center justify-center sm:h-auto sm:w-48 sm:flex-shrink-0"
                style={{ backgroundColor: corDestaque.fundoBadge }}
              >
                <span className="text-5xl opacity-60">
                  {destaque.imagemEmoji}
                </span>
              </div>

              <div className="flex-1 p-6 sm:p-7">
                <span
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: corDestaque.textoBadge }}
                >
                  {destaque.categoria}
                </span>

                <h2 className="mb-2 text-xl font-bold leading-snug text-slate-900 group-hover:text-emerald-700 sm:text-[22px]">
                  {destaque.titulo}
                </h2>

                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                  {destaque.descricao}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {destaque.tempoLeitura} de leitura
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* GRID */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        {filtroAtivo && (
          <p className="mb-6 text-sm text-slate-500">
            {artigosFiltrados.length}{" "}
            {artigosFiltrados.length === 1 ? "artigo" : "artigos"}
            {categoriaAtiva && ` em ${categoriaAtiva}`}
            {busca && ` para "${busca}"`}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(filtroAtivo ? artigosFiltrados : artigos.slice(1)).map((artigo) => {
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

                  <h3 className="mb-2 text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                    {artigo.titulo}
                  </h3>

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

        {artigosFiltrados.length === 0 && filtroAtivo && (
          <div className="py-16 text-center">
            <p className="text-slate-500">Nenhum artigo encontrado.</p>
            <button
              onClick={() => {
                setBusca("");
                setCategoriaAtiva(null);
              }}
              className="mt-4 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Limpar filtros
            </button>
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
            Nossa IA verifica gratuitamente se há erro formal no auto de
            infração. Se não houver falha, você não paga nada.
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
          </nav>

          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
