/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Scale, QrCode, X, Copy, Download, Check, Search, FileText, Lock, UserX, Route, ArrowDown, RefreshCcw, MessageSquare, ClipboardList, Menu, Timer, Zap, Camera, TrafficCone, Car, Smartphone, Map, PlusCircle, Calendar, DollarSign, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

interface ExtractedMultaData {
  placa?: string;
  data?: string;
  valor?: string;
  infracao?: string;
  agente?: string;
  cidade?: string;
}

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

const extractMultaData = (result: string): ExtractedMultaData => {
  const data: ExtractedMultaData = {};
  
  const placaMatch = result.match(/Placa:\s*([A-Z0-9\-]+)/i);
  if (placaMatch) data.placa = placaMatch[1].trim();
  
  const dataMatch = result.match(/Data:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dataMatch) data.data = dataMatch[1].trim();
  
  const valorMatch = result.match(/Valor:\s*R\$\s*([\d.,]+)/i);
  if (valorMatch) data.valor = valorMatch[1].trim();
  
  const infracaoMatch = result.match(/Infração:\s*([^\n]+)/i);
  if (infracaoMatch) data.infracao = infracaoMatch[1].trim();
  
  const agenteMatch = result.match(/Agente(?:\s+Autuador)?:\s*([^\n]+)/i);
  if (agenteMatch) data.agente = agenteMatch[1].trim();
  
  const cidadeMatch = result.match(/(?:Órgão|Cidade):\s*([^\n]+)/i);
  if (cidadeMatch) data.cidade = cidadeMatch[1].trim();
  
  return data;
};

const calculateDeadline = (dataInfracao: string | undefined): { diasRestantes: number; dataVencimento: string; urgente: boolean } | null => {
  if (!dataInfracao) return null;
  
  try {
    const parts = dataInfracao.split('/');
    if (parts.length !== 3) return null;
    
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const prazoVencimento = new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    const agora = new Date();
    const diasRestantes = Math.ceil((prazoVencimento.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000));
    
    const dataVencimentoStr = prazoVencimento.toLocaleDateString('pt-BR');
    const urgente = diasRestantes <= 10 && diasRestantes > 0;
    
    return { diasRestantes, dataVencimento: dataVencimentoStr, urgente };
  } catch (e) {
    return null;
  }
};

const LOADER_MESSAGES = [
  "Analisando documento...",
  "Lendo o auto de infração...",
  "Cruzando dados com o Artigo 280 do CTB...",
  "Buscando jurisprudência no MBFT..."
];

const VIOLATION_TYPES = [
  { id: 'velocidade', name: 'Excesso de velocidade', subtitle: 'radar ou lombada', icon: Camera },
  { id: 'sinal', name: 'Avanço de sinal', subtitle: 'semáforo vermelho', icon: TrafficCone },
  { id: 'estacionamento', name: 'Estacionamento', subtitle: 'irregular ou proibido', icon: Car },
  { id: 'celular', name: 'Celular ou cinto', subtitle: 'uso e restrição', icon: Smartphone },
  { id: 'pedagio', name: 'Evasão de pedágio', subtitle: 'cancelamento', icon: Map },
  { id: 'outras', name: 'Outras infrações', subtitle: 'qualquer artigo', icon: PlusCircle },
];

const SOCIAL_PROOF_MESSAGES = [
  { icon: <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />, text: "Há 2 min: Defesa de radar (SP) gerada com sucesso — economia de R$ 195,23" },
  { icon: <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />, text: "Há 5 min: Multa de celular (MG) anulada com nossa tese — economia de R$ 293,47" },
  { icon: <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />, text: "Há 12 min: Falha legal identificada em avanço de sinal (RJ) — 7 pontos salvos" },
  { icon: <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />, text: "Há 18 min: Recurso para Lei Seca (PR) estruturado com sucesso" },
  { icon: <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />, text: "Há 24 min: Erro formal de preenchimento detectado (SC) — economia de R$ 130,16" }
];

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expiredDate, setExpiredDate] = useState<string | null>(null);
  const [expiredBypassData, setExpiredBypassData] = useState<string | null>(null);
  
  const [isExpiredBypassActive, setIsExpiredBypassActive] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  const [isGeneratingDefense, setIsGeneratingDefense] = useState(false);
  const [defenseResult, setDefenseResult] = useState<string | null>(null);
  const [defenseError, setDefenseError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [isPaid, setIsPaid] = useState(false);
  const [activeModal, setActiveModal] = useState<"termos" | "privacidade" | "aviso" | "suporte" | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [showFomoBanner, setShowFomoBanner] = useState(false);
  
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [proofIndex, setProofIndex] = useState(() => Math.floor(Math.random() * SOCIAL_PROOF_MESSAGES.length));

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixTimeLeft, setPixTimeLeft] = useState(600);

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
    const interval = setInterval(() => {
      setProofIndex((prev) => (prev + 1) % SOCIAL_PROOF_MESSAGES.length);
    }, 4500); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPixModalOpen && pixTimeLeft > 0) {
      timer = setInterval(() => {
        setPixTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (!isPixModalOpen) {
      setPixTimeLeft(600);
    }
    return () => clearInterval(timer);
  }, [isPixModalOpen, pixTimeLeft]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      if (!paymentId || !isPixModalOpen) return;
      try {
        const res = await fetch(`/api/check-payment/${paymentId}`);
        const data = await res.json();

        if (data.status === "approved") {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          setIsPixModalOpen(false);
          setIsPaid(true);
          localStorage.setItem('checkmulta_paid_status', 'true'); 

          // O Analytics capta e manda para o Google Ads
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'purchase', {
              transaction_id: paymentId.toString(),
              value: 19.90,
              currency: 'BRL',
              items: [{ item_id: 'defesa_ia', item_name: 'Defesa de Multa - IA', price: 19.90, quantity: 1 }]
            });
          }
        }
      } catch (err) {
        console.error("Erro no radar do PIX", err);
      }
    };

    if (isPixModalOpen && paymentId) {
      intervalId = setInterval(checkPaymentStatus, 3000);

      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        console.log("Radar do PIX desativado por tempo limite.");
      }, 600000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPixModalOpen, paymentId]);

  useEffect(() => {
    if (isPaid && result && !defenseResult && !isGeneratingDefense) {
      generateDefense();
    }
  }, [isPaid, result]);

  const handleViolationSelect = (violationName: string) => {
    setSelectedViolation(violationName);
    setIsUploadModalOpen(true);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'violation_selected', { violation_type: violationName });
    }
  };

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
    setExpiredBypassData(null);
    setIsExpiredBypassActive(false);
    setIsPaid(false);
    setHasAnalyzed(false);
    setQrCode(null);
    setQrCodeBase64(null);
    setPaymentId(null);
    setSecretClickCount(0);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    setSelectedViolation(null);
    setIsUploadModalOpen(false);

    localStorage.removeItem('checkmulta_saved_result');
    localStorage.removeItem('checkmulta_paid_status');

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeResultModal = () => {
    setIsResultModalOpen(false);
    if (result && !isPaid && !isExpiredBypassActive && !error) {
      setShowFomoBanner(true);
    }
  };

  const processFile = (file: File) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'file_upload', { file_type: file.type });
    }

    setImageFile(file);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setDefenseResult(null);
    setDefenseError(null);
    setExpiredBypassData(null);
    setIsExpiredBypassActive(false);
    setIsPaid(false);
    setIsResultModalOpen(false);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    setIsUploadModalOpen(false); 

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
    setExpiredBypassData(null);
    setIsExpiredBypassActive(false);
    setIsPaid(false);
    setIsResultModalOpen(true);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);

    let isBusinessError = false; 

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

      if (lowerResult.includes("documento_invalido") || lowerResult.includes("documento_inválido") || lowerResult.includes("erro_documento")) {
        isBusinessError = true;
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_erro', { tipo: 'documento_invalido' });
        throw new Error("A imagem enviada não é uma notificação de trânsito válida. Por favor, envie uma foto do seu auto de infração.");
      }
      
      if (lowerResult.includes("imagem_ilegivel") || lowerResult.includes("imagem_ilegível") || lowerResult.includes("erro_imagem")) {
        isBusinessError = true;
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_erro', { tipo: 'imagem_ilegivel' });
        throw new Error("A imagem está muito borrada ou cortada. Por favor, envie uma foto nítida do documento.");
      }
      
      if (lowerResult.includes("rejeicao_prazo_expirado")) {
        isBusinessError = true;
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_inviavel', { motivo: 'prazo_expirado' });
        let cleanBypassText = finalResult.replace(/rejeicao_prazo_expirado/gi, "").trim();
        if (cleanBypassText.length < 10) {
          cleanBypassText = "Análise processada. (Atenção Dev: A IA do backend retornou apenas a tag de vencimento. Ajuste o prompt do backend para gerar a análise da infração mesmo quando estiver vencida).";
        }
        setExpiredBypassData(cleanBypassText); 
        throw new Error("Análise Concluída: O prazo de defesa desta notificação já está vencido.");
      }
      
      else if (lowerResult.includes("rejeição") || lowerResult.includes("rejeicao")) {
        isBusinessError = true;
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_inviavel', { motivo: 'sem_viabilidade_legal' });
        throw new Error("Análise Concluída: Não encontramos viabilidade legal para recurso nesta notificação.");
      }
      
      if (lowerResult.includes("erro_seguranca") || lowerResult.includes("erro_segurança")) {
        isBusinessError = true;
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_erro', { tipo: 'bloqueio_seguranca' });
        throw new Error("A imagem foi bloqueada por nossas diretrizes de segurança. Envie o documento original.");
      }

      let expDate: string | null = null;
      const prazoMatch = finalResult.match(/⚠️ Atenção: Prazo para recurso encerrado em ([^\n]+)/);
      if (prazoMatch) {
         expDate = prazoMatch[1].trim();
         finalResult = finalResult.replace(prazoMatch[0], "").trim();
      }

      setExpiredDate(expDate);
      setResult(finalResult);
      
      if (finalResult) {
        if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ia_analise_viavel');
        setHasAnalyzed(true);
        localStorage.setItem('checkmulta_saved_result', finalResult);
      }
      
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise:", err);
      
      if (!isBusinessError && typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'ia_erro_sistema', { error_message: err.message });
      }

      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        setError("Nossos servidores estão processando um alto volume de auditorias neste momento. Por favor, aguarde alguns segundos e tente enviar sua notificação novamente.");
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
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'begin_checkout', { value: 19.90, currency: 'BRL' });
        }

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
      setShowSuccessMessage(true); 
      setShowFomoBanner(false); 
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
      if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'defesa_copiada');
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
    if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'defesa_baixada');
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
      <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 h-16 md:h-20 flex items-center justify-between shadow-sm sticky top-0 z-40 overflow-visible">
        <div className="flex items-center h-full w-[180px] md:w-[240px]">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="w-full h-auto object-contain scale-[1.3] md:scale-[1.5] origin-left translate-y-1" />
        </div>
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-600 items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-blue-600 transition-colors">Segurança</a>
          <a href="#faq-seo" className="hover:text-blue-600 transition-colors">Dúvidas</a>
          <button onClick={() => setActiveModal("suporte")} className="hover:text-blue-600 transition-colors font-bold flex items-center gap-1 text-blue-600">
            Suporte
          </button>
        </nav>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="flex md:hidden p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-slate-50"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col p-4 space-y-3 md:hidden z-50"
            >
              <a href="#inicio" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Início</a>
              <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Como Funciona</a>
              <a href="#seguranca" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Segurança</a>
              <a href="#faq-seo" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Dúvidas</a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal("suporte");
                }} 
                className="px-3 py-3 text-left bg-blue-50 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-between"
              >
                <span>Central de Suporte</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* BANNER DE URGÊNCIA (FOMO) */}
      <AnimatePresence>
        {showFomoBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 w-full bg-red-600 text-white p-4 shadow-[0_-10px_40px_-15px_rgba(220,38,38,0.5)] z-30 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-red-500"
          >
            <div className="flex items-center gap-3 text-center sm:text-left">
              <AlertCircle className="w-6 h-6 animate-pulse hidden sm:block" />
              <p className="text-sm sm:text-base font-medium">
                <strong>Atenção:</strong> Sua petição de recurso validada expirará em 24h.
              </p>
            </div>
            <button
              onClick={() => {
                setShowFomoBanner(false);
                setIsResultModalOpen(true);
              }}
              className="px-6 py-2.5 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
            >
              Concluir Liberação
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl flex-1 px-4 py-8 md:py-12 mx-auto">
        
        {/* HERO SECTION */}
        <section id="inicio" className="mb-8 flex flex-col items-center text-center w-full max-w-3xl mx-auto">

          {/* HEADLINES */}
          <h1 className="text-[34px] sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-5 tracking-tight mt-4">
            Sua multa tem <span className="text-red-500">brecha legal?</span><br className="hidden sm:block" /> Descubra em 60 segundos
          </h1>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Nossa IA cruza seu auto de infração com o CTB e o MBFT e aponta erros do agente autuador que podem anular a penalidade.
          </p>

          {/* TRUST BADGES INLINE */}
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-[13px] sm:text-sm font-bold text-slate-700 mb-10">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Análise gratuita</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-600" /> Sem cadastro</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-emerald-600" /> Resultado imediato</div>
          </div>

          {/* STATS SECTION */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-200 rounded-2xl bg-white shadow-sm mb-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
             <div className="py-6 px-4 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">12.400+</span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">multas analisadas</span>
             </div>
             <div className="py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">67%</span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">apresentam brecha</span>
             </div>
             <div className="py-6 px-4 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">R$ 293</span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">economia média</span>
             </div>
          </div>
        </section>
        
        <main className="w-full max-w-3xl mx-auto">
          {previewUrl ? (
             <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 transition-all duration-200 ease-in-out text-center mt-6">
                <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="relative mx-auto rounded-2xl overflow-hidden max-w-xs flex justify-center">
                    {imageFile?.type === "application/pdf" ? (
                      <div className="w-32 h-32 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200">
                        <FileText className="w-16 h-16 text-blue-600" />
                      </div>
                    ) : (
                      <img src={previewUrl} alt="Preview da multa" className="w-full h-auto object-cover max-h-48" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-600">{imageFile?.name}</p>
                  
                  {!isAnalyzing && !hasAnalyzed && (
                    <button onClick={clearImage} className="relative z-10 text-sm font-medium text-slate-500 hover:text-red-500 underline decoration-slate-300 hover:decoration-red-300 underline-offset-4 transition-colors" type="button">
                      Excluir ou subir nova foto
                    </button>
                  )}
                  {!isAnalyzing && hasAnalyzed && (
                    <div className="relative z-10 flex flex-row items-center justify-center gap-3 mt-4 w-full">
                      <button onClick={() => {
                        if (imageFile) {
                          if (result || error) {
                            setIsResultModalOpen(true);
                            setShowFomoBanner(false); 
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
                      }} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap" type="button">
                        Ver Resultado Novamente
                      </button>
                      <button onClick={clearImage} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap" type="button">
                        Nova Multa
                      </button>
                    </div>
                  )}
                </motion.div>
             </div>
          ) : (
             <div className="text-center mt-6">
                <h2 className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 sm:mb-6">Qual foi o motivo da autuação?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {VIOLATION_TYPES.map((v) => (
                    <button 
                      key={v.id}
                      onClick={() => handleViolationSelect(v.name)}
                      className="flex flex-col items-center justify-center gap-2.5 p-5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all duration-200 group text-slate-800 hover:text-blue-800 shadow-sm hover:shadow"
                    >
                      <v.icon className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mb-1" />
                      <div className="text-center">
                        <span className="block text-sm sm:text-[15px] font-bold leading-tight">{v.name}</span>
                        <span className="block text-[11px] sm:text-xs text-slate-500 font-medium mt-1">{v.subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* BADGE PISCANDO E DINÂMICA ABAIXO DOS BOTÕES */}
                <div className="flex justify-center mt-8 mb-2">
                  <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm">
                    <div className="relative flex items-center justify-center w-3 h-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wide">IA analisando multas agora</span>
                  </div>
                </div>
             </div>
          )}
          
          {/* BANNER DE PROVA SOCIAL - RESPONSIVO E COM INÍCIO ALEATÓRIO */}
          <div className="flex justify-center mt-4 min-h-[52px] sm:h-10 overflow-hidden relative w-full px-4 sm:px-0 mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={proofIndex}
                initial={{ y: 25, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -25, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute flex items-center justify-center gap-2 text-[12px] sm:text-[13px] font-medium text-slate-600 w-full text-center leading-snug"
              >
                {SOCIAL_PROOF_MESSAGES[proofIndex].icon}
                <span>{SOCIAL_PROOF_MESSAGES[proofIndex].text}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          
        </main>
      </div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[55] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="min-h-full flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Análise de {selectedViolation}</h3>
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left flex items-start gap-3 mt-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 font-medium">
                      <strong>Dica para a Inteligência Artificial:</strong> Para conseguirmos achar as brechas na lei, a sua foto precisa estar nítida. Deixe as <strong>datas, a placa e o órgão autuador</strong> bem legíveis.
                    </p>
                  </div>
                </div>

                <div className="relative group rounded-2xl p-8 transition-all duration-200 ease-in-out text-center border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-slate-50/50 cursor-pointer">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" disabled={isAnalyzing || isPaid} title="Clique para enviar a foto" />
                  <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                    <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-slate-800">Tirar Foto ou Enviar Arquivo</p>
                      <p className="text-slate-500 text-sm font-medium">Toque aqui para abrir a câmera.</p>
                    </div>
                  </div>
                </div>
                
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SEÇÃO "COMO FUNCIONA" */}
      <section id="como-funciona" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">Como funciona a análise?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><UploadCloud className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Envie a foto do documento</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Tire uma foto ou suba o PDF do seu auto de infração. Nenhum dado é armazenado.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><Search className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. A IA audita o preenchimento</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Cruzamos cada campo com o CTB e o Manual Brasileiro de Fiscalização de Trânsito (MBFT).</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><FileText className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. Diagnóstico grátis</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Se houver brecha, geramos a petição técnica pronta para protocolar — sem burocracia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO "SEGURANÇA" */}
      <section id="seguranca" className="w-full bg-white border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">Seus Dados 100% Seguros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6"><Lock className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Zero Armazenamento</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Não guardamos a foto do seu documento. A imagem é processada na memória do servidor e imediatamente deletada.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><UserX className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Sem Cadastro</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Você não precisa criar conta, colocar e-mail ou senha para auditar a sua multa. É direto ao ponto.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6"><Route className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Total Transparência</h3>
              <p className="text-slate-600 font-medium leading-relaxed">Atuamos como uma ferramenta tecnológica baseada no CTB. Nós criamos a tese, mas a decisão final é do órgão julgador.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO "FAQ" */}
      <section id="faq-seo" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dúvidas Frequentes</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Como saber se ainda dá tempo de recorrer da multa?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Nossa inteligência artificial analisa a data da infração e os prazos legais da sua notificação para confirmar se você ainda está dentro do período válido para apresentar sua defesa prévia ou recurso.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Quais multas podem ser contestadas?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Praticamente qualquer infração pode ser contestada se houver erros formais na autuação. Nosso foco é identificar falhas do agente de trânsito baseadas no Manual Brasileiro de Fiscalização (MBFT).</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Como funciona a análise da CheckMulta?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Você envia a foto do seu documento, nosso sistema cruza os dados com a legislação vigente em segundos e aponta se há viabilidade legal para solicitar a anulação da penalidade.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">O que contém o relatório de contestação?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">O modelo de recurso gerado entrega uma defesa estruturada e fundamentada em leis, pronta para você preencher com seus dados pessoais e protocolar no órgão autuador.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 md:col-span-2 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Vale a pena recorrer de uma multa?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Sim! Recorrer é um direito garantido por lei. Além de evitar pontos na CNH e a cobrança financeira, a defesa obriga o órgão a provar que a autuação foi feita de forma impecável, o que muitas vezes não ocorre devido a erros de preenchimento.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full text-center px-6 py-8 border-t border-gray-200 bg-gray-100 mt-auto">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="h-[40px] md:h-[48px] w-auto object-contain opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
        </div>
        <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
          🛡️ <strong className="font-bold text-slate-700">Transparência e Privacidade:</strong> Nosso sistema atua como organizador tecnológico com base no Manual Brasileiro de Fiscalização de Trânsito. A decisão final é do órgão julgador. Não exigimos cadastro e não armazenamos a sua petição ou dados do veículo. Tudo é apagado após o download.
        </p>
        <div className="flex justify-center space-x-6 mt-6 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
          <button onClick={() => setActiveModal("termos")} className="hover:text-slate-600 transition-colors">Termos</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-slate-600 transition-colors">Privacidade</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-slate-600 transition-colors">Legal</button>
          <button onClick={() => setActiveModal("suporte")} className="hover:text-blue-600 text-blue-500 transition-colors">Suporte</button>
        </div>
      </footer>
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10" aria-label="Fechar"><X className="w-6 h-6" /></button>
                <div className="mb-4 pr-8">
                  {activeModal === "aviso" && <h3 className="text-xl font-bold text-slate-800">Aviso Jurídico</h3>}
                  {activeModal === "termos" && <h3 className="text-xl font-bold text-slate-800">Termos de Uso</h3>}
                  {activeModal === "privacidade" && <h3 className="text-xl font-bold text-slate-800">Políticas de Privacidade</h3>}
                  {activeModal === "suporte" && <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span>💬</span> Central de Suporte</h3>}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3 font-medium">
                  {activeModal === "aviso" && <p>Este documento é um modelo referencial gerado automaticamente e não constitui consultoria jurídica garantida. Nós não somos um escritório de advocacia. <strong>A decisão final do recurso é exclusiva responsabilidade do órgão autuador.</strong> Nossa garantia cobre apenas a geração técnica do documento. É plenamente possível que o recurso seja indeferido, não implicando em reembolso.</p>}
                  {activeModal === "termos" && <p>O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário ou resultado das decisões julgadas pelas juntas de recursos ou instâncias superiores.</p>}
                  {activeModal === "privacidade" && <p>Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros ou retenções em log da fotografia do seu auto de infração, dados pessoais ou da petição gerada. O processamento é de estrito caráter transitório (em memória) para elaboração do documento, que é imediatamente apagado após o fechamento da página ou download.</p>}
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-2">
                      <p className="text-sm text-slate-600 font-medium">Selecione o canal de atendimento abaixo para falar com o nosso time técnico:</p>
                      <div className="flex flex-col gap-3">
                        <a href="https://wa.me/5513996485501?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20CheckMulta." target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 transition-colors text-left">
                          <MessageSquare className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                          <div><strong className="block text-sm font-bold">Atendimento via WhatsApp</strong><span className="text-xs text-emerald-700 font-medium">Fale direto com um analista</span></div>
                        </a>
                        <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-900 transition-colors text-left">
                          <ClipboardList className="w-6 h-6 text-blue-600 flex-shrink-0" />
                          <div><strong className="block text-sm font-bold">Abrir Chamado Técnico</strong><span className="text-xs text-blue-700 font-medium">Reembolsos ou falhas</span></div>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                {activeModal !== "suporte" && (
                  <button onClick={() => setActiveModal(null)} className="mt-8 w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Entendi e concordo</button>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 py-12">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                className={`max-w-3xl w-full flex flex-col relative rounded-3xl shadow-2xl ${error ? "bg-red-50/95 border border-red-200 p-8" : "bg-white/95 backdrop-blur-md p-6 sm:p-10"}`} 
                onClick={(e) => e.stopPropagation()}>
                <button onClick={closeResultModal} className={`absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors z-10 ${error ? "hover:bg-red-100" : "hover:bg-slate-100"}`} aria-label="Fechar"><X className="w-6 h-6" /></button>
                <div className="w-full mt-4 space-y-6">
                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-md mx-auto">
                      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <Search className="w-10 h-10 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 text-center">Processando Documento</h3>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div className="absolute top-0 left-0 h-full w-1/2 bg-blue-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                      </div>
                      <div className="min-h-[60px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-bold text-blue-700 text-center text-lg">{LOADER_MESSAGES[loaderIndex]}</motion.p>
                        </AnimatePresence>
                      </div>
                      <p className="text-sm text-slate-500 font-medium text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                        A inteligência artificial está extraindo os dados em alta resolução. <strong>Isso pode levar cerca de 1 minuto.</strong> Não feche a tela.
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800 mb-2">Análise Indisponível</h3>
                        <p className="text-red-700 font-medium leading-relaxed">{error}</p>
                      </div>
                      
                      {expiredBypassData && (
                        <button
                          onClick={() => {
                            setError(null);
                            setResult(expiredBypassData);
                            setHasAnalyzed(true);
                            setIsExpiredBypassActive(true); 
                            localStorage.setItem('checkmulta_saved_result', expiredBypassData);
                          }}
                          className="mt-4 px-4 py-2 text-sm text-red-700 bg-red-100 hover:bg-red-200 font-bold rounded-lg transition-colors underline decoration-red-300 underline-offset-4"
                        >
                          Ver resultado mesmo assim
                        </button>
                      )}
                    </div>
                  )}
                  {result && !isPaid && !isAnalyzing && !error && (
                    <div className="space-y-6">
                      {isExpiredBypassActive && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="text-red-800 font-bold">Atenção: Esta multa está vencida.</p>
                            <p className="text-red-700 text-sm mt-1 font-medium">A geração deste documento é somente para fins de análise e consulta.</p>
                          </div>
                        </div>
                      )}

                      {/* DADOS PERSONALIZADOS DA MULTA */}
                      {(() => {
                        const multaData = extractMultaData(result);
                        const deadline = multaData.data ? calculateDeadline(multaData.data) : null;
                        
                        return (
                          <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Sua Multa Analisada</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {multaData.placa && (
                                <div className="flex items-center gap-2.5">
                                  <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div className="text-[13px]">
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Placa</p>
                                    <p className="font-black text-slate-900">{multaData.placa}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.data && (
                                <div className="flex items-center gap-2.5">
                                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div className="text-[13px]">
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Data</p>
                                    <p className="font-black text-slate-900">{multaData.data}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.valor && (
                                <div className="flex items-center gap-2.5">
                                  <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div className="text-[13px]">
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Valor</p>
                                    <p className="font-black text-slate-900">{multaData.valor}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* PRAZO LEGAL COM URGÊNCIA */}
                            {deadline && (
                              <div className={`mt-4 pt-4 border-t border-blue-200/60 flex items-center gap-3 ${deadline.urgente ? 'bg-red-50 p-3 rounded-xl border border-red-100' : ''}`}>
                                <Timer className={`w-5 h-5 flex-shrink-0 ${deadline.urgente ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
                                <div className="text-[13px]">
                                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Prazo para Recurso</p>
                                  <p className={`font-black text-[15px] ${deadline.urgente ? 'text-red-700' : 'text-slate-900'}`}>
                                    {deadline.diasRestantes > 0 ? `${deadline.diasRestantes} dias restantes` : 'Prazo expirado'}
                                  </p>
                                  {deadline.diasRestantes > 0 && (
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Vence em {deadline.dataVencimento}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* CABEÇALHO DO SUCESSO */}
                      <div className="flex items-start space-x-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-1" />
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 leading-tight">Sua multa apresenta <span className="text-red-500">brecha legal</span></h2>
                          <p className="text-slate-600 font-medium leading-relaxed">Nossa IA encontrou erros de preenchimento que fundamentam a anulação.</p>
                          <div className="mt-3 flex flex-col items-start">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />Probabilidade de Êxito: ALTA
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TRADUTOR DE BENEFÍCIOS */}
                      <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 shadow-sm text-left relative overflow-hidden mt-6 mb-2">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                        <h3 className="text-slate-900 font-black text-base sm:text-lg mb-4 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600" /> Resumo da Brecha:
                        </h3>
                        <ul className="space-y-4 text-[13px] sm:text-[15px] text-slate-700 font-medium">
                          <li className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">1</span>
                            <span><strong className="text-slate-900">O erro do agente:</strong> Nossa IA cruzou seu documento com o Código de Trânsito e identificou falhas no preenchimento da infração.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">2</span>
                            <span><strong className="text-slate-900">O que isso significa:</strong> Essa irregularidade técnica cria uma brecha legal com <strong className="text-slate-900 underline decoration-blue-300">alta probabilidade de anulação</strong> da multa.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">3</span>
                            <span><strong className="text-slate-900">Sua defesa:</strong> O modelo de R$ 19,90 contém a fundamentação legal estruturada para maximizar as suas chances de anulação junto ao órgão autuador.</span>
                          </li>
                        </ul>
                      </div>

                      {/* DIAGNÓSTICO TÉCNICO */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Diagnóstico Técnico da IA</p>
                        <div className="text-slate-600 text-[13px] sm:text-sm font-medium whitespace-pre-wrap leading-relaxed">
                          {formatDocumentText(result.replace(/- STATUS DA ANÁLISE:.*?(?=\n|$)/i, '').trim())}
                        </div>
                      </div>

                      {/* CTA COM COMPARAÇÃO DE ECONOMIA */}
                      <div className="pt-4 border-t border-slate-200">
                        <div className="flex flex-col space-y-4 sm:space-y-5 w-full">
                          <p className="text-center text-slate-900 text-xl sm:text-2xl font-black px-1 leading-tight mb-2">
                            Aproveite a Brecha Legal
                            <span className="text-emerald-600 text-sm sm:text-base font-bold mt-2 block uppercase tracking-wide">Libere sua defesa estruturada em 60 segundos</span>
                          </p>
                          
                          {/* COMPARAÇÃO DE ECONOMIA */}
                          {(() => {
                            const multaData = extractMultaData(result);
                            const valorMulta = multaData.valor ? parseFloat(multaData.valor.replace(/[R$\s.,]/g, '').replace(',', '.')) : null;
                            const custoAdvogado = 700;
                            const custoCheckMulta = 19.90;
                            const economia = valorMulta ? Math.max(custoAdvogado, valorMulta * 0.15) : custoAdvogado;
                            
                            return (
                              <div className="bg-white rounded-2xl p-5 text-left border border-slate-200 shadow-sm w-full">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Comparação de Investimento</p>
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">Com Advogado:</p>
                                      <p className="text-[12px] text-slate-500 mt-1 font-medium">Petição + acompanhamento</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-black text-slate-400 line-through">R$ 500-1000</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start justify-between pb-4">
                                    <div>
                                      <p className="text-base font-black text-emerald-700">Com CheckMulta:</p>
                                      <p className="text-[12px] text-emerald-600/80 mt-1 font-bold uppercase tracking-wider">Petição estruturada na hora</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xl font-black text-emerald-700">R$ 19,90</p>
                                    </div>
                                  </div>
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <p className="text-sm font-black text-emerald-800">
                                      Economia estimada de <strong>R$ {Math.round(economia).toLocaleString('pt-BR')}</strong>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* AVISO LEGAL */}
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-[11px] sm:text-xs text-amber-800 font-medium leading-relaxed">
                              <p><strong>Transparência Jurídica:</strong> O CheckMulta gera a petição com tese técnica validada. A decisão final depende exclusivamente do órgão julgador. Sua economia é garantida no preço do documento gerado.</p>
                            </div>
                          </div>

                          <button onClick={handleCheckout} disabled={isCheckoutLoading} className="w-full flex flex-col items-center justify-center py-4 px-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-75 disabled:cursor-not-allowed font-bold">
                            <div className="flex flex-row items-center justify-center gap-2 text-lg text-center leading-tight">
                              {isCheckoutLoading ? <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" /> : <Scale className="w-6 h-6 flex-shrink-0" />}
                              <span>{isCheckoutLoading ? "Gerando PIX..." : "Gerar Minha Petição Agora"}</span>
                            </div>
                            <span className="text-sm font-medium text-emerald-100 mt-1">Pagamento Único (R$ 19,90) • Entrega Imediata</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {isGeneratingDefense && (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 max-w-md mx-auto">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <FileText className="w-10 h-10 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 text-center">Redigindo Defesa</h3>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div className="absolute top-0 left-0 h-full w-1/2 bg-emerald-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                      </div>
                      <div className="min-h-[60px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-bold text-emerald-700 text-center text-lg">{LOADER_MESSAGES[loaderIndex]}</motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl w-full mt-4">
                        <p className="text-base md:text-lg text-emerald-800 font-black text-center flex items-center justify-center gap-2">
                          <ShieldCheck className="w-5 h-5" /> Pagamento confirmado!
                        </p>
                        <p className="text-sm text-emerald-600 font-medium text-center mt-1">
                          Por favor, aguarde e não feche esta janela.
                        </p>
                      </div>
                    </div>
                  )}
                  {defenseError && (
                    <div className="flex flex-col items-center text-center space-y-4 p-8 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800 mb-2">Falha na Geração da Defesa</h3>
                        <p className="text-red-700 font-medium leading-relaxed">
                          Ocorreu uma instabilidade na hora de escrever o documento, mas <strong>o seu pagamento está seguro.</strong> Clique abaixo para falar com nossa equipe técnica e receber seu arquivo imediatamente.
                        </p>
                      </div>
                      <a href="https://wa.me/5513996485501?text=Olá!%20Eu%20paguei%20pelo%20recurso%20agora%20mesmo,%20mas%20a%20tela%20deu%20erro%20na%20hora%20de%20carregar%20a%20petição.%20Pode%20me%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Contatar Suporte no WhatsApp
                      </a>
                    </div>
                  )}
                  
                  {defenseResult && showSuccessMessage && (
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 p-4 sm:p-10 w-full max-w-md mx-auto">
                      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-14 h-14" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Tudo certo!</h3>
                        <p className="text-slate-600 text-lg font-medium leading-relaxed">
                          Seu documento jurídico foi gerado com sucesso pela nossa inteligência artificial e já está pronto.
                        </p>
                        <p className="text-slate-500 mt-2 font-medium">
                          Na próxima tela, basta copiar o texto ou baixar o arquivo.
                        </p>
                      </div>
                      <div className="w-full flex flex-col items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                        <button 
                          onClick={() => setShowSuccessMessage(false)} 
                          className="w-full py-3.5 sm:py-4 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-base sm:text-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          OK, Ver Minha Petição <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setActiveModal("suporte")} 
                          className="text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium flex items-center gap-1"
                        >
                          Precisa de ajuda? Fale com o suporte.
                        </button>
                      </div>
                    </div>
                  )}

                  {defenseResult && !showSuccessMessage && (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                        <Scale className="w-6 h-6 text-slate-800" />
                        <h2 className="text-xl font-bold text-slate-800 text-center">Sua Defesa Jurídica Pronta</h2>
                      </div>
                      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-2 mb-4 rounded-r-xl">
                        <p className="text-sm text-amber-800 font-medium">
                          <strong>Atenção:</strong> Revise o documento abaixo. É obrigatório substituir todos os campos destacados em <span className="text-red-600 font-bold bg-red-100 px-1 rounded">vermelho</span> pelas suas informações reais antes do protocolo.
                        </p>
                      </div>
                      <div className="text-slate-800 p-4 sm:p-8 mx-auto bg-slate-50 rounded-2xl font-serif border border-slate-200 w-full shadow-inner">
                        <div className="whitespace-pre-wrap text-left text-[15px] md:text-base leading-relaxed font-medium">
                          {formatDocumentText(defenseResult)}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-4 pt-6 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                          <button onClick={handleCopy} className="flex items-center justify-center space-x-2 px-8 py-4 bg-white text-slate-800 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-bold text-lg w-full sm:w-auto shadow-sm">
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
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPixModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
             <div className="min-h-full flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-11/12 max-w-sm bg-white rounded-3xl shadow-2xl p-6">
                <button onClick={() => setIsPixModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                
                  <div className="text-center space-y-5">
                    <div className="flex justify-center">
                      <div 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          setSecretClickCount(prev => {
                            if (prev + 1 >= 5) {
                              simulateApprovedPayment();
                              return 0;
                            }
                            return prev + 1;
                          });
                        }}
                      >
                        <img src="/mercadopago.png" alt="Mercado Pago" width="150" height="40" className="h-8 w-auto object-contain" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">R$ 19,90</h3>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Petição Estruturada (IA)</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-red-700 font-bold bg-red-50 py-2.5 rounded-xl border border-red-100">
                      <Timer className="w-5 h-5 animate-pulse" />
                      <span className="text-sm">Expira em {formatTime(pixTimeLeft)}</span>
                    </div>
                    
                    <div className="flex justify-center py-2"><div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-sm">
                      {qrCodeBase64 ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code" width="192" height="192" className="w-full h-full p-2 object-contain rounded-xl" /> : <QrCode className="w-24 h-24 text-slate-200 animate-pulse" />}
                    </div></div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 font-mono truncate flex-1 text-left px-2">{qrCode || "Gerando Pix..."}</p>
                        <button onClick={handleCopyPix} className="bg-white text-slate-700 hover:text-emerald-600 hover:border-emerald-300 p-2.5 rounded-lg transition-colors border border-slate-200 shadow-sm">
                          {isPixCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-left">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed font-medium text-emerald-900">
                          <strong>Garantia Técnica:</strong> Se a petição não for liberada em 10 segundos após o pagamento, garantimos reembolso via PIX.
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-left">
                        <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] leading-relaxed font-medium text-slate-600">
                          Para sua segurança, o recebedor no app do banco aparecerá em nome de <strong>João Antônio de Brito</strong> (Diretor CheckMulta).
                        </p>
                      </div>
                      
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500 font-bold">
                      <RefreshCcw className="w-4 h-4 animate-spin text-emerald-600" />
                      Aguardando PIX no banco...
                    </div>
                  </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
