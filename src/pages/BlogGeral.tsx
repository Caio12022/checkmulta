import { useEffect } from "react";
import { artigos } from "../data/artigos";
import { artigosProcon } from "../data/artigosProcon";
import { artigosVigilancia } from "../data/artigosVigilancia";
import { artigosEnergia } from "../data/artigosEnergia";
import { artigosIbama } from "../data/artigosIbama";
import { VERTICAIS } from "../data/verticais";

/**
 * Blog-mãe: reúne as cinco verticais em uma só página, no mesmo espírito da
 * Plataforma.tsx (home-mãe). Não substitui o blog de nenhuma vertical — cada
 * um continua em sua própria rota, com seu próprio SEO. Esta página só
 * distribui o visitante e mostra os artigos mais recentes de todas juntas.
 *
 * "Mais recente" = primeira posição de cada array de artigos, porque os
 * robôs de publicação inserem o artigo novo logo no início do array (ver
 * robo-procon.ts, robo-vigilancia.ts etc — inserção após o marcador de
 * abertura). Não há campo de data nos artigos; a ordem do array é a fonte
 * de verdade de recência.
 *
 * Rota: /blog. Não é redirect — é uma página própria.
 * IMPORTANTE: /blog/:slug continua redirecionando para o artigo de trânsito
 * em /multa-de-transito/blog/:slug (ver App.tsx). Só a listagem mudou.
 */

interface ArtigoComOrigem {
  slug: string;
  titulo: string;
  descricao: string;
  categoria: string;
  href: string;
  vertical: string;
  cor: { faixa: string; texto: string };
}

const QUANTIDADE_POR_VERTICAL = 4;

function montarRecentes(): ArtigoComOrigem[] {
  const transito = artigos.slice(0, QUANTIDADE_POR_VERTICAL).map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    href: `/multa-de-transito/blog/${a.slug}`,
    vertical: "Trânsito",
    cor: { faixa: "#10b981", texto: "#047857" },
  }));

  const procon = artigosProcon.slice(0, QUANTIDADE_POR_VERTICAL).map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    href: `/procon/blog/${a.slug}`,
    vertical: "Procon",
    cor: { faixa: "#f59e0b", texto: "#b45309" },
  }));

  const vigilancia = artigosVigilancia.slice(0, QUANTIDADE_POR_VERTICAL).map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    href: `/vigilancia-sanitaria/blog/${a.slug}`,
    vertical: "Vigilância Sanitária",
    cor: { faixa: "#0ea5e9", texto: "#0369a1" },
  }));

  const energia = artigosEnergia.slice(0, QUANTIDADE_POR_VERTICAL).map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    href: `/energia/blog/${a.slug}`,
    vertical: "Energia",
    cor: { faixa: "#eab308", texto: "#a16207" },
  }));

  const ibama = artigosIbama.slice(0, QUANTIDADE_POR_VERTICAL).map((a) => ({
    slug: a.slug,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    href: `/ibama/blog/${a.slug}`,
    vertical: "IBAMA",
    cor: { faixa: "#16a34a", texto: "#15803d" },
  }));

  // Intercalado por vertical, não agrupado, para não parecer "5 blocos
  // separados" — reforça a ideia de um blog só.
  const grupos = [transito, procon, vigilancia, energia, ibama];
  const resultado: ArtigoComOrigem[] = [];
  const max = Math.max(...grupos.map((g) => g.length));
  for (let i = 0; i < max; i++) {
    for (const g of grupos) {
      if (g[i]) resultado.push(g[i]);
    }
  }
  return resultado;
}

const TITULO = "Blog CheckMulta — Trânsito, Procon, Vigilância, Energia e IBAMA";
const DESCRICAO =
  "Guias práticos sobre como recorrer de multas e notificações administrativas: trânsito, Procon, Vigilância Sanitária, cobrança de energia e infrações ambientais.";
const CANONICAL = "https://checkmulta.com.br/blog";

export default function BlogGeral() {
  useEffect(() => {
    document.title = TITULO;

    const setMeta = (attr: "name" | "property", chave: string, valor: string) => {
      let el = document.querySelector(`meta[${attr}="${chave}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, chave);
        document.head.appendChild(el);
      }
      el.setAttribute("content", valor);
    };

    setMeta("name", "description", DESCRICAO);
    setMeta("property", "og:title", TITULO);
    setMeta("property", "og:description", DESCRICAO);
    setMeta("property", "og:url", CANONICAL);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", CANONICAL);
  }, []);

  const recentes = montarRecentes();

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </a>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
            <a href="/" className="transition hover:text-emerald-600">
              Áreas
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-16">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Blog
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Um blog para cada <span className="text-emerald-600">área</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Escolha a área do seu caso para ver todos os artigos, ou role para
            ver o que saiu de mais recente em cada uma.
          </p>
        </div>
      </section>

      {/* Cartões: um por área, leva pro blog daquela vertical */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {VERTICAIS.filter((v) => v.hrefBlog).map((v) => (
              <a
                key={v.id}
                href={v.hrefBlog}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-700"
              >
                <span
                  className="mb-3 h-1 w-8 rounded-full"
                  style={{ backgroundColor: v.cor.faixa }}
                />
                <span className="text-base font-semibold text-slate-900 group-hover:text-emerald-800">
                  {v.titulo}
                </span>
                <span className="mt-3 text-sm font-medium text-emerald-700">
                  Ver artigos →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Artigos recentes, intercalados por vertical */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Publicados recentemente
          </p>
          <h2 className="mx-auto mb-10 max-w-2xl text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            De todas as áreas, <span className="text-emerald-600">juntos</span>
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((a) => (
              <a
                key={`${a.vertical}-${a.slug}`}
                href={a.href}
                className="flex flex-col rounded-xl border border-slate-200 p-5 transition-colors hover:border-slate-300"
              >
                <span
                  className="mb-3 inline-block w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: `${a.cor.faixa}1a`, color: a.cor.texto }}
                >
                  {a.vertical}
                </span>
                <span className="text-base font-semibold leading-snug text-slate-900">
                  {a.titulo}
                </span>
                <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {a.descricao}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
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
            {VERTICAIS.map((v) => (
              <a
                key={v.id}
                href={v.href}
                className="text-slate-600 transition hover:text-emerald-600"
              >
                {v.titulo}
              </a>
            ))}
          </nav>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
