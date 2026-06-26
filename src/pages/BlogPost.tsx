import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { artigos } from "../data/artigos";

const renderMarkdown = (texto: string) => {
  const linhas = texto.trim().split("\n");
  const elementos: JSX.Element[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.startsWith("## ")) {
      elementos.push(
        <h2 key={i} className="text-xl sm:text-2xl font-black text-slate-900 mt-10 mb-4 leading-tight">
          {linha.replace("## ", "")}
        </h2>
      );
    }
    else if (linha.startsWith("### ")) {
      elementos.push(
        <h3 key={i} className="text-lg font-black text-slate-800 mt-6 mb-3 leading-tight">
          {linha.replace("### ", "")}
        </h3>
      );
    }
    else if (linha.includes("|") && linha.trim().startsWith("|")) {
      const linhasTabela: string[] = [];
      while (i < linhas.length && linhas[i].includes("|")) {
        if (!linhas[i].includes("---")) linhasTabela.push(linhas[i]);
        i++;
      }
      const [cabecalho, ...corpo] = linhasTabela;
      const cols = cabecalho.split("|").filter(c => c.trim());
      elementos.push(
        <div key={i} className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                {cols.map((col, ci) => (
                  <th key={ci} className="px-4 py-3 text-left font-bold text-slate-700">{col.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {row.split("|").filter(c => c.trim()).map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-slate-600 font-medium">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    else if (linha.startsWith("- ")) {
      const itens: string[] = [];
      while (i < linhas.length && linhas[i].startsWith("- ")) {
        itens.push(linhas[i].replace("- ", ""));
        i++;
      }
      elementos.push(
        <ul key={i} className="space-y-2 my-4 pl-2">
          {itens.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2.5 text-slate-700 font-medium text-[15px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
              <span dangerouslySetInnerHTML={{ __html: formatarTexto(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }
    else if (/^\d+\.\s/.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\d+\.\s/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elementos.push(
        <ol key={i} className="space-y-2 my-4 pl-2">
          {itens.map((item, ii) => (
            <li key={ii} className="flex items-start gap-3 text-slate-700 font-medium text-[15px]">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {ii + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: formatarTexto(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }
    else if (linha.trim() === "") {
      // ignora
    }
    else {
      elementos.push(
        <p key={i} className="text-slate-700 text-[15px] sm:text-base leading-relaxed font-medium my-3"
          dangerouslySetInnerHTML={{ __html: formatarTexto(linha) }}
        />
      );
    }
    i++;
  }

  return elementos;
};

const formatarTexto = (texto: string): string => {
  return texto
    .replace(/\\(.?)\\*/g, '<strong class="text-slate-900 font-black">$1</strong>')
    .replace(/\(.?)\*/g, '<em class="italic">$1</em>');
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const artigo = artigos.find((a) => a.slug === slug);

  if (!artigo) return <Navigate to="/blog" replace />;

  const outrosArtigos = artigos.filter((a) => a.slug !== slug).slice(0, 3);
  const url = https://www.checkmulta.com.br/blog/${artigo.slug};

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      <Helmet>
        <title>{artigo.titulo} | CheckMulta</title>
        <meta name="description" content={artigo.descricao} />
        <meta name="keywords" content={artigo.palavrasChave.join(", ")} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={${artigo.titulo} | CheckMulta} />
        <meta property="og:description" content={artigo.descricao} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={artigo.titulo} />
        <meta name="twitter:description" content={artigo.descricao} />
      </Helmet>

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

      {/* BREADCRUMB */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-slate-500 font-medium hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Blog
        </Link>
      </div>

      {/* ARTIGO */}
      <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">

        {/* Cabeçalho */}
        <div className={bg-gradient-to-br ${artigo.imagemBg} rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden}>
          <div className="absolute top-4 right-4 text-5xl opacity-30">{artigo.imagemEmoji}</div>
          <span className="inline-block bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            {artigo.categoria}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight mb-4">
            {artigo.titulo}
          </h1>
          <p className="text-white/80 text-base font-medium mb-6">{artigo.descricao}</p>
          <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>{artigo.tempoLeitura} de leitura</span>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 mb-8">
          {renderMarkdown(artigo.conteudo)}
        </div>

        {/* CTA INLINE */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-900 mb-2">Tem uma multa para analisar?</h3>
              <p className="text-slate-600 font-medium text-sm mb-4">
                Nossa IA analisa seu auto de infração gratuitamente e encontra erros formais que podem anular a multa. Se não houver falha, você não paga nada.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm"
              >
                Analisar Minha Multa Grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* OUTROS ARTIGOS */}
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-5">Outros artigos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {outrosArtigos.map((a) => (
              <Link key={a.slug} to={/blog/${a.slug}} className="group block">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className={bg-gradient-to-br ${a.imagemBg} p-4 flex items-center justify-between}>
                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{a.categoria}</span>
                    <span className="text-2xl">{a.imagemEmoji}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors mb-1">
                      {a.titulo}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {a.tempoLeitura}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </article>

      {/* FOOTER */}
      <footer className="w-full text-center px-6 py-6 border-t border-gray-200 bg-gray-100">
        <p className="text-xs text-slate-500 font-medium">
          CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
        </p>
        <Link to="/" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">
          ← Voltar ao site
        </Link>
      </footer>
    </div>
  );
}
