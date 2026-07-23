import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CategoriaBlog from "./pages/CategoriaBlog";
import Procon from "./pages/Procon";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function BlogPostWrapper() {
  const { slug } = useParams();
  return <BlogPost key={slug} />;
}

function CategoriaWrapper() {
  const { categoria } = useParams();
  return <CategoriaBlog key={categoria} />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/procon" element={<Procon />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/categoria/:categoria" element={<CategoriaWrapper />} />
        <Route path="/blog/:slug" element={<BlogPostWrapper />} />
      </Routes>
    </>
  );
}
