import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock, ShieldCheck, ArrowLeft } from "lucide-react";
import { artigos } from "../data/artigos";

export default function CategoriaBlog() {
  const { categoria } = useParams<{ categoria: string }>();

  // Decodifica o slug da categoria (ex: "cnh-e-pontos" -> "CNH e Pontos")
  const artigosFiltrados = artigos.filter(
    (a) => slugify(a.categoria) === categoria
  );

  const nomeCategoria = artigosFiltrados.length > 0 ? artigosFiltrados[0].categoria : "Categoria";

  useEffect(() => {
    document.title = `${nomeCategoria} — Blog CheckMulta`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", `Artigos sobre ${nomeCategoria} — guias práticos sobre multas de trânsito, recursos e seus direitos como condutor.`);
    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, [nomeCategoria]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* HEADER */}
      <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 h-16 md:h-20 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <Link to="/" className="flex items-center h-full w-[180px] md:w-[240px]">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="w-full h-auto object-contain scale-[1.3] md:scale-[1.5] origin-left translate-y-1" />
        </Link>
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-600 items-center">
          <Link to="/" className="hover:text-blue-600 transition-colors">Início</Link>
          <Link to="/blog" className="text-blue-600 font-bold">Blog</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="w-full bg-gradient-to-br from-blue-900 to-slate-900 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-700 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Categoria</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            {nomeCategoria}
          </h1>
          <p className="text-slate-300 text-base sm:text-lg font-medium max-w-2xl mx-auto">
            {artigosFiltrados.length} {artigosFiltrados.length === 1 ? "artigo" : "artigos"} sobre este tema
          </p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 flex-wrap">
          <Link to="/" className="hover:text-blue-600 transition-colors">Início</Link>
          <span className="text-slate-300">/</span>
          <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-bold">{nomeCategoria}</span>
        </nav>
      </div>

      {/* GRID DE ARTIGOS */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {artigosFiltrados.map((artigo) => (
            <Link key={artigo.slug} to={"/blog/" + artigo.slug} className="group block">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col">
                <div className={"bg-gradient-to-br " + artigo.imagemBg + " p-6 flex items-center justify-between"}>
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full">
                    {artigo.categoria}
                  </span>
                  <span className="text-3xl">{artigo.imagemEmoji}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-base font-black text-slate-900 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                    {artigo.titulo}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed flex-1 mb-4">
                    {artigo.descricao}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {artigo.tempoLeitura}
                    </div>
                    <span className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                      Ler <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {artigosFiltrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg font-medium">Nenhum artigo encontrado nesta categoria</p>
            <Link to="/blog" className="mt-4 text-blue-600 font-bold hover:underline inline-block">
              Ver todos os artigos
            </Link>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/blog" className="inline-flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para todos os artigos
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-emerald-600 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Tem uma multa para analisar?</h2>
          <p className="text-emerald-100 font-medium mb-6">Mais de 400 multas já analisadas. Nossa IA encontra erros que podem anular a sua. Grátis.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg text-lg"
          >
            Analisar Minha Multa Grátis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full text-center px-6 py-6 border-t border-gray-200 bg-gray-100">
        <p className="text-xs text-slate-500 font-medium">CheckMulta Tecnologia · CNPJ 63.524.338/0001-62</p>
        <Link to="/" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">
          ← Voltar ao site
        </Link>
      </footer>
    </div>
  );
}

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
