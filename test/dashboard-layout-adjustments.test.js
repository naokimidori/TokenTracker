const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const containerPath = path.join(__dirname, "..", "dashboard", "src", "pages", "DashboardPage.jsx");
const viewPath = path.join(
  __dirname,
  "..",
  "dashboard",
  "src",
  "ui",
  "dashboard",
  "views",
  "DashboardView.jsx",
);
const copyPath = path.join(__dirname, "..", "dashboard", "src", "content", "copy.csv");
const dataDetailsPath = path.join(
  __dirname,
  "..",
  "dashboard",
  "src",
  "ui",
  "dashboard",
  "components",
  "DataDetails.jsx",
);
const projectDetailModalPath = path.join(
  __dirname,
  "..",
  "dashboard",
  "src",
  "ui",
  "dashboard",
  "components",
  "ProjectDetailModal.jsx",
);
const installStatusPath = path.join(
  __dirname,
  "..",
  "dashboard",
  "src",
  "lib",
  "install-status.js",
);
const heroPath = path.join(
  __dirname,
  "..",
  "dashboard",
  "src",
  "ui",
  "dashboard",
  "components",
  "DashboardHero.jsx",
);

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("DashboardPage renders V3 continuous layout components", () => {
  const src = readFile(viewPath);
  assert.ok(src.includes("<DashboardHero"), "expected DashboardHero in V3 layout");
  assert.ok(src.includes("<DashboardMetricTrack"), "expected DashboardMetricTrack in V3 layout");
  assert.ok(src.includes("<DashboardActivityBand"), "expected DashboardActivityBand in V3 layout");
  assert.ok(src.includes("<DashboardDataDetails"), "expected DashboardDataDetails in V3 layout");

  const heroSrc = readFile(heroPath);
  assert.ok(heroSrc.includes("<DashboardToolbar"), "expected DashboardToolbar embedded inside DashboardHero");
});

test("DataDetails project rows open the drill-down modal instead of navigating", () => {
  const src = readFile(dataDetailsPath);
  assert.ok(src.includes("<ProjectDetailModal"), "expected project detail modal wiring");
  assert.ok(src.includes("onSelect?.(entry)"), "expected project row click to select entry");
  assert.ok(
    !src.includes("target=\"_blank\""),
    "project rows must not navigate to external project URLs",
  );
});

test("DataDetails project rows honor the global token format, sources and share bar", () => {
  const src = readFile(dataDetailsPath);
  assert.ok(src.includes("formatTokens(tokensRaw)"), "expected global token formatting");
  assert.ok(src.includes("formatTokensTooltip(tokensRaw)"), "expected exact hover details");
  assert.ok(src.includes("<ProviderIcon"), "expected per-source provider icons");
  assert.ok(src.includes("maxTokens"), "expected share bar scaled to top project");
  assert.ok(src.includes("truncate"), "expected truncated project names");
  assert.ok(src.includes("min-w-0"), "expected min width constraint for project names");
});

test("ProjectDetailModal renders inline (no body portal) and stays local", () => {
  const src = readFile(projectDetailModalPath);
  assert.ok(!src.includes("createPortal("), "modal must render inline for Windows WebView2");
  assert.ok(
    !src.includes("api.github.com"),
    "modal must not call external APIs — local data only",
  );
  assert.ok(src.includes("useProjectUsageDetail"), "expected drill-down data hook");
});

test("DashboardPage wires install panel gating through helper", () => {
  const containerSrc = readFile(containerPath);
  const installStatusSrc = readFile(installStatusPath);
  const viewSrc = readFile(viewPath);
  assert.ok(containerSrc.includes("shouldShowInstallCard"), "expected install status helper usage");
  assert.ok(
    containerSrc.includes("has_active_device_token"),
    "expected snake_case install token field usage",
  );
  assert.ok(containerSrc.includes("hasActiveDeviceToken"), "expected camelCase fallback usage");
  assert.ok(
    containerSrc.includes("const shouldShowInstall = shouldShowInstallCard({"),
    "expected helper-based install gate assignment",
  );
  assert.ok(
    installStatusSrc.includes("publicMode || screenshotMode"),
    "expected helper to hide in public/screenshot mode",
  );
  assert.ok(
    installStatusSrc.includes("if (forceInstall) return true"),
    "expected helper to honor forceInstall",
  );
  assert.ok(installStatusSrc.includes("accessEnabled"), "expected helper to check accessEnabled");
  assert.ok(
    installStatusSrc.includes("!heatmapLoading"),
    "expected helper to check heatmapLoading",
  );
  assert.ok(installStatusSrc.includes("activeDays === 0"), "expected helper to gate on activeDays");
  assert.ok(
    installStatusSrc.includes("!hasActiveDeviceToken"),
    "expected helper to hide card for active device token",
  );
  assert.ok(
    viewSrc.includes("installCopy: shouldShowInstall"),
    "expected install panel to use shouldShowInstall",
  );
  assert.ok(viewSrc.includes('case "installCopy"'), "expected install panel card renderer");
});

test("DashboardView wires Hero, activity band and details components", () => {
  const src = readFile(viewPath);
  assert.ok(src.includes("DashboardHero"), "expected DashboardHero");
  assert.ok(src.includes("DashboardActivityBand"), "expected DashboardActivityBand");
  assert.ok(src.includes("DashboardDataDetails"), "expected DashboardDataDetails");
});

test("DashboardPage only uses the full skeleton before dashboard content is first shown", () => {
  const src = readFile(containerPath);
  assert.ok(
    src.includes("const [dashboardContentShown, setDashboardContentShown] = useState(false)"),
    "expected a one-way latch for the first dashboard render",
  );
  assert.match(
    src,
    /const initialDashboardLoading\s*=\s*!dashboardContentShown\s*&&/,
    "later period refreshes must not restore the full-page skeleton",
  );
  assert.ok(
    src.includes("setDashboardContentShown(true)"),
    "expected the latch to be set after dashboard content is visible",
  );
});

test("DashboardPage removes heatmap range label", () => {
  const src = readFile(viewPath);
  assert.ok(!src.includes("dashboard.activity.range"), "expected heatmap range label removed");
});

test("copy registry removes unused install steps and range label", () => {
  const csv = readFile(copyPath);
  const removed = [
    "dashboard.install.headline",
    "dashboard.install.step1",
    "dashboard.install.step2",
    "dashboard.install.step3",
    "dashboard.activity.range",
  ];
  for (const key of removed) {
    assert.ok(!csv.includes(key), `expected copy key removed: ${key}`);
  }
});

test("DashboardHero renders 24 hours trend and rankings", () => {
  const heroPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardHero.jsx",
  );
  const src = readFile(heroPath);
  assert.ok(src.includes("hourlyData"), "expected hourlyData calculation in Hero");
  assert.ok(src.includes("providerStats"), "expected providerStats in Hero");
  assert.ok(src.includes("modelStats"), "expected modelStats in Hero");
});

test("TrendMonitor root does not force full height", () => {
  const src = readFile(
    path.join(
      __dirname,
      "..",
      "dashboard",
      "src",
      "ui",
      "dashboard",
      "components",
      "TrendMonitor.jsx",
    ),
  );
  assert.ok(src.includes("export function TrendMonitor"), "expected TrendMonitor component");
  const lines = src.split("\n");
  const rootLine = lines.find((line) => line.includes('"rounded-xl border border-oai-gray-200'));
  assert.ok(rootLine, "expected TrendMonitor root className line");
  assert.ok(!rootLine.includes("h-full"), "expected TrendMonitor root to avoid h-full");
});

test("DashboardPage supports force_install preview", () => {
  const src = readFile(containerPath);
  assert.ok(src.includes("force_install"), "expected force_install query param support");
  assert.ok(
    src.includes("isProductionHost"),
    "expected force_install gated by production host check",
  );
  assert.ok(
    src.includes("forceInstall"),
    "expected forceInstall flag to influence install visibility",
  );
});

test("DashboardPage removes the obsolete responsive summary format state", () => {
  const src = readFile(containerPath);
  assert.ok(!src.includes("setCompactSummary"), "obsolete summary setter must not survive state removal");
  assert.ok(!src.includes("compactSummary"), "obsolete summary state must not survive global formatting");
  assert.ok(
    src.includes("const summaryValue = formatTokens(summaryTotalTokens)"),
    "dashboard hero total must follow the global token format setting",
  );
  assert.ok(
    src.includes("onToggleSummaryFormat={toggleSummaryFormat}"),
    "dashboard hero click must toggle the global token format setting",
  );
  assert.ok(
    src.includes("setTokenFormatMode("),
    "dashboard hero click must persist through the shared token format provider",
  );
});

test("DashboardMetricTrack removes conversationsValue === 1 special case and handles edge values", () => {
  const metricTrackPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardMetricTrack.jsx",
  );
  const src = readFile(metricTrackPath);
  assert.ok(
    !src.includes("conversationsValue === 1"),
    "conversationsValue === 1 must not be treated as screenshot fallback",
  );
  assert.ok(
    src.includes("AnimatedMetric"),
    "expected AnimatedMetric integration in MetricTrack",
  );
});

test("DashboardHero removes 75/25 artificial provider split", () => {
  const heroPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardHero.jsx",
  );
  const src = readFile(heroPath);
  assert.ok(
    !src.includes("agShare = 0.75"),
    "DashboardHero must not fake 75% antigravity and 25% codex split",
  );
  assert.ok(
    src.includes("AnimatedMetric"),
    "expected AnimatedMetric integration in Hero",
  );
});

test("DashboardDataDetails removes Math.random row keys and 0/1 row mock fallback", () => {
  const dataDetailsPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardDataDetails.jsx",
  );
  const src = readFile(dataDetailsPath);
  assert.ok(!src.includes("Math.random()"), "row keys must be stable and deterministic");
  assert.ok(
    !src.includes("dailyBreakdownRows.length <= 1"),
    "1 row must be rendered as valid user data, not fallback to baseline",
  );
});

test("DashboardView wires real heatmap data to DashboardActivityBand", () => {
  const viewSrc = readFile(viewPath);
  assert.ok(
    viewSrc.includes("heatmapData={heatmap}"),
    "expected real heatmap data passed to DashboardActivityBand",
  );
});

test("DashboardMetricTrack wires rolling last_7d, last_30d and avg_per_active_day", () => {
  const metricTrackPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardMetricTrack.jsx",
  );
  const src = readFile(metricTrackPath);
  assert.ok(
    src.includes("rollingUsage?.last_7d?.totals"),
    "expected rollingUsage.last_7d.totals path for 7d metric",
  );
  assert.ok(
    src.includes("rollingUsage?.last_30d?.totals"),
    "expected rollingUsage.last_30d.totals path for 30d metric",
  );
  assert.ok(
    src.includes("rollingUsage?.last_30d?.avg_per_active_day"),
    "expected rollingUsage.last_30d.avg_per_active_day for daily avg metric",
  );
});

test("DashboardView passes renderDailyBreakdownDate to DashboardDataDetails", () => {
  const viewSrc = readFile(viewPath);
  assert.ok(
    viewSrc.includes("renderDailyBreakdownDate={renderDailyBreakdownDate}"),
    "expected renderDailyBreakdownDate passed to DashboardDataDetails",
  );
});

test("DashboardToolbar removes custom date, share button, and redundant overview title/sync dot", () => {
  const toolbarPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardToolbar.jsx",
  );
  const src = readFile(toolbarPath);
  assert.ok(!src.includes('key: "custom"'), "custom date range must be removed");
  assert.ok(!src.includes("handleShare"), "share button logic must be removed");
  assert.ok(!src.includes("animate-ping"), "fake animate-ping green dot must be removed");
  assert.ok(!src.includes("dashboard.v3.title"), "top title must be removed from toolbar");
  assert.ok(!src.includes("dashboard.v3.just_synced"), "just synced indicator must be removed from toolbar");
  assert.ok(!src.includes("dashboard.v3.subtitle"), "subtitle description must be removed from toolbar");
});

test("Sidebar theme toggle uses dynamic icon without static text", () => {
  const sidebarPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "components",
    "Sidebar.jsx",
  );
  const src = readFile(sidebarPath);
  assert.ok(src.includes("<Sun"), "expected Sun icon in theme toggle");
  assert.ok(src.includes("<Moon"), "expected Moon icon in theme toggle");
  assert.ok(
    !src.includes('{copy("nav.theme_dark") || "夜间模式"}</span>'),
    "visible static text must be removed from sidebar theme button",
  );
});

test("DashboardHero correctly calculates modelStats from topModels tokens/percent and supports providersLoading", () => {
  const heroPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "components",
    "DashboardHero.jsx",
  );
  const heroSrc = readFile(heroPath);
  assert.ok(heroSrc.includes("m.tokens ?? m.usage"), "expected topModels to read tokens field as fallback for usage");
  assert.ok(heroSrc.includes("m.percent != null"), "expected topModels to support precalculated percent field");
  assert.ok(heroSrc.includes("providersLoading"), "expected providersLoading support for model and provider stats");

  const viewPath = path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "ui",
    "dashboard",
    "views",
    "DashboardView.jsx",
  );
  const viewSrc = readFile(viewPath);
  assert.ok(viewSrc.includes("providersLoading={providersLoading}"), "expected DashboardView to forward providersLoading to DashboardHero");
});
