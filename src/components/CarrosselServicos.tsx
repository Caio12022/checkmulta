import { useState, useEffect, useRef } from "react";
import { Building2, Scale, FileText, ShieldCheck, Zap, Leaf } from "lucide-react";

/**
 * Carrossel de serviços do CheckMulta.
 * Troca por crossfade suave, sem movimento lateral: o card atual some
 * enquanto o próximo aparece, no mesmo lugar.
 *
 * - Pausa quando o mouse está sobre o bloco ou quando algo dentro recebe foco
 * - Respeita quem desativou animações no sistema (prefers-reduced-motion)
 * - Não depende de biblioteca de animação: só transição de opacidade
 *
 * A prop "excluir" remove um serviço da rotação — usada para a página não
 * anunciar a si mesma.
 */

export type ServicoId = "procon" | "vigilancia" | "energia" | "ibama" | "simulador" | "codigos";

interface Servico {
  id: ServicoId;
  eyebrow: string;
  titulo: string;
  texto: string;
  href: string;
  botao: string;
  Icone: typeof Building2;
  /** Paleta suave do serviço: dá ao visitante o sinal de que o card trocou. */
  cor: { faixa: string; icone: string; fundoIcone: string; texto: string };
}

const SERVICOS: Servico[] = [
  {
    id: "procon",
    eyebrow: "Para empresas",
    titulo: "Sua empresa foi multada pelo Procon?",
    texto:
      "Analisamos gratuitamente o auto de infração do Procon e apontamos se há falha que permite recorrer, com base no Código de Defesa do Consumidor e no Decreto 2.181/97.",
    href: "/procon",
    botao: "Analisar grátis",
    Icone: Building2,
    cor: { faixa: "#f59e0b", icone: "#b45309", fundoIcone: "#fffbeb", texto: "#b45309" },
  },
  {
    id: "vigilancia",
    eyebrow: "Para empresas",
    titulo: "Recebeu um auto da Vigilância Sanitária?",
    texto:
      "Verificamos de graça se o auto de infração sanitária tem falha formal e entregamos a defesa administrativa pronta para protocolo, fundamentada na Lei 6.437/77.",
    href: "/vigilancia-sanitaria",
    botao: "Analisar grátis",
    Icone: ShieldCheck,
    cor: { faixa: "#0ea5e9", icone: "#0369a1", fundoIcone: "#f0f9ff", texto: "#0369a1" },
  },
  {
    id: "energia",
    eyebrow: "Para pessoas e empresas",
    titulo: "Recebeu uma cobrança retroativa de energia?",
    texto:
      "Analisamos gratuitamente o TOI ou a notificação de recuperação de consumo e apontamos se a inspeção ou o cálculo têm falha, com base na Resolução ANEEL nº 1.000/2021.",
    href: "/energia",
    botao: "Analisar grátis",
    Icone: Zap,
    cor: { faixa: "#eab308", icone: "#a16207", fundoIcone: "#fefce8", texto: "#a16207" },
  },
  {
    id: "ibama",
    eyebrow: "Para pessoas e empresas",
    titulo: "Recebeu um auto de infração do IBAMA?",
    texto:
      "Analisamos gratuitamente o auto de infração ambiental e apontamos se há vício formal, incompetência ou prescrição, com base no Decreto nº 6.514/2008.",
    href: "/ibama",
    botao: "Analisar grátis",
    Icone: Leaf,
    cor: { faixa: "#16a34a", icone: "#15803d", fundoIcone: "#f0fdf4", texto: "#15803d" },
  },
  {
    id: "simulador",
    eyebrow: "Ferramenta gratuita",
    titulo: "Quantos pontos faltam para perder a CNH?",
    texto:
      "Some suas multas dos últimos 12 meses e veja sua margem real. O limite muda conforme as infrações gravíssimas: pode ser 20, 30 ou 40 pontos.",
    href: "/simulador-pontos",
    botao: "Simular agora",
    Icone: Scale,
    cor: { faixa: "#8b5cf6", icone: "#6d28d9", fundoIcone: "#f5f3ff", texto: "#6d28d9" },
  },
  {
    id: "codigos",
    eyebrow: "Ferramenta gratuita",
    titulo: "Não sabe o que significa o código da sua multa?",
    texto:
      "Digite o código que aparece no auto e veja o valor, os pontos na CNH, a gravidade e o artigo do CTB. São 258 infrações da tabela oficial da SENATRAN.",
    href: "/infracao",
    botao: "Consultar código",
    Icone: FileText,
    cor: { faixa: "#10b981", icone: "#047857", fundoIcone: "#ecfdf5", texto: "#047857" },
  },
];

const INTERVALO = 5000;

export default function CarrosselServicos({
  excluir = [],
}: {
  excluir?: ServicoId[];
}) {
  const itens = SERVICOS.filter((s) => !excluir.includes(s.id));
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reduzido = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    reduzido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (pausado || itens.length <= 1 || reduzido.current) return;
    const t = setInterval(() => {
      setAtivo((i) => (i + 1) % itens.length);
    }, INTERVALO);
    return () => clearInterval(t);
  }, [pausado, itens.length]);

  if (itens.length === 0) return null;

  const corAtiva = itens[ativo].cor;

  return (
    <section className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-14">
        <div
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocusCapture={() => setPausado(true)}
          onBlurCapture={() => setPausado(false)}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {/* Faixa superior: muda de cor junto com o card, dando o sinal visual da troca */}
          <div
            className="h-1 w-full transition-colors duration-700 ease-in-out"
            style={{ backgroundColor: corAtiva.faixa }}
          />

          <div className="p-6 sm:p-8">
          {/* Os cards ficam empilhados na mesma célula do grid.
              Só a opacidade muda, então não há salto de layout. */}
          <div className="grid">
            {itens.map((s, i) => {
              const visivel = i === ativo;
              return (
                <div
                  key={s.id}
                  aria-hidden={!visivel}
                  className={`col-start-1 row-start-1 transition-opacity duration-700 ease-in-out ${
                    visivel ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: s.cor.fundoIcone, color: s.cor.icone }}
                    >
                      <s.Icone className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <span
                        className="mb-1 block text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: s.cor.texto }}
                      >
                        {s.eyebrow}
                      </span>
                      <h2 className="mb-2 text-xl font-bold leading-snug text-slate-900">
                        {s.titulo}
                      </h2>
                      <p className="text-sm leading-relaxed text-slate-600">{s.texto}</p>
                    </div>

                    <a
                      href={s.href}
                      tabIndex={visivel ? 0 : -1}
                      className="w-full flex-shrink-0 rounded-lg bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                    >
                      {s.botao}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navegação */}
          {itens.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {itens.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setAtivo(i)}
                  aria-label={`Ver ${s.titulo}`}
                  aria-current={i === ativo}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === ativo ? "w-6" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  style={i === ativo ? { backgroundColor: s.cor.faixa } : undefined}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
