import { useEffect } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";

import Home from "./pages/Home";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CategoriaBlog from "./pages/CategoriaBlog";
import Procon from "./pages/Procon";
import BlogProcon from "./pages/BlogProcon";
import BlogPostProcon from "./pages/BlogPostProcon";

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

        {/* CheckMulta — Procon */}
        <Route path="/procon" element={<Procon />} />
        <Route path="/procon/blog" element={<BlogProcon />} />
        <Route path="/procon/blog/:slug" element={<BlogPostProconWrapper />} />
      </Routes>
    </>
  );
}
