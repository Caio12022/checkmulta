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
    metaDesc.setAttribute("content", "Guias práticos sobre como recorrer de multas de trânsito, prazos legais, pontos na CNH e seus direitos como condutor.");
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
      <section className="w-full bg-white border-b border-slate-100 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Guias e Informações</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
            Tudo sobre <span className="text-emerald-600">multas de trânsito</span>
          </h1>
          <p className="text-slate-500 text-base sm:text-lg font-medium max-w-2xl mx-auto mb-8">
            Guias práticos sobre como recorrer, prazos, pontos na CNH e seus direitos como condutor.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar artigos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* ARTIGO DESTAQUE */}
      {!busca && (
        <section className="max-w-4xl mx-auto px-4 mt-8 mb-8">
          <Link to={"/blog/" + artigos[0].slug} className="block">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
              <div className="p-8 sm:p-10 flex items-center justify-between" style={{ backgroundColor: getCorSuave(artigos[0].imagemBg).fundoBadge, borderBottom: "4px solid " + getCorSuave(artigos[0].imagemBg).corPrincipal }}>
                <div className="flex-1">
                  <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ backgroundColor: "#ffffff", color: getCorSuave(artigos[0].imagemBg).textoBadge }}>
                    {artigos[0].categoria}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-2 group-hover:underline">
                    {artigos[0].titulo}
                  </h2>
                  <p className="text-slate-600 text-sm font-medium">{artigos[0].descricao}</p>
                </div>
                <div className="text-6xl ml-6 hidden sm:block">{artigos[0].imagemEmoji}</div>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  <span>{artigos[0].tempoLeitura} de leitura</span>
                </div>
                <span className="flex items-center gap-1.5 text-blue-600 font-bold text-sm group-hover:gap-2.5 transition-all">
                  Ler artigo <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* GRID */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        {busca && (
          <p className="text-slate-500 text-sm font-medium mb-6">
            {artigosFiltrados.length} {artigosFiltrados.length === 1 ? "resultado" : "resultados"} para "{busca}"
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(busca ? artigosFiltrados : artigos.slice(1)).map((artigo) => {
            const corC = getCorSuave(artigo.imagemBg);
            return (
            <Link key={artigo.slug} to={"/blog/" + artigo.slug} className="group block">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col">
                <div className="p-6 flex items-center justify-between" style={{ backgroundColor: corC.fundoBadge, borderBottom: "3px solid " + corC.corPrincipal }}>
                  <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: corC.textoBadge, backgroundColor: "#ffffff" }}>
                    {artigo.categoria}
                  </span>
                  <span className="text-3xl">{artigo.imagemEmoji}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-base font-black text-slate-900 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                    {artigo.titulo}
                  </h3>
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
            );
          })}
        </div>
        {artigosFiltrados.length === 0 && busca && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg font-medium">Nenhum artigo encontrado para "{busca}"</p>
            <button onClick={() => setBusca("")} className="mt-4 text-blue-600 font-bold hover:underline">
              Limpar busca
            </button>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="w-full bg-emerald-600 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Tem uma multa para analisar?</h2>
          <p className="text-emerald-100 font-medium mb-6">Nossa IA analisa gratuitamente e encontra erros que podem anular sua multa.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg text-lg">
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
