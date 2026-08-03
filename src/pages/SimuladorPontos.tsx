import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  buscarInfracoes,
  calcularValor,
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

function rastrear(evento: string, params: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", evento, params);
  }
}

const CORES: Record<Gravidade, { texto: string; fundo: string; borda: string }> = {
  leve: { texto: "#15803d", fundo: "#f0fdf4", borda: "#bbf7d0" },
  media: { texto: "#a16207", fundo: "#fefce8", borda: "#fef08a" },
  grave: { texto: "#c2410c", fundo: "#fff7ed", borda: "#fed7aa" },
  gravissima: { texto: "#b91c1c", fundo: "#fef2f2", borda: "#fecaca" },
  especial: { texto: "#475569", fundo: "#f8fafc", borda: "#e2e8f0" },
};

/** Pontos por gravidade, conforme o art. 259 do CTB. */
const PONTOS_RAPIDOS: { gravidade: Gravidade; pontos: number; rotulo: string }[] = [
  { gravidade: "leve", pontos: 3, rotulo: "Leve" },
  { gravidade: "media", pontos: 4, rotulo: "Média" },
  { gravidade: "grave", pontos: 5, rotulo: "Grave" },
  { gravidade: "gravissima", pontos: 7, rotulo: "Gravíssima" },
];

interface Lancamento {
  id: number;
  rotulo: string;
  gravidade: Gravidade;
  pontos: number;
  codigo?: string;
  slug?: string;
}

function tituloCurto(descricao: string, limite = 60): string {
  const corte = descricao.split(/\s+-\s+|\s+e\s+(?=[A-ZÀ-Ú])/)[0].trim();
  return corte.length > limite ? corte.slice(0, limite).trim() + "…" : corte;
}

export default function SimuladorPontos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [profissional, setProfissional] = useState(false);
  const [termo, setTermo] = useState("");
  const [proximoId, setProximoId] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);

    document.title =
      "Simulador de pontos na CNH: veja se você está perto da suspensão | CheckMulta";

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

    const desc =
      "Some suas multas dos últimos 12 meses e descubra quantos pontos faltam para a suspensão da CNH. O limite muda conforme as infrações gravíssimas: 20, 30 ou 40 pontos. Simulação gratuita.";

    setMeta("description", desc);
    setMeta(
      "keywords",
      "simulador pontos CNH, quantos pontos tenho, limite pontos CNH, suspensão CNH, 20 30 40 pontos, art 261 CTB"
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/simulador-pontos");

    setOG("og:title", "Simulador de pontos na CNH | CheckMulta");
    setOG("og:description", desc);
    setOG("og:url", "https://checkmulta.com.br/simulador-pontos");
    setOG("og:type", "website");

    let schema = document.getElementById("simulador-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "simulador-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Com quantos pontos a CNH é suspensa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Depende das infrações gravíssimas registradas nos últimos 12 meses. Conforme o art. 261 do CTB, com a redação da Lei 14.071/2020, o limite é de 40 pontos sem nenhuma gravíssima, 30 pontos com uma gravíssima e 20 pontos com duas ou mais.",
          },
        },
        {
          "@type": "Question",
          name: "Quando os pontos saem da CNH?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Os pontos deixam de contar 12 meses após a data da infração, e não após a data do pagamento. Pagar a multa não antecipa a saída dos pontos.",
          },
        },
        {
          "@type": "Question",
          name: "Motorista profissional tem limite diferente?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. O condutor com registro de atividade remunerada na CNH mantém o limite de 40 pontos, independentemente da quantidade de infrações gravíssimas no período.",
          },
        },
        {
          "@type": "Question",
          name: "Recorrer de uma multa tira os pontos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Se o recurso for acolhido e a autuação cancelada, os pontos correspondentes não são computados. É por isso que, para quem está perto do limite, derrubar uma única infração pode alterar o resultado.",
          },
        },
      ],
    });

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, []);

  const resultados = useMemo(
    () => (termo.trim().length >= 2 ? buscarInfracoes(termo, 8) : []),
    [termo]
  );

  const totalPontos = useMemo(
    () => lancamentos.reduce((soma, l) => soma + l.pontos, 0),
    [lancamentos]
  );

  const gravissimas = useMemo(
    () => lancamentos.filter((l) => l.gravidade === "gravissima").length,
    [lancamentos]
  );

  /** Art. 261 do CTB: o teto cai conforme as gravíssimas do período. */
  const limite = useMemo(() => {
    if (profissional) return 40;
    if (gravissimas >= 2) return 20;
    if (gravissimas === 1) return 30;
    return 40;
  }, [gravissimas, profissional]);

  const restante = limite - totalPontos;
  const percentual = Math.min(100, Math.round((totalPontos / limite) * 100));
  const ultrapassou = totalPontos >= limite;

  const corBarra = ultrapassou
    ? "#ef4444"
    : percentual >= 75
    ? "#f97316"
    : percentual >= 50
    ? "#eab308"
    : "#22c55e";

  function adicionarRapido(gravidade: Gravidade, pontos: number, rotulo: string) {
    setLancamentos((prev) => [
      ...prev,
      { id: proximoId, rotulo: `Infração ${rotulo.toLowerCase()}`, gravidade, pontos },
    ]);
    setProximoId((n) => n + 1);
    rastrear("simulador_adicionar", { tipo: "rapido", gravidade });
  }

  function adicionarInfracao(i: Infracao) {
    setLancamentos((prev) => [
      ...prev,
      {
        id: proximoId,
        rotulo: tituloCurto(i.descricao),
        gravidade: i.gravidade,
        pontos: i.infrator === "Condutor" ? i.pontos : 0,
        codigo: i.codigo,
        slug: i.slug,
      },
    ]);
    setProximoId((n) => n + 1);
    setTermo("");
    rastrear("simulador_adicionar", { tipo: "codigo", infracao_codigo: i.codigo });
  }

  function remover(id: number) {
    setLancamentos((prev) => prev.filter((l) => l.id !== id));
  }

  function limpar() {
    setLancamentos([]);
  }

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
            <Link to="/infracao" className="hover:text-emerald-600">
              Infrações
            </Link>
            <Link to="/blog" className="hover:text-emerald-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-slate-500">
          <Link to="/" className="hover:text-emerald-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Simulador de pontos</span>
        </nav>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
          Quantos pontos faltam para você perder a CNH?
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          Adicione as multas que você recebeu nos últimos 12 meses. O simulador aplica a
          regra do art. 261 do Código de Trânsito Brasileiro, em que o limite muda conforme
          as infrações gravíssimas do período.
        </p>

        {/* PAINEL DE RESULTADO */}
        <div
          className="mb-8 overflow-hidden rounded-xl border"
          style={{
            borderColor: ultrapassou ? "#fecaca" : "#e2e8f0",
            backgroundColor: ultrapassou ? "#fef2f2" : "#f8fafc",
          }}
        >
          <div className="p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Pontos acumulados
                </span>
                <span className="text-4xl font-bold tabular-nums text-slate-900 sm:text-5xl">
                  {totalPontos}
                  <span className="text-2xl font-semibold text-slate-400"> / {limite}</span>
                </span>
              </div>

              <div className="text-right">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {ultrapassou ? "Situação" : "Ainda cabem"}
                </span>
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: ultrapassou ? "#b91c1c" : "#0f172a" }}
                >
                  {ultrapassou ? "Acima do limite" : `${restante} pontos`}
                </span>
              </div>
            </div>

            {/* BARRA */}
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentual}%`, backgroundColor: corBarra }}
              />
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              {lancamentos.length === 0 ? (
                <>
                  Seu limite começa em 40 pontos. Ele cai para 30 com uma infração
                  gravíssima e para 20 com duas ou mais. Adicione suas multas abaixo.
                </>
              ) : ultrapassou ? (
                <>
                  <strong className="font-semibold text-red-800">
                    Você atingiu o limite de {limite} pontos.
                  </strong>{" "}
                  Nessa faixa o órgão de trânsito pode instaurar o processo de suspensão do
                  direito de dirigir. Cancelar uma autuação retira os pontos dela da
                  contagem.
                </>
              ) : (
                <>
                  Seu limite é de <strong className="font-semibold">{limite} pontos</strong>{" "}
                  porque você tem{" "}
                  {profissional
                    ? "registro de atividade remunerada na CNH"
                    : gravissimas === 0
                    ? "nenhuma infração gravíssima no período"
                    : gravissimas === 1
                    ? "uma infração gravíssima no período"
                    : `${gravissimas} infrações gravíssimas no período`}
                  .
                </>
              )}
            </p>
          </div>

          {/* MOTORISTA PROFISSIONAL */}
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={profissional}
                onChange={(e) => {
                  setProfissional(e.target.checked);
                  rastrear("simulador_profissional", { ativo: e.target.checked });
                }}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm leading-relaxed text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Sou motorista profissional
                </strong>{" "}
                — minha CNH tem a observação EAR (exerce atividade remunerada). Nesse caso o
                limite permanece em 40 pontos, independentemente das gravíssimas.
              </span>
            </label>
          </div>
        </div>

        {/* ADICIONAR */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-[22px]">
            Adicione suas multas
          </h2>

          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Não sabe o código? Escolha pela gravidade
          </span>
          <div className="mb-6 flex flex-wrap gap-2">
            {PONTOS_RAPIDOS.map((p) => {
              const cor = CORES[p.gravidade];
              return (
                <button
                  key={p.gravidade}
                  onClick={() => adicionarRapido(p.gravidade, p.pontos, p.rotulo)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition hover:shadow-sm"
                  style={{
                    backgroundColor: cor.fundo,
                    borderColor: cor.borda,
                    color: cor.texto,
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {p.rotulo} · {p.pontos} pts
                </button>
              );
            })}
          </div>

          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ou busque a infração exata
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Ex: 7471 ou velocidade"
              aria-label="Buscar infração para adicionar"
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {termo && (
              <button
                onClick={() => setTermo("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {resultados.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              {resultados.map((i, idx) => {
                const cor = CORES[i.gravidade];
                const pontosItem = i.infrator === "Condutor" ? i.pontos : 0;
                return (
                  <button
                    key={i.slug}
                    onClick={() => adicionarInfracao(i)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/60 ${
                      idx !== 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <span
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
                      style={{
                        backgroundColor: cor.fundo,
                        color: cor.texto,
                        border: `1px solid ${cor.borda}`,
                      }}
                    >
                      {i.codigoUrl}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {tituloCurto(i.descricao, 70)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {NOMES_GRAVIDADE[i.gravidade]} · {pontosItem} pontos
                      </span>
                    </span>
                    <Plus className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  </button>
                );
              })}
            </div>
          )}

          {termo.trim().length >= 2 && resultados.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Nenhuma infração encontrada para “{termo}”. Confira o código no auto ou use os
              botões de gravidade acima.
            </p>
          )}
        </section>

        {/* LISTA */}
        {lancamentos.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 sm:text-[22px]">
                Suas multas ({lancamentos.length})
              </h2>
              <button
                onClick={limpar}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar tudo
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              {lancamentos.map((l, idx) => {
                const cor = CORES[l.gravidade];
                return (
                  <div
                    key={l.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    } ${idx !== 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <span
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: cor.fundo,
                        color: cor.texto,
                        border: `1px solid ${cor.borda}`,
                      }}
                    >
                      {l.pontos} pts
                    </span>
                    <span className="min-w-0 flex-1">
                      {l.slug ? (
                        <Link
                          to={`/infracao/${l.slug}`}
                          className="block truncate text-sm font-medium text-slate-800 hover:text-emerald-700"
                        >
                          {l.rotulo}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {l.rotulo}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {NOMES_GRAVIDADE[l.gravidade]}
                        {l.codigo && ` · código ${l.codigo}`}
                      </span>
                    </span>
                    <button
                      onClick={() => remover(l.id)}
                      aria-label="Remover esta multa"
                      className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA CONTEXTUAL */}
        {lancamentos.length > 0 && (
          <div
            className="mb-10 rounded-xl border p-5"
            style={{
              borderColor: ultrapassou || percentual >= 75 ? "#fecaca" : "#a7f3d0",
              backgroundColor: ultrapassou || percentual >= 75 ? "#fef2f2" : "#ecfdf5",
            }}
          >
            <p className="mb-3 text-sm leading-relaxed text-slate-700">
              {ultrapassou ? (
                <>
                  <strong className="font-semibold text-slate-900">
                    Uma multa cancelada pode mudar essa conta.
                  </strong>{" "}
                  Se o recurso for acolhido, os pontos daquela autuação saem da contagem — e,
                  quando a infração cancelada é gravíssima, o próprio limite volta a subir.
                </>
              ) : percentual >= 75 ? (
                <>
                  <strong className="font-semibold text-slate-900">
                    Você está perto do limite.
                  </strong>{" "}
                  Vale conferir se alguma dessas autuações tem erro formal. Cancelar uma
                  delas devolve fôlego na contagem.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-slate-900">
                    Alguma dessas multas tem erro?
                  </strong>{" "}
                  Nossa IA lê o auto de infração e aponta de graça se há falha formal que
                  abra margem para recurso.
                </>
              )}
            </p>
            <Link
              to="/"
              onClick={() =>
                rastrear("cta_simulador_click", {
                  cta_local: "resultado",
                  pontos_total: totalPontos,
                  ultrapassou,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Analisar minha multa grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* COMO FUNCIONA */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            Como funciona o limite de pontos
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            Até 2021 o limite era único: 20 pontos para todo mundo. A Lei 14.071/2020 mudou
            o art. 261 do CTB e criou um sistema escalonado, em que o teto depende de quantas
            infrações gravíssimas o condutor acumulou nos últimos 12 meses.
          </p>

          <div className="my-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Gravíssimas em 12 meses
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Limite para suspensão
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">Nenhuma</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">40 pontos</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-600">Uma</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">30 pontos</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">Duas ou mais</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">20 pontos</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-600">
                    Motorista com EAR na CNH
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    40 pontos, sempre
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            Repare no efeito prático: uma única infração gravíssima não apenas soma 7 pontos,
            ela também derruba seu teto em 10. O impacto real é de 17 pontos de folga
            perdidos de uma vez.
          </p>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-600">
              Os pontos deixam de contar 12 meses depois da{" "}
              <strong className="font-semibold text-slate-800">data da infração</strong>, não
              da data do pagamento. Quitar a multa não antecipa a saída dos pontos, e o
              desconto de 40% do art. 284 do CTB também não interfere na pontuação.
            </p>
          </div>
        </section>

        {/* AVISO */}
        <div className="mb-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Esta é uma simulação baseada nos pontos que você informou e considera todas as
            infrações dentro da mesma janela de 12 meses. Ela não consulta o seu prontuário —
            para a pontuação oficial, consulte o DETRAN do seu estado. Algumas infrações
            levam à suspensão do direito de dirigir por si sós, independentemente da
            pontuação acumulada.
          </p>
        </div>

        {/* FAQ */}
        <section className="mb-4">
          <h2 className="mb-5 text-xl font-bold text-slate-900 sm:text-[22px]">
            Perguntas frequentes
          </h2>
          <div className="space-y-3">
            {[
              {
                p: "Com quantos pontos a CNH é suspensa?",
                r: "Depende das infrações gravíssimas registradas nos últimos 12 meses. Conforme o art. 261 do CTB, com a redação da Lei 14.071/2020, o limite é de 40 pontos sem nenhuma gravíssima, 30 pontos com uma gravíssima e 20 pontos com duas ou mais.",
              },
              {
                p: "Quando os pontos saem da CNH?",
                r: "Os pontos deixam de contar 12 meses após a data da infração, e não após a data do pagamento. Pagar a multa não antecipa a saída dos pontos.",
              },
              {
                p: "Motorista profissional tem limite diferente?",
                r: "Sim. O condutor com registro de atividade remunerada na CNH mantém o limite de 40 pontos, independentemente da quantidade de infrações gravíssimas no período.",
              },
              {
                p: "Recorrer de uma multa tira os pontos?",
                r: "Se o recurso for acolhido e a autuação cancelada, os pontos correspondentes não são computados. É por isso que, para quem está perto do limite, derrubar uma única infração pode alterar o resultado.",
              },
            ].map((f, i) => (
              <details
                key={i}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15.5px] font-semibold text-slate-800 hover:text-emerald-700">
                  {f.p}
                  <span className="ml-3 flex-shrink-0 text-lg text-emerald-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 text-[15.5px] leading-relaxed text-slate-600">
                  {f.r}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* CTA FINAL */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Descubra se sua multa tem erro formal
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Envie a foto do auto de infração. Nossa IA verifica os requisitos do art. 280 do
            CTB e aponta o que encontrar. A análise é gratuita e não exige cadastro.
          </p>
          <Link
            to="/"
            onClick={() => rastrear("cta_simulador_click", { cta_local: "final" })}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar minha multa grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

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
            Simulação baseada no art. 261 do CTB, com a redação da Lei 14.071/2020. Pontuação
            por gravidade conforme o art. 259 do CTB.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
