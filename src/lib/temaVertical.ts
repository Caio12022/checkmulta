/**
 * Paleta por vertical, usada pelos componentes compartilhados (HeroFluxo,
 * ComoFuncionaScroll, EscolhaOrgao) pra cada página de vertical ter sua
 * própria cor em vez do verde padrão — trânsito azul, procon laranja,
 * vigilância vermelho, energia âmbar, ibama verde (sem mudança).
 *
 * Cada campo é a string de classe COMPLETA, já com o prefixo de variante
 * (hover:, group-hover:, data-[...]:) quando existir — não é montada por
 * template literal aqui nem no componente que consome. O Tailwind escaneia
 * o texto bruto dos arquivos atrás de nomes de classe completos; uma classe
 * só existe no CSS final se aparecer, literal, em algum lugar do
 * código-fonte, então cada variação precisa estar escrita por extenso.
 */

export type CorVertical = "emerald" | "blue" | "orange" | "red" | "amber";

export interface TokensCor {
  text600: string;
  text700: string;
  bg100: string;
  bg600: string;
  bg700: string;
  border700: string;
  hex500: string;
  hex600: string;
  hex700: string;
  gradAchado: string;
  gradScan: string;
  dataFeitoBorder200: string;
  dataFeitoBg100: string;
  dataAtivoBorder700: string;
  dataAtivoBg700: string;
  groupDataFeitoText700: string;
  dataFaseFeitoBorder200: string;
  groupDataSolidoText600: string;
  groupDataSolidoBorder700: string;
  groupDataSolidoBg700: string;
  hoverBorder700: string;
  hoverBg50_40: string;
  groupHoverText700: string;
  groupHoverText800: string;
  linkDecoration200: string;
  linkHoverDecoration700: string;
  dataVistoBorder700: string;
  dataVistoText700: string;
  dataAtivoTrueBorder700: string;
  dataAtivoTrueBg700: string;
}

export const CORES: Record<CorVertical, TokensCor> = {
  emerald: {
    text600: "text-emerald-600",
    text700: "text-emerald-700",
    bg100: "bg-emerald-100",
    bg600: "bg-emerald-600",
    bg700: "bg-emerald-700",
    border700: "border-emerald-700",
    hex500: "#10b981",
    hex600: "#059669",
    hex700: "#0f766e",
    gradAchado: "from-emerald-600 to-emerald-800",
    gradScan: "from-emerald-100/0 via-emerald-100/70 to-emerald-100/0",
    dataFeitoBorder200: "data-[estado=feito]:border-emerald-200",
    dataFeitoBg100: "data-[estado=feito]:bg-emerald-100",
    dataAtivoBorder700: "data-[estado=ativo]:border-emerald-700",
    dataAtivoBg700: "data-[estado=ativo]:bg-emerald-700",
    groupDataFeitoText700: "group-data-[estado=feito]:text-emerald-700",
    dataFaseFeitoBorder200: "data-[fase=feito]:border-emerald-200",
    groupDataSolidoText600: "group-data-[solido=true]:text-emerald-600",
    groupDataSolidoBorder700: "group-data-[solido=true]:border-emerald-700",
    groupDataSolidoBg700: "group-data-[solido=true]:bg-emerald-700",
    hoverBorder700: "hover:border-emerald-700",
    hoverBg50_40: "hover:bg-emerald-50/40",
    groupHoverText700: "group-hover:text-emerald-700",
    groupHoverText800: "group-hover:text-emerald-800",
    linkDecoration200: "decoration-emerald-200",
    linkHoverDecoration700: "hover:decoration-emerald-700",
    dataVistoBorder700: "data-[visto=true]:border-emerald-700",
    dataVistoText700: "data-[visto=true]:text-emerald-700",
    dataAtivoTrueBorder700: "data-[ativo=true]:border-emerald-700",
    dataAtivoTrueBg700: "data-[ativo=true]:bg-emerald-700",
  },
  blue: {
    text600: "text-blue-600",
    text700: "text-blue-700",
    bg100: "bg-blue-100",
    bg600: "bg-blue-600",
    bg700: "bg-blue-700",
    border700: "border-blue-700",
    hex500: "#3b82f6",
    hex600: "#2563eb",
    hex700: "#1d4ed8",
    gradAchado: "from-blue-600 to-blue-800",
    gradScan: "from-blue-100/0 via-blue-100/70 to-blue-100/0",
    dataFeitoBorder200: "data-[estado=feito]:border-blue-200",
    dataFeitoBg100: "data-[estado=feito]:bg-blue-100",
    dataAtivoBorder700: "data-[estado=ativo]:border-blue-700",
    dataAtivoBg700: "data-[estado=ativo]:bg-blue-700",
    groupDataFeitoText700: "group-data-[estado=feito]:text-blue-700",
    dataFaseFeitoBorder200: "data-[fase=feito]:border-blue-200",
    groupDataSolidoText600: "group-data-[solido=true]:text-blue-600",
    groupDataSolidoBorder700: "group-data-[solido=true]:border-blue-700",
    groupDataSolidoBg700: "group-data-[solido=true]:bg-blue-700",
    hoverBorder700: "hover:border-blue-700",
    hoverBg50_40: "hover:bg-blue-50/40",
    groupHoverText700: "group-hover:text-blue-700",
    groupHoverText800: "group-hover:text-blue-800",
    linkDecoration200: "decoration-blue-200",
    linkHoverDecoration700: "hover:decoration-blue-700",
    dataVistoBorder700: "data-[visto=true]:border-blue-700",
    dataVistoText700: "data-[visto=true]:text-blue-700",
    dataAtivoTrueBorder700: "data-[ativo=true]:border-blue-700",
    dataAtivoTrueBg700: "data-[ativo=true]:bg-blue-700",
  },
  orange: {
    text600: "text-orange-600",
    text700: "text-orange-700",
    bg100: "bg-orange-100",
    bg600: "bg-orange-600",
    bg700: "bg-orange-700",
    border700: "border-orange-700",
    hex500: "#f97316",
    hex600: "#ea580c",
    hex700: "#c2410c",
    gradAchado: "from-orange-600 to-orange-800",
    gradScan: "from-orange-100/0 via-orange-100/70 to-orange-100/0",
    dataFeitoBorder200: "data-[estado=feito]:border-orange-200",
    dataFeitoBg100: "data-[estado=feito]:bg-orange-100",
    dataAtivoBorder700: "data-[estado=ativo]:border-orange-700",
    dataAtivoBg700: "data-[estado=ativo]:bg-orange-700",
    groupDataFeitoText700: "group-data-[estado=feito]:text-orange-700",
    dataFaseFeitoBorder200: "data-[fase=feito]:border-orange-200",
    groupDataSolidoText600: "group-data-[solido=true]:text-orange-600",
    groupDataSolidoBorder700: "group-data-[solido=true]:border-orange-700",
    groupDataSolidoBg700: "group-data-[solido=true]:bg-orange-700",
    hoverBorder700: "hover:border-orange-700",
    hoverBg50_40: "hover:bg-orange-50/40",
    groupHoverText700: "group-hover:text-orange-700",
    groupHoverText800: "group-hover:text-orange-800",
    linkDecoration200: "decoration-orange-200",
    linkHoverDecoration700: "hover:decoration-orange-700",
    dataVistoBorder700: "data-[visto=true]:border-orange-700",
    dataVistoText700: "data-[visto=true]:text-orange-700",
    dataAtivoTrueBorder700: "data-[ativo=true]:border-orange-700",
    dataAtivoTrueBg700: "data-[ativo=true]:bg-orange-700",
  },
  red: {
    text600: "text-red-600",
    text700: "text-red-700",
    bg100: "bg-red-100",
    bg600: "bg-red-600",
    bg700: "bg-red-700",
    border700: "border-red-700",
    hex500: "#ef4444",
    hex600: "#dc2626",
    hex700: "#b91c1c",
    gradAchado: "from-red-600 to-red-800",
    gradScan: "from-red-100/0 via-red-100/70 to-red-100/0",
    dataFeitoBorder200: "data-[estado=feito]:border-red-200",
    dataFeitoBg100: "data-[estado=feito]:bg-red-100",
    dataAtivoBorder700: "data-[estado=ativo]:border-red-700",
    dataAtivoBg700: "data-[estado=ativo]:bg-red-700",
    groupDataFeitoText700: "group-data-[estado=feito]:text-red-700",
    dataFaseFeitoBorder200: "data-[fase=feito]:border-red-200",
    groupDataSolidoText600: "group-data-[solido=true]:text-red-600",
    groupDataSolidoBorder700: "group-data-[solido=true]:border-red-700",
    groupDataSolidoBg700: "group-data-[solido=true]:bg-red-700",
    hoverBorder700: "hover:border-red-700",
    hoverBg50_40: "hover:bg-red-50/40",
    groupHoverText700: "group-hover:text-red-700",
    groupHoverText800: "group-hover:text-red-800",
    linkDecoration200: "decoration-red-200",
    linkHoverDecoration700: "hover:decoration-red-700",
    dataVistoBorder700: "data-[visto=true]:border-red-700",
    dataVistoText700: "data-[visto=true]:text-red-700",
    dataAtivoTrueBorder700: "data-[ativo=true]:border-red-700",
    dataAtivoTrueBg700: "data-[ativo=true]:bg-red-700",
  },
  amber: {
    text600: "text-amber-600",
    text700: "text-amber-700",
    bg100: "bg-amber-100",
    bg600: "bg-amber-600",
    bg700: "bg-amber-700",
    border700: "border-amber-700",
    hex500: "#f59e0b",
    hex600: "#d97706",
    hex700: "#b45309",
    gradAchado: "from-amber-600 to-amber-800",
    gradScan: "from-amber-100/0 via-amber-100/70 to-amber-100/0",
    dataFeitoBorder200: "data-[estado=feito]:border-amber-200",
    dataFeitoBg100: "data-[estado=feito]:bg-amber-100",
    dataAtivoBorder700: "data-[estado=ativo]:border-amber-700",
    dataAtivoBg700: "data-[estado=ativo]:bg-amber-700",
    groupDataFeitoText700: "group-data-[estado=feito]:text-amber-700",
    dataFaseFeitoBorder200: "data-[fase=feito]:border-amber-200",
    groupDataSolidoText600: "group-data-[solido=true]:text-amber-600",
    groupDataSolidoBorder700: "group-data-[solido=true]:border-amber-700",
    groupDataSolidoBg700: "group-data-[solido=true]:bg-amber-700",
    hoverBorder700: "hover:border-amber-700",
    hoverBg50_40: "hover:bg-amber-50/40",
    groupHoverText700: "group-hover:text-amber-700",
    groupHoverText800: "group-hover:text-amber-800",
    linkDecoration200: "decoration-amber-200",
    linkHoverDecoration700: "hover:decoration-amber-700",
    dataVistoBorder700: "data-[visto=true]:border-amber-700",
    dataVistoText700: "data-[visto=true]:text-amber-700",
    dataAtivoTrueBorder700: "data-[ativo=true]:border-amber-700",
    dataAtivoTrueBg700: "data-[ativo=true]:bg-amber-700",
  },
};
