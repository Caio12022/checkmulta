import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUp, Check, Loader2, ShieldCheck, Zap } from "lucide-react";
import { VERTICAIS } from "../data/verticais";

gsap.registerPlugin(ScrollTrigger);

/**
 * Abertura da Plataforma, reproduzindo a mecânica do hero do auxia.io.
 *
 * A mecânica foi tirada do vídeo de referência quadro a quadro (o .mht não
 * guarda o JS do site, então a timeline foi remontada a partir do que o
 * vídeo mostra). Três coisas definem o efeito:
 *
 * 1. UMA ESTEIRA HORIZONTAL, não uma troca de telas. Todas as 4 fases
 *    ficam numa fileira só, e a fileira desliza para a esquerda conforme
 *    avança — a fase que sai continua existindo, só sai de quadro.
 *
 * 2. TUDO JÁ ESTÁ NA TELA DESDE O INÍCIO, em estado "fantasma" (cinza,
 *    apagado). Nada entra deslizando: o que acontece é o item passar de
 *    fantasma para sólido, UM DE CADA VEZ. No site, cada linha da lista
 *    troca um spinner cinza por um ✓ colorido, de cima para baixo.
 *
 * 3. SÓ A PRIMEIRA FASE É CARTÃO FLUTUANTE (fundo branco + sombra). As
 *    fases 2 e 3 são conteúdo solto sobre o fundo da seção — sem cartão,
 *    sem sombra. A fase 4 é a peça ilustrada.
 *
 * A linha do topo acompanha: o selo da fase ativa se expande e mostra o
 * rótulo; os outros ficam como bolinha. O traço preenche até o selo ativo.
 *
 * Roda automática (ScrollTrigger só dispara uma vez, quando a seção entra
 * na tela) — não é scroll-driven. A mecânica de "um gesto = um passo" é
 * exclusiva do bloco "Como funciona", logo abaixo.
 */

const SOMBRA_CARD = {
  boxShadow:
    "rgba(0,0,0,0.02) 0px 140px 56px, rgba(0,0,0,0.07) 0px 78px 47px, rgba(0,0,0,0.1) 0px 7px 14px, rgba(0,0,0,0.12) 0px 9px 19px",
};

const FASES = ["Enviar", "Identificar órgão", "Analisar", "Resultado"];

/** Conteúdo por página: os textos mudam, a mecânica (acima) não. */
export type HeroFluxoProps = {
  /** Tag mono acima do título. */
  tagSecao?: string;
  /** Título da seção — em páginas de vertical já definida, pode ser o
   * próprio H1 de SEO, para não duplicar título em dois blocos. */
  titulo?: React.ReactNode;
  /** Parágrafo de apoio abaixo do título. */
  descricao?: React.ReactNode;
  /** Fala na caixa flutuante (fase 1). */
  mensagemChat?: string;
  /** Rótulo do stepper na fase 2 — "Identificar órgão" só faz sentido na
   * home, que ainda não sabe qual vertical é. Numa página de vertical já
   * definida, o nome muda para o que a fase 2 realmente faz ali. */
  rotuloFase2?: string;
  /** Os 5 itens que acendem um a um na fase 2. Casa com T.itemPasso — cinco
   * itens é o tempo pra que o cronograma foi calibrado. */
  itensChecklist?: string[];
  /** Peça final (fase 4). */
  resultado?: {
    badge: string;
    titulo: string;
    texto: string;
  };
};

const RESULTADO_PADRAO = {
  badge: "1 falha encontrada",
  titulo: "Encontramos uma brecha legal",
  texto:
    "O endereço da autuação está incompleto — falha de forma que abre espaço para recorrer. Geramos a defesa pronta para protocolar.",
};

/**
 * Ilustração do topo da peça final: o auto de infração com o trecho
 * defeituoso marcado e a lupa em cima dele. Desenho, não print — o layout
 * do produto ainda vai mudar, e print viraria dívida na hora que mudasse.
 */
function IlustracaoAchado() {
  return (
    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800">
      <svg
        viewBox="0 0 320 144"
        className="h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Textura sutil de fundo */}
        <g opacity="0.14" stroke="#fff" strokeWidth="1">
          <path d="M0 34h320M0 74h320M0 114h320" />
        </g>

        {/* Folha do auto, levemente inclinada */}
        <g transform="translate(96 16) rotate(-5 56 56)">
          <rect width="128" height="126" rx="7" fill="#fffdf8" />
          {/* cabeçalho do documento */}
          <rect x="14" y="16" width="46" height="6" rx="3" fill="#0f766e" opacity="0.8" />
          {/* linhas de texto */}
          <g fill="#d6d3d1">
            <rect x="14" y="34" width="100" height="5" rx="2.5" />
            <rect x="14" y="46" width="86" height="5" rx="2.5" />
            <rect x="14" y="76" width="94" height="5" rx="2.5" />
            <rect x="14" y="88" width="70" height="5" rx="2.5" />
            <rect x="14" y="100" width="88" height="5" rx="2.5" />
          </g>
          {/* o trecho com o defeito, destacado */}
          <rect x="10" y="56" width="94" height="14" rx="4" fill="#fee2e2" />
          <rect x="14" y="61" width="62" height="5" rx="2.5" fill="#dc2626" opacity="0.75" />
          <rect x="10" y="56" width="2.5" height="14" rx="1.25" fill="#dc2626" />
        </g>

        {/* Lupa centrada no trecho destacado (≈153,79 no espaço do SVG) */}
        <g transform="translate(153 79)">
          <circle r="26" fill="#0f766e" opacity="0.22" />
          <circle r="20" fill="none" stroke="#fff" strokeWidth="3.5" />
          <path
            d="M15 15l16 16"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

/** O que a análise confere — some como texto solto, igual às personas do site. */
const CONFERENCIAS = [
  ["Prazo de defesa", "Ainda aberto para recorrer"],
  ["Quem autuou", "Competência do agente"],
  ["Como foi descrito", "Falha de forma no auto"],
];

/**
 * Deslocamento da esteira em cada fase, na tela larga (px). Abaixo de
 * 1280px ele é medido em tempo real — as quatro colunas somam ~1220px, e
 * numa faixa mais estreita elas simplesmente não caberiam lado a lado.
 */
const DESLOCAMENTO_DESKTOP = [60, 40, 0, -40];

/**
 * Cronograma do ciclo, em segundos. Reunido num lugar só porque os tempos
 * dependem uns dos outros: mexer num número solto espalhado pela timeline
 * desencaixa a fase seguinte sem avisar.
 */
const T = {
  fase2: 1.2,
  /** Quando a primeira vertical começa a "pensar". */
  itemInicio: 1.5,
  /** Intervalo entre uma vertical e a seguinte. */
  itemPasso: 0.55,
  /** Quanto tempo o anel gira antes de virar visto. */
  itemPensa: 0.45,
  fase3: 4.6,
  fase4: 6.2,
  /** Início do fechamento — inclui o tempo de leitura da peça pronta. */
  fechamento: 8.8,
};

export default function HeroFluxo({
  tagSecao = "Analisador de autos de infração",
  titulo = (
    <>
      Descubra se a sua multa tem <span className="text-emerald-600">erro</span>
    </>
  ),
  descricao = "Leitura do documento à luz da lei do órgão que autuou. Gratuita em todas as áreas — você só paga se houver falha.",
  mensagemChat = "Recebi uma multa e não sei se ela tem algum erro. Pode analisar pra mim?",
  rotuloFase2 = "Identificar órgão",
  itensChecklist = VERTICAIS.map((v) => v.titulo),
  resultado = RESULTADO_PADRAO,
}: HeroFluxoProps) {
  const secaoRef = useRef<HTMLDivElement>(null);
  const esteiraRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const trilhoFillRef = useRef<HTMLDivElement>(null);
  const selosRef = useRef<(HTMLDivElement | null)[]>([]);
  const rotulosRef = useRef<(HTMLSpanElement | null)[]>([]);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const linhasVerticalRef = useRef<(HTMLLIElement | null)[]>([]);
  const conferenciaRef = useRef<(HTMLDivElement | null)[]>([]);
  const resultadoRef = useRef<HTMLDivElement>(null);
  /** As 4 colunas da esteira, na ordem — usadas para centralizar no celular. */
  const colunasRef = useRef<(HTMLDivElement | HTMLUListElement | null)[]>([]);

  useEffect(() => {
    const reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /**
     * Acende um elemento: liga o atributo que as classes de cor observam e,
     * nos dois cartões, tira o desfoque via GSAP.
     *
     * O desfoque não sai por classe utilitária: `blur-[3px]` e o
     * `data-[...]:blur-0` que deveria anulá-lo empatam, e o primeiro vence —
     * o cartão ficava borrado para sempre, com o resto do estado correto.
     */
    const marcarSolido = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return;
      el.dataset.solido = "true";
      if (el.dataset.cartao === "sim") {
        gsap.to(el, {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
        });
      }
    };

    if (reduzMovimento) {
      // Estado final direto: tudo sólido, esteira parada, trilho cheio.
      [
        cartaoRef.current,
        resultadoRef.current,
        ...conferenciaRef.current,
      ].forEach(marcarSolido);
      linhasVerticalRef.current.forEach((el) => {
        if (el) el.dataset.fase = "feito";
      });
      const ultimo = selosRef.current.length - 1;
      selosRef.current.forEach((el, i) => {
        if (el) el.dataset.estado = i === ultimo ? "ativo" : "feito";
      });
      // Só o rótulo da última fase fica aberto — é o estado em que a
      // animação termina.
      rotulosRef.current.forEach(
        (el, i) => el && gsap.set(el, { width: i === ultimo ? "auto" : 0 }),
      );
      if (trilhoFillRef.current) gsap.set(trilhoFillRef.current, { width: "100%" });
      return;
    }

    const mm = gsap.matchMedia();

    /**
     * Monta o ciclo inteiro. Recebe de fora quanto a esteira anda em cada
     * fase, que é a única coisa que muda entre telas: no desktop as quatro
     * colunas cabem quase todas de uma vez e a esteira só se ajusta; no
     * celular cabe uma por vez, então cada fase centraliza a sua.
     */
    const montarCiclo = (deslocamento: number[]) => {
      // Posição da fase 1. Sem isto a esteira começa em x=0: a primeira fase
      // nunca é levada ao lugar dela, porque o primeiro tween da timeline só
      // acontece na fase 2 — e ela ficava fora de centro na tela estreita.
      gsap.set(esteiraRef.current, { x: deslocamento[0] });

      // Preenche o trilho até o centro do selo da fase indicada. Medido na
      // hora porque o selo ativo muda de largura ao expandir o rótulo.
      const preencherTrilho = (indice: number) => {
        const stepper = stepperRef.current;
        const selo = selosRef.current[indice];
        const fill = trilhoFillRef.current;
        if (!stepper || !selo || !fill) return;
        const base = stepper.getBoundingClientRect();
        const r = selo.getBoundingClientRect();
        gsap.to(fill, {
          width: r.left + r.width / 2 - base.left,
          duration: 0.45,
          ease: "power2.out",
        });
      };

      // Um atributo só, com três valores — duas classes concorrentes
      // (solido/ativo) empatam em especificidade e o vencedor passa a
      // depender da ordem do CSS gerado.
      const ativarSelo = (indice: number) => {
        selosRef.current.forEach((el, i) => {
          if (!el) return;
          el.dataset.estado =
            i === indice ? "ativo" : i < indice ? "feito" : "futuro";
        });
        rotulosRef.current.forEach((el, i) => {
          if (!el) return;
          gsap.to(el, {
            width: i === indice ? "auto" : 0,
            duration: 0.35,
            ease: "power2.inOut",
          });
        });
      };

      /**
       * Fechamento do ciclo: devolve tudo ao estado fantasma para a volta
       * do loop. Chamado com a esteira já invisível, então o corte não
       * aparece — o que se vê é só o apagar e o reacender.
       */
      const reiniciarCiclo = () => {
        gsap.killTweensOf([cartaoRef.current, resultadoRef.current]);
        [cartaoRef.current, resultadoRef.current].forEach((el, i) => {
          if (!el) return;
          el.dataset.solido = "false";
          gsap.set(el, { opacity: 0.3, filter: `blur(${i === 0 ? 2 : 3}px)` });
        });
        conferenciaRef.current.forEach((el) => {
          if (el) el.dataset.solido = "false";
        });
        linhasVerticalRef.current.forEach((el) => {
          if (el) el.dataset.fase = "espera";
        });
        selosRef.current.forEach((el) => {
          if (el) el.dataset.estado = "futuro";
        });
        rotulosRef.current.forEach((el) => el && gsap.set(el, { width: 0 }));
        if (trilhoFillRef.current) gsap.set(trilhoFillRef.current, { width: 0 });
        gsap.set(esteiraRef.current, { x: deslocamento[0] });
      };

      const tl = gsap.timeline({
        scrollTrigger: { trigger: secaoRef.current, start: "top 80%", once: true },
        defaults: { ease: "power2.inOut" },
        repeat: -1,
      });

      // Agenda os itens de uma lista para acender um de cada vez, dentro da
      // própria timeline (não em delayedCall solto, que sobreviveria ao
      // cleanup e continuaria escrevendo em nós já desmontados).
      const solidificarEmSerie = (
        els: (Element | null)[],
        inicio: number,
        intervalo = 0.13,
      ) => {
        els.forEach((el, i) => {
          tl.call(() => marcarSolido(el), [], inicio + i * intervalo);
        });
      };

      // Fase 1 — cartão flutuante.
      tl.call(() => {
        ativarSelo(0);
        preencherTrilho(0);
        marcarSolido(cartaoRef.current);
      })
        // Fase 2 — as verticais pensam e acendem uma de cada vez.
        .to(esteiraRef.current, { x: deslocamento[1], duration: 0.9 }, T.fase2)
        .call(
          () => {
            ativarSelo(1);
            preencherTrilho(1);
          },
          [],
          T.fase2,
        )
        // Fase 3 — a esteira anda e as conferências acendem.
        .to(esteiraRef.current, { x: deslocamento[2], duration: 0.9 }, T.fase3)
        .call(
          () => {
            ativarSelo(2);
            preencherTrilho(2);
          },
          [],
          T.fase3,
        )
        // Fase 4 — a esteira anda de novo e a peça final acende.
        .to(esteiraRef.current, { x: deslocamento[3], duration: 0.9 }, T.fase4)
        .call(
          () => {
            ativarSelo(3);
            preencherTrilho(3);
            marcarSolido(resultadoRef.current);
          },
          [],
          T.fase4 + 0.05,
        )
        // Fechamento: segura a peça pronta, apaga suave e recomeça.
        .to(
          esteiraRef.current,
          { opacity: 0, x: deslocamento[3] - 70, duration: 0.9, ease: "power2.in" },
          T.fechamento,
        )
        .to(
          [trilhoFillRef.current, ...rotulosRef.current],
          { width: 0, duration: 0.6 },
          T.fechamento + 0.2,
        )
        .call(reiniciarCiclo, [], T.fechamento + 0.9)
        .to(
          esteiraRef.current,
          { opacity: 1, duration: 0.6, ease: "power2.out" },
          T.fechamento + 0.95,
        );

      // Cada vertical primeiro "pensa" (anel girando) e só então recebe o
      // visto — é o passo que faz a lista parecer conferência de verdade em
      // vez de cinco vistos aparecendo de enfeite.
      linhasVerticalRef.current.forEach((el, i) => {
        const inicio = T.itemInicio + i * T.itemPasso;
        tl.call(() => el && (el.dataset.fase = "pensa"), [], inicio);
        tl.call(() => el && (el.dataset.fase = "feito"), [], inicio + T.itemPensa);
      });

      solidificarEmSerie(conferenciaRef.current, T.fase3 + 0.35, 0.45);

      return () => {
        tl.kill();
      };
    };

    mm.add("(min-width: 1280px)", () => montarCiclo(DESLOCAMENTO_DESKTOP));

    mm.add("(max-width: 1279px)", () => {
      // Fora da tela larga as colunas são medidas de verdade em vez de
      // chutadas:
      // largura de tela varia demais para número fixo, e um erro aqui deixa
      // a fase ativa metade fora do quadro.
      const esteira = esteiraRef.current;
      const visivel = esteira?.parentElement;
      if (!esteira || !visivel) return;

      gsap.set(esteira, { x: 0 });
      const base = esteira.getBoundingClientRect().left;

      // Largura ÚTIL, sem o padding do recorte. Usar clientWidth cru joga a
      // coluna para a direita pela metade do padding — a conta tem de ser
      // feita na mesma caixa em que a esteira começa, que é a de conteúdo.
      const estilo = getComputedStyle(visivel);
      const larguraUtil =
        visivel.clientWidth -
        parseFloat(estilo.paddingLeft) -
        parseFloat(estilo.paddingRight);

      const deslocamento = colunasRef.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return -(r.left - base) + (larguraUtil - r.width) / 2;
      });

      return montarCiclo(deslocamento);
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={secaoRef} className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
      {/* Um layout só para celular e desktop: manter duas árvores separadas
          foi o que deixou o celular parado enquanto o desktop animava. */}
      <div className="py-14 xl:py-20">
        {/* Chamada da seção */}
        <div className="mx-auto mb-10 w-full max-w-[1300px] px-6 xl:mb-14 xl:px-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-700">
            {tagSecao}
          </p>
          <p className="font-display mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {titulo}
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600">
            {descricao}
          </p>
        </div>

        {/* Linha do topo — selo ativo expande o rótulo, trilho preenche até ele. */}
        <div
          ref={stepperRef}
          className="relative mx-auto mb-10 flex w-full max-w-[1300px] items-center gap-2 px-6 xl:mb-14 xl:gap-3 xl:px-8"
        >
          <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-stone-200 xl:left-8 xl:right-8" />
          <div
            ref={trilhoFillRef}
            className="absolute left-6 top-1/2 h-0.5 w-0 -translate-y-1/2 bg-emerald-600 xl:left-8"
          />
          {FASES.map((fase, i) => (
            <div
              key={i}
              ref={(el) => {
                selosRef.current[i] = el;
              }}
              data-estado="futuro"
              className="group relative z-10 flex h-8 items-center rounded-full border px-2.5 transition-colors duration-300 data-[estado=futuro]:border-stone-200 data-[estado=futuro]:bg-stone-100 data-[estado=feito]:border-emerald-200 data-[estado=feito]:bg-emerald-100 data-[estado=ativo]:border-emerald-700 data-[estado=ativo]:bg-emerald-700"
            >
              <Zap
                className="h-3 w-3 flex-shrink-0 transition-colors duration-300 group-data-[estado=futuro]:text-stone-300 group-data-[estado=feito]:text-emerald-700 group-data-[estado=ativo]:text-white"
                strokeWidth={2.5}
              />
              <span
                ref={(el) => {
                  rotulosRef.current[i] = el;
                }}
                className="flex items-center overflow-hidden whitespace-nowrap"
                style={{ width: 0 }}
              >
                <span className="pl-2 pr-0.5 font-mono text-[10px] uppercase leading-none tracking-widest text-white">
                  {i === 1 ? rotuloFase2 : fase}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Esteira: as 4 fases numa fileira só, que desliza para a esquerda.
            O pai é quem recorta e quem dá a largura de referência usada para
            centralizar a fase ativa no celular. */}
        <div className="mx-auto w-full max-w-[1300px] overflow-hidden px-6 xl:px-8">
          <div ref={esteiraRef} className="flex items-start gap-8 xl:gap-14">
          {/* Fase 1 — único cartão flutuante da sequência */}
          <div
            ref={(el) => {
              cartaoRef.current = el;
              colunasRef.current[0] = el;
            }}
            data-solido="false"
            data-cartao="sim"
            className="w-60 flex-shrink-0 rounded-2xl border border-stone-200 bg-white p-4 xl:w-64"
            style={{ ...SOMBRA_CARD, opacity: 0.3, filter: "blur(2px)" }}
          >
            <p className="text-sm leading-relaxed text-stone-800">
              {mensagemChat}
            </p>
            <div className="mt-3 flex justify-end">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </div>

          {/* Fase 2 — solto no fundo, sem cartão. Três estados por linha:
              espera (anel parado), pensa (anel girando) e feito (visto).
              Um atributo só, com valores exclusivos: duas classes que possam
              casar ao mesmo tempo empatam em especificidade e o vencedor
              passa a depender da ordem do CSS gerado. */}
          <ul
            ref={(el) => {
              colunasRef.current[1] = el;
            }}
            className="w-60 flex-shrink-0 space-y-2 xl:w-64"
          >
            {itensChecklist.map((item, i) => (
              <li
                key={item}
                ref={(el) => {
                  linhasVerticalRef.current[i] = el;
                }}
                data-fase="espera"
                className="group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors duration-500 data-[fase=espera]:border-stone-200 data-[fase=pensa]:border-stone-300 data-[fase=feito]:border-emerald-200"
              >
                <span className="relative flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center">
                  <span className="absolute inset-0 hidden rounded-full border-2 border-stone-200 group-data-[fase=espera]:block" />
                  <Loader2
                    className="absolute inset-0 hidden h-3.5 w-3.5 animate-spin text-emerald-600 group-data-[fase=pensa]:block"
                    strokeWidth={2.5}
                  />
                  <Check
                    className="hidden h-3 w-3 text-emerald-600 group-data-[fase=feito]:block"
                    strokeWidth={3}
                  />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wide transition-colors duration-500 group-data-[fase=espera]:text-stone-300 group-data-[fase=pensa]:text-stone-500 group-data-[fase=feito]:text-stone-700">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Fase 3 — texto solto, sem cartão. Acende um de cada vez. */}
          <div
            ref={(el) => {
              colunasRef.current[2] = el;
            }}
            className="w-56 flex-shrink-0 space-y-6 pt-1"
          >
            {CONFERENCIAS.map(([titulo, detalhe], i) => (
              <div
                key={titulo}
                ref={(el) => {
                  conferenciaRef.current[i] = el;
                }}
                data-solido="false"
                className="group flex gap-2"
              >
                <ShieldCheck
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-stone-200 transition-colors duration-500 group-data-[solido=true]:text-emerald-600"
                  strokeWidth={2}
                />
                <div className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-stone-200 transition-colors duration-500 group-data-[solido=true]:text-stone-700">
                  <div>{titulo}</div>
                  <div className="text-stone-200 transition-colors duration-500 group-data-[solido=true]:text-stone-400">
                    {detalhe}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fase 4 — peça ilustrada, maior. */}
          <div
            ref={(el) => {
              resultadoRef.current = el;
              colunasRef.current[3] = el;
            }}
            data-solido="false"
            data-cartao="sim"
            className="w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-white xl:w-80"
            style={{ ...SOMBRA_CARD, opacity: 0.3, filter: "blur(3px)" }}
          >
            <IlustracaoAchado />
            <div className="p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-red-700">
                {resultado.badge}
              </span>
              <h3 className="font-display mt-3 text-lg font-semibold leading-snug tracking-tight text-stone-900">
                {resultado.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {resultado.texto}
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
    </section>
  );
}
