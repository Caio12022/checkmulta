/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Scale, QrCode, X, Copy, Download, Check, Search, FileText,
  Lock, UserX, Route, RefreshCcw, MessageSquare,
  ClipboardList, Menu, Timer, Building2, Megaphone,
  PackageX, Receipt, PlusCircle, Clock, UploadCloud
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}

const PRECO = 99.0;

const track = (gtagEvent: string, clarityEvent: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  if (window.gtag) window.gtag("event", gtagEvent, params || {});
  if (window.clarity) window.clarity("event", clarityEvent);
};

// ─── TIPOS ─────────────────────────────────────────────────────────────────
interface Achado {
  titulo: string;
  gravidade: "critico" | "atencao" | "verificar";
  trecho_documento: string;
  explicacao: string;
  base_legal: string;
}

interface Analise {
  resumo: string;
  orgao_emissor: string;
  numero_processo: string;
  empresa_autuada: string;
  prazo_identificado: string;
  achados: Achado[];
  quantidade_criticos: number;
  quantidade_atencao: number;
  quantidade_verificar: number;
  houve_achado: boolean;
}

type Viabilidade = { nivel: "Alta" | "Média" | "Baixa"; cor: string; bg: string; borda: string };

// ─── VIABILIDADE: derivada das gravidades encontradas ──────────────────────
const calcularViabilidade = (a: Analise | null): Viabilidade | null => {
  if (!a || !a.houve_achado) return null;
  if (a.quantidade_criticos > 0)
    return { nivel: "Alta", cor: "text-emerald-700", bg: "bg-emerald-50", borda: "border-emerald-200" };
  if (a.quantidade_atencao > 0)
    return { nivel: "Média", cor: "text-amber-700", bg: "bg-amber-50", borda: "border-amber-200" };
  return { nivel: "Baixa", cor: "text-red-700", bg: "bg-red-50", borda: "border-red-200" };
};

// ─── FORMATAÇÃO DO DOCUMENTO ───────────────────────────────────────────────
const formatDocumentText = (text: string) => {
  if (!text) return text;
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1");
  cleanText = cleanText.replace(/\*(.*?)\*/g, "$1");
  cleanText = cleanText.replace(/`/g, "");
  const parts = cleanText.split(/(\[[^\[\]]*\])/g);
  return parts.map((part, index) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <span key={index} className="text-red-500 bg-red-50 px-1 rounded-sm font-semibold">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const LOADER_MESSAGES = [
  "Analisando o auto de infração...",
  "Verificando a regularidade da notificação...",
  "Cruzando dados com o Decreto 2.181/97...",
  "Conferindo a dosimetria da multa...",
];

const TIPOS_AUTUACAO = [
  { id: "publicidade", name: "Publicidade enganosa", subtitle: "oferta ou propaganda", icon: Megaphone },
  { id: "produto", name: "Produto impróprio", subtitle: "vencido ou irregular", icon: PackageX },
  { id: "cobranca", name: "Cobrança indevida", subtitle: "preço ou prática abusiva", icon: Receipt },
  { id: "outras", name: "Outras autuações", subtitle: "qualquer infração ao CDC", icon: PlusCircle },
];

const ESTILOS_GRAVIDADE = {
  critico: {
    borda: "border-l-red-500", fundo: "bg-red-50", texto: "text-red-700",
    rotulo: "Crítico", corIcone: "text-red-600",
  },
  atencao: {
    borda: "border-l-amber-500", fundo: "bg-amber-50", texto: "text-amber-700",
    rotulo: "Atenção", corIcone: "text-amber-600",
  },
  verificar: {
    borda: "border-l-sky-500", fundo: "bg-sky-50", texto: "text-sky-700",
    rotulo: "Verificar", corIcone: "text-sky-600",
  },
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function Procon() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rejeicaoInfo, setRejeicaoInfo] = useState<{ tipo: "sem_vicio"; motivo: string } | null>(null);
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

  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixTimeLeft, setPixTimeLeft] = useState(600);

  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── EFEITOS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedResult = localStorage.getItem("procon_saved_result");
    const savedPaidStatus = localStorage.getItem("procon_paid_status");
    if (savedResult && savedPaidStatus === "true" && !defenseResult && !isGeneratingDefense) {
      try {
        const parsed = JSON.parse(savedResult) as Analise;
        setAnalise(parsed);
        setIsPaid(true);
        setIsResultModalOpen(true);
        generateDefense(parsed);
      } catch {
        localStorage.removeItem("procon_saved_result");
        localStorage.removeItem("procon_paid_status");
      }
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
          localStorage.setItem("procon_paid_status", "true");
          track("purchase", "procon_5_pagamento_confirmado", {
            transaction_id: paymentId.toString(),
            value: PRECO,
            currency: "BRL",
            items: [{ item_id: "defesa_procon", item_name: "Defesa Administrativa Procon", price: PRECO, quantity: 1 }],
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
    if (isPaid && analise && !defenseResult && !isGeneratingDefense) {
      generateDefense();
    }
  }, [isPaid, analise]);

  // ─── HANDLERS ────────────────────────────────────────────────────────────
  const handleTipoSelect = (tipoName: string) => {
    setSelectedTipo(tipoName);
    setIsUploadModalOpen(true);
    track("procon_tipo_selecionado", "procon_1_tipo_selecionado", { tipo: tipoName });
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
    setAnalise(null);
    setDefenseResult(null);
    setError(null);
    setDefenseError(null);
    setCheckoutError(null);
    setRejeicaoInfo(null);
    setIsPaid(false);
    setHasAnalyzed(false);
    setQrCode(null);
    setQrCodeBase64(null);
    setPaymentId(null);
    setSecretClickCount(0);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    setSelectedTipo(null);
    setIsUploadModalOpen(false);
    localStorage.removeItem("procon_saved_result");
    localStorage.removeItem("procon_paid_status");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNovaAnalise = () => {
    clearImage();
    setIsResultModalOpen(false);
    setRejeicaoInfo(null);
    setSelectedTipo(null);
    setIsUploadModalOpen(false);
  };

  const closeResultModal = () => {
    setIsResultModalOpen(false);
    if (analise && analise.houve_achado && !isPaid && !error) {
      setShowFomoBanner(true);
    }
  };

  const processFile = (file: File) => {
    track("procon_upload", "procon_2_documento_enviado", { file_type: file.type });
    setImageFile(file);
    setPreviewUrl(null);
    setError(null);
    setAnalise(null);
    setDefenseResult(null);
    setDefenseError(null);
    setCheckoutError(null);
    setRejeicaoInfo(null);
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
      analisarAuto(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analisarAuto = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalise(null);
    setDefenseResult(null);
    setDefenseError(null);
    setRejeicaoInfo(null);
    setIsPaid(false);
    setIsResultModalOpen(true);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    let isBusinessError = false;
    try {
      const response = await fetch("/api/analyze-procon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64Data, mimeType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);

      // Rejeições em string
      if (typeof data.result === "string") {
        const lower = data.result.toLowerCase();
        if (lower.includes("documento_invalido")) {
          isBusinessError = true;
          track("procon_analise_erro", "procon_erro_documento_invalido", { tipo: "documento_invalido" });
          throw new Error("O arquivo enviado não parece ser um auto de infração ou notificação do Procon. Confira o documento e tente novamente.");
        }
        if (lower.includes("documento_ilegivel")) {
          isBusinessError = true;
          track("procon_analise_erro", "procon_erro_documento_ilegivel", { tipo: "documento_ilegivel" });
          throw new Error("Não conseguimos ler o documento. Envie um arquivo mais nítido ou o PDF original.");
        }
        throw new Error("Não foi possível concluir a análise. Tente novamente.");
      }

      const resultado = data.result as Analise;

      // Nenhum vício encontrado
      if (!resultado.houve_achado || !resultado.achados || resultado.achados.length === 0) {
        isBusinessError = true;
        track("procon_analise_inviavel", "procon_3_sem_vicio", { motivo: "sem_vicio" });
        setRejeicaoInfo({ tipo: "sem_vicio", motivo: resultado.resumo || "" });
        setAnalise(resultado);
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      setAnalise(resultado);
      const v = calcularViabilidade(resultado);
      track("procon_analise_viavel", "procon_3_paywall_exibido", { viabilidade: v ? v.nivel : "Negada" });
      setHasAnalyzed(true);
      localStorage.setItem("procon_saved_result", JSON.stringify(resultado));
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise do Procon:", err);
      if (!isBusinessError && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "procon_erro_sistema", { error_message: err.message });
      }
      if (err.message && (err.message.includes("429") || err.message.includes("SERVER_BUSY") || err.message.includes("exhausted"))) {
        setError("Nossos servidores estão processando um alto volume de análises. Por favor, aguarde alguns segundos e tente novamente.");
      } else {
        setError(err.message || "Ocorreu um erro ao comunicar com o servidor.");
      }
      setIsResultModalOpen(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCheckout = async () => {
    if (!analise) return;
    setIsCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "comprador@checkmulta.com.br",
          valor: PRECO,
          descricao: "Defesa Administrativa Procon - CheckMulta",
        }),
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor demorou para responder. Por favor, aguarde 1 minuto e clique novamente.");
      }
      const data = await response.json();
      if (response.ok && data.qr_code) {
        track("begin_checkout", "procon_4_checkout_iniciado", { value: PRECO, currency: "BRL" });
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
      localStorage.setItem("procon_paid_status", "true");
      generateDefense();
    }, 1500);
  };

  const generateDefense = async (overrideAnalise?: Analise) => {
    const dataToUse = overrideAnalise || analise;
    if (!dataToUse) return;
    setIsGeneratingDefense(true);
    setDefenseError(null);
    setDefenseResult(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/generate-defense-procon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analise: dataToUse }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      if (data.error) throw new Error(data.error);
      setDefenseResult(data.result);
      setShowSuccessMessage(true);
      setShowFomoBanner(false);
      localStorage.removeItem("procon_saved_result");
      localStorage.removeItem("procon_paid_status");
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
      track("procon_defesa_copiada", "procon_6_defesa_copiada");
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
    track("procon_defesa_baixada", "procon_6_defesa_baixada");
    const blob = new Blob([defenseResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defesa-administrativa-procon.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const viabilidade = calcularViabilidade(analise);

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

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <a href="/" className="transition hover:text-emerald-600">Multas de trânsito</a>
            <a href="#como-funciona" className="transition hover:text-emerald-600">Como funciona</a>
            <a href="#seguranca" className="transition hover:text-emerald-600">Segurança</a>
            <a href="#faq-procon" className="transition hover:text-emerald-600">Dúvidas</a>
            <a href="/procon/blog" className="transition hover:text-emerald-600">Blog</a>
            <button
              onClick={() => setActiveModal("suporte")}
              className="font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              Suporte
            </button>
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 hover:text-emerald-600 md:hidden"
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
                className="absolute left-0 top-full z-50 flex w-full flex-col space-y-2 border-b border-slate-200 bg-white p-4 shadow-lg md:hidden"
              >
                <a href="/" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Multas de trânsito</a>
                <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Como funciona</a>
                <a href="#seguranca" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Segurança</a>
                <a href="#faq-procon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Dúvidas</a>
                <a href="/procon/blog" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Blog</a>
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
                <strong className="font-semibold">Análise concluída.</strong> O prazo de defesa está correndo.
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Building2 className="h-3.5 w-3.5" />
            Para empresas autuadas
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Sua empresa foi multada pelo Procon? Veja se dá para recorrer,{" "}
            <span className="text-emerald-600">grátis</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
            Faça a análise gratuita do auto de infração. Nossa inteligência
            artificial verifica 16 pontos do processo, com base no Código de
            Defesa do Consumidor e no Decreto 2.181/97, em busca da falha que
            permite recorrer. Se não encontrar nada, você não paga — a análise é
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

      {/* ÁREA PRINCIPAL */}
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
                  <img src={previewUrl} alt="Preview do auto" className="h-auto max-h-48 w-full object-cover" />
                )}
              </div>

              <p className="text-sm text-slate-600">{imageFile?.name}</p>

              {!isAnalyzing && !hasAnalyzed && (
                <button
                  onClick={clearImage}
                  className="relative z-10 text-sm text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-red-500"
                  type="button"
                >
                  Excluir ou enviar outro documento
                </button>
              )}

              {!isAnalyzing && hasAnalyzed && (
                <div className="relative z-10 mt-4 flex w-full flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      if (analise || error) {
                        setIsResultModalOpen(true);
                        setShowFomoBanner(false);
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
                    Novo auto
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Descubra <span className="text-emerald-600">agora</span> se dá
                para recorrer
              </h2>
              <p className="text-base text-slate-600">
                Selecione o tipo de autuação para iniciar a análise gratuita:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TIPOS_AUTUACAO.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTipoSelect(t.name)}
                  className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-6 text-slate-800 transition hover:border-emerald-300 hover:shadow-md"
                >
                  <t.icon className="mb-1 h-8 w-8 text-slate-400 transition group-hover:text-emerald-600" />
                  <div className="text-center">
                    <span className="block text-[15px] font-bold leading-tight text-slate-900 group-hover:text-emerald-700">
                      {t.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">{t.subtitle}</span>
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
              <h3 className="mb-2 text-base font-bold text-slate-900">1. Envie o auto</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Suba o PDF ou a foto do auto de infração recebido do Procon. Nenhum dado é armazenado.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">2. A IA audita</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Verificamos 16 pontos do processo administrativo com base no CDC e no Decreto 2.181/97.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">3. Diagnóstico grátis</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Mostramos as falhas encontradas, com o trecho exato do documento, e se dá para recorrer.
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
                    Falha grave encontrada no auto. Fundamento consistente para pedir a anulação.
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
                    Há pontos questionáveis, especialmente na dosimetria. Argumento possível, não garantido.
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
                    Caso mais limitado. Ainda possível arguir — a decisão é da empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE VERIFICAMOS */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl">
              O que verificamos no seu <span className="text-emerald-600">auto de infração</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              A análise percorre os principais pontos que podem abrir margem para
              recurso, conforme o Decreto 2.181/97 e o Código de Defesa do
              Consumidor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { t: "Vícios de notificação", d: "Notificação por edital sem esgotamento de diligências, ausência de intimação pessoal do julgamento e prazo de defesa concedido abaixo do previsto." },
              { t: "Vícios de competência", d: "Atuação de órgão fora de sua atribuição territorial ou material e ausência de identificação do agente autuante." },
              { t: "Descrição da conduta", d: "Conduta narrada de forma genérica, ausência de capitulação legal e divergência entre o fato descrito e o dispositivo indicado." },
              { t: "Dosimetria da multa", d: "Ausência de fundamentação dos critérios do art. 57 do CDC, desconsideração do porte da empresa e estimativa de faturamento sem base documental." },
              { t: "Regularidade do processo", d: "Cerceamento do contraditório, decisão sem motivação expressa e ausência de investigação preliminar quando cabível." },
              { t: "Vícios formais do auto", d: "Ausência de data, local, número de processo, qualificação completa da autuada ou rasuras não ressalvadas." },
            ].map((item) => (
              <div key={item.t} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="mb-1.5 font-bold text-slate-900">{item.t}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Seus dados <span className="text-emerald-600">100% seguros</span>
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Zero armazenamento</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Não guardamos o auto de infração da sua empresa. O documento é processado na memória
                do servidor e imediatamente deletado.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserX className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Sem cadastro</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Você não precisa criar conta nem informar dados da empresa para verificar o auto.
                É direto ao ponto.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Route className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Total transparência</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Atuamos como ferramenta tecnológica baseada no CDC e no Decreto 2.181/97. A decisão
                final é do órgão julgador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq-procon" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Dúvidas <span className="text-emerald-600">frequentes</span>
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Qual o prazo para apresentar defesa no Procon?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                O Decreto federal 2.181/97 prevê 20 dias, mas há Procons estaduais com prazo próprio —
                o Procon-SP, por exemplo, adota 15 dias. Confira sempre o prazo indicado no seu auto
                de infração.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                O que acontece se a empresa não apresentar defesa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                O processo é julgado sem a manifestação da empresa e a multa é fixada. Não recolhido
                o valor no prazo, o débito pode ser inscrito em dívida ativa e cobrado judicialmente.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Que tipo de vício pode anular o auto?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Conduta descrita de forma genérica, ausência de capitulação legal, notificação
                irregular, incompetência do órgão e falta de fundamentação da multa são exemplos
                tratados no Decreto 2.181/97.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                É possível reduzir o valor da multa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Sim. O art. 57 do CDC exige que a multa considere gravidade, vantagem auferida e
                condição econômica. Se a estimativa de faturamento estiver equivocada, ela pode ser
                impugnada com documentos contábeis.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 md:col-span-2">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Preciso de advogado para apresentar defesa administrativa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Não é obrigatório na esfera administrativa — a empresa pode apresentar defesa por meio
                de seu representante legal. Para casos de maior complexidade ou valor elevado, a
                consulta a um advogado é recomendável.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO SEO */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Como apresentar defesa administrativa no{" "}
            <span className="text-emerald-600">Procon</span>
          </h2>

          <div className="max-w-none">
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              Quando uma empresa é autuada pelo Procon, instaura-se um{" "}
              <strong className="font-semibold text-slate-900">processo administrativo sancionador</strong>,
              disciplinado pela Lei 8.078/90 (Código de Defesa do Consumidor) e pelo Decreto 2.181/97.
              Nesse processo, a empresa tem direito ao contraditório e à ampla defesa antes que
              qualquer penalidade se torne definitiva.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              O que é o auto de infração do Procon
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O auto de infração é o documento que formaliza a acusação. Ele deve descrever a conduta
              com precisão, indicar o dispositivo legal violado, identificar o agente autuante e
              observar as formalidades previstas na legislação. A ausência desses elementos pode
              comprometer a validade da autuação.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Qual o prazo para defesa
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O <strong className="font-semibold text-slate-900">artigo 42 do Decreto 2.181/97</strong>,
              com a redação dada pelo Decreto 10.887/2021, prevê o prazo de 20 dias contados do
              recebimento da notificação. Alguns Procons estaduais adotam prazo próprio — o Procon-SP,
              por exemplo, trabalha com 15 dias, com base na Lei Estadual 10.177/98. Por isso, é
              fundamental conferir o prazo indicado no próprio auto de infração e, em caso de dúvida,
              confirmar junto ao órgão emissor.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Como é calculado o valor da multa
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O <strong className="font-semibold text-slate-900">artigo 57 do CDC</strong> determina
              que a multa seja graduada de acordo com a gravidade da infração, a vantagem auferida e a
              condição econômica do fornecedor. Quando o auto não demonstra essa análise, ou quando
              estima o faturamento da empresa sem base documental, abre-se espaço para requerer a
              redução do valor — inclusive apresentando a declaração de faturamento real.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Tratamento diferenciado para ME e EPP
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              Microempresas e empresas de pequeno porte têm tratamento diferenciado previsto na Lei
              Complementar 123/2006, incorporado ao processo do Procon pelo Decreto 10.887/2021. Se o
              auto desconsiderou o porte da empresa na dosimetria, esse é um ponto que pode ser
              arguido na defesa.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Onde protocolar a defesa
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              A forma de protocolo varia conforme o órgão. Alguns Procons aceitam envio eletrônico;
              outros{" "}
              <strong className="font-semibold text-slate-900">
                exigem protocolo presencial ou por via postal
              </strong>{" "}
              e não consideram documentos enviados por e-mail. Confirme sempre a forma de protocolo
              junto ao Procon emissor antes do vencimento do prazo.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Como o CheckMulta ajuda
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O CheckMulta analisa gratuitamente o auto de infração e aponta os vícios encontrados,
              sempre citando o trecho exato do documento que fundamenta cada apontamento. Se houver
              vício, geramos uma{" "}
              <strong className="font-semibold text-slate-900">
                defesa administrativa completa, estruturada em preliminares, mérito e pedidos
              </strong>
              , pronta para a empresa preencher e protocolar. Nossa ferramenta informa e
              instrumentaliza — não presta consultoria jurídica nem representação processual.
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

          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-slate-500">
            <strong className="font-semibold text-slate-700">Transparência e privacidade:</strong>{" "}
            nosso sistema atua como organizador tecnológico com base no Código de Defesa do Consumidor
            e no Decreto 2.181/97. Não prestamos consultoria jurídica nem representação processual. A
            decisão final é do órgão julgador. Não exigimos cadastro e não armazenamos o seu documento.
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
            <div className="min-h-full flex items-center justify-center p-4">
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
                    <h3 className="text-base font-bold leading-tight text-slate-900">{selectedTipo}</h3>
                  </div>
                  <button onClick={() => setIsUploadModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <p className="text-xs leading-relaxed text-amber-800">
                      Envie o <strong className="font-semibold">PDF original</strong> sempre que possível. Se for foto, deixe o texto completo e legível.
                    </p>
                  </div>

                  <div className="group relative cursor-pointer rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/30 text-center transition hover:border-emerald-500 hover:bg-emerald-50/60">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      disabled={isAnalyzing || isPaid}
                      title="Clique para enviar o documento"
                    />
                    <div className="pointer-events-none flex flex-col items-center justify-center space-y-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white transition duration-200 group-hover:scale-105">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Auto de infração do Procon</p>
                        <p className="mt-0.5 text-xs text-slate-500">PDF, JPG ou PNG — documento completo</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <Lock className="h-3 w-3" />
                    <p className="text-[11px]">Documento deletado imediatamente após a análise</p>
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
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
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
                  {activeModal === "aviso" && <p>Este documento é um modelo referencial gerado automaticamente por inteligência artificial e não constitui consultoria jurídica. Não somos um escritório de advocacia e não representamos a empresa juridicamente. <strong className="font-semibold text-slate-900">A decisão final do processo administrativo é de exclusiva competência do órgão julgador.</strong> Confira sempre o prazo e a forma de protocolo junto ao Procon emissor.</p>}
                  {activeModal === "termos" && <p>O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário, forma de protocolo inadequada ou resultado das decisões proferidas pelo órgão julgador. Para casos de maior complexidade ou valor elevado, recomendamos a consulta a um advogado.</p>}
                  {activeModal === "privacidade" && <p>Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros do auto de infração enviado, dados da empresa ou da defesa gerada. O processamento é de caráter transitório para elaboração do documento, que é imediatamente apagado após o fechamento da página.</p>}
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-1">
                      <p className="text-[15px] text-slate-600">Selecione o canal de atendimento para falar com o nosso time:</p>
                      <div className="flex flex-col gap-3">
                        <a href="https://wa.me/5513996485501?text=Olá!%20Preciso%20de%20ajuda%20com%20a%20análise%20do%20Procon." target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-900 transition hover:bg-emerald-100">
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
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 py-12">
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
                        A IA está lendo o documento em alta resolução. <strong className="font-semibold text-slate-900">Isso pode levar cerca de 1 minuto.</strong> Não feche a tela.
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

                  {/* REJEIÇÃO: SEM VÍCIO */}
                  {!error && !isAnalyzing && rejeicaoInfo && rejeicaoInfo.tipo === "sem_vicio" && (
                    <div className="mx-auto flex max-w-md flex-col items-center space-y-5 py-4 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <ShieldCheck className="h-10 w-10" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">Não encontramos falha para recorrer</h3>
                        <p className="leading-relaxed text-slate-600">
                          Analisamos o auto de infração ponto por ponto e <strong className="font-semibold text-slate-900">não encontramos falha</strong> entre os 16 itens verificados. O documento aparenta seguir as formalidades exigidas pelo CDC e pelo Decreto 2.181/97.
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-500">
                          Como não encontramos irregularidade, não há cobrança. Optamos por informá-lo com franqueza, em vez de elaborar uma defesa sem fundamento real. Esse é o critério que aplicamos em toda análise.
                        </p>
                      </div>
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                        <p className="text-sm leading-relaxed text-slate-600">
                          <strong className="font-semibold text-slate-900">Importante:</strong> isso não significa que a autuação seja necessariamente procedente. Significa que as falhas que analisamos não foram encontradas. Se a empresa discorda do mérito da autuação, recomendamos a consulta a um advogado.
                        </p>
                      </div>
                      <button onClick={handleNovaAnalise} className="mt-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Analisar outro auto
                      </button>
                    </div>
                  )}

                  {/* RESULTADO COM PAYWALL */}
                  {analise && analise.houve_achado && !isPaid && !isAnalyzing && !error && !rejeicaoInfo && (
                    <div className="space-y-6">

                      {/* Dados do processo */}
                      {(analise.empresa_autuada || analise.orgao_emissor || analise.numero_processo) && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Auto de infração analisado</p>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {analise.empresa_autuada && (
                              <div className="flex items-start gap-2.5">
                                <Building2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Empresa</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.empresa_autuada}</p>
                                </div>
                              </div>
                            )}
                            {analise.orgao_emissor && (
                              <div className="flex items-start gap-2.5">
                                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Órgão</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.orgao_emissor}</p>
                                </div>
                              </div>
                            )}
                            {analise.numero_processo && (
                              <div className="flex items-start gap-2.5">
                                <FileText className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Processo</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.numero_processo}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {analise.prazo_identificado && (
                            <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4">
                              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Prazo para defesa</p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-700">{analise.prazo_identificado}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Título com viabilidade */}
                      <div className="flex items-start space-x-4">
                        <CheckCircle2 className={`mt-1 h-7 w-7 flex-shrink-0 ${viabilidade?.nivel === "Baixa" ? "text-amber-500" : "text-emerald-600"}`} />
                        <div>
                          <h2 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                            {viabilidade?.nivel === "Baixa" ? (
                              <>Analisamos o auto e há um <span className="text-amber-600">ângulo possível</span></>
                            ) : (
                              <>Encontramos <span className="text-emerald-600">falha</span> neste auto</>
                            )}
                          </h2>
                          <p className="leading-relaxed text-slate-600">{analise.resumo}</p>
                        </div>
                      </div>

                      {/* Contadores */}
                      <div className="flex flex-wrap gap-2.5">
                        {analise.quantidade_criticos > 0 && (
                          <span className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700">
                            {analise.quantidade_criticos} crítico(s)
                          </span>
                        )}
                        {analise.quantidade_atencao > 0 && (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
                            {analise.quantidade_atencao} de atenção
                          </span>
                        )}
                        {analise.quantidade_verificar > 0 && (
                          <span className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-700">
                            {analise.quantidade_verificar} a verificar
                          </span>
                        )}
                      </div>

                      {/* Achados */}
                      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">O que a análise encontrou no seu auto</p>
                        {analise.achados.map((achado, i) => {
                          const est = ESTILOS_GRAVIDADE[achado.gravidade] || ESTILOS_GRAVIDADE.verificar;
                          return (
                            <div key={i} className={`rounded-r-lg border-l-4 bg-white p-4 ${est.borda}`}>
                              <div className="mb-2.5 flex items-start gap-2.5">
                                <AlertCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${est.corIcone}`} />
                                <div>
                                  <h3 className="text-[15px] font-bold leading-snug text-slate-900">{achado.titulo}</h3>
                                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${est.texto}`}>{est.rotulo}</span>
                                </div>
                              </div>
                              <div className="mb-2.5 pl-7">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trecho do documento</p>
                                <p className="border-l-2 border-slate-200 pl-3 text-[13px] italic leading-relaxed text-slate-600">
                                  {achado.trecho_documento}
                                </p>
                              </div>
                              <p className="pl-7 text-[13px] leading-relaxed text-slate-700 sm:text-sm">{achado.explicacao}</p>
                              {achado.base_legal && (
                                <p className="mt-1.5 pl-7 text-[11px] text-slate-500">{achado.base_legal}</p>
                              )}
                            </div>
                          );
                        })}

                        {viabilidade && (
                          <div className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 ${viabilidade.bg} ${viabilidade.borda}`}>
                            <ShieldCheck className={`h-4 w-4 ${viabilidade.cor}`} />
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chance de recorrer:</span>
                            <span className={`text-sm font-bold uppercase ${viabilidade.cor}`}>{viabilidade.nivel}</span>
                          </div>
                        )}
                      </div>

                      {/* Oferta */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 text-left">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                          <Scale className="h-5 w-5 text-emerald-600" /> O que você recebe por R$ 99,00
                        </h3>
                        <ul className="space-y-3 text-[13px] text-slate-700 sm:text-[15px]">
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Defesa administrativa completa, estruturada em preliminares, mérito e pedidos</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Cada ponto fundamentado no CDC e no Decreto 2.181/97, com o trecho do seu documento</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Pedido subsidiário de redução da multa com base nos critérios do art. 57 do CDC</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Entrega imediata após o pagamento — pronta para preencher e protocolar</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <p className="text-[11px] leading-relaxed text-amber-800 sm:text-xs">
                          <strong className="font-semibold">Por que vale a pena:</strong> a elaboração de uma defesa administrativa por advogado costuma custar a partir de R$ 800. Aqui, são R$ 99,00 — e apenas quando encontramos falha concreta. A peça é fundamentada no CDC e no Decreto 2.181/97; a decisão final cabe ao órgão julgador. Confira o prazo e a forma de protocolo junto ao Procon emissor.
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
                          <span>{isCheckoutLoading ? "Gerando PIX..." : "Gerar minha defesa agora"}</span>
                        </div>
                        <span className="mt-1 text-sm font-normal text-emerald-50">Pagamento único · R$ 99,00 · Entrega imediata</span>
                      </button>
                      <p className="mt-2 text-center text-[11px] text-slate-400">CheckMulta Tecnologia — CNPJ 63.524.338/0001-62</p>
                    </div>
                  )}

                  {/* LOADING DA GERAÇÃO */}
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

                  {/* ERRO NA GERAÇÃO */}
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
                      <a href="https://wa.me/5513996485501?text=Olá!%20Eu%20paguei%20pela%20defesa%20do%20Procon%20mas%20a%20tela%20deu%20erro%20ao%20carregar.%20Pode%20me%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
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
                        <h3 className="mb-3 text-2xl font-bold text-slate-900">Defesa pronta</h3>
                        <p className="text-base leading-relaxed text-slate-600">
                          Sua defesa administrativa foi gerada. Na próxima tela, copie o texto ou baixe o arquivo.
                        </p>
                      </div>
                      <div className="mt-4 flex w-full flex-col items-center gap-3 sm:mt-6 sm:gap-4">
                        <button
                          onClick={() => setShowSuccessMessage(false)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Ver minha defesa <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => setActiveModal("suporte")} className="text-sm text-slate-400 transition hover:text-emerald-600">
                          Precisa de ajuda? Fale com o suporte.
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DEFESA GERADA */}
                  {defenseResult && !showSuccessMessage && (
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-center justify-center space-x-3 border-b border-slate-200 pb-4">
                        <Scale className="h-6 w-6 text-slate-700" />
                        <h2 className="text-center text-xl font-bold text-slate-900">Sua defesa administrativa</h2>
                      </div>
                      <div className="mb-4 mt-2 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4">
                        <p className="text-sm leading-relaxed text-amber-800">
                          <strong className="font-semibold">Atenção:</strong> revise o documento e substitua todos os campos em{" "}
                          <span className="rounded bg-red-50 px-1 font-semibold text-red-600">vermelho</span> pelos dados reais da empresa antes de protocolar. Confirme o prazo e a forma de protocolo junto ao Procon emissor.
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
                            {isCopied ? <><Check className="h-5 w-5 text-emerald-600" /><span className="text-emerald-600">Copiado</span></> : <><Copy className="h-5 w-5 text-slate-500" /><span>Copiar defesa</span></>}
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
            <div className="min-h-full flex items-center justify-center p-4">
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
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">R$ 99,00</h3>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Defesa administrativa</p>
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
                        <strong className="font-semibold">Garantia técnica:</strong> se a defesa não for liberada em 10 segundos após o pagamento, garantimos reembolso via PIX.
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
