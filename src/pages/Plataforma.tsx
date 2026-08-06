import { useEffect } from "react";
import { ChevronDown, ShieldCheck, FileSearch, FileCheck2 } from "lucide-react";
import { VERTICAIS, FERRAMENTAS } from "../data/verticais";

/**
 * Home institucional do CheckMulta (home-mãe).
 *
 * Papel: apresentar a plataforma como um todo e distribuir o visitante para
 * a vertical correta. Não analisa documento nem processa pagamento — cada
 * vertical continua responsável pelo próprio funil.
 *
 * SEO: esta página mira termos do CONJUNTO ("auto de infração", "defesa
 * administrativa", "recebi uma notificação"). Termos específicos de cada
 * vertical pertencem à landing da vertical — nunca duplicar aqui.
 *
 * Acessibilidade e indexação: os detalhes usam <details>/<summary> nativos.
 * O texto fica sempre no HTML, mesmo fechado.
 */

const PASSOS = [
  {
    Icone: FileSearch,
    titulo: "Envie o documento",
    texto:
      "Fotografe ou anexe o auto de infração, a notificação ou o termo que você recebeu. Não é preciso criar conta.",
  },
  {
    Icone: ShieldCheck,
    titulo: "Receba a análise gratuita",
    texto:
      "A leitura do documento é feita à luz da legislação aplicável àquele órgão e aponta, com o trecho citado, onde há falha formal.",
  },
  {
    Icone: FileCheck2,
    titulo: "Obtenha a defesa pronta",
    texto:
      "Havendo fundamento, entregamos a peça redigida e pronta para protocolo. Se não houver falha, dizemos isso com clareza e nada é cobrado.",
  },
];

const FAQ = [
  {
    pergunta: "O que é um auto de infração?",
    resposta:
      "É o documento pelo qual um órgão público formaliza a acusação de que alguém descumpriu uma norma. Ele dá início ao processo administrativo e abre o prazo para defesa. Vale para trânsito, consumo, vigilância sanitária, meio ambiente e demais áreas fiscalizadas.",
  },
  {
    pergunta: "Recebi uma notificação. Quanto tempo eu tenho para me defender?",
    resposta:
      "O prazo varia conforme o órgão e costuma ser contado a partir da ciência da autuação. Cada área tem regra própria, e o prazo é fatal: perdido, a penalidade se consolida. Por isso a orientação é analisar o documento assim que ele chega.",
  },
  {
    pergunta: "Vale a pena recorrer mesmo tendo cometido a irregularidade?",
    resposta:
      "Sim, em muitos casos. A defesa administrativa não discute apenas o fato: discute se o órgão observou as formalidades exigidas por lei ao lavrar o auto. Descrição genérica, ausência de dispositivo legal, falha na notificação e erro na dosimetria comprometem a autuação independentemente do mérito.",
  },
  {
    pergunta: "É preciso contratar advogado?",
    resposta:
      "Na esfera administrativa, não. A defesa pode ser apresentada pelo próprio interessado ou por seu representante legal. Nossa atuação é informativa e instrumental: analisamos o documento e entregamos a peça. Não representamos ninguém em juízo.",
  },
  {
    pergunta: "Quanto custa?",
    resposta:
      "A análise é sempre gratuita, em todas as áreas. A cobrança ocorre apenas quando há falha identificada e você decide gerar a defesa. O valor varia conforme a área e o porte da penalidade.",
  },
];

const TITULO = "CheckMulta — Defesa de autos de infração e notificações administrativas";
const DESCRICAO =
  "Recebeu um auto de infração ou uma notificação de órgão público? Analisamos o documento gratuitamente e apontamos se há falha que permite recorrer. Trânsito, Procon, Vigilância Sanitária, energia elétrica e meio ambiente.";
const CANONICAL = "https://checkmulta.com.br/plataforma";

export default function Plataforma() {
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

    /* ------------------------------------------------------------------
       PROVISÓRIO — REMOVER NO PASSO 3

       Enquanto esta página vive em /plataforma, ela não pode ser indexada:
       seria conteúdo concorrendo com a raiz. Quando ela assumir a raiz do
       domínio, apagar o bloco abaixo (as três linhas do robots).
    ------------------------------------------------------------------ */
    setMeta("name", "robots", "noindex, follow");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", CANONICAL);

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    });
    document.head.appendChild(schema);

    return () => {
      schema.remove();
      const r = document.querySelector('meta[name="robots"]');
      if (r) r.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <a href="/plataforma" className="text-lg font-bold tracking-tight text-slate-900">
            Check<span className="text-emerald-600">Multa</span>
          </a>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <a href="#servicos" className="transition hover:text-emerald-700">
              Serviços
            </a>
            <a href="/blog" className="transition hover:text-emerald-700">
              Blog
            </a>
          </nav>
        </div>
      </header>

      {/* Abertura */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <span className="mb-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Análise gratuita
          </span>
          <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Recebeu um auto de infração ou uma notificação?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            O CheckMulta analisa o documento e aponta, com base na legislação
            aplicável ao órgão que autuou, se existe falha formal que permita
            recorrer. A análise não custa nada e não exige cadastro.
          </p>
          
            href="#servicos"
            className="mt-8 inline-block rounded-lg bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Ver as áreas atendidas
          </a>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-slate-900">
            Como funciona
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <div key={p.titulo} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <p.Icone className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {i + 1}. {p.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticais */}
      <section id="servicos" className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-3 text-center text-2xl font-bold tracking-tight text-slate-900">
            Áreas atendidas
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm leading-relaxed text-slate-600">
            Cada área tem legislação própria e é analisada por um agente
            específico. Abra o item para ver o que cobrimos.
          </p>

          <div className="space-y-4">
            {VERTICAIS.map((v) => (
              <details
                key={v.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300"
              >
                <div className="h-1 w-full" style={{ backgroundColor: v.cor.faixa }} />

                <summary className="flex cursor-pointer list-none items-start gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: v.cor.fundoIcone, color: v.cor.icone }}
                  >
                    <v.Icone className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: v.cor.texto }}
                    >
                      {v.publico}
                    </span>
                    <h3 className="text-lg font-bold leading-snug text-slate-900">
                      {v.titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {v.resumo}
                    </p>
                  </div>

                  <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>

                <div className="border-t border-slate-100 px-5 pb-6 pt-5 sm:px-6">
                  <p className="mb-5 text-sm leading-relaxed text-slate-700">
                    {v.detalhe}
                  </p>

                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Situações analisadas
                  </h4>
                  <ul className="mb-5 grid gap-2 sm:grid-cols-2">
                    {v.especialidades.map((e) => (
                      <li
                        key={e.texto}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: v.cor.faixa }}
                        />
                        {e.href ? (
                          
                            href={e.href}
                            className="underline decoration-slate-300 underline-offset-2 transition hover:text-emerald-700"
                          >
                            {e.texto}
                          </a>
                        ) : (
                          <span>{e.texto}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="mb-5 rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                    <strong className="font-semibold text-slate-800">
                      Base legal:
                    </strong>{" "}
                    {v.baseLegal}
                    <br />
                    <strong className="font-semibold text-slate-800">
                      Análise gratuita.
                    </strong>{" "}
                    Defesa a partir de {v.preco.replace(/^A partir de /, "")}.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    
                      href={v.href}
                      className="rounded-lg bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {v.botao}
                    </a>
                    {v.hrefBlog && (
                      
                        href={v.hrefBlog}
                        className="rounded-lg border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Ler os artigos
                      </a>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Ferramentas */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-slate-900">
            Ferramentas gratuitas
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {FERRAMENTAS.map((f) => (
              <div
                key={f.id}
                className="flex flex-col rounded-xl border border-slate-200 p-6"
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: f.cor.fundoIcone, color: f.cor.icone }}
                >
                  <f.Icone className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">
                  {f.titulo}
                </h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-600">
                  {f.resumo}
                </p>
                
                  href={f.href}
                  className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                >
                  {f.botao} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-slate-900">
            Perguntas frequentes
          </h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.pergunta}
                className="group rounded-xl border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.pergunta}
                  <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-relaxed text-slate-600">
                  {f.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-8 grid gap-8 sm:grid-cols-3">
            <div>
              <span className="mb-3 block text-sm font-bold text-slate-900">
                Áreas
              </span>
              <ul className="space-y-2 text-sm text-slate-600">
                {VERTICAIS.map((v) => (
                  <li key={v.id}>
                    <a href={v.href} className="transition hover:text-emerald-700">
                      {v.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="mb-3 block text-sm font-bold text-slate-900">
                Ferramentas
              </span>
              <ul className="space-y-2 text-sm text-slate-600">
                {FERRAMENTAS.map((f) => (
                  <li key={f.id}>
                    <a href={f.href} className="transition hover:text-emerald-700">
                      {f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="mb-3 block text-sm font-bold text-slate-900">
                Conteúdo
              </span>
              <ul className="space-y-2 text-sm text-slate-600">
                {VERTICAIS.filter((v) => v.hrefBlog).map((v) => (
                  <li key={v.id}>
                    <a href={v.hrefBlog} className="transition hover:text-emerald-700">
                      Blog de {v.titulo.toLowerCase()}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-500">
            <p className="mb-2">
              CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
            </p>
            <p>
              O CheckMulta presta serviço de análise documental e elaboração de
              peça administrativa. Não realiza representação judicial nem
              substitui a orientação de advogado.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
