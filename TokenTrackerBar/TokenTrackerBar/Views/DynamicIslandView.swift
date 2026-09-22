import SwiftUI

/// SwiftUI content of the Dynamic Island panel.
///
/// Collapsed: a notch-hugging black bar — today's tokens on the left wing,
/// today's cost on the right wing, the center occluded by the hardware notch.
/// Hover: expands into a spend summary (today / 7d / 30d / total) plus the
/// usage-limits bars, all fed by the shared `DashboardViewModel`.
///
/// The panel window is always the expanded size; only this black shape
/// animates. Growing from a top-aligned outer frame (instead of resizing the
/// window mid-animation) keeps the top edge glued to the screen so no
/// wallpaper seam flashes through.
struct DynamicIslandView: View {
    @ObservedObject var viewModel: DashboardViewModel
    @ObservedObject var state: DynamicIslandState
    /// Reports the measured wing width (max of both labels + breathing room)
    /// so the controller can shrink the hit-test pill to hug the text.
    let onWingWidthChanged: (CGFloat) -> Void
    /// Reports the rendered island height after layout so the controller can
    /// size the expanded hit-test rect to the actual black shape.
    let onExpandedHeightChanged: (CGFloat) -> Void

    /// Horizontal breathing room added around the widest wing label.
    private static let wingPadding: CGFloat = 16

    @State private var menuBarIcon: NSImage? = nil
    @State private var wingMetrics = WingSelection.default
    @State private var compactModeEnabled = false

    var body: some View {
        // Referenced so currency/locale changes force a re-render.
        let _ = state.settingsTick
        ZStack(alignment: .top) {
            island
        }
        // Fixed root frame matching the (always-expanded) panel exactly — a
        // fluid root on a borderless panel triggers NSWindow constraint
        // updates that crash (same trap DesktopPetHost avoids).
        .frame(width: state.panelSize.width, height: state.panelSize.height, alignment: .top)
        // The panel covers the menu-bar / notch safe area; never let SwiftUI
        // inset the black fill or a top seam appears.
        .ignoresSafeArea()
        // The island is always a black surface — force dark styling for the
        // embedded summary cards and limit bars regardless of system theme.
        .environment(\.colorScheme, .dark)
        .preferredColorScheme(.dark)
        .onReceive(NotificationCenter.default.publisher(for: .menuBarIconFrameUpdated)) { note in
            // The animator posts a frame per animation tick (up to ~12/s while
            // a runner sprints). Only re-render for it when the panel is on
            // screen and a wing actually displays the icon.
            guard state.isPanelVisible, wingsShowMenuBarIcon,
                  let image = note.object as? NSImage else { return }
            self.menuBarIcon = image
        }
        .onAppear {
            self.menuBarIcon = StatusBarController.currentMenuBarIcon
            self.wingMetrics = resolveWingMetrics()
            self.compactModeEnabled = DynamicIslandCompactPolicy.isEnabled()
        }
        .onChange(of: state.settingsTick) { _ in
            self.wingMetrics = resolveWingMetrics()
            self.compactModeEnabled = DynamicIslandCompactPolicy.isEnabled()
        }
    }

    private var island: some View {
        let geo = state.geometry
        let expanded = state.isExpanded
        let islandWidth = expanded
            ? max(DynamicIslandGeometry.expandedWidth, geo.collapsedWidth)
            : geo.collapsedWidth
        let shoulderRadius = expanded ? CGFloat(8) : min(6, geo.collapsedHeight / 4)
        let renderedWidth = islandWidth + shoulderRadius * 2
        let revealWidth = DynamicIslandVisibilityPolicy.revealWidth(
            progress: state.visibilityProgress,
            fullWidth: renderedWidth,
            centerGapWidth: geo.centerGapWidth,
            hasNotch: geo.hasNotch,
            isDismissing: state.isVisibilityDismissing
        )
        let shape = IslandRoundedRectangle(
            topShoulderRadius: shoulderRadius,
            bottomRadius: expanded ? 22 : min(12, geo.collapsedHeight / 2.5)
        )

        return VStack(spacing: 0) {
            if !expanded {
                collapsedRow
                    .transition(.opacity)
            } else {
                expandedHeaderRow
                    .transition(.opacity)
                expandedContent
                    .transition(.opacity)
            }
        }
        // Width is always explicit. Height: nil when expanded lets the VStack
        // size naturally to its content; explicit when collapsed.
        .frame(width: islandWidth, height: expanded ? nil : geo.collapsedHeight, alignment: .top)
        // The native notch shoulder flares outward at the screen edge, then
        // curves inward to the content body. Keep that flare outside the
        // content width so it never squeezes either metric wing.
        .padding(.horizontal, shoulderRadius)
        .fixedSize(horizontal: false, vertical: expanded)
        .clipShape(shape)
        .background(
            shape.fill(Color.black)
                .shadow(color: .black.opacity(expanded ? 0.25 : 0), radius: expanded ? 10 : 0, x: 0, y: expanded ? 5 : 0)
                .shadow(color: .black.opacity(expanded ? 0.15 : 0), radius: expanded ? 3 : 0, x: 0, y: expanded ? 1 : 0)
        )
        .overlay(
            Group {
                if expanded {
                    shape
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.18),
                                    Color.white.opacity(0.05),
                                    Color.white.opacity(0.08)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.5
                        )
                }
            }
        )
        // Report the rendered island height back to the controller for
        // hit-test sizing. This runs AFTER layout so it reads the actual
        // natural content height — no chicken-and-egg.
        .background(
            GeometryReader { proxy in
                Color.clear.preference(key: IslandRenderedHeightKey.self, value: proxy.size.height)
            }
        )
        .onPreferenceChange(IslandRenderedHeightKey.self) { h in
            onExpandedHeightChanged(h)
        }
        // Reveal from the center without scaling the contents.
        .mask(alignment: .center) {
            Rectangle()
                .frame(width: revealWidth)
        }
        // Top-align inside the always-expanded panel so height/width springs
        // grow downward / outward instead of from the view's center (which
        // would pull the top edge away from the screen and flash wallpaper).
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Collapsed wings

    /// Tokens left, cost right; the center gap sits behind the hardware notch
    /// (or is plain filler on the simulated island). Also kept as the header
    /// row while expanded so the numbers never jump around.
    private var collapsedRow: some View {
        let geo = state.geometry
        let metrics = wingMetrics
        return HStack(spacing: 0) {
            Group {
                if compactModeEnabled {
                    compactRingWingView()
                } else {
                    buildWingView(for: metrics.left)
                }
            }
            .frame(width: geo.wingWidth)
            Spacer()
                .frame(width: geo.centerGapWidth)
            buildWingView(for: metrics.right, suppressValue: compactModeEnabled)
                .frame(width: geo.wingWidth)
        }
        .frame(height: geo.collapsedHeight)
        // Invisible natural-size copies of both wings: their measured max
        // drives the shared wing width, keeping the island tight + symmetric.
        .background(
            HStack(spacing: 0) {
                if compactModeEnabled {
                    measured(compactRingWingView())
                } else {
                    measured(buildWingView(for: metrics.left))
                }
                measured(buildWingView(for: metrics.right, suppressValue: compactModeEnabled))
            }
            .hidden()
        )
        .onPreferenceChange(WingNaturalWidthKey.self) { natural in
            onWingWidthChanged(ceil(natural) + Self.wingPadding)
        }
    }

    /// The two collapsed-wing metrics: the user's two menu-bar slots, kept
    /// positional so an explicit "none" slot leaves that wing empty. Hidden
    /// providers are filtered exactly like the menu bar. Reads preferences
    /// once per render.
    private func resolveWingMetrics() -> WingSelection {
        let hidden = LimitsSettingsStore.shared.hiddenProviders
        let ids = MenuBarDisplayPreferences.read()
        func metric(at index: Int, fallback: MenuBarDisplayMetric) -> MenuBarDisplayMetric? {
            guard ids.indices.contains(index) else { return fallback }
            let id = ids[index]
            // Explicit "show nothing" slot (issue #379).
            if id == MenuBarDisplayPreferences.noneID { return nil }
            guard let parsed = MenuBarDisplayMetric(rawValue: id) else { return fallback }
            if let provider = parsed.providerKey, hidden.contains(provider) { return nil }
            return parsed
        }
        return WingSelection(
            left: metric(at: 0, fallback: .todayTokens),
            right: metric(at: 1, fallback: .todayCost)
        )
    }

    /// Whether either wing renders the animated menu-bar icon (the
    /// `.todayTokens` slot) — gates icon-frame notification re-renders.
    private var wingsShowMenuBarIcon: Bool {
        let metrics = wingMetrics
        if compactModeEnabled {
            return metrics.right == .todayTokens
        }
        return metrics.left == .todayTokens || metrics.right == .todayTokens
    }

    @ViewBuilder
    private func buildWingView(
        for metric: MenuBarDisplayMetric?,
        suppressValue: Bool = false
    ) -> some View {
        if let metric {
            buildMetricWingView(for: metric, suppressValue: suppressValue)
        } else {
            // Explicit "none" slot: contribute nothing to the wing (the
            // shared minWingWidth floor keeps the island shape balanced).
            Color.clear.frame(width: 0, height: 0)
        }
    }

    private func buildMetricWingView(
        for metric: MenuBarDisplayMetric,
        suppressValue: Bool = false
    ) -> some View {
        let content = wingContent(for: metric)
        return HStack(spacing: 4) {
            if let providerKey = metric.providerKey,
               let iconName = LimitsSettingsStore.iconNames[providerKey] {
                Image(iconName)
                    .renderingMode(.original)
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 10.5, height: 10.5)
            } else if metric == .todayTokens, let icon = menuBarIcon ?? StatusBarController.currentMenuBarIcon {
                Image(nsImage: icon)
                    .renderingMode(.template)
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(height: 15.5)
                    .foregroundStyle(Color.white.opacity(0.95))
            } else if let icon = content.icon {
                Image(systemName: icon)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.92))
            }

            if let label = content.label {
                Text(label)
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.55))
            }

            if !content.value.isEmpty && !(metric == .todayTokens && suppressValue) {
                wingLabel(content.value)
            }
        }
    }

    private var ringMetric: MenuBarDisplayMetric? {
        DynamicIslandCompactPolicy.resolveRingMetric(
            primarySlot: wingMetrics.left,
            secondarySlot: wingMetrics.right,
            limits: viewModel.usageLimits,
            hiddenProviders: LimitsSettingsStore.shared.hiddenProviders
        )
    }

    private var ringValues: (trim: Double, color: Double)? {
        guard let ringMetric else { return nil }
        return DynamicIslandCompactPolicy.ringValues(
            pct: viewModel.usageLimits?.utilizationPercent(for: ringMetric),
            displayMode: LimitsSettingsStore.shared.displayMode
        )
    }

    private func compactRingWingView() -> some View {
        let metric = ringMetric
        let values = ringValues
        let icon = metric.flatMap(\.providerKey).flatMap { LimitsSettingsStore.iconNames[$0] }
        let fallbackIcon = NSApp.applicationIconImage ?? NSImage(named: NSImage.applicationIconName) ?? NSImage()
        let tier = DynamicIslandCompactPolicy.quotaColor(colorValue: values?.color ?? 0)
        let color: Color = switch tier {
        case .green: .green
        case .yellow: .yellow
        case .red: .red
        }

        return ZStack {
            Circle()
                .stroke(Color.white.opacity(0.15), lineWidth: 2.5)
            if let values {
                Circle()
                    .trim(from: 0, to: values.trim)
                    .stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.35), value: values.trim)
            }
            if let icon {
                Image(icon)
                    .renderingMode(.original)
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 9, height: 9)
            } else {
                Image(nsImage: fallbackIcon)
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 9, height: 9)
            }
        }
        .frame(width: 18, height: 18)
        .id(metric?.rawValue ?? "empty")
    }

    private func wingContent(for metric: MenuBarDisplayMetric) -> (icon: String?, label: String?, value: String) {
        switch metric {
        case .todayTokens:
            // Same "has data" gate as the menu bar (todaySummary != nil): the
            // value stays put during re-syncs instead of blinking empty.
            let val = viewModel.todaySummary == nil ? "" : TokenFormatter.formatCompact(viewModel.todayTokens)
            return ("bolt.fill", nil, val)
        case .todayCost:
            let val = viewModel.todaySummary == nil ? "" : viewModel.todayCost
            return (nil, nil, val)
        case .last7dTokens:
            let val = viewModel.rollingSummary == nil ? "--" : TokenFormatter.formatCompact(viewModel.last7dTokens)
            return ("clock.fill", "7d", val)
        case .totalTokens:
            let val = viewModel.totalSummary == nil ? "--" : TokenFormatter.formatCompact(viewModel.totalTokens)
            return ("chart.bar.fill", "Tot", val)
        case .totalCost:
            let val = viewModel.totalSummary == nil ? "--" : viewModel.totalCost
            return (nil, "All", val)
        case .claude5h, .codex5h, .codexSpark5h, .kimi5h, .antigravityClaude5h, .antigravityGemini5h:
            return (nil, "5h", limitPercentText(for: metric) ?? "--")
        case .claude7d, .codex7d, .codexSpark7d, .antigravityClaudeWeekly, .antigravityGeminiWeekly:
            return (nil, "7d", limitPercentText(for: metric) ?? "--")
        case .cursorPlan:
            return (nil, "Plan", limitPercentText(for: metric) ?? "--")
        case .cursorAuto:
            return (nil, "Auto", limitPercentText(for: metric) ?? "--")
        case .cursorAPI:
            return (nil, "API", limitPercentText(for: metric) ?? "--")
        case .geminiPro:
            return (nil, "Pro", limitPercentText(for: metric) ?? "--")
        case .geminiFlash:
            return (nil, "Flash", limitPercentText(for: metric) ?? "--")
        case .geminiLite:
            return (nil, "Lite", limitPercentText(for: metric) ?? "--")
        default:
            return (nil, metric.menuLabel, limitPercentText(for: metric) ?? "--")
        }
    }

    /// Limit percent for a wing, sharing the menu bar's guards (configured,
    /// no error) and its display-mode/rounding rules so both surfaces agree.
    private func limitPercentText(for metric: MenuBarDisplayMetric) -> String? {
        guard let pct = viewModel.usageLimits?.utilizationPercent(for: metric) else { return nil }
        return LimitsSettingsStore.formatPercentText(pct)
    }

    private func measured<Content: View>(_ content: Content) -> some View {
        content
            .fixedSize()
            .background(GeometryReader { proxy in
                Color.clear.preference(key: WingNaturalWidthKey.self, value: proxy.size.width)
            })
    }

    private func wingLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(Color.white.opacity(0.95))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }

    @State private var hoveringBrand = false
    @State private var hoveringGear = false

    /// 展开头部控制项高度
    private static let headerControlHeight: CGFloat = 26

    private var expandedHeaderRow: some View {
        let geo = state.geometry
        let appIcon = NSApp.applicationIconImage ?? NSImage(named: NSImage.applicationIconName) ?? NSImage()
        return HStack(spacing: 0) {
            Button(action: {
                DashboardPresentationCoordinator.shared.showDashboard()
            }) {
                HStack(spacing: 6) {
                    Image(nsImage: appIcon)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                        .frame(width: 18, height: 18)
                        .cornerRadius(4)
                        .shadow(color: .black.opacity(0.35), radius: 1.5, x: 0, y: 1)

                    Text("TokenTracker")
                        .font(.system(size: 12.5, weight: .regular, design: .rounded))
                        .foregroundStyle(Color.white.opacity(hoveringBrand ? 1.0 : 0.85))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .pointingHandCursor()
            .onHover { hovering in
                withAnimation(.easeOut(duration: 0.12)) { hoveringBrand = hovering }
            }
            .accessibilityLabel(Strings.openDashboard)
            .help(Strings.openDashboard)

            Spacer()

            // 设置齿轮按钮：点击呼出托盘上下文菜单
            Button(action: {
                StatusBarController.showContextMenuFromIslandGear()
            }) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundStyle(Color.white.opacity(hoveringGear ? 0.95 : 0.65))
                    .frame(width: Self.headerControlHeight, height: Self.headerControlHeight)
                    .background(
                        Circle()
                            .fill(Color.white.opacity(hoveringGear ? 0.16 : 0.09))
                            .overlay(Circle().strokeBorder(Color.white.opacity(hoveringGear ? 0.28 : 0.15), lineWidth: 0.5))
                    )
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .pointingHandCursor()
            .onHover { hovering in
                withAnimation(.easeOut(duration: 0.12)) { hoveringGear = hovering }
            }
            .accessibilityLabel(Strings.menuSettings)
            .help(Strings.menuSettings)
            .padding(.leading, 8)
        }
        .padding(.horizontal, 14)
        .frame(height: geo.collapsedHeight)
    }

    // MARK: - Expanded detail

    /// Cap for the limits list: island chrome (header + summary cards +
    /// divider + footer + paddings) stays under ~240pt, so this keeps the
    /// whole island within `maxExpandedHeight` and the panel's bounds.
    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: 10) {
            SummaryCardsView(
                todayTokens: viewModel.todayTokens,
                todayCost: viewModel.todayCost,
                last7dTokens: viewModel.last7dTokens,
                last7dActiveDays: viewModel.last7dActiveDays,
                last30dTokens: viewModel.last30dTokens,
                last30dAvgPerDay: viewModel.last30dAvgPerDay,
                totalTokens: viewModel.totalTokens,
                totalCost: viewModel.totalCost
            )

            // Self-sizing up to the cap (outer `.fixedSize` makes the scroll
            // view hug its content), scrollable beyond it — many configured
            // providers must not push the island past the panel's bottom.
            ScrollView(.vertical, showsIndicators: false) {
                UsageLimitsView(limits: viewModel.usageLimits, subscriptions: viewModel.subscriptions)
            }
            .frame(maxHeight: DynamicIslandLayoutPolicy.limitsHeight(panelHeight: state.panelSize.height))

            Divider()
                .opacity(0.4)
                .padding(.vertical, 2)

            FooterView(horizontalPadding: 4, verticalPadding: 2)
        }
        .padding(.horizontal, 14)
        .padding(.top, 10)
        .padding(.bottom, 10)
    }
}

private struct WingSelection: Equatable {
    let left: MenuBarDisplayMetric?
    let right: MenuBarDisplayMetric?

    static let `default` = WingSelection(left: .todayTokens, right: .todayCost)
}

/// Rendered height of the island shape, reported after layout for hit-testing.
private struct IslandRenderedHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

/// Widest natural wing-label width; both wings adopt the max so the island
/// stays symmetric around the notch center.
private struct WingNaturalWidthKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

/// Notch-like silhouette with inverse upper shoulders and rounded lower
/// corners. At the screen edge the black shape is wider, then curves inward
/// to the content body — matching the concave transition of a native notch.
struct IslandRoundedRectangle: Shape {
    var topShoulderRadius: CGFloat
    var bottomRadius: CGFloat

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(topShoulderRadius, bottomRadius) }
        set {
            topShoulderRadius = newValue.first
            bottomRadius = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        let shoulder = min(max(0, topShoulderRadius), min(rect.width / 4, rect.height / 2))
        let bodyLeft = rect.minX + shoulder
        let bodyRight = rect.maxX - shoulder
        let bodyWidth = max(0, bodyRight - bodyLeft)
        let bottom = min(max(0, bottomRadius), min(bodyWidth, rect.height) / 2)
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addCurve(
            to: CGPoint(x: bodyRight, y: rect.minY + shoulder),
            control1: CGPoint(x: rect.maxX - shoulder * 0.55, y: rect.minY),
            control2: CGPoint(x: bodyRight, y: rect.minY + shoulder * 0.45)
        )
        path.addLine(to: CGPoint(x: bodyRight, y: rect.maxY - bottom))
        path.addQuadCurve(
            to: CGPoint(x: bodyRight - bottom, y: rect.maxY),
            control: CGPoint(x: bodyRight, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: bodyLeft + bottom, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: bodyLeft, y: rect.maxY - bottom),
            control: CGPoint(x: bodyLeft, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: bodyLeft, y: rect.minY + shoulder))
        path.addCurve(
            to: CGPoint(x: rect.minX, y: rect.minY),
            control1: CGPoint(x: bodyLeft, y: rect.minY + shoulder * 0.45),
            control2: CGPoint(x: rect.minX + shoulder * 0.55, y: rect.minY)
        )
        path.closeSubpath()
        return path
    }
}

