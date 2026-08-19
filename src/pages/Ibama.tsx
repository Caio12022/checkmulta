/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Scale, QrCode, X, Copy, Download, Check, Search, FileText,
  Lock, UserX, Route, RefreshCcw, MessageSquare,
  ClipboardList, Menu, Timer, Building2, Leaf,
  ShieldAlert, FileWarning, PlusCircle, UploadCloud, Receipt,
  ExternalLink, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CarrosselServicos from "../components/CarrosselServicos";
import GerarPdfDefesa from "../components/GerarPdfDefesa";
import { ehSobrecarga, ehCotaDiaria } from "../lib/sobrecarga";
import HeroFluxo from "../components/HeroFluxo";
import EscolhaOrgao from "../components/EscolhaOrgao";
import ComoFuncionaScroll from "../components/ComoFuncionaScroll";
import Reveal from "../components/Reveal";
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: (...args: any[]) => void;
  }
}

// Preço escalonado pelo valor da multa do auto (3 faixas).
// Os três valores já constam do VALORES_PERMITIDOS do server.ts.
// Sem valor extraível, aplica-se o piso da vertical (149) — nunca o de 19,90.
const PRECO_BAIXO = 149.0;   // multa até R$ 5 mil
const PRECO_MEDIO = 299.0;   // multa de R$ 5 mil a R$ 50 mil
const PRECO_ALTO = 599.0;    // multa acima de R$ 50 mil
const LIMITE_BAIXO = 5000;
const LIMITE_ALTO = 50000;

const precoPara = (a: Analise | null): number => {
  const v = a && typeof a.valor_multa === "number" ? a.valor_multa : null;
  if (v === null) return PRECO_BAIXO;
  if (v > LIMITE_ALTO) return PRECO_ALTO;
  if (v > LIMITE_BAIXO) return PRECO_MEDIO;
  return PRECO_BAIXO;
};

const formatarPreco = (v: number) => v.toFixed(2).replace(".", ",");

/* Valor da multa do auto, em reais. Diferente de formatarPreco, que formata o
   preco do produto: aqui entra separador de milhar, porque multa ambiental
   costuma passar de mil (ex.: 62500 vira "R$ 62.500,00"). */
const formatarValorMulta = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const track = (gtagEvent: string, clarityEvent: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return;
  if (window.gtag) window.gtag("event", gtagEvent, params || {});
  if (window.clarity) window.clarity("event", clarityEvent);
};
// ─── DISPARO DA VENDA ──────────────────────────────────────────────────────
// A trava por transaction_id evita contagem dupla em recarga de página.
const fireCompraIbama = (transactionId: string, preco: number) => {
  if (typeof window === "undefined") return;
  const chave = `ibama_purchase_${transactionId}`;
  try {
    if (localStorage.getItem(chave)) return;
    localStorage.setItem(chave, "1");
  } catch {
    // localStorage indisponível (aba anônima): segue e dispara mesmo assim
  }
  track("purchase", "ibama_5_pagamento_confirmado", {
    transaction_id: transactionId,
    value: preco,
    currency: "BRL",
    items: [{ item_id: "defesa_ibama", item_name: "Defesa Auto Infracao IBAMA", price: preco, quantity: 1 }],
  });
};
// ─── TIPOS ─────────────────────────────────────────────────────────────────
interface Achado {
  titulo: string;
  gravidade: "critico" | "atencao" | "verificar";
  bloco: "formalidade" | "competencia" | "prescricao" | "prazo";
  trecho_documento: string;
  explicacao: string;
  base_legal: string;
}

interface Analise {
  resumo: string;
  orgao_autuante: string;
  esfera: string;
  numero_auto: string;
  autuado: string;
  infracao_descrita: string;
  dispositivo_enquadrado: string;
  valor_multa: number | null;
  achados: Achado[];
  quantidade_criticos: number;
  quantidade_atencao: number;
  quantidade_verificar: number;
  houve_achado: boolean;
  /* Trava de venda: quando o prazo aparenta vencido, a análise continua
     visível mas a oferta some. Preenchido pelo prompt, nunca por achado. */
  prazo_aparenta_vencido?: boolean;
  prazo_detalhe?: string;
}

type Viabilidade = { nivel: "Alta" | "Média" | "Baixa"; cor: string; bg: string; borda: string };

/*
   Auto lavrado por orgao ESTADUAL ou MUNICIPAL (CETESB, INEA, IAT, secretaria
   municipal...). A analise so consegue conferi-lo contra a norma FEDERAL, que
   ali nao se aplica diretamente: o orgao tem legislacao e prazos proprios.

   Vender uma peca nesse caso e perigoso — ela sairia enderecada ao IBAMA,
   citando o prazo de 20 dias do art. 113 e mandando protocolar no SEI/IBAMA,
   tudo errado para um auto estadual. O usuario protocolaria no orgao errado e
   perderia o prazo real. Entao aqui a analise informa e NAO cobra.
*/
const ehForaDaEsferaFederal = (a: Analise | null): boolean => {
  if (!a) return false;
  const e = (a.esfera || "").toLowerCase().trim();
  return e === "estadual" || e === "municipal";
};

// ─── VIABILIDADE: derivada das gravidades encontradas ──────────────────────
/*
   Antes, QUALQUER achado critico devolvia "Alta". Na pratica isso fazia o
   medidor marcar Alta em praticamente toda analise com achado, e um indicador
   que nunca varia nao informa nada — alem de inflar a expectativa do usuario
   justamente onde queremos conte-la.

   Agora ha gradacao: "Alta" exige um achado que sozinho derruba a autuacao
   (prescricao ou incompetencia) ou o reforco de mais de um critico. Um unico
   critico formal, isolado, e argumento bom mas nao garantido — fica "Media".
*/
const calcularViabilidade = (a: Analise | null): Viabilidade | null => {
  if (!a || !a.houve_achado) return null;

  const criticos = a.quantidade_criticos;

  /* Achados que, procedentes, encerram o processo por si sos. */
  const temAchadoTerminativo =
    Array.isArray(a.achados) &&
    a.achados.some(
      (ac) =>
        ac.gravidade === "critico" &&
        (ac.bloco === "prescricao" || ac.bloco === "competencia")
    );

  if (criticos > 0 && (temAchadoTerminativo || criticos >= 2))
    return { nivel: "Alta", cor: "text-emerald-700", bg: "bg-emerald-50", borda: "border-emerald-200" };

  if (criticos > 0 || a.quantidade_atencao > 0)
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
        <span key={index} className="rounded-sm bg-red-50 px-1 font-semibold text-red-500">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const LOADER_MESSAGES = [
  "Lendo o auto de infração...",
  "Conferindo os requisitos formais do auto...",
  "Verificando indícios de prescrição...",
  "Avaliando a competência do órgão autuante...",
];

const TIPOS_AUTUACAO = [
  { id: "auto", name: "Auto de Infração", subtitle: "documento do IBAMA", icon: FileWarning },
  { id: "notificacao", name: "Notificação do processo", subtitle: "andamento ou decisão", icon: Receipt },
  { id: "embargo", name: "Termo de embargo", subtitle: "embargo ou apreensão", icon: ShieldAlert },
  { id: "outros", name: "Outros documentos", subtitle: "laudo, relatório ou correspondência", icon: PlusCircle },
];

const ESTILOS_GRAVIDADE = {
  critico: {
    borda: "border-l-red-500", texto: "text-red-700",
    rotulo: "Crítico", corIcone: "text-red-600",
  },
  atencao: {
    borda: "border-l-amber-500", texto: "text-amber-700",
    rotulo: "Atenção", corIcone: "text-amber-600",
  },
  verificar: {
    borda: "border-l-sky-500", texto: "text-sky-700",
    rotulo: "Verificar", corIcone: "text-sky-600",
  },
};

/* Para onde enviar a defesa pronta. IBAMA é federal e o caminho de
   protocolo é único (SEI/IBAMA), diferente de verticais estaduais/
   municipais como Procon ou Vigilância — por isso é um passo a passo
   fixo aqui, sem precisar de lógica por estado (a parte mais simples
   de padronizar entre as cinco verticais). Links para páginas oficiais
   do gov.br, que se mantêm corretas mesmo se o processo interno mudar. */
const PASSO_A_PASSO_IBAMA = [
  {
    titulo: "Confirme o prazo no seu auto",
    texto: "O prazo padrão é de 20 dias contados da ciência da autuação (art. 113 do Decreto nº 6.514/2008), mas pode estar suspenso se houver audiência de conciliação ambiental agendada (art. 97-A). Confira a data exata impressa no seu documento.",
  },
  {
    titulo: "Cadastre-se como usuário externo no SEI/IBAMA",
    texto: "Se ainda não tiver acesso, é necessário se cadastrar antes de conseguir enviar a defesa pelo sistema eletrônico.",
    href: "https://www.gov.br/ibama/pt-br/assuntos/notas/2020/sei-ibama-modulo-de-peticionamento-eletronico-disponivel-para-usuarios-externos-cadastrados",
    linkTexto: "Como funciona o cadastro de usuário externo",
  },
  {
    titulo: "Localize o seu processo",
    texto: "Use o Portal do Autuado para consultar o andamento e confirmar o número do processo antes de protocolar.",
    href: "https://autuacoes.ibama.gov.br/",
    linkTexto: "Portal do Autuado (IBAMA)",
  },
  {
    titulo: "Anexe a defesa e protocole",
    texto: "Envie o arquivo baixado abaixo pelo sistema eletrônico e guarde o comprovante de protocolo.",
  },
];

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function Ibama() {
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

  /* Retomada de sessao.
     Quando o usuario volta e ja existe defesa paga guardada, a pagina NAO abre
     o resultado direto nem gera nada: mostra a escolha entre reabrir o que ele
     comprou ou comecar de novo. Comecar de novo passa por confirmacao, porque
     descarta a peca paga. */
  const [showRetomarModal, setShowRetomarModal] = useState(false);
  const [showConfirmNovaModal, setShowConfirmNovaModal] = useState(false);
  /* Aviso antes de encerrar a consulta da defesa: fechar o modal apaga a peca
     deste aparelho, entao o usuario confirma que ja salvou o texto. */
  const [showConfirmFecharDefesa, setShowConfirmFecharDefesa] = useState(false);
  /* Recusa por escopo nao e erro: a analise funcionou e concluiu que o
     documento nao e do tipo que tratamos. Precisa de titulo e cor proprios,
     senao "Analise indisponivel" faz parecer falha do site. */
  const [ehForaDeEscopo, setEhForaDeEscopo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── EFEITOS ─────────────────────────────────────────────────────────────
  // ─── SCHEMA FAQPage — faz a IA e o Google entenderem as perguntas de baixo ──
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Qual o prazo para apresentar defesa?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O prazo é de 20 dias contados da ciência da autuação, mas pode ficar suspenso quando há audiência de conciliação ambiental. Confira o prazo no próprio auto e no sistema do IBAMA, e protocole o quanto antes."
          }
        },
        {
          "@type": "Question",
          "name": "O que acontece se eu não apresentar defesa?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O processo é julgado sem a sua manifestação e a multa é consolidada, podendo ser inscrita em dívida ativa e executada. Apresentar defesa é o que garante o contraditório antes da decisão."
          }
        },
        {
          "@type": "Question",
          "name": "Que tipo de falha pode anular o auto?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Descrição genérica da infração, enquadramento incompatível com o fato, ausência de laudo de constatação, área sem georreferenciamento, autuação por órgão incompetente e prescrição são exemplos."
          }
        },
        {
          "@type": "Question",
          "name": "O que é a prescrição do auto ambiental?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A Administração tem 5 anos, contados do fato, para lavrar o auto, e o processo não pode ficar parado por mais de 3 anos. Ultrapassados esses prazos, há indício de prescrição, que pode levar ao arquivamento. Um dos argumentos mais fortes em autos antigos."
          }
        },
        {
          "@type": "Question",
          "name": "Preciso de advogado para apresentar defesa?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Não é obrigatório na via administrativa: o próprio autuado pode protocolar a defesa pelo sistema do IBAMA. Para autos de valor elevado ou se o caso for para a Justiça, a consulta a um advogado é fortemente recomendável."
          }
        }
      ]
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema-ibama";
    script.text = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("faq-schema-ibama");
      if (existing) existing.remove();
    };
  }, []);
  useEffect(() => {
    const savedResult = localStorage.getItem("ibama_saved_result");
    const savedPaidStatus = localStorage.getItem("ibama_paid_status");
    const savedDefense = localStorage.getItem("ibama_defense_result");
    if (savedResult && savedPaidStatus === "true" && !defenseResult && !isGeneratingDefense) {
      try {
        const parsed = JSON.parse(savedResult) as Analise;
        setAnalise(parsed);
        setIsPaid(true);
        setHasAnalyzed(true);
        /* Se a peca ja foi gerada antes, ela volta do storage — sem nova
           chamada a IA. Isso evita cobrar uma geracao a cada retorno e
           garante que o usuario receba exatamente o texto que comprou. */
        if (savedDefense) setDefenseResult(savedDefense);
        /* Nao abre o resultado automaticamente: oferece a escolha. */
        setShowRetomarModal(true);
      } catch {
        localStorage.removeItem("ibama_saved_result");
        localStorage.removeItem("ibama_paid_status");
        localStorage.removeItem("ibama_pending_payment");
        localStorage.removeItem("ibama_defense_result");
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
      if (!paymentId) return;
      try {
        const res = await fetch(`/api/check-payment/${paymentId}`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          setIsPixModalOpen(false);
          setIsPaid(true);
          localStorage.setItem("ibama_paid_status", "true");
          localStorage.removeItem("ibama_pending_payment");
          fireCompraIbama(paymentId.toString(), precoPara(analise));
          // Se voltou numa página "limpa" (recarga/aba nova), recupera a análise
          // do localStorage para que a defesa seja gerada.
          if (!analise) {
            const salvo = localStorage.getItem("ibama_saved_result");
            if (salvo) {
              try {
                setAnalise(JSON.parse(salvo));
                setIsResultModalOpen(true);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error("Erro no radar do PIX", err);
      }
    };
    // Roda enquanto houver pagamento pendente — mesmo com o modal FECHADO.
    if (paymentId && !isPaid) {
      checkPaymentStatus();
      intervalId = setInterval(checkPaymentStatus, 3000);
      timeoutId = setTimeout(() => clearInterval(intervalId), 900000); // 15 min
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentId, isPaid]);

  // Ao carregar a página: se houver pagamento pendente salvo, retoma a verificação.
  useEffect(() => {
    if (paymentId) return;
    try {
      const pendente = localStorage.getItem("ibama_pending_payment");
      const jaPago = localStorage.getItem("ibama_paid_status") === "true";
      if (!pendente || jaPago) return;
      const dados = JSON.parse(pendente);
      // Descarta pendências antigas (mais de 30 min): o PIX já teria expirado.
      if (!dados?.id || Date.now() - (dados.ts || 0) > 30 * 60 * 1000) {
        localStorage.removeItem("ibama_pending_payment");
        return;
      }
      setPaymentId(dados.id);
    } catch {
      localStorage.removeItem("ibama_pending_payment");
    }
  }, []);

  // Deep-link do blog: "?analisar=1" pula a landing e rola direto para a
  // escolha do documento — poupa o clique de achar essa área depois do CTA
  // do artigo.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("analisar") !== "1") return;
    const t = setTimeout(() => {
      const alvo = document.getElementById("enviar-documento");
      if (!alvo) return;
      // Desconta a altura do header fixo (sticky top-0), senão o título
      // fica escondido atrás dele.
      const y = alvo.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // ─── HANDLERS ────────────────────────────────────────────────────────────
  const handleTipoSelect = (tipoName: string) => {
    setSelectedTipo(tipoName);
    setIsUploadModalOpen(true);
    track("ibama_tipo_selecionado", "ibama_1_tipo_selecionado", { tipo: tipoName });
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
    localStorage.removeItem("ibama_saved_result");
    localStorage.removeItem("ibama_paid_status");
    localStorage.removeItem("ibama_pending_payment");
    localStorage.removeItem("ibama_defense_result");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* Reabre a peca ja paga. Se por algum motivo o texto nao veio do storage
     (ex.: aba fechada antes de a geracao terminar), gera uma unica vez. */
  const handleAbrirDefesaSalva = () => {
    setShowRetomarModal(false);
    setShowConfirmNovaModal(false);
    setIsPaid(true);
    /* Abre direto no texto final, sem a tela intermediaria "Defesa pronta". */
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    setIsResultModalOpen(true);
    if (!defenseResult && analise) generateDefense(analise);
  };

  /* Comecar de novo descarta a peca paga: exige confirmacao. */
  const handlePedirNovaAnalise = () => {
    setShowRetomarModal(false);
    setShowConfirmNovaModal(true);
  };

  const handleConfirmarNovaAnalise = () => {
    setShowConfirmNovaModal(false);
    setDefenseResult(null);
    setAnalise(null);
    setIsPaid(false);
    clearImage();
  };

  /* Desistiu de comecar de novo: volta para a escolha, sem perder nada. */
  const handleCancelarNovaAnalise = () => {
    setShowConfirmNovaModal(false);
  };

  /* Sair da retomada sem escolher: o usuario quer navegar ou enviar outro
     documento. Nada e apagado — a defesa continua guardada. */
  const handleFecharRetomada = () => {
    setShowRetomarModal(false);
  };

  const handleNovaAnalise = () => {
    clearImage();
    setIsResultModalOpen(false);
    setRejeicaoInfo(null);
    setSelectedTipo(null);
    setIsUploadModalOpen(false);
  };

  const closeResultModal = () => {
    /* Com a defesa paga em tela, fechar significa encerrar: confirma antes,
       porque a peca sai do aparelho e nao ha como recuperar. */
    if (defenseResult && isPaid) {
      setShowConfirmFecharDefesa(true);
      return;
    }
    setIsResultModalOpen(false);
    if (analise && analise.houve_achado && !ehForaDaEsferaFederal(analise) && !isPaid && !error) {
      setShowFomoBanner(true);
    }
  };

  /* Confirmou que salvou: encerra de vez. Some do storage, o fluxo volta ao
     inicio e a retomada nao aparece mais numa proxima visita. */
  const handleEncerrarDefesa = () => {
    setShowConfirmFecharDefesa(false);
    setIsResultModalOpen(false);
    setShowRetomarModal(false);
    setShowSuccessMessage(false);
    setShowFomoBanner(false);
    clearImage();
  };

  /* Ainda nao salvou: volta para a peca sem apagar nada. */
  const handleVoltarParaDefesa = () => {
    setShowConfirmFecharDefesa(false);
  };

  const processFile = (file: File) => {
    track("ibama_upload", "ibama_2_documento_enviado", { file_type: file.type });
    /* Enviar documento novo sempre recomeca do zero, mesmo com defesa
       guardada: sem isso a tela ficava presa no resultado antigo. */
    setShowRetomarModal(false);
    setShowConfirmNovaModal(false);
    setShowConfirmFecharDefesa(false);
    setHasAnalyzed(false);
    setEhForaDeEscopo(false);
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
      const response = await fetch("/api/analyze-ibama", {
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
          track("ibama_analise_erro", "ibama_erro_documento_invalido", { tipo: "documento_invalido" });
          throw new Error("O arquivo enviado não parece ser um auto de infração ambiental ou documento de processo do IBAMA. Confira o documento e tente novamente.");
        }
        if (lower.includes("documento_ilegivel")) {
          isBusinessError = true;
          track("ibama_analise_erro", "ibama_erro_documento_ilegivel", { tipo: "documento_ilegivel" });
          throw new Error("Não conseguimos ler o documento. Envie um arquivo mais nítido ou o PDF original.");
        }

        /* Recusa por ESCOPO. Diferente de "não encontramos falha": aqui o
           documento é legítimo, mas trata de tema que a plataforma não analisa.
           Dizer isso com clareza é mais honesto e mais profissional do que
           devolver "nada encontrado" para algo que sequer foi examinado. */
        const foraDeEscopo: Record<string, string> = {
          fora_escopo_dosimetria:
            "Este documento trata do valor da multa (cálculo, gradação ou pedido de redução). Não analisamos dosimetria: isso depende de critérios internos do órgão e da situação econômica do autuado, que não constam do auto. Um contador ou advogado consegue avaliar esse ponto.",
          fora_escopo_merito:
            "A questão aqui é de fato — se a conduta ocorreu, se a área tem a classificação apontada — e não de forma do documento. Não analisamos mérito: isso se resolve com prova e perícia, não com a leitura do auto.",
          fora_escopo_cautelar:
            "Este é um termo de embargo, apreensão ou suspensão de atividade, que segue regras e prazos distintos do auto de infração. Não analisamos esse tipo de documento. Procure orientação jurídica com urgência, porque os prazos costumam ser curtos.",
          fora_escopo_execucao:
            "Esta multa já está em cobrança judicial ou inscrita em dívida ativa. A fase administrativa se encerrou e uma defesa administrativa não teria mais efeito. O caminho agora é judicial: procure um advogado.",
          fora_escopo_penal:
            "Este documento é da esfera criminal, não administrativa. Não analisamos matéria penal. Procure um advogado o quanto antes: prazos criminais são curtos e a defesa exige representação.",
        };

        const chaveEscopo = Object.keys(foraDeEscopo).find((k) => lower.includes(k));
        if (chaveEscopo) {
          isBusinessError = true;
          setEhForaDeEscopo(true);
          track("ibama_analise_erro", "ibama_fora_escopo", { tipo: chaveEscopo });
          throw new Error(foraDeEscopo[chaveEscopo]);
        }
        throw new Error("Não foi possível concluir a análise. Tente novamente.");
      }

      const resultado = data.result as Analise;

      // Nenhuma falha encontrada
      if (!resultado.houve_achado || !resultado.achados || resultado.achados.length === 0) {
        isBusinessError = true;
        track("ibama_analise_inviavel", "ibama_3_sem_falha", { motivo: "sem_falha" });
        setRejeicaoInfo({ tipo: "sem_vicio", motivo: resultado.resumo || "" });
        setAnalise(resultado);
        setIsResultModalOpen(true);
        setIsAnalyzing(false);
        return;
      }

      setAnalise(resultado);
      const v = calcularViabilidade(resultado);
      track("ibama_analise_viavel", "ibama_3_paywall_exibido", { viabilidade: v ? v.nivel : "Negada" });
      setHasAnalyzed(true);
      localStorage.setItem("ibama_saved_result", JSON.stringify(resultado));
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Erro na Análise de IBAMA:", err);
      if (!isBusinessError && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "ibama_erro_sistema", { error_message: err.message });
      }
      if (ehCotaDiaria(err)) {
        setError("Nossa cota diária de análises com IA acabou por hoje. O serviço volta automaticamente na virada do dia. Se for urgente, fale com o suporte.");
      } else if (ehSobrecarga(err)) {
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
          valor: preco,
          descricao: "Defesa Auto Infracao IBAMA - CheckMulta",
        }),
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor demorou para responder. Por favor, aguarde 1 minuto e clique novamente.");
      }
      const data = await response.json();
      if (response.ok && data.qr_code) {
        track("begin_checkout", "ibama_4_checkout_iniciado", { value: preco, currency: "BRL" });
        setPaymentId(data.id);
        try {
          localStorage.setItem("ibama_pending_payment", JSON.stringify({
            id: data.id,
            ts: Date.now(),
          }));
        } catch {}
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
      localStorage.setItem("ibama_paid_status", "true");
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
      const response = await fetch("/api/generate-defense-ibama", {
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
      /* NAO limpar o storage aqui. Se o usuario fechar a aba agora, ele perde a
         peca que acabou de pagar. Guardamos o texto final e mantemos
         saved_result e paid_status para permitir a retomada. Só o
         pending_payment sai, porque o pagamento ja foi concluido. */
      try {
        localStorage.setItem("ibama_defense_result", data.result);
      } catch {
        /* storage cheio ou indisponivel: segue, o usuario ainda ve o texto na tela */
      }
      localStorage.removeItem("ibama_pending_payment");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") setDefenseError("TIMEOUT");
      else if (ehCotaDiaria(err)) setDefenseError("QUOTA_DIARIA");
      else if (ehSobrecarga(err)) setDefenseError("SERVER_BUSY");
      else setDefenseError("FALHA_GERACAO");
    } finally {
      setIsGeneratingDefense(false);
    }
  };

  const handleCopy = async () => {
    if (!defenseResult) return;
    try {
      await navigator.clipboard.writeText(defenseResult);
      track("ibama_defesa_copiada", "ibama_6_defesa_copiada");
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
    track("ibama_defesa_baixada", "ibama_6_defesa_baixada");
    const blob = new Blob([defenseResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defesa-auto-ibama.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const viabilidade = calcularViabilidade(analise);
  const preco = precoPara(analise);

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
            <a href="#faq-ibama" className="transition hover:text-emerald-600">Dúvidas</a>
            <a href="/ibama/blog" className="transition hover:text-emerald-600">Blog</a>
            <a href="/multa-de-transito" className="transition hover:text-emerald-600">Trânsito</a>
            <a href="/procon" className="transition hover:text-emerald-600">Procon</a>
            <a href="/vigilancia-sanitaria" className="transition hover:text-emerald-600">Vigilância</a>
            <a href="/energia" className="transition hover:text-emerald-600">Energia</a>
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
                <a href="#faq-ibama" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Dúvidas</a>
                <a href="/ibama/blog" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Blog</a>
                <a href="/multa-de-transito" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Trânsito</a>
                <a href="/procon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Procon</a>
                <a href="/vigilancia-sanitaria" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Vigilância</a>
                <a href="/energia" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Energia</a>
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

      {/* HERO — o H1 de SEO vira o título do próprio HeroFluxo, em vez de
          duplicar título em dois blocos separados. */}
      <div id="inicio">
        <HeroFluxo
          tagSecao="Para quem foi autuado pelo IBAMA"
          titulo={
            <>
              Recebeu um auto de infração do IBAMA? Veja se o auto tem falha
              que permite defesa, <span className="text-emerald-600">grátis</span>
            </>
          }
          descricao={
            <>
              Análise gratuita do auto de infração ambiental à luz do Decreto nº
              6.514/2008. Se não encontrar falha, você não paga nada.
              <span className="mt-3 flex flex-wrap items-center gap-3 text-sm text-stone-500 sm:gap-5">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Análise gratuita
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-600" /> Sem cadastro
                </span>
                <span className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-emerald-600" /> Resultado imediato
                </span>
              </span>
            </>
          }
          mensagemChat="Recebi um auto de infração do IBAMA e não sei se ele tem falha, pode analisar pra mim?"
          rotuloFase2="Cruzar com o Decreto"
          itensChecklist={[
            "Auto de Infração",
            "Notificação do processo",
            "Termo de embargo",
            "Outros documentos",
          ]}
          resultado={{
            badge: "Chance alta",
            titulo: "Encontramos uma falha no auto",
            texto:
              "Falha grave encontrada no auto de infração — fundamento consistente para apresentar defesa. Geramos a defesa administrativa pronta para protocolar.",
          }}
        />
      </div>

      {/* ÁREA PRINCIPAL */}
      <section id="enviar-documento" className="mx-auto max-w-3xl px-4 py-12">
        {previewUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-10">
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="relative mx-auto flex max-w-xs justify-center overflow-hidden rounded-xl">
                {imageFile?.type === "application/pdf" ? (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <FileText className="h-14 w-14 text-emerald-600" />
                  </div>
                ) : (
                  <img src={previewUrl} alt="Preview do documento" className="h-auto max-h-48 w-full object-cover" />
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
                    Novo documento
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Suba <span className="text-emerald-600">agora</span> o documento
                e verifique se dá para recorrer
              </h2>
              <p className="text-base text-slate-600">
                Selecione o documento que você recebeu para iniciar a análise gratuita:
              </p>
              <p className="mt-1 text-sm text-slate-500 font-semibold sm:font-normal">
                Depois você envia a foto ou o PDF dele. Tenha-o em mãos.
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

      {/* COMO FUNCIONA — mesmo mecanismo de scroll fixo (pin/scrub) usado na
          home e nas outras verticais. */}
      <ComoFuncionaScroll />

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 pb-4 pt-5">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                O que o diagnóstico pode revelar
              </p>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Reveal delay={0} className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Chance alta
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Falha grave encontrada no auto. Fundamento consistente para pedir a anulação.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.08} className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Chance média
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Há pontos questionáveis na autuação. Argumento possível.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.16} className="flex items-start gap-4 p-6">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-500">
                    Chance baixa
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Caso mais limitado. Ainda é possível apresentar defesa. A decisão é sua.
                  </p>
                </div>
              </Reveal>
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
              A análise percorre as exigências do Decreto nº 6.514/2008 em três
              frentes: os requisitos formais do auto, a competência do órgão e a
              prescrição.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { t: "Descrição clara da infração", d: "O auto deve descrever de forma clara e objetiva o que foi constatado. Descrição genérica, sem indicar a conduta e a extensão, contraria o art. 97 do Decreto nº 6.514/2008." },
              { t: "Enquadramento legal correto", d: "O auto deve indicar o dispositivo infringido. Enquadramento incompatível com o fato descrito é vício do art. 97." },
              { t: "Dimensionamento do dano", d: "Área estimada a olho, sem georreferenciamento ou levantamento técnico, é fragilidade relevante na prova da autuação." },
              { t: "Laudo e prova técnica", d: "Autuação sem laudo de constatação ou relatório de fiscalização que a sustente fica sem suporte técnico." },
              { t: "Competência do órgão", d: "Autuação por órgão sem competência para a matéria enseja nulidade, nos termos da LC 140/2011." },
              { t: "Prescrição", d: "Auto lavrado mais de 5 anos após o fato, ou processo parado por mais de 3 anos, pode estar prescrito (art. 21 do Decreto nº 6.514/2008)." },
            ].map((item, i) => (
              <Reveal key={item.t} delay={(i % 2) * 0.08} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="mb-1.5 font-bold text-slate-900">{item.t}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <EscolhaOrgao
        titulo={
          <>
            Descubra se ela pode ser <span className="text-emerald-600">anulada</span>
          </>
        }
        subtitulo="A mesma análise gratuita vale para multa de trânsito, Procon, vigilância sanitária, energia e Ibama."
      />

      {/* SEGURANÇA */}
      <section id="seguranca" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Seus dados <span className="text-emerald-600">100% seguros</span>
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Reveal delay={0} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Zero armazenamento</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Não guardamos o seu auto de infração. O documento é processado na
                memória do servidor e imediatamente deletado.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <UserX className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Sem cadastro</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Você não precisa criar conta nem informar dados pessoais para
                verificar o auto. É direto ao ponto.
              </p>
            </Reveal>

            <Reveal delay={0.16} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Route className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Total transparência</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Atuamos como ferramenta tecnológica. A decisão sobre a defesa é da
                autoridade julgadora do IBAMA.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CARROSSEL DE SERVIÇOS */}
      <Reveal>
        <CarrosselServicos excluir={["ibama"]} />
      </Reveal>

      {/* FAQ */}
      <section id="faq-ibama" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Dúvidas <span className="text-emerald-600">frequentes</span>
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal delay={0} className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Qual o prazo para apresentar defesa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                O prazo é de 20 dias contados da ciência da autuação, mas pode ficar
                suspenso quando há audiência de conciliação ambiental. Confira o
                prazo no próprio auto e no sistema do IBAMA, e protocole o quanto
                antes.
              </p>
            </Reveal>

            <Reveal delay={0.06} className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                O que acontece se eu não apresentar defesa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                O processo é julgado sem a sua manifestação e a multa é consolidada,
                podendo ser inscrita em dívida ativa e executada. Apresentar defesa
                é o que garante o contraditório antes da decisão.
              </p>
            </Reveal>

            <Reveal delay={0} className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Que tipo de falha pode anular o auto?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Descrição genérica da infração, enquadramento incompatível com o
                fato, ausência de laudo de constatação, área sem georreferenciamento,
                autuação por órgão incompetente e prescrição são exemplos.
              </p>
            </Reveal>

            <Reveal delay={0.06} className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                O que é a prescrição do auto ambiental?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                A Administração tem 5 anos, contados do fato, para lavrar o auto, e o
                processo não pode ficar parado por mais de 3 anos. Ultrapassados
                esses prazos, há indício de prescrição, que pode levar ao
                arquivamento. Um dos argumentos mais fortes em autos antigos.
              </p>
            </Reveal>

            <Reveal delay={0} className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 md:col-span-2">
              <h3 className="mb-2 text-[15.5px] font-bold text-slate-900">
                Preciso de advogado para apresentar defesa?
              </h3>
              <p className="text-[15.5px] leading-relaxed text-slate-600">
                Não é obrigatório na via administrativa: o próprio autuado pode
                protocolar a defesa pelo sistema do IBAMA. Para autos de valor
                elevado ou se o caso for para a Justiça, a consulta a um advogado é
                fortemente recomendável.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CONTEÚDO SEO */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="mb-8 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Como se defender de um{" "}
            <span className="text-emerald-600">auto de infração do IBAMA</span>
          </h2>

          <Reveal className="max-w-none" amount={0.15}>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O auto de infração ambiental é um ato administrativo vinculado: para
              ser válido, precisa cumprir requisitos formais previstos no Decreto nº
              6.514/2008. A ausência de qualquer desses requisitos pode fundamentar
              a nulidade do auto.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Os requisitos formais do auto
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O art. 97 do Decreto nº 6.514/2008 exige que o auto seja lavrado em
              impresso próprio, com a identificação do autuado, a descrição clara e
              objetiva da infração constatada e a indicação dos dispositivos legais
              infringidos, sem emendas ou rasuras que comprometam sua validade. A
              descrição genérica, o enquadramento incompatível com o fato ou a
              ausência de laudo de constatação são vícios frequentes.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              A prescrição: o argumento mais forte em autos antigos
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O art. 21 do Decreto nº 6.514/2008 estabelece que a Administração tem
              cinco anos, contados do fato, para apurar a infração. Além disso, o
              processo não pode ficar parado por mais de três anos. A chamada
              prescrição intercorrente. Boa parte dos autos antigos pendentes de
              julgamento está prescrita pela inércia do próprio órgão, e essa é uma
              das razões mais consistentes de anulação.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              A competência do órgão autuante
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              A Lei Complementar nº 140/2011 reparte a competência de fiscalização
              ambiental entre União, estados e municípios. A autuação por órgão sem
              competência para a matéria pode ensejar nulidade. Esta análise é
              voltada ao auto federal, lavrado pelo IBAMA; autos estaduais ou
              municipais seguem legislação própria.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              O prazo de defesa
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O art. 113 do Decreto nº 6.514/2008 assegura o prazo de vinte dias,
              contados da ciência da autuação, para apresentar defesa. Esse prazo
              pode ficar suspenso quando há agendamento de audiência de conciliação
              ambiental. Confira sempre o prazo indicado no próprio auto.
            </p>

            <h3 className="mb-3 mt-9 text-xl font-bold leading-snug text-slate-900 sm:text-[22px]">
              Como o CheckMulta ajuda
            </h3>
            <p className="mb-4 text-[16.5px] leading-[1.75] text-slate-700">
              O CheckMulta analisa gratuitamente o seu auto e aponta as falhas
              encontradas, sempre citando o trecho exato que as fundamenta. Havendo
              falha, geramos uma{" "}
              <strong className="font-semibold text-slate-900">
                defesa administrativa completa, com fatos, fundamentos e pedidos
              </strong>
              , pronta para você revisar e protocolar no sistema do IBAMA. Nossa
              ferramenta informa e instrumentaliza. Não presta consultoria jurídica
              nem representação.
            </p>
          </Reveal>
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
            <a href="/multa-de-transito" className="text-slate-600 transition hover:text-emerald-600">
              Multas de trânsito
            </a>
            <a href="/procon" className="text-slate-600 transition hover:text-emerald-600">
              Procon
            </a>
            <a href="/vigilancia-sanitaria" className="text-slate-600 transition hover:text-emerald-600">
              Vigilância Sanitária
            </a>
            <a href="/energia" className="text-slate-600 transition hover:text-emerald-600">
              Conta de luz
            </a>
            <a href="/blog" className="text-slate-600 transition hover:text-emerald-600">
              Blog
            </a>
          </nav>

          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-slate-500">
            <strong className="font-semibold text-slate-700">Transparência e privacidade:</strong>{" "}
            nosso sistema atua como organizador tecnológico com base no Decreto nº
            6.514/2008 e na Lei nº 9.605/98. Não prestamos consultoria jurídica nem
            representação. A decisão sobre a defesa é da autoridade julgadora do
            IBAMA. Não exigimos cadastro e não armazenamos o seu documento.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            CheckMulta Tecnologia. CNPJ 63.524.338/0001-62
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
                        <p className="text-sm font-bold text-slate-900">Auto de infração ou documento do processo</p>
                        <p className="mt-0.5 text-xs text-slate-500">PDF, JPG ou PNG. Documento completo</p>
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
                  {activeModal === "aviso" && <p>Este documento é um modelo referencial gerado automaticamente por inteligência artificial e não constitui consultoria jurídica. Não somos um escritório de advocacia e não representamos você juridicamente. <strong className="font-semibold text-slate-900">A decisão sobre a defesa é da autoridade julgadora do IBAMA.</strong> Confira sempre o prazo e a forma de protocolo indicados no próprio auto.</p>}
                  {activeModal === "termos" && <p>O acesso a esta ferramenta tem finalidade unicamente de auxílio referencial para formulação de teses administrativas. Não nos responsabilizamos por prazos excedidos, inserção de dados incorretos pelo usuário, forma de protocolo inadequada ou resultado das decisões proferidas pelo órgão julgador. Para casos de maior complexidade ou valor elevado, recomendamos a consulta a um advogado.</p>}
                  {activeModal === "privacidade" && <p>Sua privacidade é absoluta. Não possuímos banco de dados, nem realizamos registros do documento enviado, dos seus dados ou da defesa gerada. O processamento é de caráter transitório para elaboração do documento, que é imediatamente apagado após o fechamento da página.</p>}
                  {activeModal === "suporte" && (
                    <div className="space-y-5 pt-1">
                      <p className="text-[15px] text-slate-600">Selecione o canal de atendimento para falar com o nosso time:</p>
                      <div className="flex flex-col gap-3">
                        <a href="https://wa.me/5513996485501?text=Olá!%20Preciso%20de%20ajuda%20com%20a%20análise%20do%20auto%20do%20IBAMA." target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-900 transition hover:bg-emerald-100">
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

                  {/* ERRO — e, em amarelo, a recusa por escopo */}
                  {error && (
                    <div className="flex flex-col items-center space-y-4 text-center">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${ehForaDeEscopo ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-slate-900">
                          {ehForaDeEscopo ? "Não trabalhamos com este tipo de documento" : "Análise indisponível"}
                        </h3>
                        <p className="leading-relaxed text-slate-600">{error}</p>
                        {ehForaDeEscopo && (
                          <p className="mt-3 text-sm text-slate-500">
                            Nada foi cobrado. Se você tiver um auto de infração do IBAMA,
                            pode enviá-lo para análise.
                          </p>
                        )}
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
                          Analisamos o documento ponto por ponto e <strong className="font-semibold text-slate-900">não encontramos falha</strong> entre os pontos verificados. O auto aparenta cumprir as exigências do Decreto nº 6.514/2008.
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-500">
                          Como não encontramos falha, não há cobrança. Optamos por informá-lo com franqueza, em vez de elaborar uma defesa sem fundamento real. Esse é o critério que aplicamos em toda análise.
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

                  {/* AUTO DE ÓRGÃO ESTADUAL OU MUNICIPAL — informa e não cobra */}
                  {analise && ehForaDaEsferaFederal(analise) && !isAnalyzing && !error && !rejeicaoInfo && (
                    <div className="mx-auto max-w-lg space-y-5 py-4 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                        <AlertCircle className="h-8 w-8 text-amber-600" />
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        Este auto não é do IBAMA
                      </h3>

                      <p className="text-sm leading-relaxed text-slate-600">
                        {analise.orgao_autuante
                          ? `O documento foi lavrado por ${analise.orgao_autuante}, que é um órgão `
                          : "O documento foi lavrado por um órgão "}
                        {(analise.esfera || "").toLowerCase() === "municipal" ? "municipal" : "estadual"}.
                        Nossa análise confere o auto contra a legislação federal, que não se
                        aplica diretamente nesse caso. O órgão emissor tem norma, prazo de
                        defesa e forma de protocolo próprios.
                      </p>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                        <p className="text-sm leading-relaxed text-slate-600">
                          <strong className="font-semibold text-slate-900">
                            Por isso não cobramos nada aqui.
                          </strong>{" "}
                          Uma peça redigida pela norma federal sairia com o prazo e o
                          endereço errados, e você poderia perder o prazo real. Confira no
                          próprio auto qual é o prazo e onde protocolar, ou procure um
                          advogado da sua região.
                        </p>
                      </div>

                      <button
                        onClick={handleNovaAnalise}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        type="button"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Analisar outro auto
                      </button>
                    </div>
                  )}

                  {/* RESULTADO COM PAYWALL */}
                  {analise && analise.houve_achado && !ehForaDaEsferaFederal(analise) && !isPaid && !isAnalyzing && !error && !rejeicaoInfo && (
                    <div className="space-y-6">

                      {/* Dados do processo */}
                      {(analise.autuado || analise.orgao_autuante || analise.numero_auto) && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Documento analisado</p>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {analise.autuado && (
                              <div className="flex items-start gap-2.5">
                                <Building2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Autuado</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.autuado}</p>
                                </div>
                              </div>
                            )}
                            {analise.orgao_autuante && (
                              <div className="flex items-start gap-2.5">
                                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Órgão autuante</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.orgao_autuante}</p>
                                </div>
                              </div>
                            )}
                            {analise.numero_auto && (
                              <div className="flex items-start gap-2.5">
                                <FileText className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Número do auto</p>
                                  <p className="text-[13px] font-bold leading-snug text-slate-900">{analise.numero_auto}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {analise.infracao_descrita && (
                            <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4">
                              <FileWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Infração descrita</p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-700">{analise.infracao_descrita}</p>
                              </div>
                            </div>
                          )}

                          {typeof analise.valor_multa === "number" && (
                            <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4">
                              <Receipt className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Valor da multa</p>
                                <p className="mt-0.5 text-[13px] font-bold leading-relaxed text-slate-900">{formatarValorMulta(analise.valor_multa)}</p>
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

                      {/* AVISO DE TRANSPARÊNCIA — só quando a chance é baixa */}
                      {viabilidade?.nivel === "Baixa" && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5 text-left">
                          <h3 className="mb-2 text-base font-bold text-slate-900">
                            Encontramos um ponto para arguir. E queremos ser claros sobre ele
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-700">
                            A falha identificada é de natureza formal e pode ser arguida na
                            defesa, mas não é do tipo que costuma levar à anulação direta.
                            Ainda assim, apresentar defesa tem valor: o processo passa a exigir
                            manifestação fundamentada da autoridade, e a penalidade não se
                            consolida sem o contraditório.
                          </p>
                          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                            A decisão é sua. Se preferir, consulte um advogado antes de seguir.
                          </p>
                        </div>
                      )}

                      {/* Prazo vencido: mostra a análise gratuita e retira a oferta.
                          Vender aqui seria cobrar por uma peça que o órgão rejeita
                          por intempestividade, sem sequer ler o mérito. */}
                      {analise?.prazo_aparenta_vencido && (
                        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
                          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-800">O prazo de defesa aparenta estar vencido.</p>
                            <p className="mt-1 text-sm leading-relaxed text-red-700">
                              Por isso não liberamos a geração da defesa: apresentada fora do prazo, ela seria
                              rejeitada sem que o mérito fosse analisado, e você teria pago por uma peça sem
                              efeito. A análise acima continua disponível para consulta.
                            </p>
                            {analise.prazo_detalhe ? (
                              <p className="mt-2 text-sm leading-relaxed text-red-700">{analise.prazo_detalhe}</p>
                            ) : null}
                            <p className="mt-2 text-sm leading-relaxed text-red-700">
                              O prazo aqui é de 20 dias contados da ciência da autuação. Confira a data de
                              recebimento no seu documento — se ela estiver diferente da que lemos, fale com o suporte.
                            </p>
                          </div>
                        </div>
                      )}

                      {!analise?.prazo_aparenta_vencido && (
                      <>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 text-left">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                          <Scale className="h-5 w-5 text-emerald-600" /> O que você recebe por R$ {formatarPreco(preco)}
                        </h3>
                        <ul className="space-y-3 text-[13px] text-slate-700 sm:text-[15px]">
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Defesa administrativa completa, com fatos, fundamentos e pedidos</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Cada ponto fundamentado no Decreto nº 6.514/2008, com o trecho do seu documento</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Pedido subsidiário de atenuantes ou de conversão da multa em serviços ambientais</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                            <span>Entrega imediata após o pagamento. Pronta para preencher e protocolar</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <p className="text-[11px] leading-relaxed text-amber-800 sm:text-xs">
                          <strong className="font-semibold">Por que vale a pena:</strong> contratar um advogado ambiental para uma defesa costuma custar a partir de R$ 2.000. Aqui, o valor varia com o tamanho do auto. E você só paga quando encontramos falha concreta. A peça é fundamentada no Decreto nº 6.514/2008; a decisão cabe à autoridade julgadora do IBAMA. Confira o prazo e a forma de protocolo no próprio auto.
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
                        <span className="mt-1 text-sm font-normal text-emerald-50">Pagamento único · R$ {formatarPreco(preco)} · Entrega imediata</span>
                      </button>
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 sm:text-xs">
                          O que você está contratando
                        </p>
                        <p className="text-[11px] leading-relaxed text-amber-800 sm:text-xs">
                          Uma peça de defesa fundamentada nas falhas encontradas no seu
                          documento. A decisão final é do órgão julgador. Nenhuma defesa
                          garante a anulação.
                        </p>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-slate-400">CheckMulta Tecnologia. CNPJ 63.524.338/0001-62</p>
                      </>
                      )}
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
                      <a href="https://wa.me/5513996485501?text=Olá!%20Eu%20paguei%20pela%20defesa%20do%20auto%20do%20IBAMA%20mas%20a%20tela%20deu%20erro%20ao%20carregar.%20Pode%20me%20ajudar?" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
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
                          <span className="rounded bg-red-50 px-1 font-semibold text-red-600">vermelho</span> pelos seus dados reais antes de protocolar. Confirme o prazo e a forma de protocolo na notificação recebida.
                        </p>
                      </div>
                      <div className="rounded-r-lg border-l-4 border-emerald-400 bg-emerald-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Send className="h-4 w-4 flex-shrink-0 text-emerald-700" />
                          <p className="text-sm font-semibold text-emerald-900">Para onde enviar essa defesa</p>
                        </div>
                        <p className="mb-4 text-sm leading-relaxed text-emerald-800">
                          O IBAMA é órgão federal, então o caminho de protocolo é único em todo o Brasil — feito pelo processo eletrônico (SEI/IBAMA). Siga os passos abaixo:
                        </p>
                        <ol className="space-y-4">
                          {PASSO_A_PASSO_IBAMA.map((p, i) => (
                            <li key={p.titulo} className="flex gap-3">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-emerald-900">{p.titulo}</p>
                                <p className="mt-0.5 text-sm leading-relaxed text-emerald-800">{p.texto}</p>
                                {p.href ? (
                                  <a
                                    href={p.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-800 hover:decoration-emerald-700"
                                  >
                                    {p.linkTexto}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                        <p className="mt-4 text-xs leading-relaxed text-emerald-700">
                          Confirme sempre o canal de protocolo indicado no seu auto de infração — ele pode variar conforme a unidade do IBAMA responsável.
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
                          <GerarPdfDefesa
                            texto={defenseResult}
                            nomeArquivo="defesa-auto-ibama"
                            corBotao="bg-emerald-600 hover:bg-emerald-700"
                            onBaixar={() => track("ibama_defesa_baixada_pdf", "ibama_6_defesa_baixada_pdf")}
                          />
                        </div>
                        <button onClick={() => setActiveModal("suporte")} className="text-sm text-slate-400 transition hover:text-emerald-600">
                          Precisa de ajuda? Fale com o suporte.
                        </button>
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
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">R$ {formatarPreco(preco)}</h3>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Defesa administrativa</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">CheckMulta Tecnologia. CNPJ 63.524.338/0001-62</p>
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
                        O recebedor identificado no seu aplicativo bancário será <strong className="font-semibold text-slate-900">CheckMulta Tecnologia</strong>. CNPJ 63.524.338/0001-62.
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

      {/* ─── RETOMADA DE SESSÃO ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showRetomarModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <button
                  onClick={handleFecharRetomada}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Fechar"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h3 className="mb-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                Você tem uma defesa pronta
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                Encontramos a análise do auto
                {analise?.numero_auto ? ` nº ${analise.numero_auto}` : ""} que você já
                pagou. Pode abrir a peça novamente ou começar uma análise nova.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleAbrirDefesaSalva}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Abrir minha defesa
                  <FileText className="h-4 w-4" />
                </button>

                <button
                  onClick={handlePedirNovaAnalise}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  Analisar outro auto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRMAÇÃO ANTES DE DESCARTAR A PEÇA PAGA ─────────────────── */}
      <AnimatePresence>
        {showConfirmNovaModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>

              <h3 className="mb-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                Você vai perder a defesa atual
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                Ao começar uma análise nova, a peça que você já pagou é apagada deste
                aparelho e não poderá ser recuperada. Se ainda não salvou o texto,
                volte e copie antes de prosseguir.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCancelarNovaAnalise}
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Não, manter minha defesa
                </button>

                <button
                  onClick={handleConfirmarNovaAnalise}
                  className="w-full rounded-xl border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Sim, quero analisar outro auto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRMACAO AO ENCERRAR A CONSULTA DA DEFESA --- */}
      <AnimatePresence>
        {showConfirmFecharDefesa && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>

              <h3 className="mb-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                Você já salvou o arquivo?
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                Ao fechar, a defesa é apagada deste aparelho e não poderá ser
                recuperada. Seria necessário fazer uma nova análise. Se ainda não
                copiou ou baixou o texto, volte e salve antes.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleVoltarParaDefesa}
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  type="button"
                >
                  Voltar e salvar
                </button>

                <button
                  onClick={handleEncerrarDefesa}
                  className="w-full rounded-xl border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  type="button"
                >
                  Já salvei, pode fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
