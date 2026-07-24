/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Scale, QrCode, X, Copy, Download, Check, Search, FileText,
  Lock, UserX, Route, ArrowDown, RefreshCcw, MessageSquare,
  ClipboardList, Menu, Timer, Camera, TrafficCone, Car,
  Smartphone, Map, PlusCircle, Calendar, DollarSign, Tag, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}

// Helper: dispara evento no Clarity (se disponível) e no gtag simultaneamente
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

// ─── FORMATAÇÃO DO DOCUMENTO ───────────────────────────────────────────────
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

// ─── EXTRAÇÃO DE DADOS DA MULTA ────────────────────────────────────────────
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

// ─── CÁLCULO DE PRAZO ──────────────────────────────────────────────────────
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

// ─── VIABILIDADE: extrai nível e devolve estilo de cor ─────────────────────
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

// ─── Limpa o texto da pista, removendo cabeçalhos e a linha de viabilidade ──
const extractPista = (result: string): string => {
  return result
    .replace(/- STATUS DA ANÁLISE:.*?(?=\n|$)/i, "")
    .replace(/DADOS EXTRA[ÍI]DOS DO SEU AUTO:[\s\S]*?(?=O QUE ENCONTRAMOS|DIAGN[ÓO]STICO|$)/i, "")
    .replace(/O QUE ENCONTRAMOS NA SUA MULTA:/i, "")
    .replace(/DIAGN[ÓO]STICO T[ÉE]CNICO DA IRREGULARIDADE:/i, "")
    .replace(/-?\s*VIABILIDADE DO RECURSO:.*?(?=\n|$)/i, "")
    .trim();
};

// ─── CONSTANTES ────────────────────────────────────────────────────────────
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

// ─── GUIAS DO BLOG (links internos home → blog, passa autoridade) ──────────
const BLOG_GUIAS = [
  { titulo: "Direitos do motorista na blitz policial", slug: "blitz-policia-direitos-motorista" },
  { titulo: "Multa de moto: como recorrer", slug: "multa-transito-moto-como-recorrer" },
  { titulo: "CNH vencida: o que fazer", slug: "multa-cnh-vencida-o-que-fazer" },
  { titulo: "Como recorrer de multa: passo a passo", slug: "como-recorrer-multa-transito-passo-a-passo" },
  { titulo: "Artigo 280 do CTB: o que é", slug: "artigo-280-ctb-o-que-e" },
  { titulo: "Multa de lombada eletrônica: como recorrer", slug: "multa-lombada-eletronica-como-recorrer" },
];

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
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
  // Rejeição elegante: tipo + motivo legível
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

  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);
  const [isSeoOpen, setIsSeoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── EFEITOS ─────────────────────────────────────────────────────────────
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
              transaction_id: paymentId.toString(),
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

  // ─── HANDLERS ────────────────────────────────────────────────────────────
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
    setExpiredBypassData(null);
    setRejeicaoInfo(null);
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
    localStorage.removeItem("checkmulta_saved_result");
    localStorage.removeItem("checkmulta_paid_status");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Reseta tudo e volta para os cards de seleção de infração — sem rastro do estado anterior
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
    setExpiredBypassData(null);
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
    setExpiredBypassData(null);
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
        if (typeof window !== "undefined" && window.gtag) window.gtag("event", "ia_analise_erro", { tipo: "documento_invalido" });
        throw new Error("A imagem enviada não é uma notificação de trânsito válida. Por favor, envie uma foto do seu auto de infração.");
      }
      if (lowerResult.includes("imagem_ilegivel") || lowerResult.includes("imagem_ilegível") || lowerResult.includes("erro_imagem")) {
        isBusinessError = true;
        if (typeof window !== "undefined" && window.gtag) window.gtag("event", "ia_analise_erro", { tipo: "imagem_ilegivel" });
        throw new Error("A imagem está muito borrada ou cortada. Por favor, envie uma foto nítida do documento.");
      }

      // ── Rejeição fora do escopo (Lei Seca, penal, etc) ──────────────────
      if (lowerResult.includes("rejeicao_fora_escopo")) {
        isBusinessError = true;
        const match = finalResult.match(/rejeicao_fora_escopo\|([^\n]+)/i);
        const tipoInfracao = match ? match[1].trim() : "Infração fora do escopo";
        track("ia_analise_inviavel", "funil_3_rejeitado_fora_escopo", { motivo: "fora_escopo" });
        setRejeicaoInfo({ tipo: "fora_escopo", motivo: tipoInfracao });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      // ── Rejeição: multa sem nenhuma falha real ───────────────────────────
      if (lowerResult.includes("rejeicao_sem_falha")) {
        isBusinessError = true;
        track("ia_analise_inviavel", "funil_3_rejeitado_sem_falha", { motivo: "sem_falha" });
        setRejeicaoInfo({ tipo: "sem_falha", motivo: "" });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      // ── Prazo vencido: mantém o resultado mas sinaliza ───────────────────
      if (lowerResult.includes("rejeicao_prazo_expirado")) {
        isBusinessError = true;
        track("ia_analise_inviavel", "funil_3_rejeitado_prazo_expirado", { motivo: "prazo_expirado" });
        let cleanBypassText = finalResult.replace(/rejeicao_prazo_expirado/gi, "").trim();
        if (cleanBypassText.length < 10) cleanBypassText = "Análise processada.";
        setRejeicaoInfo({ tipo: "prazo", motivo: cleanBypassText });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      // ── Fallback: qualquer outra rejeicao genérica ───────────────────────
      if (lowerResult.includes("rejeição") || lowerResult.includes("rejeicao")) {
        isBusinessError = true;
        if (typeof window !== "undefined" && window.gtag) window.gtag("event", "ia_analise_inviavel", { motivo: "generica" });
        setRejeicaoInfo({ tipo: "sem_falha", motivo: "" });
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }
      if (lowerResult.includes("erro_seguranca") || lowerResult.includes("erro_segurança")) {
        isBusinessError = true;
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
        track("ia_analise_viavel", "funil_3_paywall_exibido");
        setHasAnalyzed(true);
        localStorage.setItem("checkmulta_saved_result", finalResult);
      }
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise:", err);
      if (!isBusinessError && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "ia_erro_sistema", { error_message: err.message });
      }
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        setError("Nossos servidores estão processando um alto volume de auditorias. Por favor, aguarde alguns segundos e tente novamente.");
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
    setCheckoutError(null);
    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "comprador@checkmulta.com.br" }),
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor demorou para responder. Por favor, aguarde 1 minuto e clique novamente.");
      }
      const data = await response.json();
      if (response.ok && data.qr_code) {
        track("begin_checkout", "funil_4_checkout_iniciado", { value: 19.9, currency: "BRL" });
        setPaymentId(data.id);
        setQrCode(data.qr_code);
        setQrCodeBase64(data.qr_code_base64);
        setIsPixModalOpen(true);
      } else {
        setCheckoutError("Erro na integração com o Mercado Pago. Tente novamente ou fale com o suporte.");
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/generate-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: dataToUse }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);
      setDefenseResult(data.result);
      setShowSuccessMessage(true);
      setShowFomoBanner(false);
      localStorage.removeItem("checkmulta_saved_result");
      localStorage.removeItem("checkmulta_paid_status");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") setDefenseError("TIMEOUT");
      else if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY"))) setDefenseError("SERVER_BUSY");
      else setDefenseError("FALHA_GERACAO");
    } finally {
      setIsGeneratingDefense(false);
    }
  };

  const handleCopy = async () => {
    if (!defenseResult) return;
    try {
      await navigator.clipboard.writeText(defenseResult);
      track("defesa_copiada", "funil_6_defesa_copiada");
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
    track("defesa_baixada", "funil_6_defesa_baixada");
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

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-white text-slate-900">

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-14 w-auto object-contain md:h-20"
            />
          </a>

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
            <a href="#como-funciona" className="transition hover:text-emerald-600">Como funciona</a>
            <a href="#seguranca" className="transition hover:text-emerald-600">Segurança</a>
            <a href="#guias" className="transition hover:text-emerald-600">Guias</a>
            <a href="#faq-seo" className="transition hover:text-emerald-600">Dúvidas</a>
            <a href="/blog" className="transition hover:text-emerald-600">Blog</a>
            <a href="/procon" className="transition hover:text-emerald-600">Procon</a>
            <a href="/vigilancia-sanitaria" className="transition hover:text-emerald-600">Vigilância</a>
            <button
              onClick={() => setActiveModal("suporte")}
              className="font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              Suporte
            </button>
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 hover:text-emerald-600 lg:hidden"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 top-full z-50 flex w-full flex-col space-y-2 border-b border-slate-200 bg-white p-4 shadow-lg lg:hidden"
              >
                <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Como funciona</a>
                <a href="#seguranca" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Segurança</a>
                <a href="#guias" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Guias</a>
                <a href="#faq-seo" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Dúvidas</a>
                <a href="/blog" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Blog</a>
                <a href="/procon" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
                  <span>Procon — para empresas</span>
                  <Building2 className="h-4 w-4 text-slate-400" />
                </a>
                <a href="/vigilancia-sanitaria" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
                  <span>Vigilância Sanitária</span>
                  <Building2 className="h-4 w-4 text-slate-400" />
                </a>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setActiveModal("suporte"); }}
                  className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-3 text-left font-semibold text-emerald-700 transition"
                >
                  <span>Central de suporte</span>
                  <MessageSquare className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* FOMO BANNER */}
      <AnimatePresence>
        {showFomoBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 z-30 flex w-full flex-col items-center justify-center gap-4 border-t border-amber-300 bg-amber-50 p-4 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] sm:flex-row"
          >
            <div className="flex items-center gap-3 text-center sm:text-left">
              <AlertCircle className="hidden h-5 w-5 flex-shrink-0 text-amber-600 sm:block" />
              <p className="text-sm text-amber-900 sm:text-base">
                <strong className="font-semibold">Análise concluída.</strong> O prazo legal está correndo.
              </p>
            </div>
            <button
              onClick={() => { setShowFomoBanner(false); setIsResultModalOpen(true); }}
              className="w-full whitespace-nowrap rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              Ver resultado
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section id="inicio" className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Consulta de multa de trânsito online: descubra se a sua dá pra
            recorrer, <span className="text-emerald-600">grátis</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
            Faça a análise gratuita da sua multa. Nossa inteligência artificial
            cruza o auto de infração com o Código de Trânsito Brasileiro (CTB) e o
            MBFT, campo por campo, em busca do erro formal que pode anular a
            autuação. Se não encontrar falha, você não paga nada — a análise é
            grátis e sem cadastro.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 sm:gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Análise gratuita
            </div>
            <div className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" /> Sem cadastro
            </div>
            <div className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-600" /> Resultado imediato
            </div>
          </div>
        </div>
      </section>

      {/* ÁREA PRINCIPAL — upload ou preview */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        {previewUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-10">
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="relative mx-auto flex max-w-xs justify-center overflow-hidden rounded-xl">
                {imageFile?.type === "application/pdf" ? (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <FileText className="h-14 w-14 text-emerald-600" />
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview da multa" className="h-auto max-h-48 w-full object-cover" />
                )}
              </div>

              <p className="text-sm text-slate-600">{imageFile?.name}</p>

              {!isAnalyzing && !hasAnalyzed && (
                <button
                  onClick={clearImage}
                  className="relative z-10 text-sm text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-red-500"
                  type="button"
                >
                  Excluir ou subir nova foto
                </button>
              )}

              {!isAnalyzing && hasAnalyzed && (
                <div className="relative z-10 mt-4 flex w-full flex-row items-center justify-center gap-3">
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
                    className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    type="button"
                  >
                    Ver resultado novamente
                  </button>
                  <button
                    onClick={clearImage}
                    className="whitespace-nowrap rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    type="button"
                  >
                    Nova multa
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Descubra <span className="text-emerald-600">agora</span> se sua
                multa pode ser anulada
              </h2>
              <p className="text-base text-slate-600">
                Selecione o tipo de infração para iniciar a análise gratuita:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {VIOLATION_TYPES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleViolationSelect(v.name)}
                  className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-6 text-slate-800 transition hover:border-emerald-300 hover:shadow-md"
                >
                  <v.icon className="mb-1 h-8 w-8 text-slate-400 transition group-hover:text-emerald-600" />
                  <div className="text-center">
                    <span className="block text-[15px] font-bold leading-tight text-slate-900 group-hover:text-emerald-700">
                      {v.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">{v.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Como funciona a <span className="text-emerald-600">análise</span>
          </h2>

          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">1. Envie a foto</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Tire uma foto ou suba o PDF do auto de infração. Nenhum dado é armazenado.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">2. A IA audita</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Cruzamos cada campo com o CTB e o Manual Brasileiro de Fiscalização (MBFT).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">3. Diagnóstico grátis</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Revelamos a falha encontrada e o nível de viabilidade do seu recurso.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 pb-4 pt-5">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                O que o diagnóstico pode revelar
              </p>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Viabilidade alta
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Erro formal grave encontrado. Boas chances de anulação da multa.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Viabilidade média
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Há um ângulo de defesa possível, mas não garantido.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-500">
                    Viabilidade baixa
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Caso mais limitado. Ainda possível tentar — a decisão é sua.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Seus dados <span className="text-emerald-600">100% seguros</span>
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Zero armazenamento</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Não guardamos a foto do seu documento. A imagem é processada na
                memória do servidor e imediatamente deletada.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserX className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Sem cadastro</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Você não precisa criar conta, colocar e-mail ou senha para auditar
                a sua multa. É direto ao ponto.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Route className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Total transparência</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Atuamos como ferramenta tecnológica baseada no CTB. Nós criamos a
                tese, mas a decisão final é do órgão julgador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq-seo" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Dúvidas <span className="text-emerald-600">frequentes</span>
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Como saber se ainda dá tempo de recorrer da multa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Nossa IA analisa a data da infração e os prazos legais para
                confirmar se você ainda está dentro do período válido para
                apresentar defesa prévia ou recurso.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Quais multas podem ser contestadas?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Qualquer infração pode ser contestada se houver erros formais na
                autuação. Nosso foco é identificar falhas do agente de trânsito
                baseadas no Manual Brasileiro de Fiscalização (MBFT).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Como funciona a análise da CheckMulta?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Você envia a foto do seu documento, nosso sistema cruza os dados
                com a legislação vigente em segundos e aponta se há viabilidade
                legal para solicitar a anulação.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                O que contém o relatório de contestação?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                O modelo de recurso gerado entrega uma defesa estruturada e
                fundamentada em leis, pronta para você preencher com seus dados
                pessoais e protocolar no órgão autuador.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Vale a pena recorrer de uma multa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Sim. Recorrer é um direito garantido por lei. Além de evitar
                pontos na CNH e a cobrança financeira, a defesa obriga o órgão a
                provar que a autuação foi feita corretamente — o que muitas vezes
                não acontece.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GUIAS POR TIPO DE INFRAÇÃO — links internos home → blog */}
      <section id="guias" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl">
              Guias para recorrer de multa por tipo de{" "}
              <span className="text-emerald-600">infração</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              Além da análise automática, reunimos guias completos sobre como
              recorrer de cada tipo de multa de trânsito no Brasil. Escolha o seu
              caso:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_GUIAS.map((guia) => (
              <a
                key={guia.slug}
                href={`/blog/${guia.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-emerald-600 transition group-hover:bg-emerald-50">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold leading-snug text-slate-800 transition group-hover:text-emerald-700">
                  {guia.titulo}
                </span>
              </a>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver todos os guias no blog <ArrowDown className="h-4 w-4 -rotate-90" />
            </a>
          </div>
        </div>
      </section>

      {/* VERTICAL PROCON — apresenta a outra frente */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Building2 className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Para empresas
                </span>
                <h2 className="mb-2 text-xl font-bold leading-snug text-slate-900">
                  Sua empresa foi multada pelo Procon?
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  Analisamos gratuitamente o auto de infração do Procon e apontamos
                  se há falha que permite recorrer, com base no Código de Defesa do
                  Consumidor e no Decreto 2.181/97.
                </p>
              </div>

              <a
                href="/procon"
                className="w-full flex-shrink-0 rounded-lg bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                Analisar grátis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO SEO */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Como recorrer de uma multa de trânsito{" "}
            <span className="text-emerald-600">no Brasil</span>
          </h2>

          <div className="max-w-none">
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              Recorrer de uma multa de trânsito é um direito garantido pelo{" "}
              <strong className="font-semibold text-slate-900">
                Código de Trânsito Brasileiro (CTB)
              </strong>{" "}
              a todo condutor que acredite ter sido autuado de forma irregular.
              Muitas autuações contêm erros formais de preenchimento que passam
              despercebidos e que podem, sozinhos, anular a multa. É exatamente
              esse tipo de falha que a análise da CheckMulta procura no seu auto de
              infração.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Qual o prazo para recorrer de uma multa?
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O prazo para a{" "}
              <strong className="font-semibold text-slate-900">defesa prévia</strong>{" "}
              é de{" "}
              <strong className="font-semibold text-slate-900">
                15 dias corridos
              </strong>{" "}
              a partir do recebimento da notificação da autuação. Caso a defesa
              seja indeferida, você ainda tem mais{" "}
              <strong className="font-semibold text-slate-900">
                30 dias para apresentar recurso na JARI
              </strong>{" "}
              (Junta Administrativa de Recursos de Infrações). Respeitar esses
              prazos é fundamental: uma multa com prazo vencido não pode mais ser
              contestada administrativamente.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Quais erros em uma multa podem anulá-la?
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O{" "}
              <strong className="font-semibold text-slate-900">
                Manual Brasileiro de Fiscalização de Trânsito (MBFT)
              </strong>{" "}
              estabelece regras rígidas de preenchimento do auto de infração. Erros
              comuns que podem fundamentar a anulação incluem: identificação
              incorreta do veículo, descrição imprecisa da infração, equipamento
              (radar) sem certificação INMETRO vigente, ausência de dados
              obrigatórios do agente autuador e sinalização irregular no local da
              autuação.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Vale a pena recorrer de multa de radar?
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              Sim. Multas de radar e lombada eletrônica exigem{" "}
              <strong className="font-semibold text-slate-900">
                aferição INMETRO vigente
              </strong>
              , identificação com placa informativa no local e dados técnicos
              completos no auto de infração. Qualquer irregularidade nesses
              requisitos pode fundamentar um recurso de anulação da multa.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Recorrer suspende os pontos na CNH?
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              Sim. Enquanto a defesa ou o recurso estiverem em análise pelo órgão
              de trânsito,{" "}
              <strong className="font-semibold text-slate-900">
                tanto a cobrança do valor quanto a pontuação na CNH ficam suspensos
              </strong>
              . Ou seja, apresentar recurso é sempre vantajoso: você adia a
              cobrança e ganha a chance real de anular a autuação.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Como a CheckMulta ajuda a recorrer da multa?
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              A CheckMulta usa inteligência artificial para analisar gratuitamente
              o seu auto de infração e apontar se existe uma falha formal que possa
              anular a multa. Se houver viabilidade, geramos uma{" "}
              <strong className="font-semibold text-slate-900">
                petição de defesa prévia completa e fundamentada no CTB
              </strong>
              , pronta para você preencher e protocolar no órgão autuador — sem
              precisar de advogado e sem cadastro.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <div className="mb-6 flex items-center justify-center">
            <img
              src="/checkmulta-logo.webp"
              alt="CheckMulta"
              width="600"
              height="200"
              className="h-12 w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 md:h-16"
            />
          </div>

          <nav className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
            <a href="/" className="text-slate-600 transition hover:text-emerald-600">
              Multas de trânsito
            </a>
            <a href="/procon" className="text-slate-600 transition hover:text-emerald-600">
              Procon
            </a>
            <a href="/vigilancia-sanitaria" className="text-slate-600 transition hover:text-emerald-600">
              Vigilância Sanitária
            </a>
          </nav>

          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-slate-500">
            <strong className="font-semibold text-slate-700">Transparência e privacidade:</strong>{" "}
            nosso sistema atua como organizador tecnológico com base no Manual
            Brasileiro de Fiscalização de Trânsito. A decisão final é do órgão
            julgador. Não exigimos cadastro e não armazenamos a sua petição ou
            dados do veículo.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            CheckMulta Tecnologia — CNPJ 63.524.338/0001-62
          </p>

          <div className="mt-5 flex justify-center gap-6 text-xs font-medium text-slate-400">
            <button onClick={() => setActiveModal("termos")} className="transition hover:text-slate-600">Termos</button>
            <button onClick={() => setActiveModal("privacidade")} className="transition hover:text-slate-600">Privacidade</button>
            <button onClick={() => setActiveModal("aviso")} className="transition hover:text-slate-600">Legal</button>
            <button onClick={() => setActiveModal("suporte")} className="text-emerald-600 transition hover:text-emerald-700">Suporte</button>
          </div>
        </div>
      </footer>

      {/* MODAL DE UPLOAD */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[55] overflow-y-auto bg-slate-900/70 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Análise gratuita</p>
                    <h3 className="text-base font-bold leading-tight text-slate-900">{selectedViolation}</h3>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <p className="text-xs leading-relaxed text-amber-800">
                      Foto nítida garante melhor análise. Deixe{" "}
                      <strong className="font-semibold">data, placa e órgão autuador</strong> bem legíveis.
                    </p>
                  </div>

                  <div className="group relative cursor-pointer rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/30 text-center transition hover:border-emerald-500 hover:bg-emerald-50/60">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      disabled={isAnalyzing || isPaid}
                      title="Clique para enviar a foto"
                    />
                    <div className="pointer-events-none flex flex-col items-center justify-center space-y-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white transition duration-200 group-hover:scale-105">
                        <Camera className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Foto do auto de infração</p>
                        <p className="mt-0.5 text-xs text-slate-500">Fotografe o documento da multa — frente completa</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <Lock className="h-3 w-3" />
                    <p className="text-[11px]">Imagem deletada imediatamente após a análise</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAIS LEGAIS E SUPORTE */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative flex w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl sm:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => setActiveModal(null)} className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
                <div className="mb-4 pr-8">
                  {activeModal === "aviso" && <h3 className="text-lg font-bold text-slate-900">Aviso jurídico</h3>}
                  {activeModal === "termos" && <h3 className="text-lg font-bold text-slate-900">Termos de uso</h3>}
                  {activeModal === "privacidade" && <h3 className="text-lg font-bold text-slate-900">Política de privacidade</h3>}
                  {activeModal === "suporte" && <h3 className="text-lg font-bold text-slate-900">Central de suporte</h3>}
                </div>
                <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
                  {activeModal === "aviso" && <p>Este documento é um modelo referencial gerado automaticamente e não constitui consultoria jurídica garantida. Não somos um escritório de advocacia. <strong className="font-semibold text-slate-900">A decisão final do recurso é exclusiva responsabilidade do órgão autuador.</strong> Nossa garantia cobre apenas a geração técnica do documento.</p>}
                  {activeModal === "termos" && <p>O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário ou resultado das decisões julgadas pelas juntas de recursos.</p>}
                  {activeModal === "privacidade" && <p>Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros da fotografia do seu auto de infração, dados pessoais ou da petição gerada. O processamento é de caráter transitório para elaboração do documento, que é imediatamente apagado após o fechamento da página.</p>}
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-1">
                      <p className="text-[15px] text-slate-600">Selecione o canal de atendimento para falar com o nosso time:</p>
                      <div className="flex flex-col gap-3">
                        <a href="https://wa.me/5513996485501?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20CheckMulta." target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-900 transition hover:bg-emerald-100">
                          <MessageSquare className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                          <div><strong className="block text-sm font-semibold">Atendimento via WhatsApp</strong><span className="text-xs text-emerald-700">Fale direto com um analista</span></div>
                        </a>
                        <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-slate-900 transition hover:bg-slate-100">
                          <ClipboardList className="h-5 w-5 flex-shrink-0 text-slate-500" />
                          <div><strong className="block text-sm font-semibold">Abrir chamado técnico</strong><span className="text-xs text-slate-600">Reembolsos ou falhas</span></div>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                {activeModal !== "suporte" && (
                  <button onClick={() => setActiveModal(null)} className="mt-7 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Entendi</button>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE RESULTADO */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="flex min-h-full items-center justify-center p-4 py-12 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`relative flex w-full max-w-3xl flex-col rounded-xl shadow-xl ${error ? "border border-red-200 bg-white p-8" : "bg-white p-6 sm:p-10"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={closeResultModal} className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>

                <div className="mt-4 w-full space-y-6">

                  {/* LOADING DA ANÁLISE */}
                  {isAnalyzing && (
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6 p-6">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Search className="h-10 w-10 animate-pulse" />
                      </div>
                      <h3 className="text-center text-xl font-bold text-slate-900">Processando documento</h3>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-emerald-600" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                      </div>
                      <div className="flex min-h-[60px] items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="text-center text-base font-semibold text-emerald-700">
                            {LOADER_MESSAGES[loaderIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-sm leading-relaxed text-slate-600">
                        A IA está lendo seu documento em alta resolução. <strong className="font-semibold text-slate-900">Isso pode levar cerca de 1 minuto.</strong> Não feche a tela.
                      </p>
                    </div>
                  )}

                  {/* ERRO */}
                  {error && (
                    <div className="flex flex-col items-center space-y-4 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">Análise indisponível</h3>
                        <p className="leading-relaxed text-slate-600">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* REJEIÇÕES ELEGANTES */}
                  {!error && !result && !isAnalyzing && rejeicaoInfo && (
                    <div className="mx-auto flex max-w-md flex-col items-center space-y-5 py-4 text-center">

                      {rejeicaoInfo.tipo === "sem_falha" && (
                        <>
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <ShieldCheck className="h-10 w-10" />
                          </div>
                          <div>
                            <h3 className="mb-2 text-lg font-bold text-slate-900">Multa sem irregularidades</h3>
                            <p className="leading-relaxed text-slate-600">
                              Analisamos seu auto de infração campo por campo e <strong className="font-semibold text-slate-900">não encontramos nenhuma falha formal</strong> no preenchimento. O documento está corretamente preenchido conforme o CTB e o MBFT.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-500">
                              Seu auto de infração está em conformidade com a legislação, e por essa razão não há cobrança. Optamos por informá-lo com franqueza, em vez de elaborar uma petição sem fundamento real. Esse é o critério que aplicamos em toda análise.
                            </p>
                          </div>
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                            <p className="text-sm leading-relaxed text-slate-600">
                              <strong className="font-semibold text-slate-900">Dica:</strong> se você acredita que há algum erro que não aparece no documento (ex: sinalização irregular no local, radar sem placa informativa visível), consulte um advogado especializado em trânsito.
                            </p>
                          </div>
                          <button onClick={handleNovaAnalise} className="mt-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Analisar outra multa
                          </button>
                        </>
                      )}

                      {rejeicaoInfo.tipo === "fora_escopo" && (
                        <>
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                            <AlertCircle className="h-10 w-10" />
                          </div>
                          <div>
                            <h3 className="mb-2 text-lg font-bold text-slate-900">Infração fora do nosso escopo</h3>
                            <p className="leading-relaxed text-slate-600">
                              Identificamos que esta é uma multa de <strong className="font-semibold text-slate-900">{rejeicaoInfo.motivo}</strong>.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-500">
                              Esse tipo de infração envolve complexidade jurídica que vai além da nossa análise automatizada. <strong className="font-semibold text-slate-700">Recomendamos procurar um advogado especializado em Direito de Trânsito</strong> para avaliar o seu caso pessoalmente.
                            </p>
                          </div>
                          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                            <p className="text-sm leading-relaxed text-amber-800">
                              <strong className="font-semibold">Por que não fazemos esse tipo?</strong> Nossa IA foi desenvolvida para infrações administrativas comuns (velocidade, estacionamento, sinalização, celular). Casos como Lei Seca exigem análise de provas e defesa personalizada que só um advogado pode oferecer.
                            </p>
                          </div>
                          <button onClick={handleNovaAnalise} className="mt-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Analisar outra multa
                          </button>
                        </>
                      )}

                      {rejeicaoInfo.tipo === "prazo" && (
                        <>
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
                            <Timer className="h-10 w-10" />
                          </div>
                          <div>
                            <h3 className="mb-2 text-lg font-bold text-slate-900">Prazo para recurso vencido</h3>
                            <p className="leading-relaxed text-slate-600">
                              O prazo legal para apresentar defesa ou recurso desta multa já se encerrou. Não é mais possível contestá-la administrativamente.
                            </p>
                          </div>
                          {rejeicaoInfo.motivo && rejeicaoInfo.motivo.length > 10 && (
                            <button
                              onClick={() => {
                                setRejeicaoInfo(null);
                                setResult(rejeicaoInfo.motivo);
                                setHasAnalyzed(true);
                                setIsExpiredBypassActive(true);
                                localStorage.setItem("checkmulta_saved_result", rejeicaoInfo.motivo);
                              }}
                              className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                            >
                              Ver análise da multa mesmo assim
                            </button>
                          )}
                          <button onClick={handleNovaAnalise} className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                            Analisar outra multa
                          </button>
                        </>
                      )}

                    </div>
                  )}

                  {/* RESULTADO COM PAYWALL */}
                  {result && !isPaid && !isAnalyzing && !error && (
                    <div className="space-y-6">

                      {isExpiredBypassActive && (
                        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                          <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-800">Atenção: esta multa está vencida.</p>
                            <p className="mt-1 text-sm text-red-700">Este documento é para fins de análise e consulta.</p>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const multaData = extractMultaData(result);
                        const deadline = multaData.data ? calculateDeadline(multaData.data) : null;
                        const hasData = multaData.placa || multaData.data || multaData.valor || multaData.ait;

                        return hasData ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Auto de infração analisado</p>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                              {multaData.placa && (
                                <div className="flex items-center gap-2.5">
                                  <Tag className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Placa</p>
                                    <p className="text-[15px] font-bold text-slate-900">{multaData.placa}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.data && (
                                <div className="flex items-center gap-2.5">
                                  <Calendar className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Data</p>
                                    <p className="text-[15px] font-bold text-slate-900">{multaData.data}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.valor && (
                                <div className="flex items-center gap-2.5">
                                  <DollarSign className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Valor</p>
                                    <p className="text-[15px] font-bold text-slate-900">R$ {multaData.valor}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.ait && (
                                <div className="flex items-center gap-2.5">
                                  <FileText className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">AIT</p>
                                    <p className="text-[13px] font-bold text-slate-900">{multaData.ait}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {deadline && (
                              <div className={`mt-4 flex items-center gap-3 border-t border-slate-200 pt-4 ${deadline.urgente ? "rounded-lg border border-amber-200 bg-amber-50 p-3" : ""}`}>
                                <Timer className={`h-5 w-5 flex-shrink-0 ${deadline.urgente ? "text-amber-600" : "text-emerald-600"}`} />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Prazo para recurso</p>
                                  <p className={`text-[15px] font-bold ${deadline.urgente ? "text-amber-700" : "text-slate-900"}`}>
                                    {deadline.diasRestantes > 0 ? `${deadline.diasRestantes} dias restantes` : "Prazo expirado"}
                                  </p>
                                  {deadline.diasRestantes > 0 && (
                                    <p className="mt-0.5 text-[11px] text-slate-500">Vence em {deadline.dataVencimento}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {(() => {
                       const v = extractViabilidade(result);
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "resultado_analise", { viabilidade: v ? v.nivel : "Negada" });
}
const baixa = v?.nivel === "Baixa";
                        return (
                          <div className="flex items-start space-x-4">
                            <CheckCircle2 className={`mt-1 h-7 w-7 flex-shrink-0 ${baixa ? "text-amber-500" : "text-emerald-600"}`} />
                            <div>
                              <h2 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                                {baixa ? (
                                  <>Analisamos sua multa e há um <span className="text-amber-600">ângulo possível</span></>
                                ) : (
                                  <>Encontramos uma <span className="text-emerald-600">brecha legal</span> nesta multa</>
                                )}
                              </h2>
                              <p className="leading-relaxed text-slate-600">
                                {baixa
                                  ? "O caso é mais limitado, mas ainda existe margem para tentar o recurso. A decisão é sua."
                                  : "Nossa IA identificou um erro de preenchimento que pode fundamentar a anulação."}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-left">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">O que a análise encontrou na sua multa</p>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                          {formatDocumentText(extractPista(result))}
                        </div>
                        {(() => {
                         const v = extractViabilidade(result);
if (!v) return null;
                          return (
                            <div className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 ${v.bg} ${v.borda}`}>
                              <ShieldCheck className={`h-4 w-4 ${v.cor}`} />
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Viabilidade do recurso:</span>
                              <span className={`text-sm font-bold uppercase ${v.cor}`}>{v.nivel}</span>
                            </div>
                          );
                        })()}
                      </div>


                      {/* AVISO DE TRANSPARÊNCIA — só quando a viabilidade é baixa */}
                      {extractViabilidade(result)?.nivel === "Baixa" && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5 text-left">
                          <h3 className="mb-2 text-base font-bold text-slate-900">
                            Encontramos um ponto para arguir — e queremos ser claros sobre ele
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-700">
                            A falha identificada é de natureza formal e pode ser arguida em recurso,
                            mas não é do tipo que costuma levar à anulação direta. Ainda assim,
                            recorrer tem valor: enquanto o recurso é analisado, a cobrança e a
                            pontuação ficam suspensas, e o órgão precisa se manifestar de forma
                            fundamentada.
                          </p>
                          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                            A decisão é sua. Se preferir, consulte um advogado antes de seguir.
                          </p>
                        </div>
                      )}

                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 text-left">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                          <Scale className="h-5 w-5 text-emerald-600" /> O que você recebe por R$ 19,90
                        </h3>
                        <ul className="space-y-3 text-[13px] text-slate-700 sm:text-[15px]">
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Petição de defesa prévia completa, com fundamentação no Art. 280 do CTB e no MBFT</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Documento pronto para copiar e protocolar — sem advogado necessário</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Entrega imediata após o pagamento — gerado em segundos pela IA</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <p className="text-[11px] leading-relaxed text-amber-800 sm:text-xs">
                          <strong className="font-semibold">Por que vale a pena:</strong> a elaboração dessa defesa por um advogado costuma custar entre R$ 200 e R$ 500. Aqui, são R$ 19,90 — e apenas quando identificamos uma falha concreta. A petição é integralmente fundamentada no CTB; a decisão final cabe ao órgão julgador.
                        </p>
                      </div>

                      {checkoutError && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                          <p className="text-sm font-semibold">{checkoutError}</p>
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={isCheckoutLoading}
                        className="flex w-full flex-col items-center justify-center rounded-lg bg-emerald-600 px-4 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-75"
                      >
                        <div className="flex flex-row items-center justify-center gap-2 text-center text-lg leading-tight">
                          {isCheckoutLoading ? <Loader2 className="h-6 w-6 flex-shrink-0 animate-spin" /> : <Scale className="h-6 w-6 flex-shrink-0" />}
                          <span>{isCheckoutLoading ? "Gerando PIX..." : "Gerar minha petição agora"}</span>
                        </div>
                        <span className="mt-1 text-sm font-normal text-emerald-50">Pagamento único · R$ 19,90 · Entrega imediata</span>
                      </button>
                      <p className="mt-2 text-center text-[11px] text-slate-400">CheckMulta Tecnologia — CNPJ 63.524.338/0001-62</p>
                    </div>
                  )}

                  {/* LOADING DA GERAÇÃO DE DEFESA */}
                  {isGeneratingDefense && (
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-6 p-8">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <FileText className="h-10 w-10 animate-bounce" />
                      </div>
                      <h3 className="text-center text-xl font-bold text-slate-900">Redigindo sua defesa</h3>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-emerald-600" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                      </div>
                      <div className="flex min-h-[60px] items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="text-center text-base font-semibold text-emerald-700">
                            {LOADER_MESSAGES[loaderIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="flex items-center justify-center gap-2 text-center text-base font-bold text-emerald-800">
                          <ShieldCheck className="h-5 w-5" /> Pagamento confirmado
                        </p>
                        <p className="mt-1 text-center text-sm text-emerald-700">Por favor, aguarde e não feche esta janela.</p>
                      </div>
                    </div>
                  )}

                  {/* ERRO NA GERAÇÃO DA DEFESA */}
                  {defenseError && (
                    <div className="flex flex-col items-center space-y-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-600">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">Falha na geração da defesa</h3>
                        <p className="leading-relaxed text-slate-700">
                          Ocorreu uma instabilidade, mas <strong className="font-semibold text-slate-900">o seu pagamento está seguro.</strong> Use o botão abaixo para receber seu arquivo pelo suporte.
                        </p>
                      </div>
                      <a href="https://wa.me/5513996485501?text=Olá!%20Eu%20paguei%20pelo%20recurso%20mas%20a%20tela%20deu%20erro%20ao%20carregar%20a%20petição.%20Pode%20me%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        <MessageSquare className="h-5 w-5" /> Falar com o suporte no WhatsApp
                      </a>
                    </div>
                  )}

                  {/* TELA DE SUCESSO */}
                  {defenseResult && showSuccessMessage && (
                    <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-5 p-4 text-center sm:space-y-6 sm:p-10">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-12 w-12" />
                      </div>
                      <div>
                        <h3 className="mb-3 text-2xl font-bold text-slate-900">Petição pronta</h3>
                        <p className="text-base leading-relaxed text-slate-600">
                          Seu documento jurídico foi gerado. Na próxima tela, copie o texto ou baixe o arquivo.
                        </p>
                      </div>
                      <div className="mt-4 flex w-full flex-col items-center gap-3 sm:mt-6 sm:gap-4">
                        <button
                          onClick={() => setShowSuccessMessage(false)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Ver minha petição <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => setActiveModal("suporte")} className="text-sm text-slate-400 transition hover:text-emerald-600">
                          Precisa de ajuda? Fale com o suporte.
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PETIÇÃO GERADA */}
                  {defenseResult && !showSuccessMessage && (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                        <Scale className="h-6 w-6 text-slate-700" />
                        <h2 className="text-center text-xl font-bold text-slate-900">Sua defesa jurídica pronta</h2>
                      </div>
                      <div className="mb-4 mt-2 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4">
                        <p className="text-sm leading-relaxed text-amber-800">
                          <strong className="font-semibold">Atenção:</strong> revise o documento abaixo e substitua todos os campos em{" "}
                          <span className="rounded bg-red-50 px-1 font-semibold text-red-600">vermelho</span> pelos seus dados reais antes de protocolar.
                        </p>
                      </div>
                      <div className="mx-auto w-full rounded-lg border border-slate-200 bg-slate-50 p-4 font-serif text-slate-800 sm:p-8">
                        <div className="whitespace-pre-wrap text-left text-[15px] leading-relaxed md:text-base">
                          {formatDocumentText(defenseResult)}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-4 border-t border-slate-200 pt-6">
                        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
                          <button onClick={handleCopy} className="flex w-full items-center justify-center space-x-2 rounded-lg border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto">
                            {isCopied ? <><Check className="h-5 w-5 text-emerald-600" /><span className="text-emerald-600">Copiado</span></> : <><Copy className="h-5 w-5 text-slate-500" /><span>Copiar petição</span></>}
                          </button>
                          <button onClick={handleDownload} className="flex w-full items-center justify-center space-x-2 rounded-lg bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700 sm:w-auto">
                            <Download className="h-5 w-5" /><span>Baixar .txt</span>
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

      {/* MODAL DO PIX */}
      <AnimatePresence>
        {isPixModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-11/12 max-w-sm rounded-xl bg-white p-6 shadow-xl"
              >
                <button onClick={() => setIsPixModalOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
                <div className="space-y-5 text-center">
                  <div
                    className="flex cursor-pointer items-center justify-center gap-2 py-2"
                    onClick={() => {
                      setSecretClickCount((prev) => {
                        if (prev + 1 >= 5) { simulateApprovedPayment(); return 0; }
                        return prev + 1;
                      });
                    }}
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs text-slate-400">Pagamento seguro · Criptografia SSL</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">R$ 19,90</h3>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Petição estruturada</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">CheckMulta Tecnologia — CNPJ 63.524.338/0001-62</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-2.5 font-semibold text-amber-700">
                    <Timer className="h-5 w-5" />
                    <span className="text-sm">Expira em {formatTime(pixTimeLeft)}</span>
                  </div>
                  <div className="flex justify-center py-2">
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-slate-200 bg-white">
                      {qrCodeBase64 ? (
                        <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code" width="192" height="192" className="h-full w-full rounded-lg object-contain p-2" />
                      ) : (
                        <QrCode className="h-24 w-24 animate-pulse text-slate-200" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="flex-1 truncate px-2 text-left font-mono text-sm text-slate-500">{qrCode || "Gerando Pix..."}</p>
                      <button onClick={handleCopyPix} className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600">
                        {isPixCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="text-[11px] leading-relaxed text-emerald-900">
                        <strong className="font-semibold">Garantia técnica:</strong> se a petição não for liberada em 10 segundos após o pagamento, garantimos reembolso via PIX.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
                      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                      <p className="text-[10px] leading-relaxed text-slate-600">
                        O recebedor identificado no seu aplicativo bancário será <strong className="font-semibold text-slate-900">CheckMulta Tecnologia</strong> — CNPJ 63.524.338/0001-62.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-sm font-medium text-slate-500">
                    <RefreshCcw className="h-4 w-4 animate-spin text-emerald-600" />
                    Aguardando o pagamento...
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
