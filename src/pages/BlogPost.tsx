import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactElement } from "react";
import { Clock, ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import { artigos } from "../data/artigos";
import { getFaq } from "../data/faqs";
import { aplicarLinksInternos } from "../data/linksInternos";
import { getCorSuave } from "../data/coresSuaves";

// Hook para atualizar meta tags via DOM nativo
const useMetaTags = (titulo: string, descricao: string, url: string, keywords: string) => {
  useEffect(() => {
    document.title = `${titulo} | CheckMulta`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", descricao);

    let metaKey = document.querySelector('meta[name="keywords"]');
    if (!metaKey) {
      metaKey = document.createElement("meta");
      metaKey.setAttribute("name", "keywords");
      document.head.appendChild(metaKey);
    }
    metaKey.setAttribute("content", keywords);

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

    setOG("og:title", `${titulo} | CheckMulta`);
    setOG("og:description", descricao);
    setOG("og:url", url);
    setOG("og:type", "article");

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
      headline: titulo,
      description: descricao,
      keywords: keywords,
      url: url,
      author: {
        "@type": "Organization",
        name: "CheckMulta",
      },
      publisher: {
        "@type": "Organization",
        name: "CheckMulta",
        logo: {
          "@type": "ImageObject",
          url: "https://checkmulta.com.br/checkmulta-logo.webp",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
    });

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, [titulo, descricao, url, keywords]);
};

const formatarTexto = (texto: string, slugAtual: string, jaUsados: Set<string>): string => {
  let html = texto
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  html = aplicarLinksInternos(html, slugAtual, jaUsados);
  return html;
};

const renderMarkdown = (
  texto: string,
  slugAtual: string,
  jaUsados: Set<string>,
  corPrincipal: string
) => {
  const linhas = texto.trim().split("\n");
  const elementos: ReactElement[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.startsWith("## ")) {
      elementos.push(
        <h2
          key={i}
          className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]"
        >
          {linha.replace("## ", "")}
        </h2>
      );
    } else if (linha.startsWith("### ")) {
      elementos.push(
        <h3 key={i} className="mb-2 mt-7 text-lg font-bold text-slate-900">
          {linha.replace("### ", "")}
        </h3>
      );
    } else if (linha.includes("|") && linha.trim().startsWith("|")) {
      const linhasTabela: string[] = [];
      while (i < linhas.length && linhas[i].includes("|")) {
        if (!linhas[i].includes("---")) linhasTabela.push(linhas[i]);
        i++;
      }
      const [cabecalho, ...corpo] = linhasTabela;
      const cols = cabecalho.split("|").filter((c) => c.trim());
      elementos.push(
        <div
          key={i}
          className="my-6 overflow-x-auto rounded-xl border border-slate-200"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {cols.map((col, ci) => (
                  <th
                    key={ci}
                    className="px-4 py-3 text-left font-semibold text-slate-700"
                  >
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((row, ri) => (
                <tr
                  key={ri}
                  className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                >
                  {row
                    .split("|")
                    .filter((c) => c.trim())
                    .map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-slate-600">
                        {cell.trim()}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (linha.startsWith("- ")) {
      const itens: string[] = [];
      while (i < linhas.length && linhas[i].startsWith("- ")) {
        itens.push(linhas[i].replace("- ", ""));
        i++;
      }
      elementos.push(
        <ul
          key={i}
          className="my-5 ml-1 space-y-2 border-l-2 pl-5"
          style={{ borderColor: corPrincipal }}
        >
          {itens.map((item, ii) => (
            <li
              key={ii}
              className="text-[16.5px] leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{
                __html: formatarTexto(item, slugAtual, jaUsados),
              }}
            />
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\d+\.\s/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elementos.push(
        <ol key={i} className="my-5 space-y-3">
          {itens.map((item, ii) => (
            <li
              key={ii}
              className="flex items-start gap-3 text-[16.5px] leading-relaxed text-slate-700"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {ii + 1}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatarTexto(item, slugAtual, jaUsados),
                }}
              />
            </li>
          ))}
        </ol>
      );
      continue;
    } else if (linha.trim() === "") {
      // ignora
    } else {
      elementos.push(
        <p
          key={i}
          className="mb-4 text-[16.5px] leading-[1.75] text-slate-700"
          dangerouslySetInnerHTML={{
            __html: formatarTexto(linha, slugAtual, jaUsados),
          }}
        />
      );
    }
    i++;
  }

  return elementos;
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

  useMetaTags(artigo.titulo, artigo.descricao, url, artigo.palavrasChave.join(", "));

  const faq = getFaq(artigo.categoria);
  const cor = getCorSuave(artigo.imagemBg);

  // Schema FAQPage
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
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.resposta,
        },
      })),
    });
  }, [slug]);

  // Schema BreadcrumbList
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
        { "@type": "ListItem", position: 3, name: artigo.categoria, item: url },
        { "@type": "ListItem", position: 4, name: artigo.titulo, item: url },
      ],
    });
  }, [slug]);

  // Artigos relacionados: prioriza mesma categoria, completa com outros
  const mesmaCategoria = artigos.filter(
    (a) => a.slug !== slug && a.categoria === artigo.categoria
  );
  const outrasCategorias = artigos.filter(
    (a) => a.slug !== slug && a.categoria !== artigo.categoria
  );
  const outrosArtigos = [...mesmaCategoria, ...outrasCategorias].slice(0, 3);

  // Set compartilhado para controlar links internos (não repetir o mesmo artigo)
  const linksJaUsados = new Set<string>();

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

      {/* BARRA DE URGÊNCIA */}
      <div className="border-b border-emerald-100 bg-emerald-50">
        <div className="mx-auto max-w-3xl px-4 py-2.5 text-center text-[13px] text-emerald-800">
          O prazo para recorrer é curto.{" "}
          <Link to="/" className="font-semibold underline">
            Analise sua multa grátis agora
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link to="/" className="hover:text-emerald-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/blog" className="hover:text-emerald-600">
            Blog
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to={`/blog/categoria/${slugifyCategoria(artigo.categoria)}`}
            className="text-slate-400 hover:text-emerald-600"
          >
            {artigo.categoria}
          </Link>
        </nav>

        {/* CABEÇALHO DO ARTIGO */}
        <div
          className="mb-8 border-l-4 pl-5"
          style={{ borderColor: cor.corPrincipal }}
        >
          <span
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: cor.textoBadge }}
          >
            {artigo.categoria}
          </span>

          <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[32px] sm:leading-[1.2]">
            {artigo.titulo}
          </h1>

          <p className="mb-4 text-base leading-relaxed text-slate-600">
            {artigo.descricao}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {artigo.tempoLeitura} de leitura
          </div>
        </div>

        {/* CTA TOPO */}
        <div
          className="mb-9 rounded-xl border p-5"
          style={{ borderColor: cor.borda, backgroundColor: cor.fundoPagina }}
        >
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">
              Tem uma multa para analisar?
            </strong>{" "}
            Nossa IA verifica grátis se há erro formal no auto de infração. Mais
            de 400 multas já analisadas, sem cadastro.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* CONTEÚDO */}
        <div className="max-w-none">
          {renderMarkdown(
            artigo.conteudo,
            artigo.slug,
            linksJaUsados,
            cor.corPrincipal
          )}
        </div>

        {/* CTA FINAL */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Descubra grátis se sua multa tem erro
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-slate-600">
            Nossa IA encontra erros formais que podem anular a autuação. Se não
            houver falha, você não paga nada.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900 sm:text-[22px]">
            Perguntas frequentes
          </h2>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details
                key={i}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15.5px] font-semibold text-slate-800 hover:text-emerald-700">
                  {f.pergunta}
                  <span className="ml-3 flex-shrink-0 text-lg text-emerald-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 text-[15.5px] leading-relaxed text-slate-600">
                  {f.resposta}
                </div>
              </details>
            ))}
          </div>
        </div>
      </article>

      {/* CONTINUE LENDO */}
      {outrosArtigos.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-[22px]">
              Continue lendo sobre {artigo.categoria}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {outrosArtigos.map((a) => {
                const corA = getCorSuave(a.imagemBg);
                return (
                  <Link
                    key={a.slug}
                    to={`/blog/${a.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <div
                      className="flex h-32 items-center justify-center"
                      style={{ backgroundColor: corA.fundoBadge }}
                    >
                      <span className="text-4xl opacity-60">{a.imagemEmoji}</span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <span
                        className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: corA.textoBadge }}
                      >
                        {a.categoria}
                      </span>
                      <h3 className="mb-2 text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                        {a.titulo}
                      </h3>
                      <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600">
                        {a.descricao}
                      </p>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" /> {a.tempoLeitura} de
                        leitura
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-7 text-center">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:gap-3"
              >
                Ver todos os artigos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* BOTÃO FLUTUANTE */}
      <div
        className={`fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 transition-all duration-300 ${
          mostrarFlutuante
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-16 opacity-0"
        }`}
      >
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
        >
          <ShieldCheck className="h-4 w-4" />
          Analisar minha multa grátis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

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

        {/* Respiro para o botão flutuante não cobrir o rodapé */}
        <div className="h-16" />
      </footer>
    </div>
  );
}
