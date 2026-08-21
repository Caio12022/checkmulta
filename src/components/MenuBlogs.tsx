import { VERTICAIS } from "../data/verticais";

/**
 * Barra de navegação entre os blogs das verticais.
 *
 * Antes, o cabeçalho de cada blog só tinha "Análise gratuita" e "Blog" da
 * PRÓPRIA vertical: quem caía num artigo de trânsito pela busca não tinha
 * como descobrir que existe blog de Procon, Vigilância, Energia e IBAMA.
 * A página central (/blog) já listava todos, mas era preciso chegar nela.
 *
 * Lê de VERTICAIS (data/verticais.ts), a fonte única: vertical nova com
 * hrefBlog aparece aqui sozinha, sem tocar em nenhuma das 6 páginas.
 *
 * Os itens QUEBRAM em duas linhas no celular em vez de rolar na horizontal.
 * Com rolagem só apareciam 3 dos 6, sem nenhuma pista de que havia mais à
 * direita - o oposto do objetivo, que é justamente mostrar que as outras
 * áreas existem. Duas linhas custam ~40px e mostram tudo de uma vez.
 *
 * Por isso também o nome curto (tituloCurto): "Cobrança retroativa de
 * energia" inteiro empurraria a faixa para três linhas.
 */
export default function MenuBlogs({ atual }: { atual?: string }) {
  const blogs = VERTICAIS.filter((v) => v.hrefBlog);

  return (
    <nav
      aria-label="Blogs por área"
      className="border-b border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-6xl px-4">
        <ul className="flex flex-wrap items-center gap-1 py-2">
          <li>
            <a
              href="/blog"
              className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                atual === "todos"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </a>
          </li>

          {blogs.map((v) => {
            const ativo = atual === v.id;
            return (
              <li key={v.id}>
                <a
                  href={v.hrefBlog}
                  aria-current={ativo ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    ativo ? "text-white" : "text-slate-600 hover:bg-slate-200"
                  }`}
                  style={ativo ? { backgroundColor: v.cor.texto } : undefined}
                >
                  {v.tituloCurto}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
