import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/LoadingState";
import HomePage from "./pages/HomePage";

const ChallengePage = lazy(() => import("./pages/ChallengePage"));
const SuccessPage = lazy(() => import("./pages/SuccessPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const SimulationPage = lazy(() => import("./pages/SimulationPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <>
      <Suspense fallback={<div className="mx-auto max-w-3xl p-8"><LoadingState label="Loading page" /></div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="challenge" element={<ChallengePage />} />
            <Route path="success" element={<SuccessPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="demo" element={<SimulationPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Analytics />
    </>
  );
}

