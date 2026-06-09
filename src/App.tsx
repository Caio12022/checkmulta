/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Scale, QrCode, X, Copy, Download, Check, Search, FileText, Lock, UserX, Route, ArrowDown, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const formatDocumentText = (text: string) => {
  if (!text) return text;
  
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/`(.*?)`/g, '$1');

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
  const [activeModal, setActiveModal] = useState<"termos" | "privacidade" | "aviso" | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  // Estados para o Mercado Pago
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);

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

  // RADAR DE VERIFICAÇÃO DO PIX REAL
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
          setIsCheckoutLoading(true);
          
          setTimeout(() => {
            setIsCheckoutLoading(false);
            setIsPaid(true);
            generateDefense();
          }, 1000);
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
    setQrCode(null);
    setQrCodeBase64(null);
    setPaymentId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

      let finalResult = data.result;
      let expDate: string | null = null;
      
      const prazoMatch = finalResult.match(/⚠️ Atenção: Prazo para recurso encerrado em ([^\n]+)/);
      if (prazoMatch) {
         expDate = prazoMatch[1].trim();
         finalResult = finalResult.replace(prazoMatch[0], "").trim();
      }

      setExpiredDate(expDate);
      setResult(finalResult);
      if (finalResult) setHasAnalyzed(true);
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise (Log da Verdade):", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted") || err.message.includes("quota"))) {
        setError("SERVER_BUSY");
      } else {
        setError(err.message || "Ocorreu um erro ao comunicar com o servidor.");
      }
      setIsResultModalOpen(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckout = async () => {
    if (!result) return;
    setIsCheckoutLoading(true);
    
    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "comprador@checkmulta.com.br" }),
      });

      const data = await response.json();

      if (response.ok && data.qr_code) {
        setPaymentId(data.id);
        setQrCode(data.qr_code);
        setQrCodeBase64(data.qr_code_base64);
        setIsPixModalOpen(true);
      } else {
        alert("Erro ao inicializar gateway de pagamento. Verifique o Token no Render.");
      }
    } catch (err) {
      console.error("Erro ao chamar API de Pagamento:", err);
      alert("Não foi possível conectar ao servidor de pagamento.");
    } finally {
      setIsCheckoutLoading(false);
    }
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
      console.error("Erro na Defesa (Log da Verdade):", err);
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted") || err.message.includes("quota"))) {
        setDefenseError("SERVER_BUSY");
      } else {
        setDefenseError(err.message || "Ocorreu um erro ao comunicar com o servidor.");
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
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleCopyPix = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setIsPixCopied(true);
      setTimeout(() => setIsPixCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy PIX: ", err);
    }
  };

  const handleDownload = () => {
    if (!defenseResult) return;
    const blob = new Blob([defenseResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'defesa-transito.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 w-full scroll-smooth">
      <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 h-16 md:h-20 flex items-center justify-between shadow-sm sticky top-0 z-10 overflow-hidden">
        <div className="flex items-center h-full w-[180px] md:w-[240px]">
          <img src="/checkmulta-logo.png" alt="CheckMulta Logo" className="w-full h-auto object-contain scale-[1.3] md:scale-[1.5] origin-left translate-y-1" />
        </div>
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-600">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-blue-600 transition-colors">Segurança</a>
        </nav>
      </header>

      <div className="w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
        
        <section id="inicio" className="mb-10 text-center pt-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
            Cancele Multas Injustas com Inteligência Artificial
          </h1>
          <p className="text-slate-800 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Nosso sistema audita sua notificação de trânsito em segundos, cruza os dados com o CTB e o Manual de Fiscalização, e identifica falhas legais para anular a infração.
          </p>
          
          <div className="bg-emerald-50 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center shadow-sm border border-emerald-100">
            <p className="text-emerald-800 font-bold text-lg md:text-xl text-center leading-snug">
              Auditoria inteligente: o que o olho humano perde, nosso sistema encontra. Analise sua multa grátis.
            </p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mt-5"
            >
              <ArrowDown className="w-8 h-8 text-emerald-700" />
            </motion.div>
          </div>
        </section>

        <main className="space-y-6">
          <div
            className={`relative group rounded-3xl p-8 sm:p-12 transition-all duration-200 ease-in-out text-center ${
              previewUrl
                ? "bg-transparent"
                : "border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-white bg-white shadow-sm"
            }`}
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
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="relative mx-auto rounded-2xl overflow-hidden max-w-xs flex justify-center">
                    {imageFile?.type === "application/pdf" ? (
                      <div className="w-32 h-32 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200">
                        <FileText className="w-16 h-16 text-blue-600" />
                      </div>
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Preview da multa"
                        className="w-full h-auto object-cover max-h-48"
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    {imageFile?.name}
                  </p>
                  {!isAnalyzing && !hasAnalyzed && (
                    <button
                      onClick={clearImage}
                      className="relative z-10 text-sm font-medium text-slate-500 hover:text-red-500 underline decoration-slate-300 hover:decoration-red-300 underline-offset-4 transition-colors"
                      type="button"
                    >
                      Excluir ou subir nova foto
                    </button>
                  )}
                  {!isAnalyzing && hasAnalyzed && (
                    <div className="relative z-10 flex flex-row items-center justify-center gap-3 mt-4 w-full">
                      <button
                        onClick={() => {
                          if (imageFile) {
                            if (result) {
                              setIsResultModalOpen(true);
                            } else {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const resultStr = reader.result as string;
                                const base64Data = resultStr.split(",")[1];
                                analyzeTicket(base64Data, imageFile.type);
                              };
                              reader.readAsDataURL(imageFile);
                            }
                          }
                        }}
                        className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                        type="button"
                      >
                        Reanalisar
                      </button>
                      <button
                        onClick={clearImage}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap"
                        type="button"
                      >
                        Nova Multa
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center space-y-4 pointer-events-none"
                >
                  <div className="w-16 h-16 bg-blue-100/50 text-blue-700 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-slate-800">
                      Envie a imagem ou PDF da notificação
                    </p>
                    <p className="text-slate-500 text-sm">
                      <span className="font-semibold text-blue-600">Clique</span> ou arraste o arquivo aqui
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <section id="como-funciona" className="w-full bg-slate-100/50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12 tracking-tight">Como funciona a nossa auditoria?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Envie a Notificação</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Tire uma foto ou envie o PDF do seu auto de infração em nossa plataforma segura.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Auditoria Imediata</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Nossa IA analisa cada detalhe em busca de erros do agente autuador.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Defesa Pronta</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Se encontramos viabilidade, geramos a petição baseada na lei pronta para protocolo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="seguranca" className="w-full bg-white border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12 tracking-tight">Seus Dados 100% Seguros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Zero Armazenamento</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Não guardamos a foto do seu documento. A imagem é processada na memória do servidor e imediatamente deletada.
              </p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <UserX className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Sem Cadastro</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Você não precisa criar conta, colocar e-mail ou senha para auditar a sua multa. É direto ao ponto.
              </p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <Route className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Total Transparência</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Atuamos como uma ferramenta tecnológica baseada no CTB. Nós criamos a tese, mas a decisão final é sempre do órgão julgador.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full text-center px-6 py-6 border-t border-gray-200 bg-gray-100 mt-auto">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/checkmulta-logo.png" alt="CheckMulta Logo" className="h-[48px] md:h-[64px] w-auto object-contain opacity-90" />
        </div>
        <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed">
          🛡️ <strong className="font-semibold text-slate-600">Transparência e Privacidade:</strong> Nosso sistema atua como organizador tecnológico com base no Manual Brasileiro de Fiscalização de Trânsito. A decisão final é do órgão julgador. Não exigimos cadastro e não armazenamos a sua petição ou dados do veículo. Tudo é apagado após o download.
        </p>
        <div className="flex justify-center space-x-6 mt-4 text-xs font-medium text-slate-400">
          <button onClick={() => setActiveModal("termos")} className="hover:text-slate-600 hover:underline transition-colors">Termos de Uso</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-slate-600 hover:underline transition-colors">Privacidade</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-slate-600 hover:underline transition-colors">Aviso Jurídico</button>
        </div>
      </footer>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-lg flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="mb-4 pr-8">
                {activeModal === "aviso" && <h3 className="text-xl font-bold text-slate-800">Aviso Jurídico</h3>}
                {activeModal === "termos" && <h3 className="text-xl font-bold text-slate-800">Termos de Uso</h3>}
                {activeModal === "privacidade" && <h3 className="text-xl font-bold text-slate-800">Políticas de Privacidade</h3>}
              </div>
              
              <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                {activeModal === "aviso" && (
                  <p>
                    Este documento é um modelo referencial gerado automaticamente de forma algorítmica e não constitui tese jurídica garantida. Nós não somos um escritório de advocacia e este sistema não substitui a consulta a um advogado especialista. É plenamente possível que o recurso seja indeferido, sendo o julgamento de total responsabilidade do órgão de trânsito competente.
                  </p>
                )}
                {activeModal === "termos" && (
                  <p>
                    O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário ou resultado das decisões julgadas pelas juntas de recursos JARI ou instâncias superiores.
                    </p>
                )}
                {activeModal === "privacidade" && (
                  <p>
                    Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros ou retenções em log da fotografia do seu auto de infração, dados pessoais ou da petição gerada. O processamento é de estrito caráter transitório (em memória) para elaboração do documento, que é imediatamente apagado após o fechamento da página ou download.
                  </p>
                )}
              </div>
              
              <button onClick={() => setActiveModal(null)} className="mt-8 w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                Entendi e concordo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-3xl w-full flex flex-col relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6 sm:p-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsResultModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 max-h-[80vh] mt-4 space-y-6">
                
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center p-4 space-y-5 max-w-md mx-auto">
                    <div className="w-full h-1.5 bg-blue-100/80 rounded-full overflow-hidden relative">
                      <motion.div
                        className="absolute top-0 left-0 h-full w-1/2 bg-blue-600 rounded-full"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-medium text-slate-700 text-center text-lg">
                        {LOADER_MESSAGES[loaderIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                )}

                {error && (
                  <div>
                    {error === "SERVER_BUSY" ? (
                      <div className="flex items-start space-x-4 text-left">
                        <div className="flex-shrink-0 mt-1"><span className="text-2xl">⚠️</span></div>
                        <div>
                          <h2 className="text-xl font-bold text-orange-900 mb-2">Servidor Ocupado</h2>
                          <p className="text-orange-800 font-medium leading-relaxed">
                            Nossos servidores estão processando um alto volume de auditorias neste momento. Por favor, aguarde alguns segundos e tente enviar sua notificação novamente.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 text-red-800 p-4 bg-red-50 rounded-xl">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                      </div>
                    )}
                  </div>
                )}

                {result && !isPaid && !isAnalyzing && (
                  <div>
                    {result.toLowerCase().includes("erro_seguranca") ? (
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 mb-2">🚫 Envio Bloqueado</h2>
                          <p className="text-slate-600 font-medium">A imagem enviada viola nossas políticas de uso e segurança.</p>
                        </div>
                      </div>
                    ) : result.toLowerCase().includes("documento_invalido") ? (
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="w-8 h-8 text-slate-500 flex-shrink-0 mt-1" />
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 mb-2">📷 Documento Não Reconhecido</h2>
                          <p className="text-slate-600 font-medium">A imagem enviada não parece ser uma notificação de trânsito válida.</p>
                        </div>
                      </div>
                    ) : result.toLowerCase().includes("imagem_ilegivel") ? (
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 mb-2">🔍 Imagem Ilegível ou Incompleta</h2>
                          <p className="text-slate-600 font-medium">Não conseguimos ler os dados essenciais com segurança. Envie uma foto mais nítida.</p>
                        </div>
                      </div>
                    ) : result.toLowerCase().includes("rejeição_tipo_a") || result.toLowerCase().includes("rejeição_tipo_b") ? (
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 mb-2">Análise Concluída: Sem viabilidade automática</h2>
                          <div className="text-slate-600 font-medium leading-relaxed space-y-4">
                            <p>Auditoramos seu documento e não encontramos falhas formais evidentes passíveis de nulidade por robô.</p>
                            <p>Recomendamos o pagamento com desconto pelo aplicativo oficial do SNE ou a consulta a um especialista.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                          <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">✅ Viabilidade Confirmada!</h2>
                            <p className="text-slate-900 font-medium leading-relaxed">
                              Encontramos falhas materiais de preenchimento que justificam o cancelamento.
                            </p>
                            <div className="mt-3 flex flex-col items-start">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-full">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Força da Tese: ALTA
                              </div>
                              
                              {expiredDate && (
                                <div className="mt-4 inline-flex items-start gap-2 bg-slate-100 border-l-4 border-amber-400 text-slate-700 px-4 py-3 rounded-r-lg">
                                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm font-medium">
                                    <strong className="text-slate-800 block mb-0.5">⚠️ Atenção: Prazo encerrado em {expiredDate}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pl-4 text-slate-600 text-sm font-medium whitespace-pre-wrap leading-relaxed border-l-2 border-slate-200 bg-slate-50/50 p-4 rounded-r-xl">
                          {formatDocumentText(result)}
                        </div>

                        <div className="pt-8 mt-6 border-t border-slate-100">
                          <div className="flex flex-col space-y-6">
                            <div className="text-center space-y-4">
                              <h4 className="text-lg md:text-base font-black text-slate-900 flex items-center justify-center gap-2.5">
                                <span className="translate-y-[-1px]">🚨</span> Irregularidade Confirmada pelo Sistema
                              </h4>
                              <p className="text-sm text-slate-700 leading-relaxed max-w-xl mx-auto font-medium px-2">
                                Cruzamos os dados do seu auto com o Manual Brasileiro de Fiscalização de Trânsito e estruturamos o documento de contestação completo. O pedido de arquivamento está fundamentado nas resoluções vigentes para solicitar a anulação da cobrança e proteger sua CNH contra a pontuação.
                              </p>
                              <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 inline-block px-5 py-2.5 rounded-full shadow-sm">
                                Tudo pronto. Você só precisa emitir o documento, copiar o texto e colar no portal de recursos do órgão.
                              </p>
                            </div>
                            
                            <button
                              onClick={handleCheckout}
                              disabled={isCheckoutLoading}
                              className="w-full flex flex-col items-center justify-center p-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-75 disabled:cursor-not-allowed border-b-4 border-emerald-800/60"
                            >
                              <div className="flex flex-row items-center justify-center gap-3 text-lg font-black tracking-tight w-full">
                                {isCheckoutLoading ? <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" /> : <Scale className="w-6 h-6 flex-shrink-0" />}
                                <span className="text-center leading-tight break-words">
                                  {isCheckoutLoading ? "Processando Emissão..." : "Emitir Recurso de Anulação Pronto"}
                                </span>
                              </div>
                              <span className="text-xs font-bold opacity-95 mt-2 bg-white/10 px-3 py-1 rounded-full">
                                Liberar documento de cancelamento • R$ 19,90
                              </span>
                            </button>
                            
                            <div className="mt-2 text-[11px] text-slate-400 text-center leading-relaxed max-w-2xl mx-auto px-4">
                              <strong className="text-slate-500">Aviso Legal:</strong> Este sistema atua como organizador algorítmico de teses referenciais com base no CTB. Não somos um escritório de advocacia. O resultado do julgamento administrativo é de total soberania da junta de trânsito competente.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isGeneratingDefense && (
                  <div className="flex flex-col items-center justify-center p-4 space-y-5 max-w-md mx-auto">
                    <div className="w-full h-1.5 bg-green-100/80 rounded-full overflow-hidden relative">
                      <motion.div className="absolute top-0 left-0 h-full w-1/2 bg-emerald-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                    </div>
                    <p className="font-medium text-slate-700 text-center text-lg animate-pulse">Gerando sua petição oficial formatada...</p>
                  </div>
                )}

                {defenseResult && (
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                      <Scale className="w-6 h-6 text-slate-800" />
                      <h2 className="text-xl font-bold text-slate-800 text-center">Sua Defesa Jurídica Pronta</h2>
                    </div>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-md">
                      <p className="text-sm text-yellow-800 font-medium">
                        <strong>Atenção:</strong> Revise o documento abaixo. Substitua todos os campos destacados em vermelho pelas suas informações reais (como nome, RG, CPF e dados legíveis do veículo) antes de assinar e protocolar.
                      </p>
                    </div>

                    <div className="text-slate-800 p-4 sm:p-6 mx-auto bg-slate-50 rounded-xl overflow-y-auto font-serif border border-slate-200 w-full">
                      <div className="whitespace-pre-wrap text-left text-[15px] md:text-base leading-relaxed font-medium">
                        {formatDocumentText(defenseResult)}
                      </div>
                    </div>

                    {/* TARJETA DE AVISO SOLICITADA PARA RETENÇÃO E SEGURANÇA JURÍDICA */}
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center max-w-xl mx-auto shadow-sm">
                      <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                        ⚠️ <strong className="text-amber-950">Aviso Importante de Sessão:</strong> Ao fechar esta janela ou atualizar a página, os dados desta análise serão perdidos permanentemente e será necessário realizar uma nova consulta. Cuidado para não atualizar e certifique-se de copiar o texto ou baixar o documento antes de sair.
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-2">
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                        <button onClick={handleCopy} className="flex items-center justify-center space-x-2 px-8 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold text-lg w-full sm:w-auto shadow-sm">
                          {isCopied ? (<><Check className="w-5 h-5 text-emerald-600" /><span className="text-emerald-600">Copiado!</span></>) : (<><Copy className="w-5 h-5 text-slate-600" /><span>Copiar Petição</span></>)}
                        </button>
                        <button onClick={handleDownload} className="flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md font-bold text-lg w-full sm:w-auto">
                          <Download className="w-5 h-5" /><span>Baixar Documento (txt)</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-11/12 max-w-sm max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6">
              <button onClick={() => setIsPixModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <QrCode className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Pagamento via Pix</h3>
                  <p className="text-slate-500 mt-2 font-medium">Escaneie o QR Code ou utilize o botão Copia e Cola abaixo.</p>
                </div>

                <div className="flex justify-center py-4">
                  <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden">
                    {qrCodeBase64 ? (
                      <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Real" className="w-full h-full p-2 object-contain" />
                    ) : (
                      <QrCode className="w-24 h-24 text-slate-300 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 text-left">Pix Copia e Cola:</p>
                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-500 font-mono truncate flex-1 text-left">{qrCode || "Gerando Pix..."}</p>
                  </div>
                  
                  <button onClick={handleCopyPix} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
                    {isPixCopied ? (<><Check className="w-5 h-5" />Código Copiado!</>) : (<><Copy className="w-5 h-5" />Copiar Código Pix</>)}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                  <RefreshCcw className="w-4 h-4 animate-spin" />Aguardando pagamento automático...
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
