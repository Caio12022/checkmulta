import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Search,
} from "lucide-react";
import {
  infracoes,
  buscarPorSlug,
  precisaRedirecionar,
  buscarPorCodigo,
  calcularValor,
  calcularValorComDesconto,
  calcularValorComDescontoGeral,
  formatarReal,
  NOMES_GRAVIDADE,
  type Infracao,
  type Gravidade,
} from "../data/infracoes";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function rastrearCTA(local: string, codigo: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "cta_infracao_click", {
      cta_local: local,
      infracao_codigo: codigo,
    });
  }
}

// Paleta suave por gravidade, no mesmo registro visual do blog.
const CORES: Record<Gravidade, { fundo: string; borda: string; texto: string; barra: string }> = {
  leve: { fundo: "#f0fdf4", borda: "#bbf7d0", texto: "#15803d", barra: "#22c55e" },
  media: { fundo: "#fefce8", borda: "#fef08a", texto: "#a16207", barra: "#eab308" },
  grave: { fundo: "#fff7ed", borda: "#fed7aa", texto: "#c2410c", barra: "#f97316" },
  gravissima: { fundo: "#fef2f2", borda: "#fecaca", texto: "#b91c1c", barra: "#ef4444" },
  especial: { fundo: "#f8fafc", borda: "#e2e8f0", texto: "#475569", barra: "#94a3b8" },
};

/** Primeira frase da descrição oficial, para usar em títulos. */
function tituloCurto(descricao: string): string {
  const corte = descricao.split(/\s+-\s+|\s+e\s+(?=[A-ZÀ-Ú])/)[0].trim();
  return corte.length > 90 ? corte.slice(0, 90).trim() + "…" : corte;
}

export default function InfracaoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const infracao = buscarPorSlug(slug || "");

  const valor = infracao ? calcularValor(infracao) : null;
  const valorDesconto = infracao ? calcularValorComDesconto(infracao) : null;
  const valorDescontoGeral = infracao ? calcularValorComDescontoGeral(infracao) : null;
  const titulo = infracao ? tituloCurto(infracao.descricao) : "";
  const url = infracao ? `https://checkmulta.com.br/infracao/${infracao.slug}` : "";

  const descricaoMeta = infracao
    ? valor !== null
      ? `Código ${infracao.codigo}: ${titulo}. Infração ${NOMES_GRAVIDADE[
          infracao.gravidade
        ].toLowerCase()}, multa de ${formatarReal(valor)} e ${infracao.pontos} ponto${
          infracao.pontos === 1 ? "" : "s"
        } na CNH. Veja se o auto tem erro formal e analise grátis.`
      : `Código ${infracao.codigo}: ${titulo}. Entenda o enquadramento no art. ${infracao.amparoLegal} do CTB e analise seu auto de infração grátis.`
    : "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Meta tags e schema
  useEffect(() => {
    if (!infracao) return;

    const tituloPagina = `Código ${infracao.codigo} (${titulo}) | CheckMulta`;
    document.title = tituloPagina;

    const setMeta = (nome: string, conteudo: string) => {
      let tag = document.querySelector(`meta[name="${nome}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", nome);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    const setOG = (prop: string, conteudo: string) => {
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    setMeta("description", descricaoMeta);
    setMeta(
      "keywords",
      `código ${infracao.codigo}, infração ${infracao.codigo}, ${titulo.toLowerCase()}, art ${
        infracao.amparoLegal
      } CTB, multa, pontos CNH`
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    setOG("og:title", tituloPagina);
    setOG("og:description", descricaoMeta);
    setOG("og:url", url);
    setOG("og:type", "article");

    let schema = document.getElementById("infracao-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "infracao-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `Código ${infracao.codigo} (${titulo})`,
      description: descricaoMeta,
      url: url,
      author: { "@type": "Organization", name: "CheckMulta" },
      publisher: {
        "@type": "Organization",
        name: "CheckMulta",
        logo: {
          "@type": "ImageObject",
          url: "https://checkmulta.com.br/checkmulta-logo.webp",
        },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    });

    let bc = document.getElementById("infracao-breadcrumb");
    if (!bc) {
      bc = document.createElement("script");
      bc.setAttribute("type", "application/ld+json");
      bc.setAttribute("id", "infracao-breadcrumb");
      document.head.appendChild(bc);
    }
    bc.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://checkmulta.com.br/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Infrações",
          item: "https://checkmulta.com.br/infracao",
        },
        { "@type": "ListItem", position: 3, name: `Código ${infracao.codigo}`, item: url },
      ],
    });

    return () => {
      document.title = "CheckMulta. Análise de Multas com IA";
    };
  }, [slug, infracao, titulo, descricaoMeta, url]);

  // Código inexistente: manda para a busca
  if (!infracao) return <Navigate to="/infracao" replace />;

  // URL não canônica (ex: /infracao/7471): redireciona para o slug completo
  if (precisaRedirecionar(slug || "", infracao)) {
    return <Navigate to={`/infracao/${infracao.slug}`} replace />;
  }

  const cor = CORES[infracao.gravidade];
  const ehCondutor = infracao.infrator === "Condutor";

  // Variantes do mesmo código (quando existem)
  const variantes = buscarPorCodigo(infracao.codigo).filter((i) => i.slug !== infracao.slug);

  // Outras infrações do mesmo artigo do CTB
  const artigoBase = infracao.amparoLegal.split(",")[0].trim();
  const relacionadas = infracoes
    .filter(
      (i) =>
        i.slug !== infracao.slug &&
        i.amparoLegal.split(",")[0].trim() === artigoBase
    )
    .slice(0, 6);

  // Se o artigo não tem vizinhas, mostra infrações da mesma gravidade
  const sugestoes =
    relacionadas.length > 0
      ? relacionadas
      : infracoes
          .filter((i) => i.slug !== infracao.slug && i.gravidade === infracao.gravidade)
          .slice(0, 6);

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
            <Link to="/infracao" className="text-emerald-600">
              Infrações
            </Link>
            <Link to="/blog" className="hover:text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      {/* BARRA DE URGÊNCIA */}
      <div className="border-b border-emerald-100 bg-emerald-50">
        <div className="mx-auto max-w-3xl px-4 py-2.5 text-center text-[13px] text-emerald-800">
          O prazo para recorrer é curto.{" "}
          <Link
            to="/"
            onClick={() => rastrearCTA("barra_urgencia", infracao.codigo)}
            className="font-semibold underline"
          >
            Analise seu auto grátis agora
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link to="/" className="hover:text-emerald-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/infracao" className="hover:text-emerald-600">
            Infrações
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Código {infracao.codigo}</span>
        </nav>

        {/* CABEÇALHO */}
        <div className="mb-8 border-l-4 pl-5" style={{ borderColor: cor.barra }}>
          <span
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: cor.texto }}
          >
            Código {infracao.codigoUrl} · Infração{" "}
            {NOMES_GRAVIDADE[infracao.gravidade].toLowerCase()}
          </span>
          <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[30px] sm:leading-[1.2]">
            {titulo}
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Enquadramento no art. {infracao.amparoLegal} do Código de Trânsito Brasileiro.
            Veja abaixo o valor, os pontos e o que verificar no seu auto de infração.
          </p>
        </div>

        {/* FICHA DA INFRAÇÃO */}
        <div
          className="mb-8 overflow-hidden rounded-xl border"
          style={{ borderColor: cor.borda, backgroundColor: cor.fundo }}
        >
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0"
               style={{ borderColor: cor.borda }}>
            <div className="p-5">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Valor da multa
              </span>
              <span className="text-xl font-bold text-slate-900 sm:text-2xl">
                {valor !== null ? formatarReal(valor) : "Específico"}
              </span>
            </div>

            <div className="p-5">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pagando até vencer
              </span>
              <span className="text-xl font-bold text-emerald-700 sm:text-2xl">
                {valorDescontoGeral !== null ? formatarReal(valorDescontoGeral) : "—"}
              </span>
            </div>

            <div className="p-5" style={{ borderColor: cor.borda }}>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pontos na CNH
              </span>
              <span className="text-xl font-bold text-slate-900 sm:text-2xl">
                {ehCondutor ? infracao.pontos : "—"}
              </span>
            </div>

            <div className="p-5">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Gravidade
              </span>
              <span className="text-xl font-bold sm:text-2xl" style={{ color: cor.texto }}>
                {NOMES_GRAVIDADE[infracao.gravidade]}
              </span>
            </div>
          </div>

          {infracao.multiplicador !== 1 && (
            <div
              className="border-t px-5 py-3 text-[13px] text-slate-600"
              style={{ borderColor: cor.borda }}
            >
              <strong className="font-semibold text-slate-800">
                Multa agravada ({infracao.multiplicador === 0.5 ? "50%" : `${infracao.multiplicador}×`}).
              </strong>{" "}
              O valor não é o padrão da gravidade. O próprio CTB prevê fator multiplicador
              para esta infração, conforme o art. 258, § 2º.
            </div>
          )}
        </div>

        {/* CTA PRINCIPAL */}
        <div className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            <strong className="font-semibold text-slate-900">
              Recebeu uma autuação com este código?
            </strong>{" "}
            Nossa IA lê o auto de infração e aponta, de graça, se existe erro formal que
            abra margem para recurso. Sem cadastro.
          </p>
          <Link
            to="/"
            onClick={() => rastrearCTA("ficha", infracao.codigo)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* DESCRIÇÃO OFICIAL */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            Descrição oficial da infração
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            É este o texto que aparece no auto de infração e na notificação, exatamente como
            consta na tabela de códigos da SENATRAN:
          </p>
          <blockquote className="rounded-xl border-l-4 border-slate-300 bg-slate-50 p-5 text-[15.5px] leading-relaxed text-slate-700">
            {infracao.descricao}
          </blockquote>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            A redação abreviada é a da tabela oficial. Se o texto do seu auto for diferente
            deste, vale conferir o enquadramento com atenção.
          </p>
        </section>

        {/* DADOS DO ENQUADRAMENTO */}
        <section className="mb-9">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-[22px]">
            Dados do enquadramento
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="w-2/5 px-4 py-3 text-left font-semibold text-slate-700">
                    Código
                  </th>
                  <td className="px-4 py-3 text-slate-600">
                    {infracao.codigo}
                    {infracao.desdobramento > 0 && ` (desdobramento ${infracao.desdobramento})`}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Amparo legal
                  </th>
                  <td className="px-4 py-3 text-slate-600">Art. {infracao.amparoLegal} do CTB</td>
                </tr>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Quem responde
                  </th>
                  <td className="px-4 py-3 text-slate-600">{infracao.infrator}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Gravidade
                  </th>
                  <td className="px-4 py-3 text-slate-600">
                    {NOMES_GRAVIDADE[infracao.gravidade]}
                    {infracao.multiplicador !== 1 &&
                      ` (fator ${infracao.multiplicador === 0.5 ? "50%" : `${infracao.multiplicador}×`})`}
                  </td>
                </tr>
                <tr className="bg-white">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Órgão competente
                  </th>
                  <td className="px-4 py-3 text-slate-600">{infracao.orgaoCompetente}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {!ehCondutor && (
            <div className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <p className="text-sm leading-relaxed text-slate-600">
                Esta infração recai sobre <strong>{infracao.infrator.toLowerCase()}</strong>,
                e não sobre o condutor. Por isso não gera pontos na CNH. Os pontos do art.
                259 do CTB são atribuídos a quem dirigia.
              </p>
            </div>
          )}
        </section>

        {/* COMO É CALCULADO */}
        {valor !== null && (
          <section className="mb-9">
            <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
              Como o valor é calculado
            </h2>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O art. 258 do CTB fixa um valor para cada nível de gravidade. Infração{" "}
              {NOMES_GRAVIDADE[infracao.gravidade].toLowerCase()} custa{" "}
              {formatarReal(valor / infracao.multiplicador)}
              {infracao.multiplicador !== 1 && (
                <>
                  , e neste caso o próprio Código prevê agravamento de{" "}
                  {infracao.multiplicador === 0.5 ? "50%" : `${infracao.multiplicador}×`},
                  chegando a {formatarReal(valor)}
                </>
              )}
              .
            </p>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O art. 284 do CTB prevê dois descontos diferentes, não um só. Pagando até o
              vencimento, sem exigência nenhuma, sai por{" "}
              <strong className="font-semibold text-slate-900">
                {formatarReal(valorDescontoGeral!)}
              </strong>{" "}
              (20% de desconto), e esse não tira o direito de recorrer depois.
            </p>
            <p className="text-[16.5px] leading-[1.75] text-slate-700">
              Já os{" "}
              <strong className="font-semibold text-slate-900">
                {formatarReal(valorDesconto!)}
              </strong>{" "}
              (40%) só valem para quem aderiu ao SNE (Sistema de Notificação Eletrônica)
              antes de a autuação ser notificada e declara, no ato, que desiste de defesa
              prévia e de recurso. Vale lembrar que nenhum dos dois descontos retira os
              pontos da CNH. Só o recurso aceito faz isso.
            </p>
            <Link
              to={`/calculadora-desconto-multa?valor=${valor}`}
              onClick={() => rastrearCTA("calculadora_desconto", infracao.codigo)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Ver os dois valores na calculadora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* O QUE VERIFICAR */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            O que verificar no seu auto de infração
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            O art. 280 do CTB lista os elementos que o auto precisa conter. A ausência ou o
            preenchimento incorreto de qualquer um deles é o tipo de falha que costuma
            sustentar uma defesa prévia. Vale conferir:
          </p>
          <ul className="my-5 ml-1 space-y-2 border-l-2 pl-5" style={{ borderColor: cor.barra }}>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se o código lançado é mesmo o {infracao.codigo} e se a conduta descrita
              corresponde ao que aconteceu.
            </li>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se o local está descrito de forma precisa, e não de modo genérico.
            </li>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se data, hora e placa conferem com a realidade.
            </li>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se o campo de observações foi preenchido, sobretudo quando não houve abordagem.
            </li>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se o agente e o órgão autuador estão identificados.
            </li>
            <li className="text-[16.5px] leading-relaxed text-slate-700">
              Se a notificação chegou dentro do prazo previsto no art. 281 do CTB.
            </li>
          </ul>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900">
              Esta página é informativa e reúne dados públicos da tabela da SENATRAN e do
              CTB. Não substitui a análise do seu documento específico nem constitui
              consultoria jurídica.
            </p>
          </div>
        </section>

        {/* VARIANTES DO MESMO CÓDIGO */}
        {variantes.length > 0 && (
          <section className="mb-9">
            <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
              Outras condutas com o mesmo código
            </h2>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O código {infracao.codigo} abrange mais de uma conduta. Confira no seu auto
              qual delas foi lançada:
            </p>
            <div className="space-y-3">
              {variantes.map((v) => (
                <Link
                  key={v.slug}
                  to={`/infracao/${v.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
                >
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Desdobramento {v.desdobramento}
                  </span>
                  <span className="text-[15px] font-medium text-slate-800">
                    {tituloCurto(v.descricao)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA FINAL */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Seu auto tem erro? Descubra grátis
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-slate-600">
            Envie a foto do auto de infração. Nossa IA verifica os requisitos do art. 280 do
            CTB e aponta o que encontrar. Se não houver falha, você não paga nada.
          </p>
          <Link
            to="/"
            onClick={() => rastrearCTA("final", infracao.codigo)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* INFRAÇÕES RELACIONADAS */}
      {sugestoes.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-[22px]">
              {relacionadas.length > 0
                ? `Outras infrações do art. ${artigoBase} do CTB`
                : `Outras infrações ${NOMES_GRAVIDADE[infracao.gravidade].toLowerCase()}s`}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sugestoes.map((s) => {
                const corS = CORES[s.gravidade];
                const valorS = calcularValor(s);
                return (
                  <Link
                    key={s.slug}
                    to={`/infracao/${s.slug}`}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <span
                      className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: corS.texto }}
                    >
                      {s.codigoUrl} · {NOMES_GRAVIDADE[s.gravidade]}
                    </span>
                    <h3 className="mb-3 flex-1 text-[15px] font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                      {tituloCurto(s.descricao)}
                    </h3>
                    <span className="text-sm text-slate-500">
                      {valorS !== null ? formatarReal(valorS) : "Penalidade específica"}
                      {s.infrator === "Condutor" && s.pontos > 0 && ` · ${s.pontos} pontos`}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-7 text-center">
              <Link
                to="/infracao"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:gap-3"
              >
                <Search className="h-4 w-4" />
                Consultar outro código
              </Link>
            </div>
          </div>
        </section>
      )}

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
            <Link to="/infracao" className="text-slate-600 transition hover:text-emerald-600">
              Consulta de infrações
            </Link>
            <Link
              to="/calculadora-desconto-multa"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Calculadora de desconto
            </Link>
            <Link to="/blog" className="text-slate-600 transition hover:text-emerald-600">
              Blog
            </Link>
            <Link to="/procon" className="text-slate-600 transition hover:text-emerald-600">
              Procon
            </Link>
            <Link
              to="/vigilancia-sanitaria"
              className="text-slate-600 transition hover:text-emerald-600"
            >
              Vigilância Sanitária
            </Link>
          </nav>

          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Dados de código, descrição e enquadramento extraídos da Tabela de Código de
            Infrações RENAINF, publicada pela SENATRAN. Valores conforme o art. 258 do CTB.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia. CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
