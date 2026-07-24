import { useEffect, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Clock,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  artigosProcon,
  getArtigoProconPorSlug,
} from "../data/artigosProcon";

/* ---------- Renderizador de markdown simples ---------- */

function renderizarConteudo(markdown: string) {
  const linhas = markdown.split("\n");
  const blocos: ReactElement[] = [];
  let listaAtual: string[] = [];
  let chave = 0;

  const aplicarNegrito = (texto: string) => {
    const partes = texto.split(/(\*\*[^*]+\*\*)/g);
    return partes.map((parte, i) => {
      if (parte.startsWith("**") && parte.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {parte.slice(2, -2)}
          </strong>
        );
      }
      const italico = parte.split(/(\*[^*]+\*)/g);
      return italico.map((p, j) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <em key={`${i}-${j}`}>{p.slice(1, -1)}</em>
        ) : (
          <span key={`${i}-${j}`}>{p}</span>
        )
      );
    });
  };

  const fecharLista = () => {
    if (listaAtual.length > 0) {
      blocos.push(
        <ul
          key={`ul-${chave++}`}
          className="my-5 ml-1 space-y-2 border-l-2 border-emerald-100 pl-5"
        >
          {listaAtual.map((item, i) => (
            <li key={i} className="text-[16.5px] leading-relaxed text-slate-700">
              {aplicarNegrito(item)}
            </li>
          ))}
        </ul>
      );
      listaAtual = [];
    }
  };

  linhas.forEach((linha) => {
    const l = linha.trim();

    if (l === "") {
      fecharLista();
      return;
    }

    if (l === "---") {
      fecharLista();
      blocos.push(
        <hr key={`hr-${chave++}`} className="my-8 border-slate-200" />
      );
      return;
    }

    if (l.startsWith("## ")) {
      fecharLista();
      blocos.push(
        <h2
          key={`h2-${chave++}`}
          className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]"
        >
          {l.slice(3)}
        </h2>
      );
      return;
    }

    if (l.startsWith("### ")) {
      fecharLista();
      blocos.push(
        <h3
          key={`h3-${chave++}`}
          className="mb-2 mt-7 text-lg font-bold text-slate-900"
        >
          {l.slice(4)}
        </h3>
      );
      return;
    }

    if (l.startsWith("- ")) {
      listaAtual.push(l.slice(2));
      return;
    }

    fecharLista();

    // Parágrafo em itálico isolado (aviso legal do rodapé)
    if (l.startsWith("*") && l.endsWith("*") && !l.startsWith("**")) {
      blocos.push(
        <p
          key={`aviso-${chave++}`}
          className="mt-6 text-sm italic leading-relaxed text-slate-500"
        >
          {l.slice(1, -1)}
        </p>
      );
      return;
    }

    blocos.push(
      <p
        key={`p-${chave++}`}
        className="mb-4 text-[16.5px] leading-[1.75] text-slate-700"
      >
        {aplicarNegrito(l)}
      </p>
    );
  });

  fecharLista();
  return blocos;
}

/* ---------- Componente ---------- */

export default function BlogPostProcon() {
  const { slug } = useParams<{ slug: string }>();
  const artigo = slug ? getArtigoProconPorSlug(slug) : undefined;

  const relacionados = artigo
    ? artigosProcon
        .filter((a) => a.slug !== artigo.slug)
        .sort((a) => (a.categoria === artigo.categoria ? -1 : 1))
        .slice(0, 3)
    : [];

  useEffect(() => {
    if (!artigo) return;

    const url = `https://checkmulta.com.br/procon/blog/${artigo.slug}`;

    document.title = `${artigo.titulo} | CheckMulta Procon`;

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

    setMeta("description", artigo.descricao);
    setMeta("keywords", artigo.palavrasChave.join(", "));
    setMeta("og:title", artigo.titulo, true);
    setMeta("og:description", artigo.descricao, true);
    setMeta("og:url", url, true);
    setMeta("og:type", "article", true);
    setMeta("twitter:title", artigo.titulo);
    setMeta("twitter:description", artigo.descricao);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: artigo.titulo,
        description: artigo.descricao,
        articleSection: artigo.categoria,
        keywords: artigo.palavrasChave.join(", "),
        inLanguage: "pt-BR",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Organization", name: "CheckMulta" },
        publisher: {
          "@type": "Organization",
          name: "CheckMulta",
          url: "https://checkmulta.com.br",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Procon",
            item: "https://checkmulta.com.br/procon",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: "https://checkmulta.com.br/procon/blog",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: artigo.titulo,
            item: url,
          },
        ],
      },
    ];

    const existente = document.getElementById("schema-post-procon");
    if (existente) existente.remove();

    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.id = "schema-post-procon";
    script.textContent = JSON.stringify(schemas);
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById("schema-post-procon");
      if (s) s.remove();
    };
  }, [artigo]);

  /* ---------- Artigo não encontrado ---------- */

  if (!artigo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          Artigo não encontrado
        </h1>
        <p className="mb-6 text-slate-600">
          O conteúdo que você procura não existe ou foi movido.
        </p>
        <Link
          to="/procon/blog"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Ver todos os artigos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  /* ---------- Artigo ---------- */

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

      {/* Barra de urgência */}
      <div className="border-b border-emerald-100 bg-emerald-50">
        <div className="mx-auto max-w-3xl px-4 py-2.5 text-center text-[13px] text-emerald-800">
          O prazo de defesa é contado da notificação.{" "}
          <Link to="/procon" className="font-semibold underline">
            Verifique seu auto agora
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link to="/procon" className="hover:text-emerald-600">
            Procon
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/procon/blog" className="hover:text-emerald-600">
            Blog
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">{artigo.categoria}</span>
        </nav>

        {/* Cabeçalho do artigo */}
        <div className="mb-8 border-l-4 border-emerald-500 pl-5">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
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

        {/* CTA topo */}
        <div className="mb-9 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">
              Sua empresa foi multada?
            </strong>{" "}
            Envie o auto de infração e veja grátis se há falha que permite
            recorrer, com base no CDC e no Decreto 2.181/97.
          </p>
          <Link
            to="/procon"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Conteúdo */}
        <div className="max-w-none">{renderizarConteudo(artigo.conteudo)}</div>

        {/* CTA final */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Veja grátis se dá para recorrer da sua multa
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-slate-600">
            A análise aponta se o auto tem falha que permite recorrer. Se não
            houver, você não paga nada.
          </p>
          <Link
            to="/procon"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Começar análise gratuita
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="mb-6 text-lg font-bold text-slate-900">
              Continue lendo
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/procon/blog/${rel.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div
                    className={`flex h-24 items-center justify-center bg-gradient-to-br ${rel.imagemBg}`}
                  >
                    <span className="text-3xl opacity-60">
                      {rel.imagemEmoji}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {rel.categoria}
                    </span>
                    <h3 className="text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                      {rel.titulo}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
