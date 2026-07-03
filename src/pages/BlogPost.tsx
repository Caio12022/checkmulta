import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { artigos } from "../data/artigos";
import { getFaq } from "../data/faqs";
import { aplicarLinksInternos } from "../data/linksInternos";

// Hook para atualizar meta tags via DOM nativo
const useMetaTags = (titulo: string, descricao: string, url: string, keywords: string) => {
  useEffect(() => {
    // Título
    document.title = `${titulo} | CheckMulta`;

    // Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', descricao);

    // Keywords
    let metaKey = document.querySelector('meta[name="keywords"]');
    if (!metaKey) {
      metaKey = document.createElement('meta');
      metaKey.setAttribute('name', 'keywords');
      document.head.appendChild(metaKey);
    }
    metaKey.setAttribute('content', keywords);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // OG tags
    const setOG = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setOG('og:title', `${titulo} | CheckMulta`);
    setOG('og:description', descricao);
    setOG('og:url', url);
    setOG('og:type', 'article');

    // Schema markup (JSON-LD) — tipo Article para o Google
    let schemaScript = document.getElementById("article-schema");
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.setAttribute("type", "application/ld+json");
      schemaScript.setAttribute("id", "article-schema");
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": titulo,
      "description": descricao,
      "keywords": keywords,
      "url": url,
      "author": {
        "@type": "Organization",
        "name": "CheckMulta"
      },
      "publisher": {
        "@type": "Organization",
        "name": "CheckMulta",
        "logo": {
          "@type": "ImageObject",
          "url": "https://checkmulta.com.br/checkmulta-logo.webp"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": url
      }
    });

    return () => {
      document.title = 'CheckMulta — Análise de Multas com IA';
    };
  }, [titulo, descricao, url, keywords]);
};

const renderMarkdown = (texto: string, slugAtual: string, jaUsados: Set<string>) => {
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
              <span dangerouslySetInnerHTML={{ __html: formatarTexto(item, slugAtual, jaUsados) }} />
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
              <span dangerouslySetInnerHTML={{ __html: formatarTexto(item, slugAtual, jaUsados) }} />
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
          dangerouslySetInnerHTML={{ __html: formatarTexto(linha, slugAtual, jaUsados) }}
        />
      );
    }
    i++;
  }

  return elementos;
};

const formatarTexto = (texto: string, slugAtual: string, jaUsados: Set<string>): string => {
  let html = texto
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-black">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  // Aplica links internos (só primeira ocorrência de cada artigo)
  html = aplicarLinksInternos(html, slugAtual, jaUsados);
  return html;
};

// Converte "CNH e Pontos" -> "cnh-e-pontos"
function slugifyCategoria(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const artigo = artigos.find((a) => a.slug === slug);
  const [mostrarFlutuante, setMostrarFlutuante] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const altura = document.body.scrollHeight - window.innerHeight;
      // Aparece após rolar 15% e some perto do fim (últimos 12%)
      setMostrarFlutuante(y > altura * 0.15 && y < altura * 0.88);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  if (!artigo) return <Navigate to="/blog" replace />;

  const url = `https://checkmulta.com.br/blog/${artigo.slug}`;

  useMetaTags(
    artigo.titulo,
    artigo.descricao,
    url,
    artigo.palavrasChave.join(", ")
  );

  // FAQ da categoria
  const faq = getFaq(artigo.categoria);

  // Schema FAQPage — injeta perguntas frequentes para o Google
  useEffect(() => {
    let faqScript = document.getElementById("faq-schema");
    if (!faqScript) {
      faqScript = document.createElement("script");
      faqScript.setAttribute("type", "application/ld+json");
      faqScript.setAttribute("id", "faq-schema");
      document.head.appendChild(faqScript);
    }
    faqScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.map((f) => ({
        "@type": "Question",
        "name": f.pergunta,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.resposta
        }
      }))
    });
  }, [slug]);

  // Schema BreadcrumbList — trilha de navegação para o Google
  useEffect(() => {
    let bcScript = document.getElementById("breadcrumb-schema");
    if (!bcScript) {
      bcScript = document.createElement("script");
      bcScript.setAttribute("type", "application/ld+json");
      bcScript.setAttribute("id", "breadcrumb-schema");
      document.head.appendChild(bcScript);
    }
    bcScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://checkmulta.com.br/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://checkmulta.com.br/blog" },
        { "@type": "ListItem", "position": 3, "name": artigo.categoria, "item": url },
        { "@type": "ListItem", "position": 4, "name": artigo.titulo, "item": url }
      ]
    });
  }, [slug]);

  // Artigos relacionados: prioriza mesma categoria, completa com outros
  const mesmaCategoria = artigos.filter((a) => a.slug !== slug && a.categoria === artigo.categoria);
  const outrasCategorias = artigos.filter((a) => a.slug !== slug && a.categoria !== artigo.categoria);
  const outrosArtigos = [...mesmaCategoria, ...outrasCategorias].slice(0, 3);

  // Divide o conteúdo em duas metades para inserir CTA no meio
  const linhasConteudo = artigo.conteudo.trim().split("\n");
  const meio = Math.floor(linhasConteudo.length / 2);
  // Ajusta o ponto de corte para não quebrar no meio de uma seção (procura um título ## próximo)
  let corte = meio;
  for (let i = meio; i < linhasConteudo.length; i++) {
    if (linhasConteudo[i].startsWith("## ")) { corte = i; break; }
  }
  const conteudoParte1 = linhasConteudo.slice(0, corte).join("\n");
  const conteudoParte2 = linhasConteudo.slice(corte).join("\n");

  // Set compartilhado para controlar links internos (não repetir o mesmo artigo)
  const linksJaUsados = new Set<string>();

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

      {/* BREADCRUMB */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 flex-wrap">
          <Link to="/" className="hover:text-blue-600 transition-colors">Início</Link>
          <span className="text-slate-300">/</span>
          <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
          <span className="text-slate-300">/</span>
          <Link to={`/blog/categoria/${slugifyCategoria(artigo.categoria)}`} className="text-slate-700 font-bold hover:text-blue-600 transition-colors">{artigo.categoria}</Link>
        </nav>
      </div>

      {/* ARTIGO */}
      <article className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        {/* Voltar ao Blog */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-slate-500 font-medium hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Blog
        </Link>

        {/* Cabeçalho */}
        <div className={`bg-gradient-to-br ${artigo.imagemBg} rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden`}>
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


        {/* BARRA DE URGÊNCIA */}
        <Link to="/" className="block mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800 flex-1">
              O prazo para recorrer é curto. Analise sua multa grátis agora
            </p>
            <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
          </div>
        </Link>

        {/* CTA TOPO — antes do conteúdo */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-slate-900 font-black text-base mb-1">Descubra em 60 segundos se sua multa tem erro</p>
              <p className="text-slate-500 text-sm font-medium">Mais de 400 multas já analisadas. Grátis e sem cadastro.</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm flex-shrink-0"
            >
              Analisar Grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CONTEÚDO — Parte 1 */}
        <div className="bg-white rounded-t-3xl border border-b-0 border-slate-200 shadow-sm p-6 sm:p-10">
          {renderMarkdown(conteudoParte1, artigo.slug, linksJaUsados)}
        </div>

        {/* CTA MEIO */}
        <div className="bg-gradient-to-r from-blue-600 to-emerald-600 p-6 sm:p-7 border-x border-slate-200">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-1">
              <p className="text-white font-black text-base sm:text-lg mb-1">Sua multa pode ter uma falha que a anula</p>
              <p className="text-white/80 text-sm font-medium">Nossa IA cruza seu auto com o CTB e o MBFT. Se não achar erro, você não paga nada.</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-6 py-3 rounded-xl hover:bg-emerald-50 transition-colors text-sm flex-shrink-0 shadow-lg"
            >
              Analisar Minha Multa <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CONTEÚDO — Parte 2 */}
        <div className="bg-white rounded-b-3xl border border-t-0 border-slate-200 shadow-sm p-6 sm:p-10 mb-8">
          {renderMarkdown(conteudoParte2, artigo.slug, linksJaUsados)}
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
                Mais de 400 multas já analisadas. Nossa IA encontra erros formais que podem anular a sua. Se não houver falha, você não paga nada.
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

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-slate-900 mb-5">Perguntas frequentes</h2>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
                <summary className="px-5 py-4 font-black text-slate-800 text-sm cursor-pointer list-none flex items-center justify-between hover:text-blue-600 transition-colors">
                  {f.pergunta}
                  <span className="text-blue-600 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4 text-slate-600 text-sm font-medium leading-relaxed">
                  {f.resposta}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* OUTROS ARTIGOS */}
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-5">Continue lendo sobre {artigo.categoria}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {outrosArtigos.map((a) => (
              <Link key={a.slug} to={`/blog/${a.slug}`} className="group block">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className={`bg-gradient-to-br ${a.imagemBg} p-4 flex items-center justify-between`}>
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
          <div className="mt-6 text-center">
            <Link to="/blog" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:gap-3 transition-all">
              Ver todos os artigos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </article>

      {/* BOTÃO FLUTUANTE */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 px-4 w-full max-w-md ${
          mostrarFlutuante ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
        }`}
      >
        <Link
          to="/"
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl shadow-2xl hover:bg-emerald-700 transition-colors"
        >
          <ShieldCheck className="w-5 h-5" />
          Analisar Minha Multa Grátis
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

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
