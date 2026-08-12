import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Versão genérica do caminho serpenteando de CaminhoVerticais.tsx — mesma
 * mecânica (traço desenhado pelo scroll, pílula, cartão fantasma→sólido),
 * parametrizada por "passos" em vez de amarrada às 5 verticais.
 *
 * Existe como componente irmão, não como refator de CaminhoVerticais: aquele
 * já está em produção e testado, e arriscar os dois numa reescrita genérica
 * custaria mais do que copiar a geometria (que é a parte difícil) e trocar
 * o conteúdo (que é a parte fácil).
 *
 * Pensado para o "como funciona" de uma vertical (3-5 passos do processo),
 * não para linkar para outra página — por isso não tem botão/href no
 * cartão, diferente de CaminhoVerticais.
 */

export type PassoCaminho = {
  Icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Rótulo curto sobre a linha, ex. "Passo 1". */
  tag: string;
  /** Texto dentro da pílula. */
  rotulo: string;
  /** Título do cartão. */
  titulo: string;
  /** Corpo do cartão. */
  texto: string;
};

const ALTURA_PARADA = 440;
const AMPLITUDE = 265;
const RAIO = 30;
const LARGURA_CARTAO = 380;
const LARGURA = 1120;

function montarCaminho(paradas: number, largura: number) {
  const meio = largura / 2;
  const partes: string[] = [`M ${meio} 0`];
  let y = 0;

  for (let i = 0; i < paradas; i++) {
    const paraDireita = i % 2 === 0;
    const destino = meio + (paraDireita ? AMPLITUDE : -AMPLITUDE);
    const sentido = paraDireita ? 1 : -1;
    const descidaAntes = ALTURA_PARADA * 0.45;
    const descidaDepois = ALTURA_PARADA * 0.55;

    partes.push(`L ${meio} ${y + descidaAntes - RAIO}`);
    partes.push(
      `Q ${meio} ${y + descidaAntes} ${meio + sentido * RAIO} ${y + descidaAntes}`,
    );
    partes.push(`L ${destino - sentido * RAIO} ${y + descidaAntes}`);
    partes.push(
      `Q ${destino} ${y + descidaAntes} ${destino} ${y + descidaAntes + RAIO}`,
    );
    partes.push(`L ${destino} ${y + descidaAntes + descidaDepois - RAIO}`);
    partes.push(
      `Q ${destino} ${y + ALTURA_PARADA} ${destino - sentido * RAIO} ${y + ALTURA_PARADA}`,
    );
    partes.push(`L ${meio + sentido * RAIO} ${y + ALTURA_PARADA}`);
    partes.push(
      `Q ${meio} ${y + ALTURA_PARADA} ${meio} ${y + ALTURA_PARADA + RAIO}`,
    );

    y += ALTURA_PARADA;
  }

  const sobra = 46;
  partes.push(`L ${meio} ${y + sobra}`);
  return { d: partes.join(" "), altura: y + sobra };
}

export default function CaminhoPassos({
  tagSecao,
  titulo,
  subtitulo,
  passos,
  corDestaque = "text-emerald-600",
}: {
  tagSecao: string;
  titulo: React.ReactNode;
  subtitulo: string;
  passos: PassoCaminho[];
  corDestaque?: string;
}) {
  const secaoRef = useRef<HTMLDivElement>(null);
  const tracoRef = useRef<SVGPathElement>(null);
  const paradaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trilhoMobileRef = useRef<HTMLDivElement>(null);
  const paradaMobileRefs = useRef<(HTMLLIElement | null)[]>([]);

  const { d: caminho, altura: alturaTotal } = montarCaminho(
    passos.length,
    LARGURA,
  );

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduzMovimento) {
      [...paradaRefs.current, ...paradaMobileRefs.current].forEach((el) => {
        if (el) el.dataset.solido = "true";
      });
      if (tracoRef.current) gsap.set(tracoRef.current, { strokeDashoffset: 0 });
      if (trilhoMobileRef.current) {
        gsap.set(trilhoMobileRef.current, { height: "100%" });
      }
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1280px)", () => {
      gsap.set(tracoRef.current, { strokeDashoffset: 100 });

      const st = ScrollTrigger.create({
        trigger: secaoRef.current,
        start: "top 65%",
        end: "bottom 85%",
        scrub: 0.5,
        onUpdate: (self) => {
          gsap.set(tracoRef.current, {
            strokeDashoffset: 100 - self.progress * 100,
          });
        },
      });

      const gatilhos = paradaRefs.current.map((el) =>
        el
          ? ScrollTrigger.create({
              trigger: el,
              start: "top 78%",
              once: true,
              onEnter: () => {
                el.dataset.solido = "true";
              },
            })
          : null,
      );

      return () => {
        st.kill();
        gatilhos.forEach((g) => g?.kill());
      };
    });

    mm.add("(max-width: 1279px)", () => {
      const st = ScrollTrigger.create({
        trigger: secaoRef.current,
        start: "top 70%",
        end: "bottom 90%",
        scrub: 0.5,
        onUpdate: (self) => {
          if (trilhoMobileRef.current) {
            gsap.set(trilhoMobileRef.current, {
              height: `${self.progress * 100}%`,
            });
          }
        },
      });

      const gatilhos = paradaMobileRefs.current.map((el) =>
        el
          ? ScrollTrigger.create({
              trigger: el,
              start: "top 82%",
              once: true,
              onEnter: () => {
                el.dataset.solido = "true";
              },
            })
          : null,
      );

      return () => {
        st.kill();
        gatilhos.forEach((g) => g?.kill());
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={secaoRef}
      className="relative overflow-hidden border-b border-stone-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-5 pt-16 sm:pt-20">
        <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-stone-400">
          {tagSecao}
        </p>
        <h2 className="font-display mx-auto mb-4 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          {titulo}
        </h2>
        <p className="mx-auto max-w-xl text-center text-base leading-relaxed text-stone-600">
          {subtitulo}
        </p>
      </div>

      {/* Desktop: caminho serpenteando, desenhado conforme rola. */}
      <div className="relative hidden pb-24 pt-16 xl:block">
        <svg
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2"
          width={LARGURA}
          height={alturaTotal}
          viewBox={`0 0 ${LARGURA} ${alturaTotal}`}
          fill="none"
          aria-hidden="true"
        >
          <path d={caminho} stroke="#e7e5e4" strokeWidth={2} strokeLinecap="round" />
          <path
            ref={tracoRef}
            d={caminho}
            stroke="#059669"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
          />
        </svg>

        <div className="relative mx-auto" style={{ width: LARGURA }}>
          {passos.map((p, i) => {
            const paraDireita = i % 2 === 0;
            return (
              <div
                key={p.tag}
                ref={(el) => {
                  paradaRefs.current[i] = el;
                }}
                data-solido="false"
                className="group absolute"
                style={{
                  top: i * ALTURA_PARADA + 74,
                  width: LARGURA_CARTAO,
                  left:
                    LARGURA / 2 +
                    (paraDireita ? AMPLITUDE : -AMPLITUDE) -
                    LARGURA_CARTAO / 2,
                }}
              >
                <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-stone-500">
                  <span className="bg-white px-2">{p.tag}</span>
                </p>

                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 transition-colors duration-500 group-data-[solido=true]:border-emerald-700 group-data-[solido=true]:bg-emerald-700">
                    <p.Icone
                      className="h-4 w-4 text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white"
                      strokeWidth={2}
                    />
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white">
                      {p.rotulo}
                    </span>
                  </div>
                </div>

                <div
                  className="mt-6 rounded-2xl border border-stone-200 bg-white p-7 opacity-40 blur-[2px] transition-all duration-700 group-data-[solido=true]:opacity-100 group-data-[solido=true]:blur-none"
                  style={{
                    boxShadow:
                      "rgba(0,0,0,0.02) 0px 100px 40px, rgba(0,0,0,0.06) 0px 56px 34px, rgba(0,0,0,0.09) 0px 6px 12px",
                  }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
                    {p.titulo}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-stone-700">
                    {p.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="relative mx-auto max-w-xl px-5 text-center"
          style={{ paddingTop: passos.length * ALTURA_PARADA + 120 }}
        >
          <p className="text-base leading-relaxed text-stone-600">
            Sem cadastro, sem custo pra descobrir — você só paga se houver{" "}
            <span className={corDestaque}>falha</span>.
          </p>
        </div>
      </div>

      {/* Telas até 1280px: mesmo caminho, reto — ver a nota em
          CaminhoVerticais.tsx sobre por que o ziguezague não cabe abaixo
          disso. */}
      <div className="mx-auto max-w-md px-5 py-12 xl:hidden">
        <div className="relative">
          <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-stone-200" />
          <div
            ref={trilhoMobileRef}
            className="absolute left-[15px] top-4 w-0.5 origin-top bg-emerald-600"
            style={{ height: 0 }}
          />

          <ol className="relative space-y-8">
            {passos.map((p, i) => (
              <li
                key={p.tag}
                ref={(el) => {
                  paradaMobileRefs.current[i] = el;
                }}
                data-solido="false"
                className="group relative pl-11"
              >
                <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-stone-200 bg-white transition-colors duration-500 group-data-[solido=true]:border-emerald-700 group-data-[solido=true]:bg-emerald-700">
                  <p.Icone
                    className="h-3.5 w-3.5 text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white"
                    strokeWidth={2}
                  />
                </span>

                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-stone-500">
                  {p.tag}
                </p>
                <p className="font-mono mt-1 text-xs uppercase tracking-widest text-stone-400 transition-colors duration-500 group-data-[solido=true]:text-emerald-700">
                  {p.rotulo}
                </p>

                <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 opacity-40 blur-[2px] transition-all duration-700 group-data-[solido=true]:opacity-100 group-data-[solido=true]:blur-none">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
                    {p.titulo}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {p.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
