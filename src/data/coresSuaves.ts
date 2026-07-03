// Converte o gradiente forte de cada artigo (ex: "from-red-600 to-orange-700")
// em uma paleta suave e clean para o novo visual do blog.

export interface CorSuave {
  corPrincipal: string;   // hex da cor forte (para faixa/detalhe)
  fundoPagina: string;    // fundo bem suave da página inteira
  fundoBadge: string;     // fundo do rótulo da categoria
  textoBadge: string;     // texto do rótulo (cor forte)
  borda: string;          // borda suave
}

// Mapa de cor base -> paleta suave
const paletas: Record<string, CorSuave> = {
  red:    { corPrincipal: "#dc2626", fundoPagina: "#fef5f5", fundoBadge: "#fef2f2", textoBadge: "#dc2626", borda: "#fce4e4" },
  rose:   { corPrincipal: "#e11d48", fundoPagina: "#fef4f6", fundoBadge: "#fff1f3", textoBadge: "#e11d48", borda: "#fce7ec" },
  orange: { corPrincipal: "#ea580c", fundoPagina: "#fff7f2", fundoBadge: "#fff4ed", textoBadge: "#ea580c", borda: "#fde4d3" },
  amber:  { corPrincipal: "#d97706", fundoPagina: "#fffbf2", fundoBadge: "#fef8ed", textoBadge: "#b45309", borda: "#fdecc8" },
  yellow: { corPrincipal: "#ca8a04", fundoPagina: "#fefcf0", fundoBadge: "#fefae8", textoBadge: "#a16207", borda: "#fbecc0" },
  green:  { corPrincipal: "#16a34a", fundoPagina: "#f4fcf6", fundoBadge: "#f0fdf4", textoBadge: "#16a34a", borda: "#d5f0dd" },
  emerald:{ corPrincipal: "#059669", fundoPagina: "#f2fcf8", fundoBadge: "#ecfdf5", textoBadge: "#059669", borda: "#cff0e4" },
  teal:   { corPrincipal: "#0d9488", fundoPagina: "#f2fcfb", fundoBadge: "#f0fdfa", textoBadge: "#0d9488", borda: "#cbeeea" },
  cyan:   { corPrincipal: "#0891b2", fundoPagina: "#f2fbfd", fundoBadge: "#ecfeff", textoBadge: "#0e7490", borda: "#c8ecf3" },
  blue:   { corPrincipal: "#2563eb", fundoPagina: "#f4f8fe", fundoBadge: "#eff6ff", textoBadge: "#2563eb", borda: "#d8e6fc" },
  indigo: { corPrincipal: "#4f46e5", fundoPagina: "#f6f6fe", fundoBadge: "#eef2ff", textoBadge: "#4f46e5", borda: "#dde2fb" },
  violet: { corPrincipal: "#7c3aed", fundoPagina: "#f9f5fe", fundoBadge: "#f5f3ff", textoBadge: "#7c3aed", borda: "#e6dcfb" },
  purple: { corPrincipal: "#9333ea", fundoPagina: "#faf5fe", fundoBadge: "#faf5ff", textoBadge: "#9333ea", borda: "#ecdcfb" },
  pink:   { corPrincipal: "#db2777", fundoPagina: "#fef4f9", fundoBadge: "#fdf2f8", textoBadge: "#db2777", borda: "#fbe0ee" },
  slate:  { corPrincipal: "#475569", fundoPagina: "#f8fafc", fundoBadge: "#f1f5f9", textoBadge: "#475569", borda: "#e2e8f0" },
  gray:   { corPrincipal: "#4b5563", fundoPagina: "#f9fafb", fundoBadge: "#f3f4f6", textoBadge: "#4b5563", borda: "#e5e7eb" },
  zinc:   { corPrincipal: "#52525b", fundoPagina: "#fafafa", fundoBadge: "#f4f4f5", textoBadge: "#52525b", borda: "#e4e4e7" },
  stone:  { corPrincipal: "#57534e", fundoPagina: "#fafaf9", fundoBadge: "#f5f5f4", textoBadge: "#57534e", borda: "#e7e5e4" },
  neutral:{ corPrincipal: "#525252", fundoPagina: "#fafafa", fundoBadge: "#f5f5f5", textoBadge: "#525252", borda: "#e5e5e5" },
};

const padrao: CorSuave = paletas.slate;

// Extrai a cor base do gradiente (ex: "from-red-600 to-orange-700" -> "red")
export function getCorSuave(imagemBg: string): CorSuave {
  const match = imagemBg.match(/from-([a-z]+)-/);
  if (match && paletas[match[1]]) {
    return paletas[match[1]];
  }
  return padrao;
}
