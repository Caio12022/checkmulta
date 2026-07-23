import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  FileText,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  Check,
  Copy,
  ArrowLeft,
  Clock,
  Building2,
  Scale,
} from "lucide-react";

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

type Etapa = "upload" | "analisando" | "resultado" | "pagamento" | "gerando" | "defesa";

const PRECO = 99.0;

export default function Procon() {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string>("");
  const [defesa, setDefesa] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  // Pagamento
  const [email, setEmail] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pagamentoId, setPagamentoId] = useState<number | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [gerandoPix, setGerandoPix] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Verifica o pagamento a cada 4 segundos
  useEffect(() => {
    if (etapa !== "pagamento" || !pagamentoId) return;

    const intervalo = setInterval(async () => {
      try {
        const res = await fetch(`/api/check-payment/${pagamentoId}`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(intervalo);
          gerarDefesa();
        }
      } catch {
        // silencioso: tenta de novo no próximo ciclo
      }
    }, 4000);

    return () => clearInterval(intervalo);
  }, [etapa, pagamentoId]);

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const tiposOk = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!tiposOk.includes(f.type)) {
      setErro("Envie o auto de infração em PDF, JPG ou PNG.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErro("O arquivo deve ter no máximo 15 MB.");
      return;
    }
    setErro("");
    setArquivo(f);
  }

  function arquivoParaBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultado = reader.result as string;
        resolve(resultado.split(",")[1]);
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }

  async function analisar() {
    if (!arquivo) return;
    setErro("");
    setEtapa("analisando");

    try {
      const base64 = await arquivoParaBase64(arquivo);
      const res = await fetch("/api/analyze-procon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64, mimeType: arquivo.type }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SERVER_BUSY") {
          setErro("Nossos servidores estão sobrecarregados. Tente novamente em alguns instantes.");
        } else {
          setErro(data.error || "Não foi possível concluir a análise.");
        }
        setEtapa("upload");
        return;
      }

      if (data.result === "documento_invalido") {
        setErro("O arquivo enviado não parece ser um auto de infração ou notificação do Procon. Confira o documento e tente novamente.");
        setEtapa("upload");
        return;
      }

      if (data.result === "documento_ilegivel") {
        setErro("Não conseguimos ler o documento. Envie um arquivo mais nítido ou o PDF original.");
        setEtapa("upload");
        return;
      }

      setAnalise(data.result as Analise);
      setEtapa("resultado");
    } catch {
      setErro("Ocorreu um erro ao enviar o documento. Verifique sua conexão e tente novamente.");
      setEtapa("upload");
    }
  }

  async function iniciarPagamento() {
    setGerandoPix(true);
    setErro("");
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || "cliente@checkmulta.com.br",
          valor: PRECO,
          descricao: "Defesa administrativa Procon - CheckMulta",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível gerar o Pix.");
        setGerandoPix(false);
        return;
      }
      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
      setPagamentoId(data.id);
      setEtapa("pagamento");
    } catch {
      setErro("Erro ao gerar o Pix. Tente novamente.");
    } finally {
      setGerandoPix(false);
    }
  }

  async function gerarDefesa() {
    setEtapa("gerando");
    try {
      const res = await fetch("/api/generate-defense-procon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analise }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao gerar a defesa.");
        setEtapa("resultado");
        return;
      }
      setDefesa(data.result);
      setEtapa("defesa");
    } catch {
      setErro("Erro ao gerar a defesa. Seu pagamento foi registrado — entre em contato se precisar.");
      setEtapa("resultado");
    }
  }

  function copiarDefesa() {
    navigator.clipboard.writeText(defesa);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function copiarPix() {
    navigator.clipboard.writeText(qrCode);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2500);
  }

  function reiniciar() {
    setEtapa("upload");
    setArquivo(null);
    setAnalise(null);
    setDefesa("");
    setErro("");
    setQrCode("");
    setQrCodeBase64("");
    setPagamentoId(null);
  }

  const estilosGravidade = {
    critico: {
      borda: "border-l-red-500",
      fundo: "bg-red-50",
      texto: "text-red-700",
      icone: <AlertTriangle className="w-5 h-5 text-red-600" />,
      rotulo: "Crítico",
    },
    atencao: {
      borda: "border-l-amber-500",
      fundo: "bg-amber-50",
      texto: "text-amber-700",
      icone: <AlertCircle className="w-5 h-5 text-amber-600" />,
      rotulo: "Atenção",
    },
    verificar: {
      borda: "border-l-sky-500",
      fundo: "bg-sky-50",
      texto: "text-sky-700",
      icone: <Info className="w-5 h-5 text-sky-600" />,
      rotulo: "Verificar",
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 transition">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold">CheckMulta</span>
          </Link>
          <span className="text-sm text-slate-500">Defesa administrativa</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* ETAPA: UPLOAD */}
        {etapa === "upload" && (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-5">
                <Building2 className="w-4 h-4" />
                Para empresas autuadas
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
                Sua empresa foi autuada pelo Procon?{" "}
                <span className="text-emerald-600">Verifique grátis</span> se o auto tem vício formal
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Envie o auto de infração e nossa análise verifica 16 pontos do processo administrativo,
                com base no Código de Defesa do Consumidor e no Decreto 2.181/97. Se houver vício, você
                recebe a defesa administrativa pronta para protocolar.
              </p>
            </div>

            {/* Área de upload */}
            <div className="max-w-xl mx-auto">
              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={selecionarArquivo}
                  className="hidden"
                />
                {arquivo ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-emerald-600" />
                    <p className="font-medium text-slate-800">{arquivo.name}</p>
                    <p className="text-sm text-slate-500">Clique para trocar o arquivo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <p className="font-medium text-slate-800">Envie o auto de infração</p>
                    <p className="text-sm text-slate-500">PDF, JPG ou PNG — até 15 MB</p>
                  </div>
                )}
              </div>

              {erro && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {erro}
                </div>
              )}

              <button
                onClick={analisar}
                disabled={!arquivo}
                className="w-full mt-5 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              >
                Analisar gratuitamente
              </button>

              <p className="text-center text-sm text-slate-500 mt-3">
                A análise é gratuita. Você só paga se encontrarmos vício no auto.
              </p>
            </div>

            {/* Como funciona */}
            <section className="mt-20">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Como funciona</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  {
                    icone: <Upload className="w-6 h-6 text-emerald-600" />,
                    titulo: "1. Envie o auto",
                    texto: "Faça o upload do auto de infração ou da notificação recebida do Procon.",
                  },
                  {
                    icone: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
                    titulo: "2. Análise gratuita",
                    texto: "Verificamos 16 pontos do processo administrativo e apontamos os vícios encontrados no documento.",
                  },
                  {
                    icone: <Scale className="w-6 h-6 text-emerald-600" />,
                    titulo: "3. Defesa pronta",
                    texto: "Se houver vício, você recebe a defesa administrativa fundamentada, pronta para protocolar.",
                  },
                ].map((item) => (
                  <div key={item.titulo} className="p-6 rounded-2xl bg-slate-50">
                    <div className="mb-3">{item.icone}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.titulo}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.texto}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* O que verificamos */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
                O que verificamos no seu auto de infração
              </h2>
              <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
                A análise percorre os principais pontos que podem tornar a autuação questionável,
                conforme o Decreto 2.181/97 e o Código de Defesa do Consumidor.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    t: "Vícios de notificação",
                    d: "Notificação por edital sem esgotamento de diligências, ausência de intimação pessoal do julgamento e prazo de defesa concedido abaixo do previsto.",
                  },
                  {
                    t: "Vícios de competência",
                    d: "Atuação de órgão fora de sua atribuição territorial ou material e ausência de identificação do agente autuante.",
                  },
                  {
                    t: "Descrição da conduta",
                    d: "Conduta narrada de forma genérica, ausência de capitulação legal e divergência entre o fato descrito e o dispositivo indicado.",
                  },
                  {
                    t: "Dosimetria da multa",
                    d: "Ausência de fundamentação dos critérios do art. 57 do CDC, desconsideração do porte da empresa e estimativa de faturamento sem base documental.",
                  },
                  {
                    t: "Regularidade do processo",
                    d: "Cerceamento do contraditório, decisão sem motivação expressa e ausência de investigação preliminar quando cabível.",
                  },
                  {
                    t: "Vícios formais do auto",
                    d: "Ausência de data, local, número de processo, qualificação completa da autuada ou rasuras não ressalvadas.",
                  },
                ].map((item) => (
                  <div key={item.t} className="p-5 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-1">{item.t}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Aviso */}
            <div className="mt-14 p-5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Importante:</strong> o CheckMulta produz material
                informativo por inteligência artificial a partir do documento enviado. Não prestamos
                consultoria jurídica nem representação processual. Confira sempre o prazo e a forma de
                protocolo junto ao Procon emissor — alguns órgãos exigem protocolo presencial ou por via
                postal. Para casos de maior complexidade ou valor, recomendamos a consulta a um advogado.
              </p>
            </div>
          </>
        )}

        {/* ETAPA: ANALISANDO */}
        {etapa === "analisando" && (
          <div className="py-24 text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Analisando o auto de infração</h2>
            <p className="text-slate-600">Verificando os 16 pontos do processo administrativo.</p>
          </div>
        )}

        {/* ETAPA: RESULTADO */}
        {etapa === "resultado" && analise && (
          <div>
            {analise.houve_achado ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">Resultado da análise</h2>
                  <p className="text-slate-600 leading-relaxed">{analise.resumo}</p>
                </div>

                {/* Dados do processo */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  {analise.empresa_autuada && (
                    <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Empresa autuada</p>
                      <p className="font-medium text-slate-900 text-sm">{analise.empresa_autuada}</p>
                    </div>
                  )}
                  {analise.orgao_emissor && (
                    <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Órgão emissor</p>
                      <p className="font-medium text-slate-900 text-sm">{analise.orgao_emissor}</p>
                    </div>
                  )}
                  {analise.numero_processo && (
                    <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1">Processo</p>
                      <p className="font-medium text-slate-900 text-sm">{analise.numero_processo}</p>
                    </div>
                  )}
                </div>

                {/* Prazo */}
                {analise.prazo_identificado && (
                  <div className="mb-8 p-5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 mb-1">Prazo</p>
                      <p className="text-sm text-amber-800 leading-relaxed">{analise.prazo_identificado}</p>
                    </div>
                  </div>
                )}

                {/* Contadores */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {analise.quantidade_criticos > 0 && (
                    <span className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                      {analise.quantidade_criticos} crítico(s)
                    </span>
                  )}
                  {analise.quantidade_atencao > 0 && (
                    <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                      {analise.quantidade_atencao} de atenção
                    </span>
                  )}
                  {analise.quantidade_verificar > 0 && (
                    <span className="px-4 py-2 rounded-full bg-sky-50 text-sky-700 text-sm font-medium">
                      {analise.quantidade_verificar} a verificar
                    </span>
                  )}
                </div>

                {/* Achados */}
                <div className="space-y-4 mb-10">
                  {analise.achados.map((achado, i) => {
                    const estilo = estilosGravidade[achado.gravidade] || estilosGravidade.verificar;
                    return (
                      <div
                        key={i}
                        className={`border-l-4 ${estilo.borda} ${estilo.fundo} rounded-r-xl p-5`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          {estilo.icone}
                          <div>
                            <h3 className="font-semibold text-slate-900">{achado.titulo}</h3>
                            <span className={`text-xs font-medium ${estilo.texto}`}>{estilo.rotulo}</span>
                          </div>
                        </div>

                        <div className="mb-3 pl-8">
                          <p className="text-xs text-slate-500 mb-1">Trecho do documento</p>
                          <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">
                            {achado.trecho_documento}
                          </p>
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed pl-8 mb-2">
                          {achado.explicacao}
                        </p>

                        {achado.base_legal && (
                          <p className="text-xs text-slate-500 pl-8">{achado.base_legal}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Oferta */}
                <div className="p-6 sm:p-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Defesa administrativa fundamentada
                  </h3>
                  <p className="text-slate-600 mb-5 leading-relaxed">
                    Peça completa, estruturada com preliminares, mérito e pedidos, fundamentada nos
                    vícios identificados acima e na legislação aplicável. Pronta para preencher os dados
                    da empresa e protocolar.
                  </p>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-bold text-slate-900">R$ 99,00</span>
                    <span className="text-slate-500">pagamento único via Pix</span>
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail (opcional)"
                    className="w-full mb-4 px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
                  />

                  {erro && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                      {erro}
                    </div>
                  )}

                  <button
                    onClick={iniciarPagamento}
                    disabled={gerandoPix}
                    className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 disabled:bg-slate-300 transition flex items-center justify-center gap-2"
                  >
                    {gerandoPix ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando Pix...
                      </>
                    ) : (
                      "Gerar a defesa por R$ 99,00"
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Nenhum vício encontrado */
              <div className="py-16 text-center max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Não identificamos vício formal neste auto
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">{analise.resumo}</p>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Como não encontramos irregularidade entre os pontos verificados, não há cobrança.
                  Isso não significa que a autuação seja necessariamente procedente — significa apenas
                  que os vícios formais que analisamos não foram identificados. Se discordar do mérito
                  da autuação, considere consultar um advogado.
                </p>
                <button
                  onClick={reiniciar}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Analisar outro documento
                </button>
              </div>
            )}
          </div>
        )}

        {/* ETAPA: PAGAMENTO */}
        {etapa === "pagamento" && (
          <div className="max-w-md mx-auto py-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Pague com Pix</h2>
            <p className="text-slate-600 mb-6">
              A defesa é gerada automaticamente assim que o pagamento for confirmado.
            </p>

            {qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code Pix"
                className="w-56 h-56 mx-auto mb-6 rounded-xl border border-slate-200"
              />
            )}

            <button
              onClick={copiarPix}
              className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2 mb-4"
            >
              {pixCopiado ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Código copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar código Pix
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando confirmação do pagamento
            </div>
          </div>
        )}

        {/* ETAPA: GERANDO */}
        {etapa === "gerando" && (
          <div className="py-24 text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Pagamento confirmado</h2>
            <p className="text-slate-600">Redigindo a defesa administrativa.</p>
          </div>
        )}

        {/* ETAPA: DEFESA PRONTA */}
        {etapa === "defesa" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Sua defesa está pronta</h2>
                <p className="text-slate-600 text-sm">
                  Copie o texto, preencha os dados entre colchetes e protocole no Procon.
                </p>
              </div>
            </div>

            <button
              onClick={copiarDefesa}
              className="mb-5 px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center gap-2"
            >
              {copiado ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar defesa
                </>
              )}
            </button>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <pre className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed font-sans">
                {defesa}
              </pre>
            </div>

            <button
              onClick={reiniciar}
              className="mt-6 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Analisar outro documento
            </button>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-200 mt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            CheckMulta — material informativo gerado por inteligência artificial. Não constitui
            consultoria jurídica nem representação processual.
          </p>
          <Link to="/" className="inline-block mt-3 text-sm text-emerald-600 hover:underline">
            Voltar para a página inicial
          </Link>
        </div>
      </footer>
    </div>
  );
}
