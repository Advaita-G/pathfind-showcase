// src/entry-server.tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "./context/AuthContext";
import { PlansProvider } from "./context/PlansContext";
import { AssistantProvider } from "./context/AssistantContext";
import AssistantLauncher from "./components/AssistantLauncher";
import AssistantDrawer from "./components/AssistantDrawer";
import AppRoutes from "./AppRoutes";
import { setServerBuildDay } from "./lib/useToday";

/**
 * The homepage tree is lazily loaded in the browser (it carries three/gsap), and
 * `React.lazy` cannot resolve during the synchronous `renderToString` pass. Prerendering
 * imports it up front instead, so the homepage ships real HTML — copy, opportunity
 * listings and the internal links crawlers need — rather than an empty root div.
 */
async function loadHome() {
  return (await import("./App")).default;
}

/**
 * `buildDay` (ISO `YYYY-MM-DD`) is stamped into the output as <meta name="pathfind-build-day">
 * so date-derived UI renders identically on the server and during client hydration.
 */
export async function render(url: string, buildDay?: string): Promise<string> {
  setServerBuildDay(buildDay ?? null);
  const homeComponent = url === "/" ? await loadHome() : undefined;
  return renderToString(
    <StaticRouter location={url}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <PlansProvider>
            <AssistantProvider>
              <AppRoutes homeComponent={homeComponent} />
              <AssistantLauncher />
              <AssistantDrawer />
            </AssistantProvider>
          </PlansProvider>
        </AuthProvider>
      </MotionConfig>
    </StaticRouter>,
  );
}

export { buildAllRoutes } from "./seo/routes";
export { resolveRouteMeta } from "./seo/meta";
