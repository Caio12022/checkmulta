import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { VERTICAIS, type VerticalId } from "../data/verticais";

/**
 * Faixa fina de órgãos: "Quem te autuou?" e, na mesma linha, os órgãos
 * correndo de lado — o equivalente à faixa de logos do site de referência,
 * mas com o que o CheckMulta realmente tem para mostrar (os órgãos que
 * cobre), em vez de logotipos de clientes que não existem.
 *
 * Desktop: laço contínuo. A lista é renderizada duas vezes e a fita anda
 * exatamente metade da própria largura, então o ponto de emenda cai onde a
 * segunda cópia começa e a volta não tem salto.
 *
 * Celular: não cabe fita. Aparece um órgão de cada vez, trocando sozinho.
 *
 * Os itens são links: esta faixa ficou no lugar da antiga grade de triagem,
 * que era o caminho de entrada para cada vertical no topo da página. Fita
 * decorativa sem link teria custado esse caminho.
 */

/**
 * Quem manda o papel, na língua de quem recebe — Detran e PRF antes de
 * "auto de infração de trânsito". Trânsito aparece três vezes porque são
 * três remetentes diferentes para a mesma vertical.
 *
 * O destino vem de VERTICAIS: escrever a rota à mão aqui já rendeu cinco
 * links errados, e é o tipo de erro que só aparece no clique.
 */
const ROTULOS: { nome: string; vertical: VerticalId }[] = [
  { nome: "Detran", vertical: "transito" },
  { nome: "PRF", vertical: "transito" },
  { nome: "Prefeitura", vertical: "transito" },
  { nome: "Procon", vertical: "procon" },
  { nome: "Vigilância Sanitária", vertical: "vigilancia" },
  { nome: "Companhia de luz", vertical: "energia" },
  { nome: "Ibama", vertical: "ibama" },
];

const ORGAOS = ROTULOS.map(({ nome, vertical }) => ({
  nome,
  href: VERTICAIS.find((v) => v.id === vertical)?.href ?? "#areas",
}));

/** Segundos para a fita percorrer uma volta completa. */
const DURACAO_VOLTA = 26;
/** Segundos que cada órgão fica na tela, no celular. */
const TEMPO_POR_ORGAO = 1.9;

export default function FaixaOrgaos() {
  const fitaRef = useRef<HTMLDivElement>(null);
  const itensMobileRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduzMovimento) {
      // Sem movimento a fita fica parada no início, e no celular só o
      // primeiro órgão aparece — os outros continuam alcançáveis pela seção
      // de áreas, mais abaixo.
      gsap.set(itensMobileRef.current[0], { opacity: 1 });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const fita = fitaRef.current;
      if (!fita) return;

      // Metade da largura = uma cópia inteira da lista. Animar por px em vez
      // de porcentagem porque a fita cresce com o conteúdo.
      const volta = fita.scrollWidth / 2;
      const tween = gsap.fromTo(
        fita,
        { x: 0 },
        { x: -volta, duration: DURACAO_VOLTA, ease: "none", repeat: -1 },
      );

      return () => {
        tween.kill();
      };
    });

    mm.add("(max-width: 767px)", () => {
      const itens = itensMobileRef.current.filter(Boolean);
      if (!itens.length) return;

      gsap.set(itens, { opacity: 0 });
      const tl = gsap.timeline({ repeat: -1 });

      itens.forEach((el, i) => {
        const inicio = i * TEMPO_POR_ORGAO;
        tl.to(el, { opacity: 1, duration: 0.35, ease: "power2.out" }, inicio);
        tl.to(
          el,
          { opacity: 0, duration: 0.35, ease: "power2.in" },
          inicio + TEMPO_POR_ORGAO - 0.35,
        );
      });

      return () => {
        tl.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-5">
        <p className="flex-shrink-0 font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Quem te autuou?
        </p>

        {/* Desktop: fita correndo */}
        <div className="relative hidden min-w-0 flex-1 overflow-hidden md:block">
          <div ref={fitaRef} className="flex w-max items-center">
            {[0, 1].map((copia) =>
              ORGAOS.map((o) => (
                <a
                  key={`${copia}-${o.nome}`}
                  href={o.href}
                  aria-hidden={copia === 1}
                  tabIndex={copia === 1 ? -1 : undefined}
                  className="flex items-center gap-6 whitespace-nowrap pr-6 font-mono text-xs uppercase tracking-widest text-stone-500 transition-colors hover:text-emerald-700"
                >
                  {o.nome}
                  <span className="h-1 w-1 rounded-full bg-stone-300" />
                </a>
              )),
            )}
          </div>
          {/* Desbota nas pontas para a fita não cortar no seco */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
        </div>

        {/* Celular: um de cada vez, no mesmo lugar */}
        <div className="relative h-5 min-w-0 flex-1 md:hidden">
          {ORGAOS.map((o, i) => (
            <a
              key={o.nome}
              href={o.href}
              ref={(el) => {
                itensMobileRef.current[i] = el;
              }}
              className="absolute inset-0 flex items-center font-mono text-xs uppercase tracking-widest text-stone-500 opacity-0"
            >
              {o.nome}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
