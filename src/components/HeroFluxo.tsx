import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ArrowUp, Check, AlertTriangle, Zap } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger, Observer, ScrollToPlugin);

/**
 * Abertura da Plataforma inspirada na seção hero do auxia.io.
 *
 * Estrutura real do site de referência (conferida no HTML salvo, não só
 * "de olho"): NÃO é uma troca de tela cheia por tela cheia. É uma caixa
 * flutuante (hero_step1-wrapper, position: absolute, por cima) com o
 * primeiro passo, e um painel em 3 colunas lado a lado (hero_right, display
 * flex em row — hero_step2 / hero_step3 / hero_step4) que revela as colunas
 * progressivamente e de forma CUMULATIVA: a coluna já revelada continua
 * visível quando a próxima aparece. O Chrome não salva o JS de um .mht
 * (só HTML/CSS), então a timeline exata não pôde ser copiada — a mecânica
 * de scroll abaixo (ScrollTrigger com scrub + Observer, mesmo motor do
 * bloco "Como funciona") foi refeita com base na estrutura confirmada.
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
      data-ativo="false"
      className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 transition-colors duration-300 data-[ativo=true]:border-emerald-700 data-[ativo=true]:bg-emerald-700 data-[ativo=true]:text-white"
    >
      <Zap className="h-3 w-3" strokeWidth={2.5} />
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {texto}
      </span>
    </div>
  );
}

export default function HeroFluxo() {
  const trackRef = useRef<HTMLDivElement>(null);
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
    if (reduzMovimento) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const n = 4;

      // Estado inicial: só a caixa flutuante (passo 1) visível.
      gsap.set(flutuanteRef.current, { opacity: 1, filter: "blur(0px)" });
      gsap.set([colIdentificaRef.current, colLerLeiRef.current, colResultadoRef.current], {
        opacity: 0,
        y: 14,
        filter: "blur(12px)",
      });
      gsap.set(itensChecklistRef.current, { opacity: 0, x: -8 });
      if (pilulaEnviarRef.current) pilulaEnviarRef.current.dataset.ativo = "true";

      let ativo = 0;
      const aplicarPasso = (indice: number) => {
        if (indice === ativo) return;
        ativo = indice;

        if (pilulaEnviarRef.current) {
          pilulaEnviarRef.current.dataset.ativo = indice === 0 ? "true" : "false";
        }
        if (pilulaIdentificaRef.current) {
          pilulaIdentificaRef.current.dataset.ativo = indice === 1 ? "true" : "false";
        }
        if (pilulaLerLeiRef.current) {
          pilulaLerLeiRef.current.dataset.ativo = indice === 2 ? "true" : "false";
        }
        if (pilulaResultadoRef.current) {
          pilulaResultadoRef.current.dataset.ativo = indice === 3 ? "true" : "false";
        }

        // Caixa flutuante some assim que o passo 2 começa — nunca mais volta,
        // igual ao site de referência (o painel de colunas toma o lugar dela).
        if (indice >= 1) {
          gsap.to(flutuanteRef.current, {
            opacity: 0,
            filter: "blur(10px)",
            y: -10,
            duration: 0.45,
            ease: "power1.in",
          });
        } else {
          gsap.to(flutuanteRef.current, {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            duration: 0.4,
          });
        }

        // Cada coluna, uma vez revelada, permanece — reveal cumulativo,
        // não troca de tela.
        const revelar = (el: HTMLDivElement | null) => {
          if (!el) return;
          gsap.to(el, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.55,
            ease: "power2.out",
          });
        };
        const esconder = (el: HTMLDivElement | null) => {
          if (!el) return;
          gsap.to(el, {
            opacity: 0,
            y: 14,
            filter: "blur(12px)",
            duration: 0.3,
          });
        };

        if (indice >= 1) {
          revelar(colIdentificaRef.current);
          if (indice === 1) {
            gsap.fromTo(
              itensChecklistRef.current,
              { opacity: 0, x: -8 },
              { opacity: 1, x: 0, duration: 0.3, stagger: 0.08, ease: "power1.out", delay: 0.15 },
            );
          }
        } else {
          esconder(colIdentificaRef.current);
          gsap.set(itensChecklistRef.current, { opacity: 0, x: -8 });
        }

        if (indice >= 2) revelar(colLerLeiRef.current);
        else esconder(colLerLeiRef.current);

        if (indice >= 3) revelar(colResultadoRef.current);
        else esconder(colResultadoRef.current);
      };

      const st = ScrollTrigger.create({
        trigger: trackRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        onUpdate: (self) => {
          const bruto = self.progress * n;
          const indice = Math.min(n - 1, Math.floor(bruto));
          aplicarPasso(indice);
        },
      });

      let animandoSalto = false;
      const irParaPasso = (indiceAlvo: number) => {
        animandoSalto = true;
        const alvoProgresso = indiceAlvo / (n - 1);
        const alvoY = st.start + alvoProgresso * (st.end - st.start);
        gsap.to(window, {
          scrollTo: { y: alvoY, autoKill: false },
          duration: 0.65,
          ease: "power2.inOut",
          onComplete: () => {
            animandoSalto = false;
          },
        });
      };

      const obs = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        tolerance: 8,
        preventDefault: false,
        onDown: (self) => tentarSalto(self, 1),
        onUp: (self) => tentarSalto(self, -1),
      });

      function tentarSalto(self: Observer, direcao: 1 | -1) {
        if (!st.isActive) return;
        if (animandoSalto) {
          self.event?.preventDefault?.();
          return;
        }
        const indiceAtual = Math.round(st.progress * (n - 1));
        const indiceAlvo = indiceAtual + direcao;
        if (indiceAlvo < 0 || indiceAlvo > n - 1) return;
        self.event?.preventDefault?.();
        irParaPasso(indiceAlvo);
      }

      return () => {
        st.kill();
        obs.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="relative border-b border-stone-200 bg-stone-50">
      {/* Mobile: painel final estático, sem pin nem scrub. */}
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

      {/* Desktop/tablet: track alto com painel grudado (sticky) + scroll scrubado. */}
      <div ref={trackRef} className="relative hidden md:block" style={{ height: "400vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-5">
          <div className="relative mx-auto w-full max-w-5xl">
            {/* Caixa flutuante — passo 1 (enviar) */}
            <div
              ref={flutuanteRef}
              className="absolute left-0 top-0 z-10 w-64"
            >
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

            {/* Painel em 3 colunas — passos 2, 3 e 4, revelados de forma cumulativa */}
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
      </div>
    </section>
  );
}
