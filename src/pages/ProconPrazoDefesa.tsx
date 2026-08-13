import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Info,
  AlertTriangle,
  Lock,
  Timer,
  CalendarClock,
} from "lucide-react";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function rastrear(evento: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", evento, params);
  }
}

type TipoContagem = "corridos" | "uteis";

function parseDias(texto: string): number | null {
  const n = parseInt(texto.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function somarDiasCorridos(dataISO: string, dias: number): Date | null {
  if (!dataISO) return null;
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  return d;
}

function somarDiasUteis(dataISO: string, dias: number): Date | null {
  if (!dataISO) return null;
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const d = new Date(ano, mes - 1, dia);
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const diaSemana = d.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return d;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ProconPrazoDefesa() {
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [diasTexto, setDiasTexto] = useState("");
  const [tipoContagem, setTipoContagem] = useState<TipoContagem>("corridos");

  useEffect(() => {
    window.scrollTo(0, 0);

    document.title = "Calculadora de prazo de defesa do Procon | CheckMulta";

    const setMeta = (nome: string, conteudo: string) => {
      let tag = document.querySelector(`meta[name="${nome}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", nome);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", conteudo);
    };

    const desc =
      "Calcule a data-limite para apresentar defesa no Procon a partir do prazo indicado no seu auto de infração. O prazo varia por Procon — a ferramenta só faz a conta com o número que você já encontrou no documento. Grátis.";

    setMeta("description", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/procon/prazo-de-defesa");

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, []);

  const dias = useMemo(() => parseDias(diasTexto), [diasTexto]);

  const resultado = useMemo(() => {
    if (!dataRecebimento || dias === null) return null;
    const limite =
      tipoContagem === "corridos"
        ? somarDiasCorridos(dataRecebimento, dias)
        : somarDiasUteis(dataRecebimento, dias);
    if (!limite) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    limite.setHours(0, 0, 0, 0);
    const diffDias = Math.round((limite.getTime() - hoje.getTime()) / 86400000);
    return { data: limite, vencido: limite < hoje, diffDias };
  }, [dataRecebimento, dias, tipoContagem]);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
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
            <Link to="/procon" className="hover:text-orange-600">
              Início
            </Link>
            <Link to="/procon/glossario" className="hover:text-orange-600">
              Glossário
            </Link>
            <Link to="/procon/blog" className="hover:text-orange-600">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-slate-500">
          <Link to="/procon" className="hover:text-orange-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Prazo de defesa</span>
        </nav>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
          Até quando dá para apresentar defesa no Procon?
        </h1>
        <p className="mb-4 text-base leading-relaxed text-slate-600">
          O prazo de defesa não é o mesmo em todo o Brasil — cada Procon pode adotar o seu.
          Esta calculadora não chuta um número: ela pega o prazo que{" "}
          <strong className="font-semibold text-slate-900">
            você encontrou no seu próprio auto de infração
          </strong>{" "}
          e calcula a data-limite.
        </p>

        <span className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-orange-600" /> Cálculo gratuito
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-orange-600" /> Sem cadastro
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-orange-600" /> Resultado imediato
          </span>
        </span>

        {/* FERRAMENTA */}
        <section className="mb-10">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Data em que você recebeu a notificação
          </span>
          <input
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            aria-label="Data de recebimento da notificação"
            className="mb-5 w-full rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-base text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 sm:w-64"
          />

          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Quantos dias de prazo o seu auto indica?
          </span>
          <div className="relative mb-5">
            <CalendarClock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              value={diasTexto}
              onChange={(e) => setDiasTexto(e.target.value)}
              placeholder="Ex: 20"
              aria-label="Quantidade de dias de prazo"
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 sm:w-64"
            />
          </div>

          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            O documento diz "dias corridos" ou "dias úteis"?
          </span>
          <div className="mb-6 flex flex-wrap gap-2">
            {(
              [
                ["corridos", "Dias corridos"],
                ["uteis", "Dias úteis"],
              ] as [TipoContagem, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                onClick={() => {
                  setTipoContagem(valor);
                  rastrear("prazo_procon_tipo", { valor });
                }}
                className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                  tipoContagem === valor
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {resultado && (
            <div
              className={`rounded-xl border p-5 ${
                resultado.vencido
                  ? "border-slate-200 bg-slate-50"
                  : "border-emerald-200 bg-emerald-50/60"
              }`}
            >
              <p className="text-[14.5px] leading-relaxed text-slate-700">
                {resultado.vencido ? (
                  <>
                    O prazo venceu em{" "}
                    <strong className="font-semibold text-slate-900">
                      {formatarData(resultado.data)}
                    </strong>
                    . Isso pode reduzir as opções, mas vale conferir com o Procon emissor
                    antes de descartar a defesa — prazos podem ter sido suspensos ou
                    reabertos em situações específicas.
                  </>
                ) : (
                  <>
                    Sua data-limite é{" "}
                    <strong className="font-semibold text-emerald-800">
                      {formatarData(resultado.data)}
                    </strong>
                    {resultado.diffDias <= 5 && resultado.diffDias >= 0 && (
                      <>
                        {" "}
                        — faltam {resultado.diffDias === 0 ? "menos de um dia" : `${resultado.diffDias} dia${resultado.diffDias === 1 ? "" : "s"}`}
                      </>
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* CTA CONTEXTUAL */}
        {resultado && (
          <div className="mb-10 rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm leading-relaxed text-slate-700">
              <strong className="font-semibold text-slate-900">
                Antes do prazo vencer, vale conferir o auto inteiro.
              </strong>{" "}
              Nossa IA lê o documento e aponta, de graça, se há falha formal que abre margem
              para recurso.
            </p>
            <Link
              to="/procon?analisar=1"
              onClick={() => rastrear("cta_prazo_procon_click", { cta_local: "resultado" })}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Analisar meu auto grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* EXPLICAÇÃO */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            Por que o prazo não é sempre o mesmo
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            O art. 42 do Decreto Federal 2.181/97 prevê 20 dias, mas Procons estaduais e
            municipais podem adotar prazo próprio — o Procon-SP, por exemplo, trabalha com
            15 dias, com base na Lei Estadual 10.177/98. Por isso esta calculadora nunca
            assume um número: ela usa o prazo que está escrito no seu próprio auto.
          </p>
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-600">
              Sobre dias corridos ou úteis: os processos administrativos federais, regidos
              pela Lei 9.784/99, contam prazo em dias corridos. Mas o auto de infração é
              sempre a referência mais confiável — se ele disser expressamente "dias úteis",
              use essa opção na calculadora.
            </p>
          </div>
        </section>

        {/* AVISO */}
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Esta calculadora faz apenas a soma de dias a partir do que você informou. Ela não
            sabe qual é o prazo do seu Procon nem confirma feriados locais — confirme sempre
            com o número escrito no seu auto e, em caso de dúvida, junto ao órgão emissor.
          </p>
        </div>
      </main>

      {/* CTA FINAL */}
      <section className="mt-8 border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Descubra grátis se o seu auto tem erro
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Nossa IA lê o auto de infração do Procon e aponta, de graça, se há falha formal.
            Se não houver, você não paga nada.
          </p>
          <Link
            to="/procon?analisar=1"
            onClick={() => rastrear("cta_prazo_procon_click", { cta_local: "final" })}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
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
            <Link to="/procon" className="text-slate-600 transition hover:text-orange-600">
              Auto de infração do Procon
            </Link>
            <Link
              to="/procon/glossario"
              className="text-slate-600 transition hover:text-orange-600"
            >
              Glossário
            </Link>
            <Link to="/procon/blog" className="text-slate-600 transition hover:text-orange-600">
              Blog
            </Link>
          </nav>
          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Prazo geral do art. 42 do Decreto Federal 2.181/97 — Procons estaduais e
            municipais podem adotar prazo próprio.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
