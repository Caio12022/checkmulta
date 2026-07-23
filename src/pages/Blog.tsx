import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, ShieldCheck, Search } from "lucide-react";
import { artigos } from "../data/artigos";
import { getCorSuave } from "../data/coresSuaves";

export default function Blog() {
  const [busca, setBusca] = useState("");

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

  const artigosFiltrados = artigos.filter(
    (a) =>
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      a.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      a.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  const destaque = artigos[0];
  const corDestaque = getCorSuave(destaque.imagemBg);

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
        </div>
      </section>

      {/* ARTIGO DESTAQUE */}
      {!busca && (
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
        {busca && (
          <p className="mb-6 text-sm text-slate-500">
            {artigosFiltrados.length}{" "}
            {artigosFiltrados.length === 1 ? "resultado" : "resultados"} para "
            {busca}"
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(busca ? artigosFiltrados : artigos.slice(1)).map((artigo) => {
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

        {artigosFiltrados.length === 0 && busca && (
          <div className="py-16 text-center">
            <p className="text-slate-500">
              Nenhum artigo encontrado para "{busca}"
            </p>
            <button
              onClick={() => setBusca("")}
              className="mt-4 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Limpar busca
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
