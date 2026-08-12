import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Car, Scale, Droplet, Zap, Leaf, ArrowRight } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger);

/**
 * "O mesmo método, cinco leis diferentes": um caminho que serpenteia para
 * baixo, com uma parada por vertical.
 *
 * Mecânica tirada da seção "Become a 10x Marketer" do auxia.io (vídeo de
 * referência lido quadro a quadro): um traço vertical em ziguezague que vai
 * sendo desenhado conforme a pessoa rola — cinza à frente, colorido atrás —
 * com uma pílula em cada parada e um rótulo curto no meio do trecho, sobre
 * a própria linha. Diferente do hero, esta seção É guiada pelo scroll: o
 * traço acompanha o dedo, não roda sozinha.
 *
 * O conteúdo NÃO repete o hero (que já mostra documento → análise → defesa).
 * Aqui a pergunta respondida é outra: por que cada área precisa de análise
 * própria. Cada parada mostra o que costuma falhar naquela vertical, com
 * texto vindo de src/data/verticais.ts — vertical nova entra aqui sozinha.
 *
 * Desenho do traço: um único <path> com pathLength=100, revelado por
 * strokeDashoffset. Duas cópias sobrepostas (trilho cinza + traço colorido)
 * em vez de trocar a cor de um traço só, que não dá para revelar em partes.
 */

/** Ícone por vertical — mesma escolha da grade de triagem da Plataforma. */
const ICONES: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  transito: Car,
  procon: Scale,
  vigilancia: Droplet,
  energia: Zap,
  ibama: Leaf,
};

/** O que a análise procura em cada área. Rótulo curto, escrito sobre a linha. */
const ROTULO_TRECHO: Record<string, string> = {
  transito: "Conferindo o auto e o radar",
  procon: "Conferindo a capitulação legal",
  vigilancia: "Conferindo a norma citada",
  energia: "Conferindo o cálculo do TOI",
  ibama: "Conferindo prazo e competência",
};

/** Altura de cada parada (px). Define o desenho do caminho e o espaçamento. */
const ALTURA_PARADA = 440;
/** Meia-largura do ziguezague (px), do centro para cada lado. */
const AMPLITUDE = 265;
/** Raio das curvas do traço. */
const RAIO = 30;
/** Largura do cartão de cada parada (px). */
const LARGURA_CARTAO = 380;

/**
 * Monta o traço em ziguezague: desce, curva para um lado, atravessa, curva
 * de novo e desce. Alterna o lado a cada parada.
 */
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

    // desce até a curva
    partes.push(`L ${meio} ${y + descidaAntes - RAIO}`);
    // curva para o lado
    partes.push(
      `Q ${meio} ${y + descidaAntes} ${meio + sentido * RAIO} ${y + descidaAntes}`,
    );
    // atravessa
    partes.push(`L ${destino - sentido * RAIO} ${y + descidaAntes}`);
    // curva para baixo
    partes.push(
      `Q ${destino} ${y + descidaAntes} ${destino} ${y + descidaAntes + RAIO}`,
    );
    // desce do outro lado
    partes.push(`L ${destino} ${y + descidaAntes + descidaDepois - RAIO}`);
    // curva de volta ao centro
    partes.push(
      `Q ${destino} ${y + ALTURA_PARADA} ${destino - sentido * RAIO} ${y + ALTURA_PARADA}`,
    );
    partes.push(`L ${meio + sentido * RAIO} ${y + ALTURA_PARADA}`);
    partes.push(
      `Q ${meio} ${y + ALTURA_PARADA} ${meio} ${y + ALTURA_PARADA + RAIO}`,
    );

    y += ALTURA_PARADA;
  }

  // Sobra curta no fim: o traço tem de morrer ANTES do texto de fecho, não
  // atravessá-lo.
  const sobra = 46;
  partes.push(`L ${meio} ${y + sobra}`);
  return { d: partes.join(" "), altura: y + sobra };
}

const LARGURA = 1120;
const { d: CAMINHO, altura: ALTURA_TOTAL } = montarCaminho(VERTICAIS.length, LARGURA);

export default function CaminhoVerticais() {
  const secaoRef = useRef<HTMLDivElement>(null);
  const tracoRef = useRef<SVGPathElement>(null);
  const paradaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trilhoMobileRef = useRef<HTMLDivElement>(null);
  const paradaMobileRefs = useRef<(HTMLLIElement | null)[]>([]);

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

    mm.add("(min-width: 768px)", () => {
      gsap.set(tracoRef.current, { strokeDashoffset: 100 });

      // O traço acompanha o scroll da seção inteira.
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

      // Cada parada acende quando entra na tela e fica acesa.
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

    mm.add("(max-width: 767px)", () => {
      // Mesma ideia do desktop, com a linha reta: altura preenchida pelo
      // progresso do scroll, paradas acendendo ao entrar na tela.
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
          Por que uma análise para cada área
        </p>
        <h2 className="font-display mx-auto mb-4 max-w-2xl text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          O mesmo método, cinco leis <span className="text-emerald-600">diferentes</span>
        </h2>
        <p className="mx-auto max-w-xl text-center text-base leading-relaxed text-stone-600">
          Um auto do Procon não se derruba com o argumento que derruba uma
          multa de trânsito. Cada área tem a lei dela — e a falha típica dela.
        </p>
      </div>

      {/* Desktop: caminho serpenteando, desenhado conforme rola. */}
      <div className="relative hidden pb-24 pt-16 md:block">
        <svg
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2"
          width={LARGURA}
          height={ALTURA_TOTAL}
          viewBox={`0 0 ${LARGURA} ${ALTURA_TOTAL}`}
          fill="none"
          aria-hidden="true"
        >
          <path d={CAMINHO} stroke="#e7e5e4" strokeWidth={2} strokeLinecap="round" />
          <path
            ref={tracoRef}
            d={CAMINHO}
            stroke="#059669"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
          />
        </svg>

        <div className="relative mx-auto" style={{ width: LARGURA }}>
          {VERTICAIS.map((v, i) => {
            const Icone = ICONES[v.id];
            const paraDireita = i % 2 === 0;
            return (
              <div
                key={v.id}
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
                {/* Rótulo do trecho, escrito sobre a linha */}
                <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-stone-500">
                  <span className="bg-white px-2">{ROTULO_TRECHO[v.id]}</span>
                </p>

                {/* Pílula da parada */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 transition-colors duration-500 group-data-[solido=true]:border-emerald-700 group-data-[solido=true]:bg-emerald-700">
                    {Icone ? (
                      <Icone
                        className="h-4 w-4 text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white"
                        strokeWidth={2}
                      />
                    ) : null}
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white">
                      {v.titulo}
                    </span>
                  </div>
                </div>

                {/* Cartão da parada */}
                <div
                  className="mt-6 rounded-2xl border border-stone-200 bg-white p-7 opacity-40 blur-[2px] transition-all duration-700 group-data-[solido=true]:opacity-100 group-data-[solido=true]:blur-none"
                  style={{
                    boxShadow:
                      "rgba(0,0,0,0.02) 0px 100px 40px, rgba(0,0,0,0.06) 0px 56px 34px, rgba(0,0,0,0.09) 0px 6px 12px",
                  }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
                    {v.publico}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-stone-700">
                    {v.resumo}
                  </p>
                  <p className="mt-5 border-t border-stone-100 pt-4 font-mono text-[11px] leading-relaxed tracking-wide text-stone-400">
                    {v.baseLegal}
                  </p>
                  <a
                    href={v.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    {v.botao}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fecho do caminho. Sem botão: a seção de áreas vem logo abaixo e já
            leva a pessoa para a vertical certa — repetir a chamada aqui só
            faria o mesmo clique duas vezes seguidas. */}
        <div
          className="relative mx-auto max-w-xl px-5 text-center"
          style={{ paddingTop: VERTICAIS.length * ALTURA_PARADA + 150 }}
        >
          <p className="text-base leading-relaxed text-stone-600">
            Cada uma delas é lida pela lei que a rege — nunca pela mesma
            análise genérica.
          </p>
        </div>
      </div>

      {/* Mobile: mesma matéria, empilhada, sem caminho. */}
      {/* Celular: o mesmo caminho, só que reto. A linha desce pela lateral e
          é preenchida conforme a pessoa rola; cada parada sai do fantasma ao
          entrar na tela. Ziguezague não cabe em 390px — o que cabe é a
          progressão, que é o que a seção precisa comunicar. */}
      <div className="mx-auto max-w-md px-5 py-12 md:hidden">
        <div className="relative">
          <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-stone-200" />
          <div
            ref={trilhoMobileRef}
            className="absolute left-[15px] top-4 w-0.5 origin-top bg-emerald-600"
            style={{ height: 0 }}
          />

          <ol className="relative space-y-8">
            {VERTICAIS.map((v, i) => {
              const Icone = ICONES[v.id];
              return (
                <li
                  key={v.id}
                  ref={(el) => {
                    paradaMobileRefs.current[i] = el;
                  }}
                  data-solido="false"
                  className="group relative pl-11"
                >
                  {/* Marco da parada, sobre a linha */}
                  <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-stone-200 bg-white transition-colors duration-500 group-data-[solido=true]:border-emerald-700 group-data-[solido=true]:bg-emerald-700">
                    {Icone ? (
                      <Icone
                        className="h-3.5 w-3.5 text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-white"
                        strokeWidth={2}
                      />
                    ) : null}
                  </span>

                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-300 transition-colors duration-500 group-data-[solido=true]:text-stone-500">
                    {ROTULO_TRECHO[v.id]}
                  </p>
                  <p className="font-mono mt-1 text-xs uppercase tracking-widest text-stone-400 transition-colors duration-500 group-data-[solido=true]:text-emerald-700">
                    {v.titulo}
                  </p>

                  <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 opacity-40 blur-[2px] transition-all duration-700 group-data-[solido=true]:opacity-100 group-data-[solido=true]:blur-none">
                    <p className="text-sm leading-relaxed text-stone-700">
                      {v.resumo}
                    </p>
                    <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-wide text-stone-400">
                      {v.baseLegal}
                    </p>
                    <a
                      href={v.href}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"
                    >
                      {v.botao}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
