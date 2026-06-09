/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Scale, QrCode, X, Copy, Download, Check, Search, FileText, Lock, UserX, Route, ArrowDown, RefreshCcw, MessageSquare, ClipboardList, Menu, ArrowRight } from "lucide-react";
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

  // NOVO ESTADO: Controla se o usuário quer ver o resumo da multa vencida
  const [showExpiredSummary, setShowExpiredSummary] = useState(false);

  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem('checkmulta_saved_result');
    const savedPaidStatus = localStorage.getItem('checkmulta_paid_status');

    if (savedResult && savedPaidStatus === 'true' && !defenseResult && !isGeneratingDefense) {
      setResult(savedResult);
      setIsPaid(true);
      setIsResultModalOpen(true);
      generateDefense(savedResult);
    }
  }, []);

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

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      if (!paymentId || !isPixModalOpen) return;
      try {
        const res = await fetch(`/api/check-payment/${paymentId}`);
        const data = await res.json();
        
        if (data.status === "approved") {
          clearInterval(intervalId);
          setIsPixModalOpen(false);
          setIsPaid(true);
          localStorage.setItem('checkmulta_paid_status', 'true');
        }
      } catch (err) {
        console.error("Erro no radar do PIX", err);
      }
    };

    if (isPixModalOpen && paymentId) {
      intervalId = setInterval(checkPaymentStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPixModalOpen, paymentId]);

  useEffect(() => {
    if (isPaid && result && !defenseResult && !isGeneratingDefense) {
      generateDefense();
    }
  }, [isPaid, result]);

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
    setShowExpiredSummary(false); // Reseta a visão do resumo
    setQrCode(null);
    setQrCodeBase64(null);
    setPaymentId(null);
    
    localStorage.removeItem('checkmulta_saved_result');
    localStorage.removeItem('checkmulta_paid_status');

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
    setShowExpiredSummary(false);
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
    setShowExpiredSummary(false);
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

      // TRAVAS DE SEGURANÇA SUAVES (RESPOSTAS TÉCNICAS DO BACKEND)
      if (lowerResult.includes("documento_invalido")) {
        setError("DOC_INVALIDO");
      } else if (lowerResult.includes("imagem_ilegivel")) {
        setError("IMG_ILEGIVEL");
      } else if (lowerResult.includes("rejeicao_complexa")) {
        setError("REJEICAO_COMPLEXA");
      } else if (lowerResult.includes("rejeicao_sem_irregularidades")) {
        setError("REJEICAO_SEM_ERROS");
      } else {
        // SUCESSO OU SUCESSO VENCIDA (2008) -> A lógida do render cuida do visual
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

  const simulateApprovedPayment = () => {
    setIsPixModalOpen(false);
    setIsCheckoutLoading(true);
    setTimeout(() => {
      setIsCheckoutLoading(false);
      setIsPaid(true);
      localStorage.setItem('checkmulta_paid_status', 'true');
      generateDefense();
    }, 1500);
  };

  const generateDefense = async (overrideResult?: string) => {
    const dataToUse = overrideResult || result;
    if (!dataToUse) return;
    
    setIsGeneratingDefense(true);
    setDefenseError(null);
    setDefenseResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("/api/generate-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: dataToUse }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);

      setDefenseResult(data.result);
      localStorage.removeItem('checkmulta_saved_result');
      localStorage.removeItem('checkmulta_paid_status');
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Erro na Defesa:", err);
      
      if (err.name === 'AbortError') {
        setDefenseError("TIMEOUT");
      } else if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        setDefenseError("SERVER_BUSY");
      } else {
        setDefenseError("FALHA_GERACAO");
      }
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
  
  const handleCopyPix = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setIsPixCopied(true);
      setTimeout(() => setIsPixCopied(false), 2000);
    } catch (err) { console.error("Failed to copy PIX: ", err); }
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 w-full scroll-smooth">
      
      <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 h-16 md:h-20 flex items-center justify-between shadow-sm sticky top-0 z-40 overflow-visible">
        <div className="flex items-center h-full w-[180px] md:w-[240px]">
          <img src="/checkmulta-logo.png" alt="CheckMulta Logo" className="w-full h-auto object-contain scale-[1.3] md:scale-[1.5] origin-left translate-y-1" />
        </div>
        
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-600 items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-blue-600 transition-colors">Segurança</a>
          <button onClick={() => setActiveModal("suporte")} className="hover:text-blue-600 transition-colors font-bold flex items-center gap-1 text-blue-600">Suporte</button>
        </nav>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex md:hidden p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-slate-50">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col p-4 space-y-3 md:hidden z-50">
              <a href="#inicio" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Início</a>
              <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Como Funciona</a>
              <a href="#seguranca" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Segurança</a>
              <button onClick={() => { setIsMobileMenuOpen(false); setActiveModal("suporte"); }} className="px-3 py-3 text-left bg-blue-50 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-between">
                <span>Suporte</span><MessageSquare className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
        <section id="inicio" className="mb-10 text-center pt-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 leading-tight">Cancele Multas Injustas com Inteligência Artificial</h1>
          <p className="text-slate-800 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">Nosso sistema audita sua notificação de trânsito em segundos, cruza os dados com o CTB e o Manual de Fiscalização, e identifica falhas legais.</p>
          <div className="bg-emerald-50 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center shadow-sm border border-emerald-100">
            <p className="text-emerald-800 font-bold text-lg md:text-xl text-center">Auditoria inteligente: o que o olho humano perde, nosso sistema encontra. Analise grátis.</p>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="mt-5"><ArrowDown className="w-8 h-8 text-emerald-700" /></motion.div>
          </div>
        </section>

        <main className="space-y-6">
          <div className={`relative group rounded-3xl p-8 sm:p-12 transition-all duration-200 ease-in-out text-center ${previewUrl ? "bg-transparent" : "border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-white bg-white shadow-sm"}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" disabled={isAnalyzing || isPaid} id="upload-input" />
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="relative mx-auto rounded-2xl overflow-hidden max-w-xs flex justify-center">
                    {imageFile?.type === "application/pdf" ? (
                      <div className="w-32 h-32 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200"><FileText className="w-16 h-16 text-blue-600" /></div>
                    ) : ( <img src={previewUrl} alt="Preview da multa" className="w-full h-auto object-cover max-h-48" /> )}
                  </div>
                  <p className="text-sm font-medium text-slate-600">{imageFile?.name}</p>
                  {!isAnalyzing && hasAnalyzed && (
                    <div className="relative z-10 flex flex-row items-center justify-center gap-3 mt-4 w-full">
                      <button onClick={clearImage} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap" type="button">Nova Multa</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                  <div className="w-16 h-16 bg-blue-100/50 text-blue-700 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"><UploadCloud className="w-8 h-8" /></div>
                  <div className="space-y-1"><p className="text-lg font-medium text-slate-800">Envie a imagem ou PDF da notificação</p>
                  <p className="text-slate-500 text-sm"><span className="font-semibold text-blue-600">Clique</span> ou arraste o arquivo aqui</p></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <footer className="w-full text-center px-6 py-6 border-t border-gray-200 bg-gray-100 mt-auto">
        <div className="flex flex-col items-center justify-center mb-6"><img src="/checkmulta-logo.png" alt="CheckMulta Logo" className="h-[48px] md:h-[64px] w-auto object-contain opacity-90" /></div>
        <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed">🛡️ Nosso sistema atua como organizador tecnológico com base no CTB e MBFT. A decisão final é do órgão julgador.</p>
        <div className="flex justify-center space-x-6 mt-4 text-xs font-medium text-slate-400">
          <button onClick={() => setActiveModal("termos")} className="hover:text-slate-600 transition-colors">Termos de Uso</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-slate-600 transition-colors">Privacidade</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-slate-600 transition-colors">Aviso Jurídico</button>
        </div>
      </footer>

      {/* MODAL DE POLÍTICAS E SUPORTE */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg flex flex-col relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"><X className="w-6 h-6" /></button>
              <div className="mb-4 pr-8">
                {activeModal === "termos" && <h3 className="text-xl font-bold text-slate-800">Termos de Uso</h3>}
                {activeModal === "privacidade" && <h3 className="text-xl font-bold text-slate-800">Privacidade</h3>}
                {activeModal === "aviso" && <h3 className="text-xl font-bold text-slate-800">Aviso Jurídico</h3>}
                {activeModal === "suporte" && <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">💬 Suporte</h3>}
              </div>
              <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                {activeModal === "suporte" ? (
                  <div className="space-y-5 pt-2">
                    <p className="text-sm text-slate-600 font-medium">Selecione o canal para falar com nosso time técnico:</p>
                    <div className="flex flex-col gap-3">
                      <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 text-left transition-colors">
                        <MessageSquare className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        <div><strong className="block text-sm font-bold">WhatsApp</strong><span className="text-xs text-emerald-700">Fale direto com um analista</span></div>
                      </a>
                    </div>
                  </div>
                ) : <p>Processamento transitório para elaboração da petição...</p>}
              </div>
              {activeModal !== "suporte" && ( <button onClick={() => setActiveModal(null)} className="mt-8 w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">Entendi</button> )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ANÁLISE / RESULTADO */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsResultModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative bg-white rounded-2xl shadow-lg p-6 sm:p-10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsResultModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"><X className="w-6 h-6" /></button>
              
              <div className="w-full overflow-y-auto mt-4 space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center p-4 space-y-5 max-w-md mx-auto">
                    <div className="w-full h-1.5 bg-blue-100/80 rounded-full overflow-hidden relative"><motion.div className="absolute top-0 left-0 h-full w-1/2 bg-blue-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} /></div>
                    <AnimatePresence mode="wait"><motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-medium text-slate-700 text-center text-lg">{LOADER_MESSAGES[loaderIndex]}</motion.p></AnimatePresence>
                  </div>
                )}

                {/* ERROS E BLOQUEIOS COMPLEXOS (BAFÔMETRO, FOTO RUIM, ETC) */}
                {error && (
                  <div className="flex flex-col items-center text-center space-y-5 p-4 mx-auto max-w-md my-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-800">Análise Concluída</h3>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">
                        {error === "DOC_INVALIDO" && "A imagem enviada não é um auto de infração ou notificação válida."}
                        {error === "IMG_ILEGIVEL" && "A imagem enviada está muito borrada ou cortada para leitura."}
                        {error === "REJEICAO_COMPLEXA" && "Identificamos que se trata de uma infração de alta complexidade (como bafômetro/DUI), que não faz parte do nosso escopo de atuação automática. Recomendamos consultar um especialista."}
                        {error === "REJEICAO_SEM_ERROS" && "Auditamos o preenchimento do auto e não encontramos falhas técnicas que garantam viabilidade para o cancelamento automático."}
                      </p>
                    </div>
                    {(error === "DOC_INVALIDO" || error === "IMG_ILEGIVEL" || error === "REJEICAO_COMPLEXA" || error === "REJEICAO_SEM_ERROS") && (
                       <button onClick={() => setIsResultModalOpen(false)} className="mt-4 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors shadow-sm">Entendi e Voltar</button>
                    )}
                  </div>
                )}

                {/* LÓGICA DE EXIBIÇÃO: SUCESSO X VENCIDA */}
                {result && !isPaid && !isAnalyzing && !error && (
                  <>
                    {/* SE FOR VENCIDA E O USUÁRIO AINDA NÃO CLICOU NO LINK */}
                    {isExpiredFine && !showExpiredSummary ? (
                      <div className="flex flex-col items-center text-center space-y-5 p-4 mx-auto max-w-md my-4">
                        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold text-slate-800">Prazo de Defesa Vencido</h3>
                          <p className="text-slate-700 text-sm font-medium leading-relaxed">
                            A nossa auditoria preliminar foi concluída. Identificamos que o prazo legal para recorrer desta infração já expirou. Devido a isso, a emissão do recurso final não está disponível.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowExpiredSummary(true)} 
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 transition-colors pt-2"
                        >
                          Gostaria de ver o resumo técnico da análise mesmo assim?
                        </button>
                      </div>
                    ) : (
                      /* RESUMO MOSTRADO (Tanto para sucesso normal quanto para vencidas liberadas pelo clique) */
                      <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                          <div className="flex-1 space-y-3">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Análise Concluída: Viabilidade Confirmada</h2>
                            <p className="text-slate-900 font-medium leading-relaxed tracking-tight">Nosso sistema identificou falhas técnicas de preenchimento que justificam a nulidade da infração.</p>
                            <div className="mt-3 flex flex-col items-start gap-2">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-full">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />Força da Tese: ALTA
                              </div>
                              {isExpiredFine && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold rounded-full">
                                  <AlertCircle className="w-4 h-4 text-slate-500" />⚠️ Prazo de defesa já venceu
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pl-4 text-slate-600 text-sm font-medium whitespace-pre-wrap leading-relaxed border-l-2 border-slate-200 bg-slate-50/50 p-4 rounded-r-xl">
                          {formatDocumentText(result)}
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                          {/* BOTÃO DE PAGAMENTO (Só aparece se NÃO for vencida) */}
                          {!isExpiredFine ? (
                            <div className="flex flex-col space-y-6 items-center text-center">
                              <p className="text-slate-900 font-medium leading-relaxed max-w-xl">Cruzamos os dados com o Manual de Fiscalização e estruturamos a tese de defesa completa...</p>
                              <button onClick={handleCheckout} disabled={isCheckoutLoading} className="w-full flex flex-col items-center justify-center py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-75 disabled:cursor-not-allowed">
                                <div className="flex flex-row items-center gap-3 text-lg font-black tracking-tight">{isCheckoutLoading ? <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" /> : <Scale className="w-6 h-6" />}<span>Emitir Defesa de Anulação Pronta</span></div>
                                <span className="text-xs font-semibold opacity-95 mt-1 bg-white/10 px-3 py-1 rounded-full">Liberação imediata • Taxa única R$ 19,90</span>
                              </button>
                            </div>
                          ) : (
                            // BOTÃO DE SAÍDA (Se a multa estiver vencida)
                            <div className="flex flex-col space-y-3 items-center text-center">
                               <button onClick={() => setIsResultModalOpen(false)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors shadow-sm">Fechar Resumo</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* TELAS DE CARREGAMENTO E SUCESSO DA PETIÇÃO */}
                {isGeneratingDefense && (
                  <div className="flex flex-col items-center justify-center p-8 space-y-5 max-w-md mx-auto">
                    <div className="w-full h-1.5 bg-green-100/80 rounded-full overflow-hidden relative"><motion.div className="absolute top-0 left-0 h-full w-1/2 bg-emerald-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} /></div>
                    <AnimatePresence mode="wait"><motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-medium text-slate-700 text-center text-lg">{LOADER_MESSAGES[loaderIndex]}</motion.p></AnimatePresence>
                    <p className="text-xs text-slate-400 font-medium text-center mt-4">Seu pagamento está seguro. Por favor, aguarde e não feche esta janela.</p>
                  </div>
                )}

                {defenseError && (
                  <div className="flex flex-col items-center text-center space-y-4 p-4 mx-auto max-w-md my-6">
                    <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Falha na Geração da Defesa</h3>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">
                        Ocorreu uma instabilidade na hora de escrever o documento, mas <strong>o seu pagamento está seguro.</strong> Clique abaixo para falar com nossa equipe técnica.
                      </p>
                    </div>
                    <a href="https://wa.me/5500000000000?text=Olá!%20Paguei%20pelo%20recurso%20agora,%20mas%20deu%20erro%20na%20hora%20de%20gerar.%20Pode%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" /> Contatar Suporte no WhatsApp
                    </a>
                  </div>
                )}

                {defenseResult && (
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                      <Scale className="w-6 h-6 text-slate-800" />
                      <h2 className="text-xl font-bold text-slate-800 text-center">Sua Defesa Jurídica Pronta</h2>
                    </div>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-2 mb-4 rounded-r-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Atenção:</strong> Revise o documento abaixo. É obrigatório substituir todos os campos destacados em <span className="text-red-600 font-bold">vermelho</span> pelas suas informações reais.
                      </p>
                    </div>

                    <div className="text-slate-800 p-4 sm:p-6 mx-auto bg-slate-50 rounded-xl font-serif border border-slate-200 w-full">
                      <div className="whitespace-pre-wrap text-left text-[15px] md:text-base leading-relaxed font-medium">
                        {formatDocumentText(defenseResult)}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                        <button onClick={handleCopy} className="flex items-center justify-center space-x-2 px-8 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold text-lg w-full sm:w-auto shadow-sm">
                          {isCopied ? (<><Check className="w-5 h-5 text-emerald-600" /><span className="text-emerald-600">Copiado!</span></>) : (<><Copy className="w-5 h-5 text-slate-600" /><span>Copiar Petição</span></>)}
                        </button>
                        <button onClick={handleDownload} className="flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md font-bold text-lg w-full sm:w-auto">
                          <Download className="w-5 h-5" /><span>Baixar txt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPixModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPixModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-11/12 max-w-sm bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsPixModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-6">
                <div className="flex justify-center"><div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><QrCode className="w-8 h-8" /></div></div>
                <div><h3 className="text-2xl font-bold text-slate-800">Pagamento via Pix</h3></div>
                <div className="flex justify-center py-4"><div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
                  {qrCodeBase64 ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code" className="w-full h-full p-2 object-contain" /> : <QrCode className="w-24 h-24 text-slate-300 animate-pulse" />}
                </div></div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-500 font-mono truncate flex-1 text-left">{qrCode || "Gerando Pix..."}</p>
                    <button onClick={handleCopyPix} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors border border-emerald-200">
                      {isPixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  Aguardando pagamento no banco...
                </div>

                <div className="mt-6 pt-2 text-center">
                  <button onClick={simulateApprovedPayment} className="text-[11px] text-slate-400 hover:text-slate-600 underline flex items-center justify-center mx-auto gap-1 transition-colors">
                    <span>Pular p/ Teste</span> <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
