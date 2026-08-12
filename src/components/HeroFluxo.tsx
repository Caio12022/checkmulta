import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Observer } from "gsap/Observer";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ArrowUp, Check, AlertTriangle } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger, SplitText, Observer, ScrollToPlugin);

/**
 * Abertura da Plataforma inspirada na seção hero do auxia.io: um stepper
 * horizontal no topo (pílulas ligadas por uma linha) e o conteúdo abaixo
 * muda por etapa, com o mesmo mecanismo do bloco "Como funciona"
 * (ver ComoFuncionaScroll.tsx) — um gesto de roda/trackpad/dedo avança um
 * passo por vez, dentro da faixa pinada; nas pontas, o scroll da página
 * segue normal.
 *
 * Fica ACIMA da seção de triagem (grade dos 5 órgãos), que continua intacta
 * — este bloco é só a abertura/demonstração, não substitui o ponto de
 * conversão direta pra cada vertical.
 *
 * Conteúdo ilustrativo, sem prometer resultado (regra do projeto): o passo
 * final mostra o achado, não uma "chance de vencer".
 */

type Etapa = {
  numero: string;
  pilula: string;
};

function PassoEnvio() {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6"
      style={SOMBRA_CARD}
    >
      <p className="text-lg leading-relaxed text-stone-800">
        Recebi uma multa e não sei se ela tem algum erro. Pode analisar pra
        mim?
      </p>
      <div className="mt-5 flex justify-end">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

function PassoIdentifica({
  itemRefs,
}: {
  itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>;
}) {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6"
      style={SOMBRA_CARD}
    >
      <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-stone-400">
        Identificando o órgão
      </p>
      <ul className="space-y-2.5">
        {VERTICAIS.map((v, i) => (
          <li
            key={v.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="flex items-center gap-3 rounded-full border border-stone-200 px-4 py-2.5"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium text-stone-700">
              {v.titulo}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PassoLeLei() {
  const destaque = VERTICAIS.find((v) => v.id === "procon") ?? VERTICAIS[0];
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 sm:grid-cols-2">
      <div
        className="rounded-3xl border border-stone-200 bg-white p-6"
        style={SOMBRA_CARD}
      >
        <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Lendo à luz da lei do órgão
        </p>
        <ul className="space-y-2">
          {VERTICAIS.map((v) => (
            <li
              key={v.id}
              className={
                v.id === destaque.id
                  ? "flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                  : "flex items-center gap-2 rounded-full px-4 py-2 text-sm text-stone-300"
              }
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    v.id === destaque.id ? undefined : "currentColor",
                }}
              />
              {v.titulo}
            </li>
          ))}
        </ul>
      </div>
      <div
        className="rounded-3xl border border-stone-200 bg-white p-6"
        style={SOMBRA_CARD}
      >
        <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-stone-400">
          {destaque.baseLegal}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">
          O que a reclamação diz
        </p>
        <p className="mt-1 inline-block rounded bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800">
          Sem data de resposta da empresa
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          O auto não registra se a empresa teve prazo pra responder antes da
          multa. Pode ser motivo de defesa.
        </p>
      </div>
    </div>
  );
}

function PassoResultado() {
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white"
      style={SOMBRA_CARD}
    >
      <div className="p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-red-700">
          1 falha encontrada
        </span>
        <p className="mt-4 text-base leading-relaxed text-stone-700">
          Encontramos um possível vício formal no seu documento. Explicamos
          qual é, com o trecho que comprova, antes de qualquer cobrança.
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-6 py-4">
        <span className="text-sm font-medium text-stone-500">
          Análise gratuita
        </span>
        <span className="text-sm font-semibold text-emerald-700">
          Ver o achado →
        </span>
      </div>
    </div>
  );
}

const SOMBRA_CARD = {
  boxShadow:
    "rgba(0,0,0,0.02) 0px 140px 56px, rgba(0,0,0,0.07) 0px 78px 47px, rgba(0,0,0,0.1) 0px 7px 14px, rgba(0,0,0,0.12) 0px 9px 19px",
};

const ETAPAS: Etapa[] = [
  { numero: "01", pilula: "Enviar" },
  { numero: "02", pilula: "Identificar órgão" },
  { numero: "03", pilula: "Ler a lei" },
  { numero: "04", pilula: "Resultado" },
];

const INDICE_IDENTIFICA = 1;

export default function HeroFluxo() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pilulaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const painelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const identificaItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const stepperRef = useRef<HTMLDivElement>(null);
  const lineSvgRef = useRef<SVGSVGElement>(null);
  const lineTrackRef = useRef<SVGPathElement>(null);
  const lineFillRef = useRef<SVGPathElement>(null);

  const paineis = [
    <PassoEnvio key="envio" />,
    <PassoIdentifica key="identifica" itemRefs={identificaItemRefs} />,
    <PassoLeLei key="lei" />,
    <PassoResultado key="resultado" />,
  ];

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduzMovimento) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const n = ETAPAS.length;
      let ativo = 0;

      pilulaRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.ativo = i === 0 ? "true" : "false";
      });
      painelRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, {
          opacity: i === 0 ? 1 : 0,
          filter: i === 0 ? "blur(0px)" : "blur(16px)",
          pointerEvents: i === 0 ? "auto" : "none",
        });
      });
      gsap.set(identificaItemRefs.current, { opacity: 0, x: -8 });

      const medirLinha = () => {
        const col = stepperRef.current;
        const svg = lineSvgRef.current;
        if (!col || !svg) return;
        const colRect = col.getBoundingClientRect();
        const centros = pilulaRefs.current.map((el) => {
          if (!el) return 0;
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2 - colRect.left;
        });
        const cy = 22;
        const x0 = centros[0];
        const x1 = centros[centros.length - 1];
        const d = `M ${x0} ${cy} L ${x1} ${cy}`;
        svg.setAttribute("viewBox", `0 0 ${colRect.width} 44`);
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

        pilulaRefs.current.forEach((el, i) => {
          if (!el) return;
          el.dataset.ativo = i === indice ? "true" : "false";
        });

        const painelSaindo = painelRefs.current[anterior];
        const painelEntrando = painelRefs.current[indice];
        if (painelSaindo) {
          gsap.to(painelSaindo, {
            opacity: 0,
            filter: "blur(16px)",
            pointerEvents: "none",
            duration: 0.35,
            ease: "power1.in",
          });
        }
        if (painelEntrando) {
          gsap.fromTo(
            painelEntrando,
            { opacity: 0, filter: "blur(16px)" },
            {
              opacity: 1,
              filter: "blur(0px)",
              pointerEvents: "auto",
              duration: 0.55,
              ease: "power2.out",
            },
          );
        }

        if (indice === INDICE_IDENTIFICA) {
          gsap.fromTo(
            identificaItemRefs.current,
            { opacity: 0, x: -8 },
            {
              opacity: 1,
              x: 0,
              duration: 0.35,
              stagger: 0.09,
              ease: "power1.out",
              delay: 0.15,
            },
          );
        } else if (anterior === INDICE_IDENTIFICA) {
          gsap.set(identificaItemRefs.current, { opacity: 0, x: -8 });
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
        window.removeEventListener("resize", medirLinha);
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
        <PassoResultado />
      </div>

      {/* Desktop/tablet: track alto com stepper horizontal + scroll scrubado. */}
      <div
        ref={trackRef}
        className="relative hidden md:block"
        style={{ height: `${ETAPAS.length * 100}vh` }}
      >
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-5">
          <div className="mx-auto w-full max-w-2xl">
            <div
              ref={stepperRef}
              className="relative mb-14 flex items-center justify-between"
            >
              <svg
                ref={lineSvgRef}
                className="pointer-events-none absolute left-0 top-0 h-11 w-full"
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

              {ETAPAS.map((e, i) => (
                <div
                  key={e.numero}
                  ref={(el) => {
                    pilulaRefs.current[i] = el;
                  }}
                  data-ativo={i === 0 ? "true" : "false"}
                  className="group relative flex items-center gap-2 rounded-full border bg-stone-50 px-4 py-2.5 transition-colors duration-300 data-[ativo=true]:border-emerald-700 data-[ativo=true]:bg-emerald-700 data-[ativo=false]:border-stone-300"
                >
                  <span className="font-mono text-[11px] tracking-widest text-stone-400 group-data-[ativo=true]:text-white">
                    {e.numero}
                  </span>
                  <span className="hidden text-xs font-semibold uppercase tracking-wide text-white sm:group-data-[ativo=true]:inline">
                    {e.pilula}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative h-[420px]">
              {paineis.map((painel, i) => (
                <div
                  key={ETAPAS[i].numero}
                  ref={(el) => {
                    painelRefs.current[i] = el;
                  }}
                  className={
                    i === 0
                      ? "absolute inset-0 flex items-center justify-center"
                      : "absolute inset-0 flex items-center justify-center opacity-0"
                  }
                >
                  {painel}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
