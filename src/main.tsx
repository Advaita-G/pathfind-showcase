// src/main.tsx
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Analytics } from "@vercel/analytics/react";
import AppRoutes from "./AppRoutes";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { PlansProvider } from "./context/PlansContext";
import { AssistantProvider } from "./context/AssistantContext";
import AssistantLauncher from "./components/AssistantLauncher";
import AssistantDrawer from "./components/AssistantDrawer";

const rootElement = document.getElementById("root")!;

const app = (
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <PlansProvider>
            <AssistantProvider>
              <AppRoutes />
              <AssistantLauncher />
              <AssistantDrawer />
            </AssistantProvider>
          </PlansProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
    <Analytics />
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
