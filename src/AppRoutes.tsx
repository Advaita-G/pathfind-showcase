// src/AppRoutes.tsx
import { Suspense, lazy, type ComponentType } from "react";
import { Routes, Route } from "react-router-dom";
import NotFoundPage from "./pages/NotFoundPage";
import OpportunitiesHubPage from "./pages/OpportunitiesHubPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import IdeaDetailPage from "./pages/IdeaDetailPage";
import CategoryPage from "./pages/CategoryPage";
import GuidePage from "./pages/GuidePage";
import GuidesIndexPage from "./pages/GuidesIndexPage";
import ProfilePage from "./pages/ProfilePage";
import PlansPage from "./pages/PlansPage";
import SharedPathPage from "./pages/SharedPathPage";
import { ALL_CATEGORIES } from "./seo/categories";
import { GUIDES } from "./seo/guides";

// The homepage is the only route that needs the hero, the 3D scene (three) and the
// timeline animations (gsap) — roughly 1.4 MB of JavaScript. Keeping it in its own chunk
// means the ~160 public opportunity/category/guide pages, which are prerendered for
// search, load a small script instead.
const LazyApp = lazy(() => import("./App"));

/**
 * The prerenderer cannot await `React.lazy` inside its synchronous pass, so it imports the
 * homepage component and passes it here. The `<Suspense>` boundary stays in place either
 * way: it is the boundary that lets hydration defer the lazy chunk in the browser instead
 * of reporting a mismatch against the prerendered markup (`<Suspense>` vs the server's
 * already-rendered tree). Prerendered pages therefore ship real HTML and hydrate cleanly.
 */
export default function AppRoutes({ homeComponent }: { homeComponent?: ComponentType }) {
  const Home = homeComponent ?? LazyApp;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={null}>
            <Home />
          </Suspense>
        }
      />
      <Route path="/opportunities" element={<OpportunitiesHubPage />} />
      <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
      <Route path="/ideas/:id" element={<IdeaDetailPage />} />
      {ALL_CATEGORIES.map((category) => (
        <Route key={category.path} path={category.path} element={<CategoryPage category={category} />} />
      ))}
      <Route path="/guides" element={<GuidesIndexPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/plans" element={<PlansPage />} />
      <Route path="/shared" element={<SharedPathPage />} />
      {GUIDES.map((guide) => (
        <Route key={guide.path} path={guide.path} element={<GuidePage guide={guide} />} />
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
