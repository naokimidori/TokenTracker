import React, { lazy, Suspense, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { useLocale } from "./hooks/useLocale.js";
import { ThemeProvider } from "./ui/foundation/ThemeProvider.jsx";
import { getBackendBaseUrl } from "./lib/config";
import { isMockEnabled } from "./lib/mock-mode";
import { isScreenshotModeEnabled } from "./lib/screenshot-mode";
import { AppLayout } from "./ui/components/Sidebar.jsx";
import { ToastProvider } from "./ui/components/Toast.jsx";
import {
  markDashboardMainContentVisible,
  preloadDashboardPageResources,
} from "./lib/dashboard-preload.js";

const nullComponent = () => null;
const Analytics = lazy(() =>
  import("@vercel/analytics/react")
    .then((m) => ({ default: m.Analytics }))
    .catch(() => ({ default: nullComponent })),
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react")
    .then((m) => ({ default: m.SpeedInsights }))
    .catch(() => ({ default: nullComponent })),
);
const CommandPalette = lazy(() =>
  import("./ui/dashboard/components/CommandPalette.jsx")
    .then((m) => ({ default: m.CommandPalette }))
    .catch(() => ({ default: nullComponent })),
);

// 页面按需加载，保留核心看板与常用辅助工具
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage.jsx").then((m) => ({ default: m.DashboardPage })),
);
const LimitsPage = lazy(() =>
  import("./pages/LimitsPage.jsx").then((m) => ({ default: m.LimitsPage })),
);
const SessionsPage = lazy(() =>
  import("./pages/SessionsPage.jsx").then((m) => ({ default: m.SessionsPage })),
);
const SkillsPage = lazy(() =>
  import("./pages/SkillsPage.jsx").then((m) => ({ default: m.SkillsPage })),
);
const WidgetsPage = lazy(() =>
  import("./pages/WidgetsPage.jsx").then((m) => ({ default: m.WidgetsPage })),
);
const IpCheckPage = lazy(() => import("./pages/IpCheckPage.jsx"));
const ServiceStatusPage = lazy(() => import("./pages/ServiceStatusPage.jsx"));
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage.jsx").then((m) => ({ default: m.SettingsPage })),
);
const WrappedPage = lazy(() => import("./pages/WrappedPage.jsx"));
const LandingPage = lazy(() =>
  import("./pages/LandingPage.jsx").then((m) => ({ default: m.LandingPage })),
);

export default function App() {
  const { resolvedLocale } = useLocale();
  const location = useLocation();
  const dashboardMainContentVisibleRef = useRef(false);
  const dashboardResourcePreloadStartedRef = useRef(false);
  const mockEnabled = isMockEnabled();
  const screenshotMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isScreenshotModeEnabled(window.location.search);
  }, []);

  const pathname = location?.pathname || "/";
  // 纯单机本地模式，无需公共分享令牌
  const publicToken = null;
  const publicMode = false;

  const isLocalMode =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const isDashboardDefaultPath = normalizedPath === "/" || normalizedPath === "/dashboard";
  const baseUrl = getBackendBaseUrl();

  const handleDashboardMainContentVisible = useCallback(() => {
    if (!isDashboardDefaultPath) return;
    if (!dashboardMainContentVisibleRef.current) {
      dashboardMainContentVisibleRef.current = true;
      markDashboardMainContentVisible();
    }
    if (!dashboardResourcePreloadStartedRef.current) {
      dashboardResourcePreloadStartedRef.current = true;
      void preloadDashboardPageResources();
    }
  }, [isDashboardDefaultPath]);

  let gate = isLocalMode || mockEnabled || screenshotMode ? "dashboard" : "landing";
  if (normalizedPath === "/landing") gate = "landing";
  if (normalizedPath === "/dashboard") gate = "dashboard";

  const isLimitsPath = normalizedPath === "/limits";
  const isSettingsPath = normalizedPath === "/settings";
  const isSkillsPath = normalizedPath === "/skills";
  const isSessionsPath = normalizedPath === "/sessions";
  const isWidgetsPath = normalizedPath === "/widgets";
  const isIpCheckPath = normalizedPath === "/ip-check";
  const isServiceStatusPath = normalizedPath === "/service-status";

  if (
    isLimitsPath ||
    isSettingsPath ||
    isSkillsPath ||
    isSessionsPath ||
    isWidgetsPath ||
    isIpCheckPath ||
    isServiceStatusPath
  ) {
    gate = "dashboard";
  }

  let PageComponent = DashboardPage;
  if (isLimitsPath) {
    PageComponent = LimitsPage;
  } else if (isSettingsPath) {
    PageComponent = SettingsPage;
  } else if (isSkillsPath) {
    PageComponent = SkillsPage;
  } else if (isSessionsPath) {
    PageComponent = SessionsPage;
  } else if (isWidgetsPath) {
    PageComponent = WidgetsPage;
  } else if (isIpCheckPath) {
    PageComponent = IpCheckPage;
  } else if (isServiceStatusPath) {
    PageComponent = ServiceStatusPage;
  }

  const showSidebar =
    !publicMode &&
    (normalizedPath === "/dashboard" ||
      normalizedPath === "/" ||
      isLimitsPath ||
      isSettingsPath ||
      isSkillsPath ||
      isSessionsPath ||
      isWidgetsPath ||
      isIpCheckPath ||
      isServiceStatusPath);

  let content = null;
  if (normalizedPath === "/wrapped") {
    content = <WrappedPage />;
  } else if (gate === "landing") {
    content = <LandingPage />;
  } else {
    const pageNode = (
      <PageComponent
        key={resolvedLocale}
        baseUrl={baseUrl}
        auth={null}
        signedIn={true}
        sessionSoftExpired={false}
        signOut={() => Promise.resolve()}
        publicMode={publicMode}
        publicToken={publicToken}
        onMainContentVisible={handleDashboardMainContentVisible}
      />
    );
    if (showSidebar) {
      content = <AppLayout>{pageNode}</AppLayout>;
    } else {
      content = pageNode;
    }
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <Suspense fallback={null}>{content}</Suspense>
          <Suspense fallback={null}>
            {showSidebar ? <CommandPalette /> : null}
            <Analytics />
            <SpeedInsights />
          </Suspense>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
