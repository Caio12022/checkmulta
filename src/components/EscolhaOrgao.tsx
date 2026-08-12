import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Car, Scale, Droplet, Zap, Leaf, ArrowRight } from "lucide-react";
import { VERTICAIS, type VerticalId } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger);

/**
 * "Quem te autuou?" — o ponto de entrada para cada vertical, no topo da
 * página.
 *
 * Isto já foi uma fita de órgãos correndo de lado, no espírito da faixa de
 * logos do site de referência. A fita foi desfeita por um motivo prático: o
 * alvo se move. Ninguém persegue um link que desliza, e a faixa acabava
 * lida como enfeite — não como "clique aqui para ir à sua área". Como esta
 * é a porta de entrada de cada funil, ambiguidade aqui custa visita.
 *
 * Então virou o que precisa ser: cartões parados, visivelmente clicáveis,
 * com uma linha dizendo o que fazer. A única animação é a entrada em
 * cascata, que não atrapalha o clique.
 *
 * Regra de escrita mantida do início do projeto: em cima a língua de quem
 * recebeu o papel (quem mandou e o que é), embaixo a lei. Quem chega aqui
 * raramente sabe que o documento se chama "auto de infração" — sabe que
 * "levou uma multa do Procon".
 */

const ICONES: Record<
  VerticalId,
  React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>
> = {
  transito: Car,
  procon: Scale,
  vigilancia: Droplet,
  energia: Zap,
  ibama: Leaf,
};

const ROTULOS: Record<VerticalId, { quem: string; oque: string; lei: string }> = {
  transito: {
    quem: "Detran, PRF ou prefeitura",
    oque: "Multa de trânsito",
    lei: "CTB",
  },
  procon: {
    quem: "Procon",
    oque: "Multa por reclamação de cliente",
    lei: "CDC",
  },
  vigilancia: {
    quem: "Vigilância Sanitária",
    oque: "Auto de infração ou interdição",
    lei: "Lei 6.437/77",
  },
  energia: {
    quem: "Companhia de luz",
    oque: "Cobrança retroativa de energia",
    lei: "REN 1.000/2021",
  },
  ibama: {
    quem: "Ibama",
    oque: "Multa ambiental",
    lei: "Decreto 6.514/08",
  },
};

export type EscolhaOrgaoProps = {
  /** Título da seção. Outras páginas de vertical já sabem "quem", e querem
   * vender o cross-sell para as outras áreas — daí o texto ser trocável. */
  titulo?: React.ReactNode;
  subtitulo?: string;
};

export default function EscolhaOrgao({
  titulo = (
    <>
      Quem te <span className="text-emerald-600">autuou?</span>
    </>
  ),
  subtitulo = "Toque no órgão que mandou o papel e vá direto para a análise da sua área.",
}: EscolhaOrgaoProps) {
  const secaoRef = useRef<HTMLElement>(null);
  const cartoesRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduzMovimento) return;

    const cartoes = cartoesRef.current.filter(Boolean);
    if (!cartoes.length) return;

    // fromTo com immediateRender: false, e não gsap.from.
    //
    // gsap.from aplica o estado inicial no ato de criar o tween: se o gatilho
    // não disparar — porque a seção já passou, porque o refresh não veio,
    // porque o GSAP falhou — os cartões ficam em opacity 0 e a porta de
    // entrada de cada vertical simplesmente desaparece. Assim o padrão é
    // estar visível, e a animação é o extra.
    const tween = gsap.fromTo(
      cartoes,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: secaoRef.current, start: "top 90%", once: true },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section ref={secaoRef} className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {titulo}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-stone-600">
            {subtitulo}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VERTICAIS.map((v, i) => {
            const Icone = ICONES[v.id];
            const r = ROTULOS[v.id];
            if (!r) return null;
            return (
              <a
                key={v.id}
                href={v.href}
                ref={(el) => {
                  cartoesRef.current[i] = el;
                }}
                className="group flex flex-col rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
              >
                <span className="mb-3 flex items-center justify-between">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: v.cor.fundoIcone }}
                  >
                    {Icone ? (
                      <Icone
                        className="h-4 w-4"
                        strokeWidth={2}
                        // Cor própria da vertical: o fundo do quadrado é o
                        // tom claro dela, e sem isto o traço herdaria a cor
                        // do texto e sumiria contra esse fundo.
                        style={{ color: v.cor.icone }}
                      />
                    ) : null}
                  </span>
                  <ArrowRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-emerald-700" />
                </span>

                <span className="block text-sm font-semibold leading-snug text-stone-900 group-hover:text-emerald-800">
                  {r.quem}
                </span>
                <span className="mt-1 block text-sm leading-snug text-stone-600">
                  {r.oque}
                </span>
                <span className="mt-3 block font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  {r.lei}
                </span>
              </a>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          Não sabe qual é o seu caso?{" "}
          <a
            href="#areas"
            className="font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-4 transition-colors hover:decoration-emerald-700"
          >
            Veja todas as áreas
          </a>
        </p>
      </div>
    </section>
  );
}
