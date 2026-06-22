import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Scale, QrCode, X, Copy, Download, Check, Search, FileText,
  Lock, UserX, Route, ArrowDown, RefreshCcw, MessageSquare,
  ClipboardList, Menu, Timer, Camera, TrafficCone, Car,
  Smartphone, Map, PlusCircle, Calendar, DollarSign, Tag, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}

const track = (gtagEvent: string, clarityEvent: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  if (window.gtag) window.gtag("event", gtagEvent, params || {});
  if (window.clarity) window.clarity("event", clarityEvent);
};

interface ExtractedMultaData {
  placa?: string;
  data?: string;
  valor?: string;
  infracao?: string;
  agente?: string;
  cidade?: string;
  ait?: string;
  hora?: string;
}

const formatDocumentText = (text: string) => {
  if (!text) return text;
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1");
  cleanText = cleanText.replace(/\*(.*?)\*/g, "$1");
  cleanText = cleanText.replace(/`/g, "");
  const parts = cleanText.split(/(\[[^\[\]]*\]|- STATUS DA ANÁLISE:.*?(?=\n|$))/gi);
  return parts.map((part, index) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <span key={index} className="text-red-500 bg-red-50 px-1 rounded-sm font-semibold">
          {part}
        </span>
      );
    }
    if (part.trim().toUpperCase().startsWith("- STATUS DA ANÁLISE:")) {
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
  const aitMatch = result.match(/(?:AIT|Auto de Infração)[^\d]*(\d[\d\.\-\/]+)/i);
  if (aitMatch) data.ait = aitMatch[1].trim();
  const horaMatch = result.match(/Hora:\s*(\d{1,2}[h:]\d{2})/i);
  if (horaMatch) data.hora = horaMatch[1].trim();
  return data;
};

const calculateDeadline = (dataInfracao: string | undefined) => {
  if (!dataInfracao) return null;
  try {
    const parts = dataInfracao.split("/");
    if (parts.length !== 3) return null;
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const prazoVencimento = new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    const agora = new Date();
    const diasRestantes = Math.ceil((prazoVencimento.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000));
    const dataVencimentoStr = prazoVencimento.toLocaleDateString("pt-BR");
    const urgente = diasRestantes <= 10 && diasRestantes > 0;
    return { diasRestantes, dataVencimento: dataVencimentoStr, urgente };
  } catch {
    return null;
  }
};

type Viabilidade = { nivel: "Alta" | "Média" | "Baixa"; cor: string; bg: string; borda: string };

const extractViabilidade = (result: string): Viabilidade | null => {
  const m = result.match(/VIABILIDADE DO RECURSO:\s*([A-Za-zÀ-ú]+)/i);
  if (!m) return null;
  const raw = m[1].trim().toLowerCase();
  if (raw.startsWith("alt")) return { nivel: "Alta", cor: "text-emerald-700", bg: "bg-emerald-50", borda: "border-emerald-200" };
  if (raw.startsWith("méd") || raw.startsWith("med")) return { nivel: "Média", cor: "text-amber-700", bg: "bg-amber-50", borda: "border-amber-200" };
  if (raw.startsWith("baix")) return { nivel: "Baixa", cor: "text-red-700", bg: "bg-red-50", borda: "border-red-200" };
  return null;
};

const extractPista = (result: string): string => {
  return result
    .replace(/- STATUS DA ANÁLISE:.*?(?=\n|$)/i, "")
    .replace(/DADOS EXTRA[ÍI]DOS DO SEU AUTO:[\s\S]*?(?=O QUE ENCONTRAMOS|DIAGN[ÓO]STICO|$)/i, "")
    .replace(/O QUE ENCONTRAMOS NA SUA MULTA:/i, "")
    .replace(/DIAGN[ÓO]STICO T[ÉE]CNICO DA IRREGULARIDADE:/i, "")
    .replace(/-?\s*VIABILIDADE DO RECURSO:.*?(?=\n|$)/i, "")
    .trim();
};

const LOADER_MESSAGES = [
  "Analisando documento...",
  "Lendo o auto de infração...",
  "Cruzando dados com o Artigo 280 do CTB...",
  "Verificando campo por campo no MBFT...",
];

const VIOLATION_TYPES = [
  { id: "velocidade", name: "Excesso de velocidade", subtitle: "radar ou lombada", icon: Camera },
  { id: "sinal", name: "Avanço de sinal", subtitle: "semáforo vermelho", icon: TrafficCone },
  { id: "estacionamento", name: "Estacionamento", subtitle: "irregular ou proibido", icon: Car },
  { id: "celular", name: "Celular ou cinto", subtitle: "uso e restrição", icon: Smartphone },
  { id: "pedagio", name: "Evasão de pedágio", subtitle: "cancelamento", icon: Map },
  { id: "outras", name: "Outras infrações", subtitle: "qualquer artigo", icon: PlusCircle },
];

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiredDate, setExpiredDate] = useState<string | null>(null);
  const [isExpiredBypassActive, setIsExpiredBypassActive] = useState(false);
  const [rejeicaoInfo, setRejeicaoInfo] = useState<{ tipo: "sem_falha" | "fora_escopo" | "prazo"; motivo: string } | null>(null);
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
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixTimeLeft, setPixTimeLeft] = useState(600);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);
  const [isSeoOpen, setIsSeoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem("checkmulta_saved_result");
    const savedPaidStatus = localStorage.getItem("checkmulta_paid_status");
    if (savedResult && savedPaidStatus === "true" && !defenseResult && !isGeneratingDefense) {
      setResult(savedResult);
      setIsPaid(true);
      setIsResultModalOpen(true);
      generateDefense(savedResult);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing || isGeneratingDefense) {
      interval = setInterval(() => setLoaderIndex((p) => (p + 1) % LOADER_MESSAGES.length), 2500);
    } else {
      setLoaderIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingDefense]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPixModalOpen && pixTimeLeft > 0) {
      timer = setInterval(() => setPixTimeLeft((p) => p - 1), 1000);
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
          localStorage.setItem("checkmulta_paid_status", "true");
          track("purchase", "funil_5_pagamento_confirmado", {
              transaction_id: paymentId,
              value: 19.9,
              currency: "BRL",
              items: [{ item_id: "defesa_ia", item_name: "Defesa de Multa - IA", price: 19.9, quantity: 1 }],
            });
        }
      } catch (err) {
        console.error("Erro no radar do PIX", err);
      }
    };
    if (isPixModalOpen && paymentId) {
      intervalId = setInterval(checkPaymentStatus, 3000);
      timeoutId = setTimeout(() => clearInterval(intervalId), 600000);
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
    track("violation_selected", "funil_1_infracao_selecionada", { violation_type: violationName });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Por favor, selecione um arquivo de imagem ou PDF válido.");
      return;
    }
    processFile(file);
    e.target.value = "";
  };

  const clearImage = (e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setDefenseResult(null);
    setError(null);
    setDefenseError(null);
    setCheckoutError(null);
    setRejeicaoInfo(null);
    setIsExpiredBypassActive(false);
    setIsPaid(false);
    setHasAnalyzed(false);
    setQrCode(null);
    setQrCodeUrl(null);
    setPaymentId(null);
    setSecretClickCount(0);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    setSelectedViolation(null);
    setIsUploadModalOpen(false);
    localStorage.removeItem("checkmulta_saved_result");
    localStorage.removeItem("checkmulta_paid_status");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNovaAnalise = () => {
    clearImage();
    setIsResultModalOpen(false);
    setRejeicaoInfo(null);
    setSelectedViolation(null);
    setIsUploadModalOpen(false);
  };

  const closeResultModal = () => {
    setIsResultModalOpen(false);
    if (result && !isPaid && !isExpiredBypassActive && !error) {
      setShowFomoBanner(true);
    }
  };

  const processFile = (file: File) => {
    track("file_upload", "funil_2_foto_enviada", { file_type: file.type });
    setImageFile(file);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setDefenseResult(null);
    setDefenseError(null);
    setCheckoutError(null);
    setRejeicaoInfo(null);
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
    setRejeicaoInfo(null);
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
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);
      let finalResult = data.result || "";
      const lowerResult = finalResult.toLowerCase();
      if (lowerResult.includes("documento_invalido") || lowerResult.includes("documento_inválido") || lowerResult.includes("erro_documento")) {
        isBusinessError = true;
        throw new Error("A imagem enviada não é uma notificação de trânsito válida. Por favor, envie uma foto do seu auto de infração.");
      }
      if (lowerResult.includes("imagem_ilegivel") || lowerResult.includes("imagem_ilegível") || lowerResult.includes("erro_imagem")) {
        isBusinessError = true;
        throw new Error("A imagem está muito borrada ou cortada. Por favor, envie uma foto nítida do documento.");
      }

      if (lowerResult.includes("rejeicao_fora_escopo")) {
        isBusinessError = true;
        const match = finalResult.match(/rejeicao_fora_escopo\|([^\n]+)/i);
        const tipoInfracao = match ? match[1].trim() : "Infração fora do escopo";
        setRejeicaoInfo({ tipo: "fora_escopo", motivo: tipoInfracao });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      if (lowerResult.includes("rejeicao_sem_falha")) {
        isBusinessError = true;
        setRejeicaoInfo({ tipo: "sem_falha", motivo: "" });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      if (lowerResult.includes("rejeicao_prazo_expirado")) {
        isBusinessError = true;
        let cleanBypassText = finalResult.replace(/rejeicao_prazo_expirado/gi, "").trim();
        if (cleanBypassText.length < 10) cleanBypassText = "Análise processada.";
        setRejeicaoInfo({ tipo: "prazo", motivo: cleanBypassText });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      setResult(finalResult);
      if (finalResult) {
        track("ia_analise_viavel", "funil_3_paywall_exibido");
        setHasAnalyzed(true);
        localStorage.setItem("checkmulta_saved_result", finalResult);
      }
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise:", err);
      setError(err.message || "Ocorreu um erro ao comunicar com o servidor.");
      setIsResultModalOpen(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckout = async () => {
    if (!result) return;
    setIsCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "comprador@checkmulta.com.br" }),
      });
      const data = await response.json();
      if (response.ok && data.qr_code) {
        track("begin_checkout", "funil_4_checkout_iniciado", { value: 19.9, currency: "BRL" });
        setPaymentId(data.id);
        setQrCode(data.qr_code);
        setQrCodeUrl(data.qr_code_url);
        setIsPixModalOpen(true);
      } else {
        setCheckoutError("Erro na integração com o Stripe. Tente novamente ou fale com o suporte.");
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Falha de conexão. Verifique sua internet ou tente novamente.");
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
      localStorage.setItem("checkmulta_paid_status", "true");
      generateDefense();
    }, 1500);
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
      if (!response.ok) throw new Error(data.error);
      setDefenseResult(data.result);
      setShowSuccessMessage(true);
      setShowFomoBanner(false);
      localStorage.removeItem("checkmulta_saved_result");
      localStorage.removeItem("checkmulta_paid_status");
    } catch (err: any) {
      setDefenseError("FALHA_GERACAO");
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
    } catch {}
  };

  const handleCopyPix = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setIsPixCopied(true);
      setTimeout(() => setIsPixCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!defenseResult) return;
    const blob = new Blob([defenseResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defesa-transito.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
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
                onClick={() => { setIsMobileMenuOpen(false); setActiveModal("suporte"); }}
                className="px-3 py-3 text-left bg-blue-50 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-between"
              >
                <span>Central de Suporte</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

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
                <strong>Atenção:</strong> Sua análise foi concluída. O prazo legal está correndo.
              </p>
            </div>
            <button
              onClick={() => { setShowFomoBanner(false); setIsResultModalOpen(true); }}
              className="px-6 py-2.5 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
            >
              Ver Resultado
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl flex-1 px-4 py-8 md:py-12 mx-auto">

        <section id="inicio" className="mb-10 flex flex-col items-center text-center w-full max-w-3xl mx-auto">
          <h1 className="text-[34px] sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-5 tracking-tight mt-4">
            Sua multa tem <span className="text-emerald-600">brecha legal?</span><br className="hidden sm:block" /> Descubra em 60 segundos
          </h1>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Nossa IA cruza seu auto de infração com o CTB e o MBFT e aponta erros do agente autuador que podem anular a penalidade.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-[13px] sm:text-sm font-bold text-slate-700 mb-10">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Análise gratuita</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-600" /> Sem cadastro</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-emerald-600" /> Resultado imediato</div>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-200 rounded-2xl bg-white shadow-sm mb-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
            <div className="py-6 px-4 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">Sem cadastro</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">direto ao ponto</span>
            </div>
            <div className="py-6 px-4 flex flex-col items-center justify-center bg-emerald-50/80">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">Grátis</span>
              <span className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase mt-1 tracking-wider">análise sem custo</span>
            </div>
            <div className="py-6 px-4 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">Art. 280</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">baseado no CTB</span>
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
                    <button
                      onClick={() => {
                        if (imageFile) {
                          if (result || error) {
                            setIsResultModalOpen(true);
                            setShowFomoBanner(false);
                          } else {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const resultStr = reader.result as string;
                              analyzeTicket(resultStr.split(",")[1], imageFile.type);
                            };
                            reader.readAsDataURL(imageFile);
                          }
                        }
                      }}
                      className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                      type="button"
                    >
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
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight">Descubra agora se sua multa pode ser anulada</h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">Selecione o tipo de infração para iniciar a análise gratuita:</p>
              </div>
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

              <div className="flex justify-center mt-8 mb-2">
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm">
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wide">IA analisando multas agora</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[55] overflow-y-auto bg-slate-900/70 backdrop-blur-sm">
            <div className="min-h-full flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-0.5">Análise gratuita</p>
                    <h3 className="text-base font-black text-white leading-tight">{selectedViolation}</h3>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Foto nítida garante melhor análise. Deixe <strong>data, placa e órgão autuador</strong> bem legíveis.
                    </p>
                  </div>

                  <div className="relative group rounded-xl transition-all duration-200 text-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/40 bg-emerald-50/20 cursor-pointer">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      disabled={isAnalyzing || isPaid}
                    />
                    <div className="flex flex-col items-center justify-center py-7 space-y-3 pointer-events-none">
                      <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Tirar Foto ou Enviar Arquivo</p>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">Toque para abrir a câmera</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <p className="text-[11px] font-medium">Imagem processada e deletada imediatamente</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <section id="como-funciona" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">Como funciona a análise?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5"><UploadCloud className="w-7 h-7" /></div>
              <h3 className="text-base font-bold text-slate-900 mb-2">1. Envie a foto</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Tire uma foto ou suba o PDF do auto de infração. Nenhum dado é armazenado.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5"><Search className="w-7 h-7" /></div>
              <h3 className="text-base font-bold text-slate-900 mb-2">2. A IA audita</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Cruzamos cada campo com o CTB e o Manual Brasileiro de Fiscalização (MBFT).</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5"><FileText className="w-7 h-7" /></div>
              <h3 className="text-base font-bold text-slate-900 mb-2">3. Diagnóstico grátis</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Revelamos a falha encontrada e o nível de viabilidade do seu recurso.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">O que o diagnóstico pode revelar</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="flex items-start gap-4 p-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Viabilidade Alta</span>
                  <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">Erro formal grave encontrado. Boas chances de anulação da multa.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider">Viabilidade Média</span>
                  <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">Há um ângulo de defesa possível, mas não garantido.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <span className="text-xs font-black text-red-500 uppercase tracking-wider">Viabilidade Baixa</span>
                  <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">Caso mais limitado. Ainda possível tentar — a decisão é sua.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

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

      <section id="faq-seo" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dúvidas Frequentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Como saber se ainda dá tempo de recorrer da multa?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Nossa IA analisa a data da infração e os prazos legais para confirmar se você ainda está dentro do período válido para apresentar defesa prévia ou recurso.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Quais multas podem be contestadas?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Qualquer infração pode ser contestada se houver erros formais na autuação. Nosso foco é identificar falhas do agente de trânsito baseadas no Manual Brasileiro de Fiscalização (MBFT).</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-slate-50 border-t border-slate-200 py-8 px-4 flex justify-center">
        <div className="max-w-4xl w-full">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
            <button onClick={() => setIsSeoOpen(!isSeoOpen)} className="w-full flex items-center justify-between text-left gap-4 group focus:outline-none">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Como recorrer de uma multa de trânsito no Brasil</h2>
              <ArrowDown className={`w-6 h-6 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isSeoOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {isSeoOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="prose prose-slate max-w-none space-y-6 text-slate-600 text-sm sm:text-base leading-relaxed font-medium mt-6 pt-6 border-t border-slate-100">
                    <p>Recorrer de uma multa de trânsito é um direito garantido pelo <strong className="text-slate-800">Código de Trânsito Brasileiro (CTB)</strong>.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <footer className="w-full text-center px-6 py-8 border-t border-gray-200 bg-gray-100 mt-auto">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="h-[40px] md:h-[48px] w-auto object-contain opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
        </div>
        <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
          🛡️ <strong className="font-bold text-slate-700">Transparência e Privacidade:</strong> Nosso sistema atua como organizador tecnológico com base no Manual Brasileiro de Fiscalização de Trânsito. A decisão final é do órgão julgador.
        </p>
        <p className="text-xs text-slate-700 font-medium mt-3">
          CheckMulta Tecnologia · CNPJ 64.824.475/0001-85
        </p>
        <div className="flex justify-center space-x-6 mt-4 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
          <button onClick={() => setActiveModal("termos")} className="hover:text-slate-600 transition-colors">Termos</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-slate-600 transition-colors">Privacy</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-slate-600 transition-colors">Legal</button>
          <button onClick={() => setActiveModal("suporte")} className="hover:text-blue-600 text-blue-500 transition-colors">Suporte</button>
        </div>
      </footer>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg flex flex-col relative">
                <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors z-10">
                  <X className="w-6 h-6" />
                </button>
                <div className="mb-4 pr-8">
                  {activeModal === "suporte" && <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span>💬</span> Central de Suporte</h3>}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3 font-medium">
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-2">
                      <div className="flex flex-col gap-3">
                        <a href="https://wa.me/5513996485501?text=Olá!" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 text-left">
                          <MessageSquare className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                          <div><strong className="block text-sm font-bold">Atendimento via WhatsApp</strong></div>
                        </a>
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
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 py-12">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className={`max-w-3xl w-full flex flex-col relative rounded-3xl shadow-2xl ${error ? "bg-red-50/95 p-8" : "bg-white/95 p-6 sm:p-10"}`}>
                <button onClick={closeResultModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors z-10">
                  <X className="w-6 h-6" />
                </button>

                <div className="w-full mt-4 space-y-6">
                  {isAnalyzing && <div className="text-center font-bold text-lg">Processando Documento...</div>}
                  {error && <div className="text-red-700 font-bold text-center">{error}</div>}

                  {result && !isPaid && !isAnalyzing && !error && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                        <div className="text-slate-800 text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                          {formatDocumentText(extractPista(result))}
                        </div>
                      </div>

                      {checkoutError && <div className="bg-red-50 text-red-700 p-3.5 rounded-xl font-bold">{checkoutError}</div>}

                      <button onClick={handleCheckout} disabled={isCheckoutLoading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg">
                        {isCheckoutLoading ? "Gerando PIX..." : "Gerar Minha Petição Agora"}
                      </button>
                      <p className="text-center text-[11px] text-slate-400 font-medium">CheckMulta Tecnologia · CNPJ 64.824.475/0001-85</p>
                    </div>
                  )}

                  {defenseResult && !showSuccessMessage && (
                    <div className="flex flex-col space-y-6">
                      <div className="whitespace-pre-wrap text-left text-[15px] font-medium font-serif bg-slate-50 p-6 rounded-2xl">
                        {formatDocumentText(defenseResult)}
                      </div>
                      <div className="flex flex-row justify-center gap-4">
                        <button onClick={handleCopy} className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold">{isCopied ? "Copiado!" : "Copiar"}</button>
                        <button onClick={handleDownload} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Baixar .txt</button>
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
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="min-h-full flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-11/12 max-w-sm bg-white rounded-3xl shadow-2xl p-6">
                <button onClick={() => setIsPixModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-5">
                  <h3 className="text-3xl font-black text-slate-900">R$ 19,90</h3>
                  <p className="text-[11px] text-slate-400">CheckMulta Tecnologia · CNPJ 64.824.475/0001-85</p>
                  <div className="flex justify-center">
                    <div className="w-48 h-48 bg-white border rounded-2xl flex items-center justify-center">
                      {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code Pix" className="w-full h-full p-2 object-contain" />}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border">
                    <p className="text-sm text-slate-500 truncate flex-1 text-left px-2">{qrCode}</p>
                    <button onClick={handleCopyPix} className="bg-white p-2 rounded-lg border">
                      {isPixCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-2">
                    <RefreshCcw className="w-4 h-4 animate-spin text-emerald-600" /> Aguardando pagamento...
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
