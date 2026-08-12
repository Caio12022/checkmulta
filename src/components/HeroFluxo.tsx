import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUp, Check, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger);

/**
 * Abertura da Plataforma inspirada na seção hero do auxia.io.
 *
 * NÃO é scroll-driven — é uma animação automática e rápida, que toca uma
 * vez sozinha assim que o bloco entra na tela (a mecânica de "um gesto = um
 * passo" é exclusiva do bloco "Como funciona" logo abaixo, com lógica de
 * interação diferente).
 *
 * Duas peças, uma timeline só:
 * - Linha superior com 4 selos (igual ao "hero_lines"/hero_tag do site de
 *   referência): vai preenchendo e cada selo acende conforme a fase começa.
 * - Corpo: uma caixa flutuante com o passo 1 (hero_step1-wrapper,
 *   position: absolute, por cima) e um painel de 3 colunas lado a lado
 *   (hero_right — hero_step2/3/4) que se acumulam: uma vez revelada, a
 *   coluna anterior continua visível quando a próxima aparece — nada troca
 *   de lugar nem some. Passo 1 e passo 2 (coluna 1) entram JUNTOS.
 *
 * Mapeamento pro CheckMulta:
 *   passo 1 (flutuante) → enviar o documento
 *   coluna 1            → identificar o órgão (checklist, um item de cada vez)
 *   coluna 2            → ler a lei daquele órgão (achado de exemplo, pequeno)
 *   coluna 3            → resultado (achado, card maior — sem prometer êxito:
 *                         regra do projeto, "linguagem de possibilidade")
 *
 * Fica ACIMA da seção de triagem (grade dos 5 órgãos), que continua intacta.
 */

const SOMBRA_CARD = {
  boxShadow:
    "rgba(0,0,0,0.02) 0px 140px 56px, rgba(0,0,0,0.07) 0px 78px 47px, rgba(0,0,0,0.1) 0px 7px 14px, rgba(0,0,0,0.12) 0px 9px 19px",
};

const ETAPAS_STEPPER = ["Enviar", "Identificar órgão", "Ler a lei", "Resultado"];

export default function HeroFluxo() {
  const secaoRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const lineSvgRef = useRef<SVGSVGElement>(null);
  const lineTrackRef = useRef<SVGPathElement>(null);
  const lineFillRef = useRef<SVGPathElement>(null);
  const selosRef = useRef<(HTMLDivElement | null)[]>([]);
  const flutuanteRef = useRef<HTMLDivElement>(null);
  const colIdentificaRef = useRef<HTMLDivElement>(null);
  const colLerLeiRef = useRef<HTMLDivElement>(null);
  const colResultadoRef = useRef<HTMLDivElement>(null);
  const itensChecklistRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const elementosAnimados = [
      flutuanteRef.current,
      colIdentificaRef.current,
      colLerLeiRef.current,
      colResultadoRef.current,
      ...itensChecklistRef.current,
    ];

    if (reduzMovimento) {
      // Estado final direto, sem animação.
      gsap.set(elementosAnimados, { opacity: 1, x: 0, y: 0, filter: "blur(0px)" });
      selosRef.current.forEach((el) => {
        if (el) el.dataset.ativo = "true";
      });
      if (lineFillRef.current) gsap.set(lineFillRef.current, { strokeDashoffset: 0 });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      // Mede a linha do stepper: um traço reto passando pelo centro dos 4 selos.
      const medirLinha = () => {
        const col = stepperRef.current;
        const svg = lineSvgRef.current;
        if (!col || !svg) return;
        const colRect = col.getBoundingClientRect();
        const centros = selosRef.current.map((el) => {
          if (!el) return 0;
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2 - colRect.left;
        });
        const cy = 18;
        const d = `M ${centros[0]} ${cy} L ${centros[centros.length - 1]} ${cy}`;
        svg.setAttribute("viewBox", `0 0 ${colRect.width} 36`);
        lineTrackRef.current?.setAttribute("d", d);
        lineFillRef.current?.setAttribute("d", d);
      };
      medirLinha();
      if (document.fonts?.ready) document.fonts.ready.then(medirLinha);
      window.addEventListener("resize", medirLinha);

      gsap.set(flutuanteRef.current, { opacity: 0, y: 14, filter: "blur(12px)" });
      gsap.set(colIdentificaRef.current, { opacity: 0, y: 14, filter: "blur(12px)" });
      gsap.set([colLerLeiRef.current, colResultadoRef.current], {
        opacity: 0,
        y: 14,
        filter: "blur(12px)",
      });
      gsap.set(itensChecklistRef.current, { opacity: 0, x: -8 });

      const acenderSelo = (i: number) => {
        const el = selosRef.current[i];
        if (el) el.dataset.ativo = "true";
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: secaoRef.current,
          start: "top 85%",
          once: true,
        },
        defaults: { ease: "power2.out" },
      });

      // Passo 1 (caixa flutuante) e passo 2 (checklist) entram juntos — a
      // linha já pula pra metade (cobre os 2 primeiros selos de uma vez).
      tl.call(() => {
        acenderSelo(0);
        acenderSelo(1);
      }, [], 0)
        .to(lineFillRef.current, { strokeDashoffset: 50, duration: 0.5 }, 0)
        .to(
          [flutuanteRef.current, colIdentificaRef.current],
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5 },
          0,
        )
        .to(
          itensChecklistRef.current,
          { opacity: 1, x: 0, duration: 0.22, stagger: 0.05, ease: "power1.out" },
          0.2,
        )
        // Passo 3 se soma.
        .call(() => acenderSelo(2), [], 0.55)
        .to(lineFillRef.current, { strokeDashoffset: 25, duration: 0.4 }, 0.55)
        .to(
          colLerLeiRef.current,
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45 },
          0.55,
        )
        // Passo 4 se soma.
        .call(() => acenderSelo(3), [], 0.9)
        .to(lineFillRef.current, { strokeDashoffset: 0, duration: 0.4 }, 0.9)
        .to(
          colResultadoRef.current,
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45 },
          0.9,
        );

      return () => {
        tl.kill();
        window.removeEventListener("resize", medirLinha);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={secaoRef} className="relative border-b border-stone-200 bg-stone-50">
      {/* Mobile: painel final estático, sem animação. */}
      <div className="mx-auto max-w-md px-5 py-16 md:hidden">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Como a análise funciona
        </p>
        <div
          className="rounded-3xl border border-stone-200 bg-white p-6"
          style={SOMBRA_CARD}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-red-700">
            1 falha encontrada
          </span>
          <p className="mt-4 text-base leading-relaxed text-stone-700">
            Encontramos um possível vício formal no seu documento. Explicamos
            qual é, com o trecho que comprova, antes de qualquer cobrança.
          </p>
        </div>
      </div>

      {/* Desktop/tablet: stepper no topo + caixa flutuante + painel de 3 colunas. */}
      <div className="hidden px-5 py-20 md:block">
        <div className="mx-auto w-full max-w-5xl">
          {/* Stepper horizontal — vai preenchendo conforme a timeline avança */}
          <div ref={stepperRef} className="relative mb-16 flex items-center justify-center gap-3">
            <svg
              ref={lineSvgRef}
              className="pointer-events-none absolute left-0 top-0 h-9 w-full"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path ref={lineTrackRef} stroke="#e7e5e4" strokeWidth={2} fill="none" pathLength={100} />
              <path
                ref={lineFillRef}
                stroke="#059669"
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100}
              />
            </svg>
            {ETAPAS_STEPPER.map((texto, i) => (
              <div
                key={texto}
                ref={(el) => {
                  selosRef.current[i] = el;
                }}
                data-ativo="false"
                className="group relative flex h-9 items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3 transition-colors duration-300 data-[ativo=true]:border-emerald-700 data-[ativo=true]:bg-emerald-700"
              >
                <Zap
                  className="h-3 w-3 text-stone-400 group-data-[ativo=true]:text-white"
                  strokeWidth={2.5}
                />
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 group-data-[ativo=true]:text-white">
                  {texto}
                </span>
              </div>
            ))}
          </div>

          {/* Caixa flutuante + painel de 3 colunas — um bloco só */}
          <div className="relative">
            {/* Caixa flutuante — passo 1 (enviar) */}
            <div ref={flutuanteRef} className="absolute left-0 top-0 z-10 w-64">
              <div
                className="rounded-2xl border border-stone-200 bg-white p-4"
                style={SOMBRA_CARD}
              >
                <p className="text-sm leading-relaxed text-stone-800">
                  Recebi uma multa e não sei se ela tem algum erro. Pode
                  analisar pra mim?
                </p>
                <div className="mt-3 flex justify-end">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </div>

            {/* Painel em 3 colunas — passos 2, 3 e 4, somando-se um ao outro */}
            <div className="flex flex-wrap items-start justify-end gap-6 pt-4">
              <div
                ref={colIdentificaRef}
                className="w-64 rounded-2xl border border-stone-200 bg-white p-4"
                style={SOMBRA_CARD}
              >
                <ul className="space-y-2">
                  {VERTICAIS.map((v, i) => (
                    <li
                      key={v.id}
                      ref={(el) => {
                        itensChecklistRef.current[i] = el;
                      }}
                      className="flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5"
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="text-xs font-medium text-stone-700">
                        {v.titulo}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                ref={colLerLeiRef}
                className="w-56 rounded-2xl border border-stone-200 bg-white p-4"
                style={SOMBRA_CARD}
              >
                <p className="font-mono text-[10px] uppercase tracking-wide text-stone-400">
                  Código de Defesa do Consumidor
                </p>
                <p className="mt-2 inline-block rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                  Sem data de resposta da empresa
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  Verifica se há possibilidade de recurso por falha de forma.
                </p>
              </div>

              {/* Passo 4 — card maior, mais ilustrado (pedido explícito: "como se
                  fosse uma imagem"). Sem quantificar chance de êxito: regra do
                  projeto é nunca prometer resultado, só linguagem de possibilidade. */}
              <div
                ref={colResultadoRef}
                className="w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white"
                style={SOMBRA_CARD}
              >
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800">
                  <ShieldCheck className="h-10 w-10 text-white" strokeWidth={1.5} />
                </div>
                <div className="p-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-red-700">
                    1 falha encontrada
                  </span>
                  <p className="mt-3 text-sm leading-relaxed text-stone-700">
                    Encontramos uma possível brecha legal no seu documento.
                    Explicamos qual é antes de qualquer cobrança.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-5 py-3">
                  <span className="text-xs font-medium text-stone-500">
                    Análise gratuita
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Ver o achado →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
