import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Lock,
  Timer,
} from "lucide-react";
import { VALORES_BASE, NOMES_GRAVIDADE, formatarReal, type Gravidade } from "../data/infracoes";

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

const PRESETS: { gravidade: Gravidade; rotulo: string }[] = [
  { gravidade: "leve", rotulo: "Leve" },
  { gravidade: "media", rotulo: "Média" },
  { gravidade: "grave", rotulo: "Grave" },
  { gravidade: "gravissima", rotulo: "Gravíssima" },
];

/** Aceita "293,47", "293.47" ou "1.467,35" e devolve o número, ou null se inválido. */
function parseValorBR(texto: string): number | null {
  let s = texto.trim().replace(/[^\d,.-]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function arredonda(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function CalculadoraDesconto() {
  const [valorTexto, setValorTexto] = useState("");
  const [presetAtivo, setPresetAtivo] = useState<Gravidade | null>(null);

  // Chega com o valor já preenchido quando vem de um link com "?valor=293,47"
  // (ex: a página de uma infração específica), poupando o passo de digitar.
  useEffect(() => {
    const valorParam = new URLSearchParams(window.location.search).get("valor");
    if (valorParam && parseValorBR(valorParam) !== null) {
      setValorTexto(valorParam);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    document.title =
      "Calculadora de desconto de multa: quanto você paga com 20% ou 40% | CheckMulta";

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
      "Calcule o valor da sua multa de trânsito com 20% ou 40% de desconto, conforme o art. 284 do CTB. Entenda a diferença entre os dois — e o que cada um exige. Grátis.";

    setMeta("description", desc);
    setMeta(
      "keywords",
      "calculadora desconto multa, 40% de desconto multa, 20% desconto multa trânsito, desconto multa 293 47, art 284 CTB, SNE desconto multa"
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://checkmulta.com.br/calculadora-desconto-multa");

    setOG("og:title", "Calculadora de desconto de multa de trânsito | CheckMulta");
    setOG("og:description", desc);
    setOG("og:url", "https://checkmulta.com.br/calculadora-desconto-multa");
    setOG("og:type", "website");

    let schema = document.getElementById("calculadora-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("id", "calculadora-schema");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Quanto é 40% de desconto numa multa de R$ 293,47?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "R$ 176,08. É a multa gravíssima (R$ 293,47) com o desconto de 40% do art. 284, § 1º, do CTB, aplicável a quem aderiu ao SNE antes da autuação e desiste de recorrer.",
          },
        },
        {
          "@type": "Question",
          name: "Pagar a multa com desconto tira os pontos da CNH?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Não. Nem o desconto de 20% nem o de 40% afetam a pontuação. Só o acolhimento de um recurso retira os pontos.",
          },
        },
        {
          "@type": "Question",
          name: "Posso pagar com desconto e recorrer depois?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Com o desconto de 20% (pagar até o vencimento), sim — o recurso continua disponível, e o valor pago é devolvido se ele for aceito. Já o desconto de 40% exige declarar, no ato, que você desiste de defesa prévia e de recurso.",
          },
        },
        {
          "@type": "Question",
          name: "Qual artigo do CTB dá o desconto na multa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "O art. 284 do CTB, na redação da Lei 14.599/2023. O caput dá 20% a quem paga até o vencimento. O § 1º dá 40% a quem aderiu ao SNE antes da autuação e desiste de recorrer.",
          },
        },
      ],
    });

    return () => {
      document.title = "CheckMulta — Análise de Multas com IA";
    };
  }, []);

  const valorNum = useMemo(() => parseValorBR(valorTexto), [valorTexto]);

  const com20 = valorNum !== null ? arredonda(valorNum * 0.8) : null;
  const com40 = valorNum !== null ? arredonda(valorNum * 0.6) : null;
  const economia20 = valorNum !== null ? arredonda(valorNum - com20!) : null;
  const economia40 = valorNum !== null ? arredonda(valorNum - com40!) : null;

  function aplicarPreset(gravidade: Gravidade) {
    const base = VALORES_BASE[gravidade];
    setValorTexto(base.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setPresetAtivo(gravidade);
    rastrear("calculadora_preset", { gravidade });
  }

  function editarValor(texto: string) {
    setValorTexto(texto);
    setPresetAtivo(null);
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
            <Link to="/multa-de-transito" className="hover:text-emerald-600">
              Início
            </Link>
            <Link to="/infracao" className="hover:text-emerald-600">
              Infrações
            </Link>
            <Link to="/simulador-pontos" className="hidden hover:text-emerald-600 sm:inline">
              Simulador
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
          <Link to="/multa-de-transito" className="hover:text-emerald-600">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Calculadora de desconto</span>
        </nav>

        <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900 sm:text-[34px] sm:leading-[1.15]">
          Quanto você paga com desconto na multa?
        </h1>
        <p className="mb-4 text-base leading-relaxed text-slate-600">
          O art. 284 do CTB prevê dois descontos diferentes — 20% ou 40% — e cada um exige uma
          coisa distinta. Digite o valor da sua multa e veja os dois lado a lado.
        </p>

        <span className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Cálculo gratuito
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-emerald-600" /> Sem cadastro
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-emerald-600" /> Resultado imediato
          </span>
        </span>

        {/* ENTRADA DE VALOR */}
        <section className="mb-8">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Não sabe o valor exato? Escolha pela gravidade
          </span>
          <div className="mb-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const ativo = presetAtivo === p.gravidade;
              return (
                <button
                  key={p.gravidade}
                  onClick={() => aplicarPreset(p.gravidade)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                    ativo
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  {p.rotulo} · {formatarReal(VALORES_BASE[p.gravidade])}
                </button>
              );
            })}
          </div>

          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ou digite o valor exato da sua multa
          </span>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => editarValor(e.target.value)}
              placeholder="Ex: 293,47"
              aria-label="Valor da multa em reais"
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </section>

        {/* RESULTADO */}
        {valorNum !== null && (
          <section className="mb-10">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Valor original
              </span>
              <span className="text-3xl font-bold tabular-nums text-slate-900">
                {formatarReal(valorNum)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* 20% */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Pagando até o vencimento
                </span>
                <span className="mb-1 block text-3xl font-bold tabular-nums text-emerald-800">
                  {formatarReal(com20!)}
                </span>
                <span className="mb-4 block text-sm text-emerald-700">
                  20% de desconto · economia de {formatarReal(economia20!)}
                </span>
                <div className="flex items-start gap-2 rounded-lg bg-white/70 p-3 text-[13px] leading-relaxed text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Sem cadastro prévio. <strong>Você continua podendo recorrer</strong> — se
                    ganhar, o valor pago volta.
                  </span>
                </div>
              </div>

              {/* 40% */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Com adesão prévia ao SNE
                </span>
                <span className="mb-1 block text-3xl font-bold tabular-nums text-amber-800">
                  {formatarReal(com40!)}
                </span>
                <span className="mb-4 block text-sm text-amber-700">
                  40% de desconto · economia de {formatarReal(economia40!)}
                </span>
                <div className="flex items-start gap-2 rounded-lg bg-white/70 p-3 text-[13px] leading-relaxed text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Só para quem já era cadastrado no SNE antes desta autuação.{" "}
                    <strong>Exige desistir de defesa e recurso.</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* CTA CONTEXTUAL */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-3 text-sm leading-relaxed text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Antes de escolher um desconto, vale conferir uma coisa:
                </strong>{" "}
                se o auto de infração tiver erro formal, cancelar a multa é melhor que qualquer
                desconto — você não paga nada e não leva os pontos.
              </p>
              <Link
                to="/multa-de-transito?analisar=1"
                onClick={() =>
                  rastrear("cta_calculadora_click", { cta_local: "resultado", valor: valorNum })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Analisar minha multa grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* EXPLICAÇÃO */}
        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold text-slate-900 sm:text-[22px]">
            Por que existem dois valores diferentes?
          </h2>
          <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
            O art. 284 do CTB, na redação dada pela Lei 14.599/2023, criou uma diferença
            importante que passa despercebida: o desconto de <strong>40%</strong> não é o
            desconto padrão de quem paga em dia — ele é uma condição à parte, ligada à
            notificação eletrônica.
          </p>

          <div className="my-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Condição</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">20%</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">40%</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">Precisa de cadastro prévio no SNE</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">Não</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">
                    Sim, antes da autuação
                  </td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-600">Mantém direito de recorrer</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">Sim</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">Não</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-slate-600">Prazo</td>
                  <td className="px-4 py-3 text-slate-700">Até o vencimento</td>
                  <td className="px-4 py-3 text-slate-700">Até o vencimento</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-600">Base legal</td>
                  <td className="px-4 py-3 text-slate-700">Art. 284, caput</td>
                  <td className="px-4 py-3 text-slate-700">Art. 284, § 1º</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-600">
              Se você ainda não aderiu ao SNE, o desconto de 40% não está mais disponível para
              uma multa que você já recebeu — a adesão precisa ser anterior à autuação. Nesse
              caso, o desconto de 20% é a opção real, e ele não fecha a porta do recurso.
            </p>
          </div>
        </section>

        {/* AVISO */}
        <div className="mb-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Esta calculadora aplica os percentuais do art. 284 do CTB sobre o valor que você
            informou. Ela não consulta o boleto oficial nem confirma se o seu órgão autuador
            aderiu ao SNE — para isso, consulte a notificação ou o DETRAN do seu estado.
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
                p: "Quanto é 40% de desconto numa multa de R$ 293,47?",
                r: "R$ 176,08. É a multa gravíssima (R$ 293,47) com o desconto de 40% do art. 284, § 1º, do CTB — aplicável só a quem aderiu ao SNE antes da autuação e desiste de recorrer.",
              },
              {
                p: "Pagar a multa com desconto tira os pontos da CNH?",
                r: "Não. Nem o desconto de 20% nem o de 40% afetam a pontuação. Só o acolhimento de um recurso retira os pontos.",
              },
              {
                p: "Posso pagar com desconto e recorrer depois?",
                r: "Com o desconto de 20% (pagar até o vencimento), sim — o recurso continua disponível, e o valor pago é devolvido se ele for aceito. Já o desconto de 40% exige declarar, no ato, que você desiste de defesa prévia e de recurso.",
              },
              {
                p: "Qual artigo do CTB dá o desconto na multa?",
                r: "O art. 284 do CTB, na redação da Lei 14.599/2023. O caput dá 20% a quem paga até o vencimento. O § 1º dá 40% a quem aderiu ao SNE antes da autuação e desiste de recorrer.",
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
            Antes de pagar, veja se a multa tem erro formal
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Envie a foto do auto de infração. Nossa IA verifica os requisitos do art. 280 do
            CTB e aponta o que encontrar. A análise é gratuita e não exige cadastro.
          </p>
          <Link
            to="/multa-de-transito?analisar=1"
            onClick={() => rastrear("cta_calculadora_click", { cta_local: "final" })}
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
            <Link to="/multa-de-transito" className="text-slate-600 transition hover:text-emerald-600">
              Multas de trânsito
            </Link>
            <Link to="/infracao" className="text-slate-600 transition hover:text-emerald-600">
              Consulta de infrações
            </Link>
            <Link to="/simulador-pontos" className="text-slate-600 transition hover:text-emerald-600">
              Simulador de pontos
            </Link>
            <Link to="/blog" className="text-slate-600 transition hover:text-emerald-600">
              Blog
            </Link>
          </nav>

          <p className="mb-2 text-xs leading-relaxed text-slate-400">
            Percentuais de desconto conforme o art. 284 do CTB, com a redação da Lei
            14.599/2023.
          </p>
          <p className="text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>
        </div>
      </footer>
    </div>
  );
}
