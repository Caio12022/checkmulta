import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUp, Check, AlertTriangle, Zap } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger);

/**
 * Abertura da Plataforma inspirada na seção hero do auxia.io.
 *
 * NÃO é scroll-driven — é uma animação automática e rápida, que toca uma
 * vez sozinha assim que o bloco entra na tela (igual ao hero de referência:
 * um demo que se anima por conta própria, não uma seção pinada que só anda
 * com o scroll do usuário — essa mecânica de "um gesto = um passo" é do
 * bloco "Como funciona" logo abaixo, não deste).
 *
 * Estrutura (conferida no HTML salvo do site — o .mht não guarda o JS
 * externo, só HTML/CSS, então a timeline exata não pôde ser copiada, mas a
 * estrutura sim): um bloco só, não duas peças separadas. Uma caixa
 * flutuante com o primeiro passo (hero_step1-wrapper, position: absolute,
 * por cima) e um painel de 3 colunas lado a lado (hero_right — hero_step2/
 * 3/4). Passo 1 e passo 2 entram JUNTOS, ao mesmo tempo; os passos 3 e 4
 * entram depois, cada um se somando ao que já está na tela — nada troca de
 * lugar nem some.
 *
 * Mapeamento pro CheckMulta:
 *   passo 1 (flutuante) → enviar o documento
 *   coluna 1            → identificar o órgão (checklist)
 *   coluna 2            → ler a lei daquele órgão (achado de exemplo)
 *   coluna 3            → resultado (achado, sem prometer sucesso)
 *
 * Fica ACIMA da seção de triagem (grade dos 5 órgãos), que continua intacta.
 */

const SOMBRA_CARD = {
  boxShadow:
    "rgba(0,0,0,0.02) 0px 140px 56px, rgba(0,0,0,0.07) 0px 78px 47px, rgba(0,0,0,0.1) 0px 7px 14px, rgba(0,0,0,0.12) 0px 9px 19px",
};

function Pilula({ texto, ativoRef }: { texto: string; ativoRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={ativoRef}
      className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-white"
    >
      <Zap className="h-3 w-3" strokeWidth={2.5} />
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {texto}
      </span>
    </div>
  );
}

export default function HeroFluxo() {
  const secaoRef = useRef<HTMLDivElement>(null);
  const flutuanteRef = useRef<HTMLDivElement>(null);
  const pilulaEnviarRef = useRef<HTMLDivElement>(null);
  const pilulaIdentificaRef = useRef<HTMLDivElement>(null);
  const pilulaLerLeiRef = useRef<HTMLDivElement>(null);
  const pilulaResultadoRef = useRef<HTMLDivElement>(null);
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
      // Estado final direto, sem animação — os pontos de partida (opacity:0
      // etc.) só são aplicados no ramo animado logo abaixo.
      gsap.set(elementosAnimados, { opacity: 1, x: 0, y: 0, filter: "blur(0px)" });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      gsap.set(flutuanteRef.current, { opacity: 0, y: 14, filter: "blur(12px)" });
      gsap.set(colIdentificaRef.current, { opacity: 0, y: 14, filter: "blur(12px)" });
      gsap.set([colLerLeiRef.current, colResultadoRef.current], {
        opacity: 0,
        y: 14,
        filter: "blur(12px)",
      });
      gsap.set(itensChecklistRef.current, { opacity: 0, x: -8 });
      gsap.set(
        [
          pilulaEnviarRef.current,
          pilulaIdentificaRef.current,
          pilulaLerLeiRef.current,
          pilulaResultadoRef.current,
        ],
        { opacity: 0 },
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: secaoRef.current,
          start: "top 85%",
          once: true,
        },
        defaults: { ease: "power2.out" },
      });

      // Passo 1 (caixa flutuante) e passo 2 (checklist) entram juntos.
      tl.to(
        [pilulaEnviarRef.current, pilulaIdentificaRef.current],
        { opacity: 1, duration: 0.3 },
        0,
      )
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
        .to(pilulaLerLeiRef.current, { opacity: 1, duration: 0.25 }, 0.55)
        .to(
          colLerLeiRef.current,
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45 },
          0.55,
        )
        // Passo 4 se soma.
        .to(pilulaResultadoRef.current, { opacity: 1, duration: 0.25 }, 0.9)
        .to(
          colResultadoRef.current,
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45 },
          0.9,
        );

      return () => {
        tl.kill();
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

      {/* Desktop/tablet: um bloco só, caixa flutuante + painel de 3 colunas. */}
      <div className="hidden px-5 py-20 md:block">
        <div className="relative mx-auto w-full max-w-5xl">
          {/* Caixa flutuante — passo 1 (enviar) */}
          <div ref={flutuanteRef} className="absolute left-0 top-0 z-10 w-64">
            <Pilula texto="Enviar" ativoRef={pilulaEnviarRef} />
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
          <div className="flex flex-wrap justify-end gap-6 pt-36">
            <div ref={colIdentificaRef} className="w-64">
              <Pilula texto="Identificar órgão" ativoRef={pilulaIdentificaRef} />
              <div
                className="rounded-2xl border border-stone-200 bg-white p-4"
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
            </div>

            <div ref={colLerLeiRef} className="w-64">
              <Pilula texto="Ler a lei" ativoRef={pilulaLerLeiRef} />
              <div
                className="rounded-2xl border border-stone-200 bg-white p-4"
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
                  O auto não registra se a empresa teve prazo pra responder
                  antes da multa.
                </p>
              </div>
            </div>

            <div ref={colResultadoRef} className="w-64">
              <Pilula texto="Resultado" ativoRef={pilulaResultadoRef} />
              <div
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                style={SOMBRA_CARD}
              >
                <div className="p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-red-700">
                    1 falha encontrada
                  </span>
                  <p className="mt-3 text-xs leading-relaxed text-stone-700">
                    Encontramos um possível vício formal, explicado antes de
                    qualquer cobrança.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-2.5">
                  <span className="text-[11px] font-medium text-stone-500">
                    Grátis
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Ver →
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
