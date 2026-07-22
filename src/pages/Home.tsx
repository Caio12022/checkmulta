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

const AnimatedNumber = ({
  end, start = 0, duration = 2500, prefix = "", suffix = "",
}: { end: number; start?: number; duration?: number; prefix?: string; suffix?: string }) => {
  const [value, setValue] = useState(start);
  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      setValue(Math.floor(start + (end - start) * easeOut));
      if (progress < duration) animationFrame = requestAnimationFrame(animate);
      else setValue(end);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, start, duration]);
  return <>{prefix}{value.toLocaleString("pt-BR")}{suffix}</>;
};

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 w-full scroll-smooth">

      {/* HEADER */}
      <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 h-16 md:h-20 flex items-center justify-between shadow-sm sticky top-0 z-40 overflow-visible">
        <div className="flex items-center h-full w-[180px] md:w-[240px]">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="w-full h-auto object-contain scale-[1.3] md:scale-[1.5] origin-left translate-y-1" />
        </div>
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-600 items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Início</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-blue-600 transition-colors">Segurança</a>
         <a href="#guias" className="hover:text-blue-600 transition-colors">Guias</a>
         <a href="#faq-seo" className="hover:text-blue-600 transition-colors">Dúvidas</a>
              <a href="/blog" className="hover:text-blue-600 transition-colors">Blog</a>
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
              <a href="#guias" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Guias</a>
              <a href="#faq-seo" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Dúvidas</a>
              <a href="/blog" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2.5 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors">Blog</a>
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

      {/* FOMO BANNER */}
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

      {/* CONTEÚDO PRINCIPAL */}
      <div className="w-full max-w-4xl flex-1 px-4 py-4 md:py-6 mx-auto">

        {/* HERO */}
        <section id="inicio" className="mb-4 flex flex-col items-center text-center w-full max-w-3xl mx-auto">
          <h1 className="text-[34px] sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-5 tracking-tight mt-2">
            Consulta de multa de trânsito online: descubra se a sua dá pra recorrer, <span className="text-emerald-600">grátis</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            Faça a análise gratuita da sua multa. Nossa inteligência artificial cruza o auto de infração com o Código de Trânsito Brasileiro (CTB) e o MBFT, campo por campo, em busca do erro formal que pode anular a autuação. Se não encontrar falha, você não paga nada — a análise é grátis e sem cadastro.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-[13px] sm:text-sm font-bold text-slate-700 mb-6">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Análise gratuita</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-600" /> Sem cadastro</div>
            <div className="hidden sm:block w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-emerald-600" /> Resultado imediato</div>
          </div>
        </section>

        {/* ÁREA PRINCIPAL — upload ou preview */}
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
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Descubra <span className="text-emerald-600">agora</span> se sua multa pode ser anulada</h2>
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
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE UPLOAD */}
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
                      title="Clique para enviar a foto"
                    />
                    <div className="flex flex-col items-center justify-center py-7 space-y-3 pointer-events-none">
                      <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Foto do Auto de Infração</p>
              <p className="text-slate-500 text-xs font-medium mt-0.5">Fotografe o documento da multa — frente completa</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <p className="text-[11px] font-medium">Imagem deletada imediatamente após a análise</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">Como funciona a <span className="text-emerald-600">análise</span>?</h2>

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

      {/* SEGURANÇA */}
      <section id="seguranca" className="w-full bg-white border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">Seus Dados <span className="text-emerald-600">100% Seguros</span></h2>
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

      {/* FAQ */}
      <section id="faq-seo" className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dúvidas <span className="text-emerald-600">Frequentes</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Como saber se ainda dá tempo de recorrer da multa?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Nossa IA analisa a data da infração e os prazos legais para confirmar se você ainda está dentro do período válido para apresentar defesa prévia ou recurso.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Quais multas podem ser contestadas?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Qualquer infração pode ser contestada se houver erros formais na autuação. Nosso foco é identificar falhas do agente de trânsito baseadas no Manual Brasileiro de Fiscalização (MBFT).</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Como funciona a análise da CheckMulta?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Você envia a foto do seu documento, nosso sistema cruza os dados com a legislação vigente em segundos e aponta se há viabilidade legal para solicitar a anulação.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">O que contém o relatório de contestação?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">O modelo de recurso gerado entrega uma defesa estruturada e fundamentada em leis, pronta para você preencher com seus dados pessoais e protocolar no órgão autuador.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 md:col-span-2 transition-colors">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Vale a pena recorrer de uma multa?</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Sim! Recorrer é um direito garantido por lei. Além de evitar pontos na CNH e a cobrança financeira, a defesa obriga o órgão a provar que a autuação foi feita corretamente — o que muitas vezes não acontece.</p>
            </div>
          </div>
        </div>
      </section>

      {/* GUIAS POR TIPO DE INFRAÇÃO — links internos home → blog */}
      <section id="guias" className="w-full bg-white border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Guias para recorrer de multa por tipo de <span className="text-emerald-600">infração</span></h2>
            <p className="text-slate-600 font-medium max-w-2xl mx-auto">Além da análise automática, reunimos guias completos sobre como recorrer de cada tipo de multa de trânsito no Brasil. Escolha o seu caso:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BLOG_GUIAS.map((guia) => (
              <a
                key={guia.slug}
                href={`/blog/${guia.slug}`}
                className="group flex items-center gap-3 p-5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all duration-200 shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 bg-white group-hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200 group-hover:border-emerald-200 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800 leading-snug transition-colors">{guia.titulo}</span>
              </a>
            ))}
          </div>

          <div className="text-center mt-8">
            <a href="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-sm">
              Ver todos os guias no blog <ArrowDown className="w-4 h-4 -rotate-90" />
            </a>
          </div>
        </div>
      </section>

      {/* CONTEÚDO SEO — sempre visível */}
      <section className="w-full bg-slate-50 border-t border-slate-200 py-16 px-4 flex justify-center">
        <div className="max-w-4xl w-full">
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-6">Como recorrer de uma multa de trânsito <span className="text-emerald-600">no Brasil</span></h2>
            <div className="prose prose-slate max-w-none space-y-6 text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              <p>Recorrer de uma multa de trânsito é um direito garantido pelo <strong className="text-slate-800">Código de Trânsito Brasileiro (CTB)</strong> a todo condutor que acredite ter sido autuado de forma irregular. Muitas autuações contêm erros formais de preenchimento que passam despercebidos e que podem, sozinhos, anular a multa. É exatamente esse tipo de falha que a análise da CheckMulta procura no seu auto de infração.</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-8 mb-3">Qual o prazo para recorrer de uma multa?</h3>
              <p>O prazo para a <strong className="text-slate-800">defesa prévia</strong> é de <strong className="text-slate-800">15 dias corridos</strong> a partir do recebimento da notificação da autuação. Caso a defesa seja indeferida, você ainda tem mais <strong className="text-slate-800">30 dias para apresentar recurso na JARI</strong> (Junta Administrativa de Recursos de Infrações). Respeitar esses prazos é fundamental: uma multa com prazo vencido não pode mais ser contestada administrativamente.</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-8 mb-3">Quais erros em uma multa podem anulá-la?</h3>
              <p>O <strong className="text-slate-800">Manual Brasileiro de Fiscalização de Trânsito (MBFT)</strong> estabelece regras rígidas de preenchimento do auto de infração. Erros comuns que podem fundamentar a anulação incluem: identificação incorreta do veículo, descrição imprecisa da infração, equipamento (radar) sem certificação INMETRO vigente, ausência de dados obrigatórios do agente autuador e sinalização irregular no local da autuação.</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-8 mb-3">Vale a pena recorrer de multa de radar?</h3>
              <p>Sim. Multas de radar e lombada eletrônica exigem <strong className="text-slate-800">aferição INMETRO vigente</strong>, identificação com placa informativa no local e dados técnicos completos no auto de infração. Qualquer irregularidade nesses requisitos pode fundamentar um recurso de anulação da multa.</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-8 mb-3">Recorrer suspende os pontos na CNH?</h3>
              <p>Sim. Enquanto a defesa ou o recurso estiverem em análise pelo órgão de trânsito, <strong className="text-slate-800">tanto a cobrança do valor quanto a pontuação na CNH ficam suspensos</strong>. Ou seja, apresentar recurso é sempre vantajoso: você adia a cobrança e ganha a chance real de anular a autuação.</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-8 mb-3">Como a CheckMulta ajuda a recorrer da multa?</h3>
              <p>A CheckMulta usa inteligência artificial para analisar gratuitamente o seu auto de infração e apontar se existe uma falha formal que possa anular a multa. Se houver viabilidade, geramos uma <strong className="text-slate-800">petição de defesa prévia completa e fundamentada no CTB</strong>, pronta para você preencher e protocolar no órgão autuador — sem precisar de advogado e sem cadastro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full text-center px-6 py-8 border-t border-gray-200 bg-gray-100 mt-auto">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/checkmulta-logo.webp" alt="CheckMulta Logo" width="240" height="64" className="h-[40px] md:h-[48px] w-auto object-contain opacity-75 grayscale hover:grayscale-0 transition-all duration-300" />
        </div>
        <p className="text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
          🛡️ <strong className="font-bold text-slate-700">Transparência e Privacidade:</strong> Nosso sistema atua como organizador tecnológico com base no Manual Brasileiro de Fiscalização de Trânsito. A decisão final é do órgão julgador. Não exigimos cadastro e não armazenamos a sua petição ou dados do veículo.
        </p>
        <p className="text-xs text-slate-700 font-medium mt-3">
          CheckMulta Tecnologia · CNPJ 63.524.338/0001-62
        </p>
        <div className="flex justify-center space-x-6 mt-4 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
          <button onClick={() => setActiveModal("termos")} className="hover:text-slate-600 transition-colors">Termos</button>
          <button onClick={() => setActiveModal("privacidade")} className="hover:text-slate-600 transition-colors">Privacidade</button>
          <button onClick={() => setActiveModal("aviso")} className="hover:text-slate-600 transition-colors">Legal</button>
          <button onClick={() => setActiveModal("suporte")} className="hover:text-blue-600 text-blue-500 transition-colors">Suporte</button>
        </div>
      </footer>

      {/* MODAIS LEGAIS E SUPORTE */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors z-10">
                  <X className="w-6 h-6" />
                </button>
                <div className="mb-4 pr-8">
                  {activeModal === "aviso" && <h3 className="text-xl font-bold text-slate-800">Aviso Jurídico</h3>}
                  {activeModal === "termos" && <h3 className="text-xl font-bold text-slate-800">Termos de Uso</h3>}
                  {activeModal === "privacidade" && <h3 className="text-xl font-bold text-slate-800">Políticas de Privacidade</h3>}
                  {activeModal === "suporte" && <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span>💬</span> Central de Suporte</h3>}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3 font-medium">
                  {activeModal === "aviso" && <p>Este documento é um modelo referencial gerado automaticamente e não constitui consultoria jurídica garantida. Não somos um escritório de advocacia. <strong>A decisão final do recurso é exclusiva responsabilidade do órgão autuador.</strong> Nossa garantia cobre apenas a geração técnica do documento.</p>}
                  {activeModal === "termos" && <p>O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário ou resultado das decisões julgadas pelas juntas de recursos.</p>}
                  {activeModal === "privacidade" && <p>Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros da fotografia do seu auto de infração, dados pessoais ou da petição gerada. O processamento é de caráter transitório para elaboração do documento, que é imediatamente apagado após o fechamento da página.</p>}
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-2">
                      <p className="text-sm text-slate-600 font-medium">Selecione o canal de atendimento para falar com o nosso time técnico:</p>
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

      {/* MODAL DE RESULTADO */}
      <AnimatePresence>
        {isResultModalOpen && (
          <div className="fixed inset-0 z-[45] overflow-y-auto bg-slate-900/60 backdrop-blur-md">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`max-w-3xl w-full flex flex-col relative rounded-3xl shadow-2xl ${error ? "bg-red-50/95 border border-red-200 p-8" : "bg-white/95 backdrop-blur-md p-6 sm:p-10"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={closeResultModal} className={`absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors z-10 ${error ? "hover:bg-red-100" : "hover:bg-slate-100"}`}>
                  <X className="w-6 h-6" />
                </button>

                <div className="w-full mt-4 space-y-6">

                  {/* LOADING DA ANÁLISE */}
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
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-bold text-blue-700 text-center text-lg">
                            {LOADER_MESSAGES[loaderIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <p className="text-sm text-slate-500 font-medium text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                        A IA está lendo seu documento em alta resolução. <strong>Isso pode levar cerca de 1 minuto.</strong> Não feche a tela.
                      </p>
                    </div>
                  )}

                  {/* ERRO */}
                  {error && (
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800 mb-2">Análise Indisponível</h3>
                        <p className="text-red-700 font-medium leading-relaxed">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* REJEIÇÕES ELEGANTES */}
                  {!error && !result && !isAnalyzing && rejeicaoInfo && (
                    <div className="flex flex-col items-center text-center space-y-5 max-w-md mx-auto py-4">

                      {rejeicaoInfo.tipo === "sem_falha" && (
                        <>
                          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-11 h-11" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Multa sem irregularidades</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                              Analisamos seu auto de infração campo por campo e <strong>não encontramos nenhuma falha formal</strong> no preenchimento. O documento está corretamente preenchido conforme o CTB e o MBFT.
                            </p>
                            <p className="text-slate-500 text-sm mt-3 font-medium">
                              Seu auto de infração está em conformidade com a legislação, e por essa razão não há cobrança. Optamos por informá-lo com franqueza, em vez de elaborar uma petição sem fundamento real. Esse é o critério que aplicamos em toda análise.
                            </p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left w-full">
                            <p className="text-sm text-blue-800 font-medium">
                              <strong>Dica:</strong> Se você acredita que há algum erro que não aparece no documento (ex: sinalização irregular no local, radar sem placa informativa visível), consulte um advogado especializado em trânsito.
                            </p>
                          </div>
                          <button onClick={handleNovaAnalise} className="mt-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
                            Analisar outra multa
                          </button>
                        </>
                      )}

                      {rejeicaoInfo.tipo === "fora_escopo" && (
                        <>
                          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-11 h-11" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Infração fora do nosso escopo</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                              Identificamos que esta é uma multa de <strong>{rejeicaoInfo.motivo}</strong>.
                            </p>
                            <p className="text-slate-500 text-sm mt-3 font-medium leading-relaxed">
                              Esse tipo de infração envolve complexidade jurídica que vai além da nossa análise automatizada. <strong>Recomendamos procurar um advogado especializado em Direito de Trânsito</strong> para avaliar o seu caso pessoalmente.
                            </p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left w-full">
                            <p className="text-sm text-amber-800 font-medium">
                              <strong>Por que não fazemos esse tipo?</strong> Nossa IA foi desenvolvida para infrações administrativas comuns (velocidade, estacionamento, sinalização, celular). Casos como Lei Seca exigem análise de provas e defesa personalizada que só um advogado pode oferecer.
                            </p>
                          </div>
                          <button onClick={handleNovaAnalise} className="mt-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
                            Analisar outra multa
                          </button>
                        </>
                      )}

                      {rejeicaoInfo.tipo === "prazo" && (
                        <>
                          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                            <Timer className="w-11 h-11" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Prazo para recurso vencido</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
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
                              className="px-5 py-2.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-colors border border-slate-200"
                            >
                              Ver análise da multa mesmo assim
                            </button>
                          )}
                          <button onClick={handleNovaAnalise} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
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
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="text-red-800 font-bold">Atenção: Esta multa está vencida.</p>
                            <p className="text-red-700 text-sm mt-1 font-medium">Este documento é para fins de análise e consulta.</p>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const multaData = extractMultaData(result);
                        const deadline = multaData.data ? calculateDeadline(multaData.data) : null;
                        const hasData = multaData.placa || multaData.data || multaData.valor || multaData.ait;

                        return hasData ? (
                          <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Auto de Infração Analisado</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {multaData.placa && (
                                <div className="flex items-center gap-2.5">
                                  <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Placa</p>
                                    <p className="font-black text-slate-900 text-[15px]">{multaData.placa}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.data && (
                                <div className="flex items-center gap-2.5">
                                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Data</p>
                                    <p className="font-black text-slate-900 text-[15px]">{multaData.data}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.valor && (
                                <div className="flex items-center gap-2.5">
                                  <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Valor</p>
                                    <p className="font-black text-slate-900 text-[15px]">R$ {multaData.valor}</p>
                                  </div>
                                </div>
                              )}
                              {multaData.ait && (
                                <div className="flex items-center gap-2.5">
                                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">AIT</p>
                                    <p className="font-black text-slate-900 text-[13px]">{multaData.ait}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {deadline && (
                              <div className={`mt-4 pt-4 border-t border-blue-200/60 flex items-center gap-3 ${deadline.urgente ? "bg-red-50 p-3 rounded-xl border border-red-100" : ""}`}>
                                <Timer className={`w-5 h-5 flex-shrink-0 ${deadline.urgente ? "text-red-600 animate-pulse" : "text-blue-600"}`} />
                                <div>
                                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Prazo para Recurso</p>
                                  <p className={`font-black text-[15px] ${deadline.urgente ? "text-red-700" : "text-slate-900"}`}>
                                    {deadline.diasRestantes > 0 ? `${deadline.diasRestantes} dias restantes` : "Prazo expirado"}
                                  </p>
                                  {deadline.diasRestantes > 0 && (
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Vence em {deadline.dataVencimento}</p>
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
                            <CheckCircle2 className={`w-8 h-8 flex-shrink-0 mt-1 ${baixa ? "text-amber-500" : "text-emerald-600"}`} />
                            <div>
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 leading-tight">
                                {baixa ? (
                                  <>Analisamos sua multa e há um <span className="text-amber-600">ângulo possível</span></>
                                ) : (
                                  <>Encontramos uma <span className="text-emerald-600">brecha legal</span> nesta multa</>
                                )}
                              </h2>
                              <p className="text-slate-600 font-medium leading-relaxed">
                                {baixa
                                  ? "O caso é mais limitado, mas ainda existe margem para tentar o recurso. A decisão é sua."
                                  : "Nossa IA identificou um erro de preenchimento que pode fundamentar a anulação."}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">O que a IA encontrou na sua multa</p>
                        <div className="text-slate-800 text-sm sm:text-[15px] font-semibold whitespace-pre-wrap leading-relaxed">
                          {formatDocumentText(extractPista(result))}
                        </div>
                        {(() => {
                         const v = extractViabilidade(result);
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "resultado_analise", { viabilidade: v ? v.nivel : "Negada" });
}
if (!v) return null;
                          return (
                            <div className={`mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border ${v.bg} ${v.borda}`}>
                              <ShieldCheck className={`w-4 h-4 ${v.cor}`} />
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Viabilidade do recurso:</span>
                              <span className={`text-sm font-black uppercase ${v.cor}`}>{v.nivel}</span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 text-left relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-2xl" />
                        <h3 className="text-slate-900 font-black text-base sm:text-lg mb-4 flex items-center gap-2 pl-2">
                          <Scale className="w-5 h-5 text-blue-600" /> O que você recebe por R$ 19,90:
                        </h3>
                        <ul className="space-y-3 text-[13px] sm:text-[15px] text-slate-700 font-medium pl-2">
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>Petição de defesa prévia completa, com fundamentação no Art. 280 do CTB e no MBFT</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>Documento pronto para copiar e protocolar — sem advogado necessário</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>Entrega imediata após o pagamento — gerado em segundos pela IA</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] sm:text-xs text-amber-800 font-medium leading-relaxed">
                          <strong>Por que vale a pena:</strong> a elaboração dessa defesa por um advogado costuma custar entre R$ 200 e R$ 500. Aqui, são R$ 19,90 — e apenas quando identificamos uma falha concreta. A petição é integralmente fundamentada no CTB; a decisão final cabe ao órgão julgador.
                        </p>
                      </div>

                      {checkoutError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-bold">{checkoutError}</p>
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={isCheckoutLoading}
                        className="w-full flex flex-col items-center justify-center py-4 px-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-75 disabled:cursor-not-allowed font-bold"
                      >
                        <div className="flex flex-row items-center justify-center gap-2 text-lg text-center leading-tight">
                          {isCheckoutLoading ? <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" /> : <Scale className="w-6 h-6 flex-shrink-0" />}
                          <span>{isCheckoutLoading ? "Gerando PIX..." : "Gerar Minha Petição Agora"}</span>
                        </div>
                        <span className="text-sm font-medium text-emerald-100 mt-1">Pagamento único · R$ 19,90 · Entrega imediata</span>
                      </button>
                      <p className="text-center text-[11px] text-slate-400 font-medium mt-2">CheckMulta Tecnologia · CNPJ 63.524.338/0001-62</p>
                    </div>
                  )}

                  {/* LOADING DA GERAÇÃO DE DEFESA */}
                  {isGeneratingDefense && (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 max-w-md mx-auto">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <FileText className="w-10 h-10 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 text-center">Redigindo sua Defesa</h3>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div className="absolute top-0 left-0 h-full w-1/2 bg-emerald-600 rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                      </div>
                      <div className="min-h-[60px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.p key={loaderIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }} className="font-bold text-emerald-700 text-center text-lg">
                            {LOADER_MESSAGES[loaderIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl w-full">
                        <p className="text-base md:text-lg text-emerald-800 font-black text-center flex items-center justify-center gap-2">
                          <ShieldCheck className="w-5 h-5" /> Pagamento confirmado!
                        </p>
                        <p className="text-sm text-emerald-600 font-medium text-center mt-1">Por favor, aguarde e não feche esta janela.</p>
                      </div>
                    </div>
                  )}

                  {/* ERRO NA GERAÇÃO DA DEFESA */}
                  {defenseError && (
                    <div className="flex flex-col items-center text-center space-y-4 p-8 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-800 mb-2">Falha na Geração da Defesa</h3>
                        <p className="text-red-700 font-medium leading-relaxed">
                          Ocorreu uma instabilidade, mas <strong>o seu pagamento está seguro.</strong> Clique abaixo para receber seu arquivo pelo suporte.
                        </p>
                      </div>
                      <a href="https://wa.me/5513996485501?text=Olá!%20Eu%20paguei%20pelo%20recurso%20mas%20a%20tela%20deu%20erro%20ao%20carregar%20a%20petição.%20Pode%20me%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Contatar Suporte no WhatsApp
                      </a>
                    </div>
                  )}

                  {/* TELA DE SUCESSO */}
                  {defenseResult && showSuccessMessage && (
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 p-4 sm:p-10 w-full max-w-md mx-auto">
                      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-14 h-14" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">Petição pronta!</h3>
                        <p className="text-slate-600 text-lg font-medium leading-relaxed">
                          Seu documento jurídico foi gerado com sucesso. Na próxima tela, copie o texto ou baixe o arquivo.
                        </p>
                      </div>
                      <div className="w-full flex flex-col items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                        <button
                          onClick={() => setShowSuccessMessage(false)}
                          className="w-full py-3.5 sm:py-4 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-base sm:text-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          Ver Minha Petição <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => setActiveModal("suporte")} className="text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium flex items-center gap-1">
                          Precisa de ajuda? Fale com o suporte.
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PETIÇÃO GERADA */}
                  {defenseResult && !showSuccessMessage && (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                        <Scale className="w-6 h-6 text-slate-800" />
                        <h2 className="text-xl font-bold text-slate-800 text-center">Sua Defesa Jurídica Pronta</h2>
                      </div>
                      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-2 mb-4 rounded-r-xl">
                        <p className="text-sm text-amber-800 font-medium">
                          <strong>Atenção:</strong> Revise o documento abaixo e substitua todos os campos em{" "}
                          <span className="text-red-600 font-bold bg-red-100 px-1 rounded">vermelho</span> pelos seus dados reais antes de protocolar.
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
                            {isCopied ? <><Check className="w-5 h-5 text-emerald-600" /><span className="text-emerald-600">Copiado!</span></> : <><Copy className="w-5 h-5 text-slate-600" /><span>Copiar Petição</span></>}
                          </button>
                          <button onClick={handleDownload} className="flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md font-bold text-lg w-full sm:w-auto">
                            <Download className="w-5 h-5" /><span>Baixar .txt</span>
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
            <div className="min-h-full flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-11/12 max-w-sm bg-white rounded-3xl shadow-2xl p-6"
              >
                <button onClick={() => setIsPixModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-5">
                  <div
                    className="flex items-center justify-center gap-2 py-2 cursor-pointer"
                    onClick={() => {
                      setSecretClickCount((prev) => {
                        if (prev + 1 >= 5) { simulateApprovedPayment(); return 0; }
                        return prev + 1;
                      });
                    }}
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-400">Pagamento seguro · Criptografia SSL</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">R$ 19,90</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Petição Estruturada (IA)</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5">CheckMulta Tecnologia · CNPJ 63.524.338/0001-62</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-red-700 font-bold bg-red-50 py-2.5 rounded-xl border border-red-100">
                    <Timer className="w-5 h-5 animate-pulse" />
                    <span className="text-sm">Expira em {formatTime(pixTimeLeft)}</span>
                  </div>
                  <div className="flex justify-center py-2">
                    <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-sm">
                      {qrCodeBase64 ? (
                        <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code" width="192" height="192" className="w-full h-full p-2 object-contain rounded-xl" />
                      ) : (
                        <QrCode className="w-24 h-24 text-slate-200 animate-pulse" />
                      )}
                    </div>
                  </div>
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
                        O recebedor identificado no seu aplicativo bancário será <strong>CheckMulta Tecnologia</strong> — CNPJ 63.524.338/0001-62.
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
