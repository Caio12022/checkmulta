import { useMemo, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ─── EXTRAÇÃO DE CAMPOS ─────────────────────────────────────────────────────
// Os prompts de defesa (prompts/*.ts) deixam entre colchetes só os dados
// pessoais que a análise não conseguiu extrair da imagem — ex.: [CPF],
// [ENDEREÇO COMPLETO]. Como o conjunto muda por vertical e por documento,
// os campos do formulário são descobertos varrendo o texto de verdade, em
// vez de uma lista fixa por vertical (que envelheceria a cada ajuste de
// prompt).
const extrairCampos = (texto: string): string[] => {
  const vistos = new Set<string>();
  const campos: string[] = [];
  const regex = /\[([^[\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    const campo = m[1].trim();
    if (campo && !vistos.has(campo)) {
      vistos.add(campo);
      campos.push(campo);
    }
  }
  return campos;
};

// Siglas que aparecem entre colchetes nos 5 prompts de defesa e que não
// devem virar "Cpf", "Rg" etc. quando exibidas no formulário.
const SIGLAS = new Set(["RG", "CPF", "CNPJ", "AIT", "RENAVAM"]);
const PREPOSICOES = new Set(["de", "da", "do", "das", "dos"]);

const humanizarLabel = (campo: string): string =>
  campo
    .split(" ")
    .map((palavra, index) => {
      if (SIGLAS.has(palavra)) return palavra;
      const minuscula = palavra.toLowerCase();
      if (index > 0 && PREPOSICOES.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join(" ");

const limparMarkdown = (texto: string): string =>
  texto
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "");

// pdf-lib com fonte padrão (Helvetica/WinAnsi) já cobre acentuação e
// cedilha do português — não precisa embutir fonte própria.
const gerarPdf = async (textoFinal: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const fonteRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const larguraPagina = 595.28; // A4 em pontos
  const alturaPagina = 841.89;
  const margem = 56;
  const larguraUtil = larguraPagina - margem * 2;
  const tamanhoFonte = 11;
  const alturaLinha = 15;

  const linhasBrutas = textoFinal.split("\n");
  const linhasFormatadas: { texto: string; negrito: boolean }[] = [];

  for (const linhaBruta of linhasBrutas) {
    const negrito = /^\s*(DEFESA|CONTESTA|IMPUGNA|RECURSO)/i.test(linhaBruta.trim()) &&
      linhaBruta.trim() === linhaBruta.trim().toUpperCase() &&
      linhaBruta.trim().length > 0;
    if (linhaBruta.trim() === "") {
      linhasFormatadas.push({ texto: "", negrito: false });
      continue;
    }
    const fonte = negrito ? fonteBold : fonteRegular;
    const palavras = linhaBruta.split(" ");
    let linhaAtual = "";
    for (const palavra of palavras) {
      const candidata = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
      const larguraCandidata = fonte.widthOfTextAtSize(candidata, tamanhoFonte);
      if (larguraCandidata > larguraUtil && linhaAtual) {
        linhasFormatadas.push({ texto: linhaAtual, negrito });
        linhaAtual = palavra;
      } else {
        linhaAtual = candidata;
      }
    }
    linhasFormatadas.push({ texto: linhaAtual, negrito });
  }

  let pagina = pdfDoc.addPage([larguraPagina, alturaPagina]);
  let y = alturaPagina - margem;

  for (const linha of linhasFormatadas) {
    if (y < margem) {
      pagina = pdfDoc.addPage([larguraPagina, alturaPagina]);
      y = alturaPagina - margem;
    }
    if (linha.texto) {
      pagina.drawText(linha.texto, {
        x: margem,
        y,
        size: tamanhoFonte,
        font: linha.negrito ? fonteBold : fonteRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    y -= alturaLinha;
  }

  return pdfDoc.save();
};

interface GerarPdfDefesaProps {
  texto: string;
  nomeArquivo: string;
  corBotao: string;
  onBaixar?: () => void;
}

export default function GerarPdfDefesa({ texto, nomeArquivo, corBotao, onBaixar }: GerarPdfDefesaProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [gerando, setGerando] = useState(false);

  const textoLimpo = useMemo(() => limparMarkdown(texto), [texto]);
  const campos = useMemo(() => extrairCampos(textoLimpo), [textoLimpo]);

  const abrirModal = () => {
    if (!texto) return;
    setModalAberto(true);
  };

  const baixarPdf = async () => {
    setGerando(true);
    try {
      const textoFinal = textoLimpo.replace(/\[([^[\]]+)\]/g, (_match, campo) => {
        const valor = valores[campo.trim()]?.trim();
        return valor || "_______________________";
      });
      const pdfBytes = await gerarPdf(textoFinal);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomeArquivo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onBaixar?.();
      setModalAberto(false);
    } finally {
      setGerando(false);
    }
  };

  return (
    <>
      <button
        onClick={abrirModal}
        className={`flex w-full items-center justify-center space-x-2 rounded-lg px-8 py-3.5 text-base font-semibold text-white transition sm:w-auto ${corBotao}`}
      >
        <FileText className="h-5 w-5" />
        <span>Preencher e baixar em PDF</span>
      </button>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Preencher dados para o PDF</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {campos.length > 0
                    ? "Esses dados não vieram do documento analisado. Preencha o que souber — o que ficar em branco sai como linha para completar à mão."
                    : "Nenhum dado pendente identificado. O PDF sairá pronto para baixar."}
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {campos.length > 0 && (
              <div className="space-y-3">
                {campos.map((campo) => (
                  <div key={campo}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {humanizarLabel(campo)}
                    </label>
                    <input
                      type="text"
                      value={valores[campo] || ""}
                      onChange={(e) => setValores((prev) => ({ ...prev, [campo]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                      placeholder={humanizarLabel(campo)}
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-400">
              Esses dados ficam só no seu navegador — não são enviados a nenhum servidor.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={baixarPdf}
                disabled={gerando}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${corBotao}`}
              >
                <Download className="h-4 w-4" />
                {gerando ? "Gerando..." : "Baixar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
