import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Lock,
  Timer,
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

type Demonstracao = "sim" | "nao" | "nao-sei";

function parseCiclos(texto: string): number | null {
  const n = parseInt(texto.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Soma dias corridos a uma data no formato "AAAA-MM-DD" e devolve a data resultante. */
function somarDias(dataISO: string, dias: number): Date | null {
  if (!dataISO) return null;
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CalculadoraToi() {
  const [ciclosTexto, setCiclosTexto] = useState("");
  const [demonstracao, setDemonstracao] = useState<Demonstracao | null>(null);
  const [dataRecebimento, setDataRecebimento] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);

    document.title =
      "Calculadora do TOI: o período cobrado está dentro do limite legal? | CheckMulta";

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
      "Veja se o período cobrado no seu TOI (recuperação de consumo) respeita o limite da Resolução ANEEL 1.000/2021: 6 ciclos sem demonstração técnica, 36 ciclos no teto geral. Calcule também o prazo para pedir perícia. Grátis.";

    setMeta("description", desc);
    setMeta(
      "keywords",
      "calculadora TOI, período cobrado TOI, 6 ciclos recuperação de consumo, teto 36 ciclos ANEEL, prazo perícia medidor, art 596 resolução 1000"
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/energia/calculadora-toi");

    setOG("og:title", "Calculadora do TOI: o período cobrado está dentro do limite? | CheckMulta");
    setOG("og:description", desc);
    setOG("og:url", "https://checkmulta.com.br/energia/calculadora-toi");
    setOG("og:type", "website");

    let schema = document.getElementById("calculadora-toi-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "calculadora-toi-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Quantos ciclos a distribuidora pode cobrar no TOI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Até 6 ciclos (6 meses) para trás, se o início da irregularidade não for demonstrado tecnicamente — art. 596, § 1º, da Resolução ANEEL 1.000/2021. Com demonstração técnica do marco inicial, o período pode ser maior, mas nunca passa de 36 ciclos, que é o teto geral.",
          },
        },
        {
          "@type": "Question",
          name: "Quantos dias eu tenho para pedir perícia no medidor após receber o TOI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "15 dias, contados do recebimento do TOI. Se esse prazo passar, você perde o direito à perícia, mas os defeitos formais e de cálculo do TOI continuam valendo como argumento — a contestação segue possível na distribuidora, na ANEEL e na Justiça.",
          },
        },
        {
          "@type": "Question",
          name: "Meu TOI cobra 36 meses, isso é normal?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "É o defeito mais comum nesse tipo de cobrança: período longo sem demonstração de quando a irregularidade começou. Sem essa demonstração técnica, o período deveria estar limitado a 6 ciclos, não a 36.",
          },
        },
      ],
    });

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, []);

  const ciclos = useMemo(() => parseCiclos(ciclosTexto), [ciclosTexto]);

  const diagnostico = useMemo(() => {
    if (ciclos === null) return null;
    if (ciclos > 36) {
      return {
        nivel: "acima" as const,
        titulo: "Acima do teto geral",
        texto:
          "36 ciclos é o limite máximo previsto no art. 596, mesmo quando a distribuidora demonstra tecnicamente o início da irregularidade. Cobrar mais que isso não tem amparo — independentemente de qualquer comprovação.",
      };
    }
    if (ciclos > 6 && demonstracao !== "sim") {
      return {
        nivel: "provavel" as const,
        titulo: "Provavelmente acima do limite",
        texto:
          "Sem demonstração técnica de quando a irregularidade começou, o art. 596, § 1º, limita a cobrança a 6 ciclos. Cobrar mais que isso exige que a distribuidora comprove tecnicamente o marco inicial — vale conferir se essa demonstração está mesmo no documento, ou se é só uma alegação genérica.",
      };
    }
    if (ciclos > 6 && demonstracao === "sim") {
      return {
        nivel: "conferir" as const,
        titulo: "Pode ser válido — mas confira a demonstração",
        texto:
          "Período acima de 6 ciclos só é válido se a distribuidora demonstrar tecnicamente quando a irregularidade começou (data, memória de cálculo, análise de histórico de consumo). Reveja se essa demonstração é concreta, e não apenas uma frase genérica no TOI.",
      };
    }
    return {
      nivel: "dentro" as const,
      titulo: "Dentro do limite padrão",
      texto:
        "6 ciclos ou menos é o teto que vale mesmo sem demonstração técnica. O período em si não caracteriza esse defeito específico — mas o TOI pode ter outros vícios de forma ou de cálculo.",
    };
  }, [ciclos, demonstracao]);

  const prazoPericia = useMemo(() => {
    const limite = somarDias(dataRecebimento, 15);
    if (!limite) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    limite.setHours(0, 0, 0, 0);
    return { data: limite, vencido: limite < hoje };
  }, [dataRecebimento]);

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/energia" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/energia" className="hover:text-amber-600">
              Início
            </Link>
            <Link to="/energia/blog" className="hover:text-amber-600">
              Blog
            </Link>
            <Link to="/multa-de-transito" className="hidden hover:text-amber-600 sm:inline">
              Trânsito
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-8">
        {/* BREADCRUMB */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-slate-500">
          <Link to="/energia" className="hover:text-amber-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Calculadora do TOI</span>
        </nav>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
          O período cobrado no seu TOI está dentro do limite?
        </h1>
        <p className="mb-4 text-base leading-relaxed text-slate-600">
          A Resolução ANEEL 1.000/2021 limita quanto tempo para trás a distribuidora pode
          cobrar numa recuperação de consumo. Informe quantos ciclos aparecem no seu TOI e
          veja se o período respeita o limite.
        </p>

        <span className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-600" /> Cálculo gratuito
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-amber-600" /> Sem cadastro
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-amber-600" /> Resultado imediato
          </span>
        </span>

        {/* FERRAMENTA 1: PERÍODO */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Período cobrado</h2>
          <span className="mb-4 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Quantos ciclos (meses) de cobrança retroativa aparecem no seu TOI?
          </span>
          <div className="relative mb-4">
            <Zap className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              value={ciclosTexto}
              onChange={(e) => setCiclosTexto(e.target.value)}
              placeholder="Ex: 36"
              aria-label="Quantidade de ciclos cobrados no TOI"
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {ciclos !== null && ciclos > 6 && (
            <div className="mb-4">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                O TOI demonstra tecnicamente quando a irregularidade começou (data exata,
                memória de cálculo, análise de histórico)?
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["sim", "Sim, demonstra"],
                    ["nao", "Não demonstra"],
                    ["nao-sei", "Não sei"],
                  ] as [Demonstracao, string][]
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    onClick={() => {
                      setDemonstracao(valor);
                      rastrear("calculadora_toi_demonstracao", { valor });
                    }}
                    className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                      demonstracao === valor
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {diagnostico && (
            <div
              className={`rounded-xl border p-5 ${
                diagnostico.nivel === "dentro"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : diagnostico.nivel === "conferir"
                  ? "border-amber-200 bg-amber-50/60"
                  : "border-red-200 bg-red-50/60"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                {diagnostico.nivel === "dentro" ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                )}
                <span
                  className={`text-base font-bold ${
                    diagnostico.nivel === "dentro" ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {diagnostico.titulo}
                </span>
              </div>
              <p className="text-[14.5px] leading-relaxed text-slate-700">{diagnostico.texto}</p>
            </div>
          )}
        </section>

        {/* FERRAMENTA 2: PRAZO DE PERÍCIA */}
        <section className="mb-10 border-t border-slate-100 pt-8">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Prazo para pedir perícia</h2>
          <span className="mb-4 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Data em que você recebeu o TOI
          </span>
          <input
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            aria-label="Data de recebimento do TOI"
            className="mb-4 w-full rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-base text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 sm:w-64"
          />

          {prazoPericia && (
            <div
              className={`rounded-xl border p-5 ${
                prazoPericia.vencido
                  ? "border-slate-200 bg-slate-50"
                  : "border-emerald-200 bg-emerald-50/60"
              }`}
            >
              <p className="text-[14.5px] leading-relaxed text-slate-700">
                {prazoPericia.vencido ? (
                  <>
                    O prazo de 15 dias para pedir a perícia do medidor venceu em{" "}
                    <strong className="font-semibold text-slate-900">
                      {formatarData(prazoPericia.data)}
                    </strong>
                    . Isso tira o direito à perícia, mas{" "}
                    <strong className="font-semibold text-slate-900">
                      não encerra a sua defesa
                    </strong>
                    : os defeitos formais e de cálculo do TOI continuam valendo como
                    argumento, e a contestação segue possível na distribuidora, na ANEEL e
                    na Justiça.
                  </>
                ) : (
                  <>
                    Você tem até{" "}
                    <strong className="font-semibold text-emerald-800">
                      {formatarData(prazoPericia.data)}
                    </strong>{" "}
                    para pedir a verificação ou perícia metrológica do medidor no INMETRO ou
                    órgão delegado.
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* CTA CONTEXTUAL */}
        {(diagnostico || prazoPericia) && (
          <div className="mb-10 rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm leading-relaxed text-slate-700">
              <strong className="font-semibold text-slate-900">
                Período e prazo são só uma parte do TOI.
              </strong>{" "}
              Formalidades da inspeção, memória de cálculo e o critério usado também podem
              ter falha. Nossa IA lê o documento inteiro e aponta o que encontrar, de graça.
            </p>
            <Link
              to="/energia?analisar=1"
              onClick={() =>
                rastrear("cta_calculadora_toi_click", { cta_local: "resultado", ciclos })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Analisar meu TOI grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* EXPLICAÇÃO */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            De onde vêm esses limites
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            A Resolução ANEEL 1.000/2021 regula a recuperação de consumo — quando a
            distribuidora identifica uma irregularidade no medidor e cobra retroativamente
            pela energia que entende não ter sido medida corretamente.
          </p>

          <div className="my-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Regra</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Limite
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Base legal
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">
                    Sem demonstração técnica do início
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">6 ciclos</td>
                  <td className="px-4 py-3 text-slate-700">Art. 596, § 1º</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-600">Teto geral, mesmo com demonstração</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">36 ciclos</td>
                  <td className="px-4 py-3 text-slate-700">Art. 596</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">Prazo para pedir perícia</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">15 dias</td>
                  <td className="px-4 py-3 text-slate-700">Art. 591</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-600">
              "Demonstração técnica" significa uma memória de cálculo real — data em que a
              irregularidade teria começado, com base em quê. Uma frase genérica do tipo "a
              irregularidade persiste há 36 meses", sem explicar como esse número foi
              apurado, não conta como demonstração.
            </p>
          </div>
        </section>

        {/* AVISO */}
        <div className="mb-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Esta calculadora aplica os limites da Resolução ANEEL 1.000/2021 sobre o que
            você informou. Ela não substitui a leitura do seu TOI nem garante que a
            distribuidora vá aceitar a contestação — para isso, o caminho é a reclamação
            formal na distribuidora e, se necessário, na ANEEL.
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
                p: "Quantos ciclos a distribuidora pode cobrar no TOI?",
                r: "Até 6 ciclos (6 meses) para trás, se o início da irregularidade não for demonstrado tecnicamente — art. 596, § 1º. Com demonstração técnica do marco inicial, o período pode ser maior, mas nunca passa de 36 ciclos, que é o teto geral.",
              },
              {
                p: "Quantos dias eu tenho para pedir perícia no medidor?",
                r: "15 dias, contados do recebimento do TOI. Se o prazo passar, você perde o direito à perícia, mas os defeitos formais e de cálculo do TOI continuam valendo como argumento — a contestação segue possível na distribuidora, na ANEEL e na Justiça.",
              },
              {
                p: "Meu TOI cobra 36 meses, isso é normal?",
                r: "É o defeito mais comum nesse tipo de cobrança: período longo sem demonstração de quando a irregularidade começou. Sem essa demonstração técnica, o período deveria estar limitado a 6 ciclos, não a 36.",
              },
            ].map((f, i) => (
              <details
                key={i}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15.5px] font-semibold text-slate-800 hover:text-amber-700">
                  {f.p}
                  <span className="ml-3 flex-shrink-0 text-lg text-amber-600 transition-transform group-open:rotate-45">
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
            Antes de contestar, veja o que mais o TOI pode ter de errado
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Envie a foto ou o PDF do TOI. Nossa IA verifica as formalidades da inspeção, o
            critério de cálculo e o período cobrado, e aponta o que encontrar. Análise
            gratuita, sem cadastro.
          </p>
          <Link
            to="/energia?analisar=1"
            onClick={() => rastrear("cta_calculadora_toi_click", { cta_local: "final" })}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Analisar meu TOI grátis
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
            <Link to="/energia" className="text-slate-600 transition hover:text-amber-600">
              Cobrança de energia
            </Link>
            <Link to="/energia/blog" className="text-slate-600 transition hover:text-amber-600">
              Blog
            </Link>
            <Link
              to="/multa-de-transito"
              className="text-slate-600 transition hover:text-amber-600"
            >
              Multas de trânsito
            </Link>
          </nav>

          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Limites de período conforme os art. 591 e 596 da Resolução ANEEL nº 1.000/2021.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
