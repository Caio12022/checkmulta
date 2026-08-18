import {
  Bike,
  FileText,
  Gauge,
  HelpCircle,
  IdCard,
  Newspaper,
  Receipt,
  Scale,
  SquareParking,
  TrafficCone,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getCorSuave } from "../data/coresSuaves";

// Ícone por categoria (piloto: Trânsito). Categoria não mapeada cai no
// ícone genérico (Newspaper) em vez de quebrar.
const ICONE_POR_CATEGORIA: Record<string, LucideIcon> = {
  "Velocidade": Gauge,
  "Comportamento no Trânsito": TrafficCone,
  "Estacionamento": SquareParking,
  "Equipamentos": Wrench,
  "CNH e Pontos": IdCard,
  "Dúvidas Frequentes": HelpCircle,
  "Processo de Recurso": FileText,
  "Motocicletas": Bike,
  "Pagamento": Receipt,
  "Jurídico": Scale,
};

interface CapaArtigoBannerProps {
  categoria: string;
  imagemBg: string;
  className?: string;
}

// Capa gerada por código (sem IA): ícone da categoria sobre a cor forte
// já usada no resto da página (mesma paleta de getCorSuave), com dois
// círculos translúcidos só pra não ficar um retângulo liso.
export function CapaArtigoBanner({ categoria, imagemBg, className = "" }: CapaArtigoBannerProps) {
  const cor = getCorSuave(imagemBg);
  const Icone = ICONE_POR_CATEGORIA[categoria] || Newspaper;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl ${className}`}
      style={{ backgroundColor: cor.corPrincipal, aspectRatio: "16 / 9" }}
    >
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
      <Icone className="relative h-16 w-16 text-white sm:h-20 sm:w-20" strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
