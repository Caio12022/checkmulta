import { useEffect } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CategoriaBlog from "./pages/CategoriaBlog";
import Procon from "./pages/Procon";
import BlogProcon from "./pages/BlogProcon";
import BlogPostProcon from "./pages/BlogPostProcon";
import Vigilancia from "./pages/Vigilancia";
import BlogVigilancia from "./pages/BlogVigilancia";
import BlogPostVigilancia from "./pages/BlogPostVigilancia";
import Energia from "./pages/Energia";
import BlogEnergia from "./pages/BlogEnergia";
import BlogPostEnergia from "./pages/BlogPostEnergia";
import Ibama from "./pages/Ibama";
import BlogIbama from "./pages/BlogIbama";
import BlogPostIbama from "./pages/BlogPostIbama";
import ConsultaInfracao from "./pages/ConsultaInfracao";
import InfracaoDetalhe from "./pages/InfracaoDetalhe";
import SimuladorPontos from "./pages/SimuladorPontos";
import Plataforma from "./pages/Plataforma";
/* Sobe a página ao trocar de rota */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
/* Wrappers com key: forçam remontagem ao trocar de slug/categoria */
function BlogPostWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogPost key={slug} />;
}
function CategoriaBlogWrapper() {
  const { categoria } = useParams<{ categoria: string }>();
  return <CategoriaBlog key={categoria} />;
}
function BlogPostProconWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogPostProcon key={slug} />;
}
function BlogPostVigilanciaWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogPostVigilancia key={slug} />;
}
function BlogPostEnergiaWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogPostEnergia key={slug} />;
}
function BlogPostIbamaWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogPostIbama key={slug} />;
}
function InfracaoDetalheWrapper() {
  const { slug } = useParams<{ slug: string }>();
  return <InfracaoDetalhe key={slug} />;
}
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* CheckMulta — trânsito */}
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/categoria/:categoria" element={<CategoriaBlogWrapper />} />
        <Route path="/blog/:slug" element={<BlogPostWrapper />} />
        {/*
          PASSO 3.1 — rotas novas em paralelo às antigas (/, /blog).
          Apontam para os MESMOS componentes. Nada foi removido ainda.
          No Passo 3.2 a raiz troca de dono e estas passam a ser as
          rotas reais do funil de trânsito.
        */}
        <Route path="/multa-de-transito" element={<Home />} />
        <Route
          path="/multa-de-transito/blog"
          element={<Blog />}
        />
        <Route
          path="/multa-de-transito/blog/categoria/:categoria"
          element={<CategoriaBlogWrapper />}
        />
        <Route
          path="/multa-de-transito/blog/:slug"
          element={<BlogPostWrapper />}
        />
        {/* CheckMulta — consulta de infrações */}
        <Route path="/infracao" element={<ConsultaInfracao />} />
        <Route path="/infracao/:slug" element={<InfracaoDetalheWrapper />} />
        {/* CheckMulta — simulador de pontos */}
        <Route path="/simulador-pontos" element={<SimuladorPontos />} />
        {/* CheckMulta — Procon */}
        <Route path="/procon" element={<Procon />} />
        <Route path="/procon/blog" element={<BlogProcon />} />
        <Route path="/procon/blog/:slug" element={<BlogPostProconWrapper />} />
        {/* CheckMulta — Vigilância Sanitária */}
        <Route path="/vigilancia-sanitaria" element={<Vigilancia />} />
        <Route path="/vigilancia-sanitaria/blog" element={<BlogVigilancia />} />
        <Route
          path="/vigilancia-sanitaria/blog/:slug"
          element={<BlogPostVigilanciaWrapper />}
        />
        {/* CheckMulta — Energia elétrica (TOI) */}
        <Route path="/energia" element={<Energia />} />
        <Route path="/energia/blog" element={<BlogEnergia />} />
        <Route path="/energia/blog/:slug" element={<BlogPostEnergiaWrapper />} />
        {/* CheckMulta — IBAMA (auto de infração ambiental) */}
        <Route path="/ibama" element={<Ibama />} />
        <Route path="/ibama/blog" element={<BlogIbama />} />
        <Route path="/ibama/blog/:slug" element={<BlogPostIbamaWrapper />} />
        <Route path="/plataforma" element={<Plataforma />} />
      </Routes>
    </>
  );
}
