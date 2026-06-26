import { Routes, Route, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

// Wrapper que força o BlogPost a recriar quando o slug muda
function BlogPostWrapper() {
  const { slug } = useParams();
  return <BlogPost key={slug} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPostWrapper />} />
    </Routes>
  );
}
