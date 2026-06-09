/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Scale, QrCode, X, Copy, Download, Check, Search, FileText, Lock, UserX, Route, ArrowDown, RefreshCcw, HelpCircle, MessageSquare, ClipboardList, Menu } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const formatDocumentText = (text: string) => {
  if (!text) return text;
  
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/`/g, '$1');

  const parts = cleanText.split(/(\[[^[\]]*\]|- STATUS DA ANÁLISE:.*?(?=\n|$))/gi);

  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={index} className="text-red-500 bg-red-50 px-1 rounded-sm font-semibold">
          {part}
        </span>
      );
    }
    if (part.trim().toUpperCase().startsWith('- STATUS DA ANÁLISE:')) {
      return (
        <strong key={index} className="text-emerald-800 font-bold block mb-2 text-lg">
          {part}
        </strong>
      );
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

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [expiredDate, setExpiredDate] = useState<string | null>(null);

  const [isGeneratingDefense, setIsGeneratingDefense] = useState(false);
  const [defenseResult, setDefenseResult] = useState<string | null>(null);
  const [defenseError, setDefenseError] = useState<string | null>(null);

  const [isPaid, setIsPaid] = useState(false);
  const [activeModal, setActiveModal] = useState<"termos" | "privacidade" | "aviso" | "suporte" | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing || isGeneratingDefense) {
      interval = setInterval(() => {
        setLoaderIndex((prev) => (prev + 1) % LOADER_MESSAGES.length);
      }, 2500);
    } else {
      setLoaderIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingDefense]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Por favor, selecione um arquivo de imagem ou PDF válido.");
      return;
    }
    processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      processFile(file);
    }
  };

  const clearImage = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setDefenseResult(null);
    setError(null);
    setDefenseError(null);
    setIsPaid(false);
    setHasAnalyzed(false);
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
  };

  const processFile = (file: File) => {
    setImageFile(file);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setDefenseResult(null);
    setDefenseError(null);
    setIsPaid(false);
    setIsResultModalOpen(false);

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      setPreviewUrl(resultStr);
      const base64Data = resultStr.split(",")[1];
      analyzeTicket(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeTicket = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setDefenseResult(null);
    setDefenseError(null);
    setIsPaid(false);
    setIsResultModalOpen(true);

    try {
      const response = await fetch("/api/analyze-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);

      let finalResult = data.result || "";
      const lowerResult = finalResult.toLowerCase();

      if (lowerResult.includes("documento_invalido")) {
        setError("DOC_INVALIDO");
      } else if (lowerResult.includes("imagem_ilegivel")) {
        setError("IMG_ILEGIVEL");
      } else if (lowerResult.includes("rejeicao_complexa")) {
        setError("REJEICAO_COMPLEXA");
      } else if (lowerResult.includes("rejeicao_sem_irregularidades")) {
        setError("REJEICAO_SEM_ERROS");
      } else {
        setResult(finalResult);
        setHasAnalyzed(true);
      }
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise:", err);
      setError("ERRO_INTERNO");
      setIsResultModalOpen(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckout = async () => {
    if (!result) return;
    setIsPixModalOpen(true);
  };

  const generateDefense = async (overrideResult?: string) => {
    const dataToUse = overrideResult || result;
    if (!dataToUse) return;
    setIsGeneratingDefense(true);
    setDefenseError(null);
    setDefenseResult(null);

    try {
      const response = await fetch("/api/generate-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: dataToUse }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);
      setDefenseResult(data.result);
    } catch (err: any) {
      console.error("Erro na Defesa:", err);
      setDefenseError("Ocorreu um erro ao comunicar com o servidor.");
    } finally {
      setIsGeneratingDefense(false);
    }
  };

  const handleCopy = async () => {
    if (!defenseResult) return;
    try {
      await navigator.clipboard.writeText(defenseResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { console.error("Failed to copy text: ", err); }
  };

  const handleDownload = () => {
    if (!defenseResult) return;
    const blob = new Blob([defenseResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'defesa-transito.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const isExpiredFine = result?.toLowerCase().includes("(vencida)");

  return (
    <div className="min-h-screen flex flex-col text-gray-900 font-sans w-full" style={{ background: '#0B0F1A' }}>
      
      {/* ── HEADER ── */}
      <header
        className="w-full px-4 md:px-8 h-16 md:h-20 flex items-center justify-between sticky top-0 z-50"
        style={{
          background: 'rgba(11,15,26,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center h-full w-[160px] md:w-[200px]">
          <img src="/checkmulta-logo.png" alt="CheckMulta Logo" className="w-full h-auto object-contain scale-[1.2] md:scale-[1.35] origin-left" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* Navegação Desktop */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <a href="#inicio" className="hover:text-white transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-white transition-colors">Segurança</a>
          <button
            onClick={() => setActiveModal("suporte")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <MessageSquare className="w-4 h-4" /> Suporte
          </button>
        </nav>

        {/* Hambúrguer Mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex md:hidden p-2 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Gaveta Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-16 left-0 w-full flex flex-col p-4 space-y-2 md:hidden z-50"
              style={{ background: '#0F1422', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <a href="#inicio" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>Início</a>
              <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>Como Funciona</a>
              <a href="#seguranca" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>Segurança</a>
              <button
                onClick={() => { setIsMobileMenuOpen(false); setActiveModal("suporte"); }}
                className="px-4 py-3 text-left rounded-xl font-bold flex items-center justify-between"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <span>Suporte</span><MessageSquare className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ── */}
      <section
        id="inicio"
        className="w-full flex flex-col items-center px-4 pt-20 pb-24 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0B0F1A 0%, #0D1526 100%)' }}
      >
        {/* Luz de fundo sutil */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        {/* Badge institucional */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-8"
          style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Auditoria Jurídica por Inteligência Artificial
        </div>

        <h1
          className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 max-w-3xl"
          style={{ color: '#F8FAFC' }}
        >
          Cancele Multas Injustas com{' '}
          <span style={{ color: '#3B82F6' }}>Inteligência Artificial</span>
        </h1>

        <p
          className="text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-12"
          style={{ color: 'rgba(248,250,252,0.55)' }}
        >
          Nosso sistema audita sua notificação de trânsito em segundos, cruza os dados com o CTB e o Manual de Fiscalização, e identifica falhas legais.
        </p>

        {/* Card de CTA */}
        <div
          className="w-full max-w-xl rounded-2xl p-6 md:p-8 flex flex-col items-center gap-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <p className="font-semibold text-base md:text-lg" style={{ color: '#E2E8F0' }}>
            Auditoria inteligente: o que o olho humano perde, nosso sistema encontra.{' '}
            <span style={{ color: '#34D399' }}>Analise grátis.</span>
          </p>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
            <ArrowDown className="w-6 h-6" style={{ color: '#34D399' }} />
          </motion.div>
        </div>
      </section>

      {/* ── UPLOAD ── */}
      <main className="w-full max-w-2xl mx-auto px-4 pb-20 -mt-8 relative z-10">
        <div
          className={`relative group rounded-2xl transition-all duration-200 ease-in-out text-center ${
            previewUrl ? 'p-6' : 'p-10 md:p-14'
          }`}
          style={{
            background: previewUrl ? 'transparent' : 'rgba(255,255,255,0.03)',
            border: previewUrl ? 'none' : '2px dashed rgba(255,255,255,0.12)',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={isAnalyzing || isPaid}
            id="upload-input"
          />
          <AnimatePresence mode="wait">
            {previewUrl ? (
              <motion.div key="preview" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="relative mx-auto rounded-xl overflow-hidden max-w-xs flex justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {imageFile?.type === "application/pdf" ? (
                    <div className="w-32 h-32 flex items-center justify-center rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <FileText className="w-16 h-16" style={{ color: '#3B82F6' }} />
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Preview da multa" className="w-full h-auto object-cover max-h-48" />
                  )}
                </div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{imageFile?.name}</p>
                {!isAnalyzing && hasAnalyzed && (
                  <div className="relative z-10 flex flex-row items-center justify-center gap-3 mt-4 w-full">
                    <button
                      onClick={clearImage}
                      className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.12)' }}
                      type="button"
                    >
                      Nova Multa
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-5 pointer-events-none">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <UploadCloud className="w-7 h-7" style={{ color: '#3B82F6' }} />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold" style={{ color: '#E2E8F0' }}>Envie a imagem ou PDF da notificação</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span className="font-semibold" style={{ color: '#60A5FA' }}>Clique</span> ou arraste o arquivo aqui
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer
        className="w-full text-center px-6 py-8 mt-auto"
        style={{ background: '#080B13', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col items-center justify-center mb-5">
          <img
            src="/checkmulta-logo.png"
            alt="CheckMulta Logo"
            className="h-10 md:h-12 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.45 }}
          />
        </div>
        <p className="text-xs max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
          🛡️ Nosso sistema atua como organizador tecnológico com base no CTB e MBFT. A decisão final é do órgão julgador. Não exigimos cadastro e não armazenamos dados pessoais.
        </p>
        <div className="flex justify-center space-x-6 mt-4 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <button onClick={() => setActiveModal("termos")} className="hover:text-white transition-colors">Termos de Uso</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-white transition-colors">Privacidade</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-white transition-colors">Aviso Jurídico</button>
        </div>
      </footer>

      {/* ── MODAIS DE CONTEÚDO ── */}
      <AnimatePresence>
        {activeModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(16px)' }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="max-w-md w-full rounded-2xl p-6 sm:p-8 relative flex flex-col"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-4 pr-8">
                {activeModal === "termos" && <h3 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>Termos de Uso</h3>}
                {activeModal === "privacidade" && <h3 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>Privacidade</h3>}
                {activeModal === "aviso" && <h3 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>Aviso Jurídico</h3>}
                {activeModal === "suporte" && <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F8FAFC' }}>💬 Suporte</h3>}
              </div>
              <div className="text-sm leading-relaxed space-y-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {activeModal === "suporte" ? (
                  <div className="space-y-5 pt-2">
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Selecione o canal para falar com nosso time técnico:</p>
                    <div className="flex flex-col gap-3">
                      <a
                        href="https://wa.me/5500000000000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 w-full p-4 rounded-xl text-left transition-colors"
                        style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399' }}
                      >
                        <MessageSquare className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <strong className="block text-sm font-bold">WhatsApp</strong>
                          <span className="text-xs" style={{ color: 'rgba(52,211,153,0.7)' }}>Fale direto com um analista</span>
                        </div>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p>Processamento transitório para elaboração da petição...</p>
                )}
              </div>
              {activeModal !== "suporte" && (
                <button
                  onClick={() => setActiveModal(null)}
                  className="mt-8 w-full py-3 rounded-xl font-semibold transition-colors text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Entendi
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL DE RESULTADO ── */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div
            className="fixed inset-0 z-[45] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,16,0.80)', backdropFilter: 'blur(16px)' }}
            onClick={() => setIsResultModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative rounded-2xl p-6 sm:p-8"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsResultModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full overflow-y-auto mt-4 space-y-6 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center p-4 space-y-5 max-w-md mx-auto">
                    <div className="w-full h-1 rounded-full overflow-hidden relative" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <motion.div
                        className="absolute top-0 left-0 h-full w-1/2 rounded-full"
                        style={{ background: '#3B82F6' }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={loaderIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className="font-medium text-center text-base"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {LOADER_MESSAGES[loaderIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center text-center space-y-5 p-4 mx-auto max-w-md">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <AlertCircle className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold" style={{ color: '#F8FAFC' }}>Análise Concluída</h3>
                      <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {error === "DOC_INVALIDO" && "A imagem enviada não é um auto de infração ou notificação válida."}
                        {error === "IMG_ILEGIVEL" && "A imagem enviada está muito borrada ou cortada para leitura."}
                        {error === "REJEICAO_COMPLEXA" && "Identificamos que se trata de uma infração de alta complexidade (como bafômetro/DUI), que não faz parte do nosso escopo de atuação automática. Recomendamos consultar um especialista."}
                        {error === "REJEICAO_SEM_ERROS" && "Auditamos o preenchimento do auto e não encontramos falhas técnicas que garantam viabilidade para o cancelamento automático."}
                      </p>
                    </div>
                    {(error === "DOC_INVALIDO" || error === "IMG_ILEGIVEL" || error === "REJEICAO_COMPLEXA") && (
                      <button
                        onClick={() => setIsResultModalOpen(false)}
                        className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Entendi e Voltar
                      </button>
                    )}
                  </div>
                )}

                {result && !isPaid && !isAnalyzing && !error && (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <CheckCircle2 className="w-5 h-5" style={{ color: '#34D399' }} />
                      </div>
                      <div className="flex-1 space-y-3">
                        <h2 className="text-lg font-bold" style={{ color: '#F8FAFC' }}>Análise Concluída: Viabilidade Confirmada</h2>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          Nosso sistema identificou falhas técnicas de preenchimento que justificam a nulidade da infração.
                        </p>
                        <div className="flex flex-col items-start gap-2">
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399' }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Força da Tese: ALTA
                          </div>
                          {isExpiredFine && (
                            <div
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> ⚠️ Atenção: Prazo de defesa já venceu
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="text-sm font-medium whitespace-pre-wrap leading-relaxed p-4 rounded-xl"
                      style={{
                        color: 'rgba(255,255,255,0.65)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderLeft: '3px solid rgba(59,130,246,0.5)',
                      }}
                    >
                      {formatDocumentText(result)}
                    </div>

                    <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      {!isExpiredFine ? (
                        <div className="flex flex-col space-y-5 items-center text-center">
                          <p className="text-sm font-medium leading-relaxed max-w-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Cruzamos os dados com o Manual de Fiscalização e estruturamos a tese de defesa completa...
                          </p>
                          <button
                            onClick={handleCheckout}
                            disabled={isCheckoutLoading}
                            className="w-full flex flex-col items-center justify-center py-4 rounded-xl font-black text-base transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)', color: '#fff' }}
                          >
                            <div className="flex flex-row items-center gap-3">
                              {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" /> : <Scale className="w-5 h-5" />}
                              <span>Emitir Defesa de Anulação Pronta</span>
                            </div>
                            <span
                              className="text-xs font-semibold mt-1.5 px-3 py-1 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                            >
                              Liberação imediata • Taxa única R$ 19,90
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-3 items-center text-center max-w-lg mx-auto">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                          >
                            <AlertCircle className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          </div>
                          <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Embora tenhamos validado a irregularidade, nossa análise preliminar gratuita detectou que o prazo legal para a defesa prévia já venceu (infração de anos anteriores). Devido a isso, não é possível prosseguir no momento.
                          </p>
                          <button
                            onClick={() => setIsResultModalOpen(false)}
                            className="mt-2 text-xs underline decoration-dashed underline-offset-4 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                          >
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

      {/* ── MODAL PIX ── */}
      <AnimatePresence>
        {isPixModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,16,0.80)', backdropFilter: 'blur(16px)' }}
            onClick={() => setIsPixModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative w-11/12 max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPixModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
                  >
                    <QrCode className="w-7 h-7" style={{ color: '#34D399' }} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>Pagamento via Pix</h3>
                </div>
                <div className="flex justify-center py-3">
                  <div
                    className="w-44 h-44 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.12)' }}
                  >
                    <QrCode className="w-20 h-20 animate-pulse" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsPixModalOpen(false);
                    setIsCheckoutLoading(true);
                    setTimeout(() => {
                      setIsCheckoutLoading(false);
                      setIsPaid(true);
                      generateDefense();
                    }, 1500);
                  }}
                  className="w-full mt-2 py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.12)' }}
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
