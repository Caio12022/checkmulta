/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Scale, QrCode, X, FileText, MessageSquare, Menu, ArrowDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const formatDocumentText = (text: string) => {
  if (!text) return text;
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/`/g, '$1');
  const parts = cleanText.split(/(\[[^[\]]*\]|- STATUS DA ANÁLISE:.*?(?=\n|$))/gi);
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return <span key={index} className="text-red-600 bg-red-50 px-1 rounded font-semibold">{part}</span>;
    }
    if (part.trim().toUpperCase().startsWith('- STATUS DA ANÁLISE:')) {
      return <strong key={index} className="text-emerald-700 font-bold block mb-2">{part}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

const LOADER_MESSAGES = [
  "Analisando documento...",
  "Lendo o auto de infração...",
  "Cruzando dados com o Artigo 280 do CTB...",
  "Buscando jurisprudência no MBFT..."
];

/* ── small reusable badge ── */
const StepLabel = ({ text }: { text: string }) => (
  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 select-none">
    {text}
  </span>
);

export default function App() {
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [result, setResult]           = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const [isGeneratingDefense, setIsGeneratingDefense] = useState(false);
  const [defenseResult, setDefenseResult]             = useState<string | null>(null);
  const [defenseError, setDefenseError]               = useState<string | null>(null);

  const [isPaid, setIsPaid]                       = useState(false);
  const [activeModal, setActiveModal]             = useState<"termos" | "privacidade" | "aviso" | "suporte" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen]   = useState(false);
  const [hasAnalyzed, setHasAnalyzed]             = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen]       = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing || isGeneratingDefense) {
      interval = setInterval(() => setLoaderIndex(p => (p + 1) % LOADER_MESSAGES.length), 2500);
    } else { setLoaderIndex(0); }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingDefense]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Selecione uma imagem ou PDF válido."); return;
    }
    processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) processFile(file);
  };

  const clearImage = (e?: React.MouseEvent) => {
    e?.stopPropagation(); e?.preventDefault();
    setImageFile(null); setPreviewUrl(null); setResult(null);
    setDefenseResult(null); setError(null); setDefenseError(null);
    setIsPaid(false); setHasAnalyzed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = (file: File) => {
    setImageFile(file); setPreviewUrl(null); setError(null);
    setResult(null); setDefenseResult(null); setDefenseError(null);
    setIsPaid(false); setIsResultModalOpen(false);
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      setPreviewUrl(s);
      analyzeTicket(s.split(",")[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeTicket = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true); setError(null); setResult(null);
    setDefenseResult(null); setDefenseError(null); setIsPaid(false); setIsResultModalOpen(true);
    try {
      const response = await fetch("/api/analyze-ticket", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);
      const finalResult = data.result || "";
      const lower = finalResult.toLowerCase();
      if (lower.includes("documento_invalido"))         setError("DOC_INVALIDO");
      else if (lower.includes("imagem_ilegivel"))       setError("IMG_ILEGIVEL");
      else if (lower.includes("rejeicao_complexa"))     setError("REJEICAO_COMPLEXA");
      else if (lower.includes("rejeicao_sem_irregularidades")) setError("REJEICAO_SEM_ERROS");
      else { setResult(finalResult); setHasAnalyzed(true); }
      setIsResultModalOpen(true);
    } catch (err: any) {
      setError("ERRO_INTERNO"); setIsResultModalOpen(true);
    } finally { setIsAnalyzing(false); }
  };

  const handleCheckout = () => { if (result) setIsPixModalOpen(true); };

  const generateDefense = async (override?: string) => {
    const data = override || result; if (!data) return;
    setIsGeneratingDefense(true); setDefenseError(null); setDefenseResult(null);
    try {
      const response = await fetch("/api/generate-defense", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: data }),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
      if (res.error) throw new Error(res.error);
      setDefenseResult(res.result);
    } catch { setDefenseError("Ocorreu um erro ao comunicar com o servidor."); }
    finally { setIsGeneratingDefense(false); }
  };

  const isExpiredFine = result?.toLowerCase().includes("(vencida)");

  /* ─────────────────────────────── RENDER ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-blue-100">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-5 md:px-10 h-14 flex items-center justify-between">
        <div className="w-36 md:w-44 flex items-center">
          <img src="/checkmulta-logo.png" alt="CheckMulta" className="w-full h-auto object-contain" />
        </div>

        {/* desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-500 font-medium">
          <a href="#inicio" className="hover:text-slate-900 transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-slate-900 transition-colors">Segurança</a>
          <button
            onClick={() => setActiveModal("suporte")}
            className="px-4 py-1.5 rounded-full text-sm font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-all"
          >
            Suporte
          </button>
        </nav>

        {/* mobile hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(v => !v)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute top-14 left-0 w-full bg-white border-b border-slate-100 flex flex-col px-5 py-3 gap-1 md:hidden"
            >
              {["#inicio","#como-funciona","#seguranca"].map((href, i) => (
                <a key={i} href={href} onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border-b border-slate-50 last:border-0">
                  {["Início","Como Funciona","Segurança"][i]}
                </a>
              ))}
              <button
                onClick={() => { setIsMobileMenuOpen(false); setActiveModal("suporte"); }}
                className="mt-1 py-2.5 text-sm font-semibold text-blue-600 text-left"
              >Suporte</button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══ MAIN CONTENT ══ */}
      <main id="inicio" className="flex-1 flex flex-col items-center px-4 pt-14 pb-20">

        {/* — headline block — */}
        <div className="w-full max-w-lg text-center mb-10">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-4">
            Auditoria por Inteligência Artificial
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-slate-900 mb-4">
            Cancele multas injustas em minutos
          </h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Envie a notificação. Nosso sistema cruza os dados com o CTB e o Manual de Fiscalização e identifica falhas legais automaticamente.
          </p>
        </div>

        {/* — main card — */}
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* card header strip */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <StepLabel text="Envio do documento" />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Gratuito
            </span>
          </div>

          {/* upload zone */}
          <div className="px-6 py-7">
            <div
              className={`relative rounded-xl transition-all duration-200 cursor-pointer group
                ${previewUrl
                  ? "border border-slate-200 bg-slate-50 p-5"
                  : "border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 p-10"
                }`}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file" ref={fileInputRef} onChange={handleFileSelect}
                accept="image/*,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={isAnalyzing || isPaid}
              />
              <AnimatePresence mode="wait">
                {previewUrl ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-4">
                    {imageFile?.type === "application/pdf"
                      ? <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                      : <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{imageFile?.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Documento carregado</p>
                    </div>
                    {!isAnalyzing && hasAnalyzed && (
                      <button
                        onClick={clearImage} type="button"
                        className="relative z-10 flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
                      >Nova multa</button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 pointer-events-none select-none text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        <span className="text-blue-600">Clique para enviar</span> ou arraste aqui
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Imagem ou PDF da notificação de infração</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* card footer with trust signals */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Sem cadastro" },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Dados não armazenados" },
              { icon: <Scale className="w-3.5 h-3.5" />, label: "Baseado no CTB" },
            ].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                {item.icon}{item.label}
              </span>
            ))}
          </div>
        </div>

        {/* — subtle scroll cue — */}
        <motion.div
          animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="mt-10"
        >
          <ArrowDown className="w-4 h-4 text-slate-300" />
        </motion.div>
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-slate-100 bg-white px-6 py-8 text-center">
        <div className="flex justify-center mb-5">
          <img src="/checkmulta-logo.png" alt="CheckMulta" className="h-7 w-auto object-contain opacity-40" />
        </div>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Sistema de organização tecnológica baseado no CTB e MBFT. A decisão final é do órgão julgador.
          Nenhum dado pessoal é armazenado.
        </p>
        <div className="flex justify-center gap-6 mt-4">
          {(["termos","privacidade","aviso"] as const).map(key => (
            <button key={key} onClick={() => setActiveModal(key)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors capitalize">
              {key === "termos" ? "Termos de Uso" : key === "privacidade" ? "Privacidade" : "Aviso Jurídico"}
            </button>
          ))}
        </div>
      </footer>

      {/* ══ MODAL GENÉRICO (termos / privacidade / aviso / suporte) ══ */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">
                  {activeModal === "termos"      ? "Termos de Uso"
                  : activeModal === "privacidade" ? "Privacidade"
                  : activeModal === "aviso"       ? "Aviso Jurídico"
                  : "💬 Suporte"}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 text-sm text-slate-600 leading-relaxed">
                {activeModal === "suporte" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Fale com nosso time técnico:</p>
                    <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">WhatsApp</p>
                        <p className="text-xs text-slate-400">Fale direto com um analista</p>
                      </div>
                    </a>
                  </div>
                ) : (
                  <p>Processamento transitório para elaboração da petição...</p>
                )}
              </div>
              {activeModal !== "suporte" && (
                <div className="px-6 pb-5">
                  <button onClick={() => setActiveModal(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                    Entendi
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ MODAL RESULTADO ══ */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsResultModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <StepLabel text="Resultado da análise" />
                <button onClick={() => setIsResultModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* modal body */}
              <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">

                {/* loading */}
                {isAnalyzing && (
                  <div className="flex flex-col items-center gap-5 py-6">
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full w-1/2 bg-blue-500 rounded-full"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.p key={loaderIndex}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="text-sm font-medium text-slate-600 text-center">
                        {LOADER_MESSAGES[loaderIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                )}

                {/* error states */}
                {error && (
                  <div className="flex flex-col items-center text-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 mb-1">Análise concluída</p>
                      <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                        {error === "DOC_INVALIDO"       && "A imagem enviada não é um auto de infração ou notificação válida."}
                        {error === "IMG_ILEGIVEL"        && "A imagem está muito borrada ou cortada para leitura."}
                        {error === "REJEICAO_COMPLEXA"   && "Infração de alta complexidade (ex: bafômetro) fora do nosso escopo automático. Recomendamos consultar um especialista."}
                        {error === "REJEICAO_SEM_ERROS"  && "Auditamos o preenchimento e não encontramos falhas técnicas que garantam viabilidade para cancelamento automático."}
                      </p>
                    </div>
                    {(error === "DOC_INVALIDO" || error === "IMG_ILEGIVEL" || error === "REJEICAO_COMPLEXA") && (
                      <button onClick={() => setIsResultModalOpen(false)}
                        className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                        Voltar
                      </button>
                    )}
                  </div>
                )}

                {/* success */}
                {result && !isPaid && !isAnalyzing && !error && (
                  <div className="space-y-5">
                    {/* status row */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">Viabilidade confirmada</p>
                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                          Identificamos falhas técnicas de preenchimento que justificam a nulidade da infração.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <ShieldCheck className="w-3 h-3" /> Força da Tese: ALTA
                          </span>
                          {isExpiredFine && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              <AlertCircle className="w-3 h-3" /> Prazo de defesa vencido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* result text */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                      {formatDocumentText(result)}
                    </div>

                    {/* CTA or expired message */}
                    <div className="pt-1">
                      {!isExpiredFine ? (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-400 text-center leading-relaxed">
                            Cruzamos os dados com o Manual de Fiscalização e estruturamos a tese de defesa completa.
                          </p>
                          <button onClick={handleCheckout} disabled={isCheckoutLoading}
                            className="w-full flex flex-col items-center justify-center py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed gap-1">
                            <span className="flex items-center gap-2 text-base font-black">
                              {isCheckoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                              Emitir Defesa de Anulação Pronta
                            </span>
                            <span className="text-xs font-semibold opacity-70">Liberação imediata · Taxa única R$ 19,90</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <p className="text-sm text-slate-500 leading-relaxed">
                            Validamos a irregularidade, porém o prazo legal para defesa prévia já venceu. Não é possível prosseguir no momento.
                          </p>
                          <button onClick={() => setIsResultModalOpen(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
                            Voltar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ MODAL PIX ══ */}
      <AnimatePresence>
        {isPixModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsPixModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">Pagamento via Pix</h3>
                <button onClick={() => setIsPixModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-5">
                <div className="w-44 h-44 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-200 animate-pulse" />
                </div>
                <button
                  onClick={() => {
                    setIsPixModalOpen(false); setIsCheckoutLoading(true);
                    setTimeout(() => { setIsCheckoutLoading(false); setIsPaid(true); generateDefense(); }, 1500);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
                >
                  Simular Pagamento Aprovado (Teste)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
