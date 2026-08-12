import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  UploadCloud,
  ScanSearch,
  FileWarning,
  FileCheck2,
  Loader2,
  AlertTriangle,
  Copy,
  Download,
  Check,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger, SplitText, Observer, ScrollToPlugin);

/**
 * Sombra multi-camada do card de referência (auxia.io, .process_image-wrapper),
 * com os deslocamentos/blur reduzidos na mesma proporção da diferença de
 * tamanho do card (lá é ~1630px de largura; aqui é ~500px) — a receita
 * original aplicada sem ajuste ficava praticamente invisível num card menor.
 */
const SOMBRA_CARD = {
  boxShadow:
    "rgba(0,0,0,0.02) 0px 140px 56px, rgba(0,0,0,0.07) 0px 78px 47px, rgba(0,0,0,0.1) 0px 7px 14px, rgba(0,0,0,0.12) 0px 9px 19px",
};

/**
 * Bloco "Como funciona" com transição scrubada por scroll (GSAP + ScrollTrigger).
 *
 * Mecânica (só em telas lg+; abaixo disso vira lista estática empilhada, sem
 * pin nem scrub — pin em mobile costuma travar o scroll e não vale o custo):
 *
 * - Um container alto (N * 100vh) fica "grudado" (position: sticky) no topo.
 *   O progresso de scroll dentro desse container é a fonte da verdade de
 *   tudo: a linha que liga os selos, qual passo está ativo, e o crossfade
 *   do painel visual (ScrollTrigger com scrub, sempre ativo).
 * - Por cima disso, o Observer (também GSAP) intercepta cada gesto de
 *   roda/trackpad/dedo enquanto o mouse está dentro da faixa pinada e troca
 *   um scroll contínuo por um salto animado até o próximo (ou anterior)
 *   passo — um gesto = um passo, nunca uma fração. Fora da faixa, ou no
 *   primeiro/último passo tentando sair pela ponta, o Observer não
 *   intercepta e o scroll da página segue normal.
 * - Passo ativo ganha o selo preenchido e o título nasce letra por letra
 *   (SplitText) a primeira vez que fica ativo. Passos já vistos ficam
 *   revelados e escurecidos; os que ainda não chegaram ficam apagados.
 * - O painel da direita troca de mockup com blur-in, um por etapa.
 *
 * Todo o conteúdo visual é ilustrativo (mockup desenhado, não print do
 * produto) — os textos são placeholder e serão revisados depois.
 */

type Etapa = {
  numero: string;
  Icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titulo: string;
  texto: string;
  legenda: string;
  Mockup: React.ComponentType;
};

export function MockupEnvio() {
  return (
    <div className="flex h-full flex-col justify-center gap-5 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
      style={SOMBRA_CARD}>
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 px-6 py-10 text-center">
        <UploadCloud className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
        <p className="text-sm font-medium text-stone-700">
          Arraste o arquivo aqui ou toque para escolher
        </p>
        <p className="text-xs text-stone-400">Foto ou PDF · sem limite de páginas</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-4 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
          <Check className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-stone-800">
            multa-transito.pdf
          </span>
          <span className="block text-xs text-stone-400">2.1 MB · enviado</span>
        </span>
      </div>
    </div>
  );
}

export function MockupAnalise() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-3 overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
      style={SOMBRA_CARD}>
      <div className="mb-2 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" strokeWidth={2} />
        <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-700">
          Analisando documento
        </span>
      </div>
      {[92, 76, 88, 60, 84, 40].map((w, i) => (
        <div key={i} className="h-3 rounded bg-stone-100" style={{ width: `${w}%` }} />
      ))}
      <div
        className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-emerald-100/0 via-emerald-100/70 to-emerald-100/0"
        style={{ animation: "cf-scan 2.4s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes cf-scan {
          0% { transform: translateY(-20%); }
          50% { transform: translateY(320%); }
          100% { transform: translateY(-20%); }
        }
      `}</style>
    </div>
  );
}

export function MockupAchado() {
  return (
    <div className="flex h-full flex-col justify-center gap-5 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
      style={SOMBRA_CARD}>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-red-700">
        1 falha encontrada
      </span>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">
          Onde a multa foi aplicada
        </p>
        <p className="mt-1 inline-block rounded bg-red-50 px-2 py-1 text-sm font-medium text-red-800">
          Av. Principal, s/n
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Endereço incompleto — sem número nem ponto de referência. Motivo de
          anulação.
        </p>
      </div>
    </div>
  );
}

export function MockupDefesa() {
  return (
    <div className="flex h-full flex-col justify-center gap-5 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"
      style={SOMBRA_CARD}>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        Defesa pronta
      </span>
      <div className="space-y-2">
        <div className="h-3 w-1/3 rounded bg-stone-800" />
        {[100, 96, 88, 100, 70].map((w, i) => (
          <div key={i} className="h-2.5 rounded bg-stone-200" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
          <Copy className="h-3.5 w-3.5" /> Copiar texto
        </span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700">
          <Download className="h-3.5 w-3.5" /> Baixar PDF
        </span>
      </div>
    </div>
  );
}

const ETAPAS: Etapa[] = [
  {
    numero: "01",
    Icone: UploadCloud,
    titulo: "Envie a multa",
    texto:
      "Tire uma foto do papel que você recebeu ou anexe o arquivo. Não precisa criar conta nem informar dados pessoais.",
    legenda: "Envio simples",
    Mockup: MockupEnvio,
  },
  {
    numero: "02",
    Icone: ScanSearch,
    titulo: "A IA analisa o documento",
    texto:
      "Lemos o auto de infração inteiro à luz da lei do órgão que autuou você, procurando falha formal linha por linha.",
    legenda: "Leitura linha por linha",
    Mockup: MockupAnalise,
  },
  {
    numero: "03",
    Icone: FileWarning,
    titulo: "Veja a prévia do achado",
    texto:
      "Mostramos, em português claro, cada erro encontrado — com o trecho do documento que comprova. Sem erro, a gente diz isso também.",
    legenda: "Achado explicado",
    Mockup: MockupAchado,
  },
  {
    numero: "04",
    Icone: FileCheck2,
    titulo: "Receba a defesa pronta",
    texto:
      "Havendo falha, entregamos a peça escrita e formatada, pronta para protocolar no órgão.",
    legenda: "Pronto para protocolar",
    Mockup: MockupDefesa,
  },
];

export default function ComoFuncionaScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stepsColRef = useRef<HTMLDivElement>(null);
  const lineSvgRef = useRef<SVGSVGElement>(null);
  const lineTrackRef = useRef<SVGPathElement>(null);
  const lineFillRef = useRef<SVGPathElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tituloRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const textoRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);
  const legendaRef = useRef<HTMLSpanElement>(null);
  const etapaMobileRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduzMovimento) {
      // Sem o gatilho de scroll, as etapas do celular ficariam apagadas para
      // sempre: o estado inicial delas é fantasma, e quem acende é a
      // animação. Aqui elas já nascem acesas.
      etapaMobileRefs.current.forEach((el) => {
        if (el) el.dataset.solido = "true";
      });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const n = ETAPAS.length;
      const revelados = new Set<number>([0]);
      const splits: (SplitText | null)[] = [];
      let ativo = 0;

      // Estado inicial: passo 0 ativo, textos revelados; demais apagados.
      tituloRefs.current.forEach((el, i) => {
        if (!el) return;
        const split = new SplitText(el, { type: "chars" });
        splits[i] = split;
        gsap.set(split.chars, {
          opacity: i === 0 ? 1 : 0.18,
          y: 0,
          filter: i === 0 ? "blur(0px)" : "blur(2px)",
        });
      });
      badgeRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.ativo = i === 0 ? "true" : "false";
        el.dataset.visto = i === 0 ? "true" : "false";
      });
      textoRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { opacity: i === 0 ? 1 : 0.35 });
      });
      visualRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, {
          opacity: i === 0 ? 1 : 0,
          filter: i === 0 ? "blur(0px)" : "blur(16px)",
        });
      });

      // Linha que liga os selos: um traço reto passando pelo centro do
      // primeiro ao último selo. Medido em pixels reais (não fração fixa),
      // porque a altura de cada passo varia com o tamanho do texto.
      const medirLinha = () => {
        const coluna = stepsColRef.current;
        const svg = lineSvgRef.current;
        if (!coluna || !svg) return;
        const colRect = coluna.getBoundingClientRect();
        const centros = badgeRefs.current.map((el) => {
          if (!el) return 0;
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2 - colRect.top;
        });
        const cx = 22;
        const y0 = centros[0];
        const y1 = centros[centros.length - 1];
        const d = `M ${cx} ${y0} L ${cx} ${y1}`;
        svg.setAttribute("viewBox", `0 0 44 ${colRect.height}`);
        lineTrackRef.current?.setAttribute("d", d);
        lineFillRef.current?.setAttribute("d", d);
      };
      medirLinha();
      if (document.fonts?.ready) {
        document.fonts.ready.then(medirLinha);
      }
      window.addEventListener("resize", medirLinha);

      const aplicarPasso = (indice: number) => {
        if (indice === ativo) return;
        const anterior = ativo;
        ativo = indice;
        revelados.add(indice);

        if (legendaRef.current) {
          gsap.to(legendaRef.current, {
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
              if (legendaRef.current) {
                legendaRef.current.textContent = ETAPAS[indice].legenda;
              }
              gsap.to(legendaRef.current, { opacity: 1, duration: 0.25 });
            },
          });
        }

        badgeRefs.current.forEach((el, i) => {
          if (!el) return;
          el.dataset.ativo = i === indice ? "true" : "false";
          el.dataset.visto = revelados.has(i) ? "true" : "false";
        });

        textoRefs.current.forEach((el, i) => {
          if (!el) return;
          gsap.to(el, {
            opacity: i === indice ? 1 : revelados.has(i) ? 0.55 : 0.35,
            duration: 0.3,
          });
        });

        const split = splits[indice];
        if (split) {
          gsap.fromTo(
            split.chars,
            { opacity: 0.18, y: 4, filter: "blur(2px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.35,
              stagger: 0.014,
              ease: "power1.out",
            },
          );
        }
        splits.forEach((s, i) => {
          if (!s || i === indice) return;
          gsap.to(s.chars, {
            opacity: revelados.has(i) ? 1 : 0.18,
            duration: 0.25,
          });
        });

        const visualSaindo = visualRefs.current[anterior];
        const visualEntrando = visualRefs.current[indice];
        if (visualSaindo) {
          gsap.to(visualSaindo, {
            opacity: 0,
            filter: "blur(16px)",
            duration: 0.35,
            ease: "power1.in",
          });
        }
        if (visualEntrando) {
          gsap.fromTo(
            visualEntrando,
            { opacity: 0, filter: "blur(16px)" },
            { opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "power2.out" },
          );
        }
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
          if (lineFillRef.current) {
            const percentual = Math.min(100, (bruto / n) * 100);
            gsap.set(lineFillRef.current, {
              strokeDashoffset: 100 - percentual,
            });
          }
        },
      });

      // Um gesto = um passo. Enquanto o scroll estiver dentro da faixa
      // pinada (st.isActive), cada roda/trackpad/dedo vira um salto animado
      // até o próximo ponto de parada — não uma fração do scroll natural.
      // Na ponta (primeiro ou último passo) tentando sair, não intercepta:
      // o scroll da página segue seu curso normal.
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

      // Só roda e trackpad. Incluir "touch" aqui era o que travava a página
      // em tela sensível ao toque: cada arrasto virava um salto e o
      // preventDefault comia a rolagem, então a seção animava mas a página
      // não descia. Em toque, o scrub normal já dá conta.
      const obs = Observer.create({
        target: window,
        type: "wheel",
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
        window.removeEventListener("resize", medirLinha);
        splits.forEach((s) => s?.revert());
      };
    });

    mm.add("(max-width: 1023px)", () => {
      const gatilhos = etapaMobileRefs.current.map((el) =>
        el
          ? ScrollTrigger.create({
              trigger: el,
              start: "top 80%",
              once: true,
              onEnter: () => {
                el.dataset.solido = "true";
              },
            })
          : null,
      );
      return () => gatilhos.forEach((g) => g?.kill());
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="como-funciona" className="border-b border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-5 pt-16 sm:pt-20">
        <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Como funciona
        </p>
        <h2 className="font-display mx-auto mb-4 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          Quatro etapas, nessa <span className="text-emerald-600">ordem</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-base leading-relaxed text-stone-600 lg:mb-0">
          Do documento que você recebeu até a defesa pronta para protocolar.
        </p>
      </div>

      {/* Mobile / tablet: lista empilhada, sem pin nem scrub — cada etapa
          sai do fantasma ao entrar na tela, para o bloco não ficar parado
          justo onde entra a maior parte do público. */}
      <div className="mx-auto max-w-2xl px-5 pb-16 lg:hidden">
        <ol className="space-y-10">
          {ETAPAS.map((e, i) => (
            <li
              key={e.numero}
              ref={(el) => {
                etapaMobileRefs.current[i] = el;
              }}
              data-solido="false"
              className="group flex items-center gap-5"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-500 group-data-[solido=false]:border-stone-300 group-data-[solido=false]:bg-stone-50 group-data-[solido=false]:text-stone-300 group-data-[solido=true]:border-emerald-700 group-data-[solido=true]:bg-emerald-700 group-data-[solido=true]:text-white">
                <e.Icone className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs tracking-widest text-emerald-700">
                  {e.numero}
                </span>
                <h3 className="font-display mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  {e.titulo}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-stone-600">
                  {e.texto}
                </p>
                <div className="mt-4 h-56 opacity-40 blur-[2px] transition-all duration-700 group-data-[solido=true]:opacity-100 group-data-[solido=true]:blur-none">
                  <e.Mockup />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Desktop: track alto com painel grudado (sticky) + scroll scrubado. */}
      <div
        ref={trackRef}
        className="relative hidden lg:block"
        style={{ height: `${ETAPAS.length * 100}vh` }}
      >
        <div
          ref={stickyRef}
          className="sticky top-0 flex h-screen items-center overflow-hidden"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 lg:grid-cols-2 xl:gap-16">
            {/* Coluna dos passos, com a linha ligando os selos por trás */}
            <div ref={stepsColRef} className="relative">
              <svg
                ref={lineSvgRef}
                className="pointer-events-none absolute left-0 top-0 h-full w-11"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  ref={lineTrackRef}
                  stroke="#e7e5e4"
                  strokeWidth={2}
                  fill="none"
                  pathLength={100}
                />
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

              <ol className="relative flex flex-col justify-center gap-9">
                {ETAPAS.map((e, i) => (
                  <li key={e.numero} className="flex items-start gap-5">
                    <div
                      ref={(el) => {
                        badgeRefs.current[i] = el;
                      }}
                      data-ativo={i === 0 ? "true" : "false"}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-stone-50 transition-colors duration-300 data-[ativo=true]:border-emerald-700 data-[ativo=true]:bg-emerald-700 data-[ativo=true]:text-white data-[ativo=false]:border-stone-300 data-[ativo=false]:bg-stone-50 data-[ativo=false]:text-stone-300 data-[visto=true]:border-emerald-700 data-[visto=true]:text-emerald-700"
                    >
                      <e.Icone className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 pt-1.5">
                      <span className="font-mono text-xs tracking-widest text-emerald-700">
                        {e.numero}
                      </span>
                      <h3
                        ref={(el) => {
                          tituloRefs.current[i] = el;
                        }}
                        className="font-display mt-1 text-xl font-semibold tracking-tight text-stone-900 xl:text-2xl"
                      >
                        {e.titulo}
                      </h3>
                      <p
                        ref={(el) => {
                          textoRefs.current[i] = el;
                        }}
                        className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600"
                      >
                        {e.texto}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Painel visual */}
            <div className="flex flex-col justify-center">
              <span
                ref={legendaRef}
                className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-700 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-white"
              >
                {ETAPAS[0].legenda}
              </span>
              <div className="relative h-80 xl:h-96">
                {ETAPAS.map((e, i) => (
                  <div
                    key={e.numero}
                    ref={(el) => {
                      visualRefs.current[i] = el;
                    }}
                    className={i === 0 ? "absolute inset-0" : "absolute inset-0 opacity-0"}
                  >
                    <e.Mockup />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-stone-400">
                Ilustração do fluxo. As telas variam conforme a área.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
