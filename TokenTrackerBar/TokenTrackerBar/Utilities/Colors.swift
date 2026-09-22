import SwiftUI

extension Color {
    /// Primary accent used for emphasis throughout the app.
    static let brand = Color.accentColor

    /// Helper to produce an adaptive color for light and dark appearances.
    static func adaptive(light: Color, dark: Color) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? NSColor(dark) : NSColor(light)
        })
    }

    /// 活跃度日历主强调色（GitHub 亮绿 #39D353）
    static let heatmapAccent = Color(.sRGB, red: 57.0 / 255.0, green: 211.0 / 255.0, blue: 83.0 / 255.0, opacity: 1.0)

    /// 热力图各级色阶（参考 RareUI GitHub Activity：0 级为前景色 8% 底座，1-4 级分别为 30%、52%、76%、100% 亮绿叠加）
    private static let heatmapLevel0: Color = adaptive(
        light: Color(.sRGB, red: 0.92, green: 0.92, blue: 0.92, opacity: 1.0), // #EBEBEB 浅灰底块
        dark:  Color(.sRGB, red: 0.20, green: 0.20, blue: 0.22, opacity: 1.0)  // #323236 深色模式清晰底块
    )
    private static let heatmapLevel1: Color = adaptive(
        light: Color(.sRGB, red: 0.71, green: 0.89, blue: 0.74, opacity: 1.0), // #B6E4BD 浅淡绿
        dark:  Color(.sRGB, red: 0.20, green: 0.38, blue: 0.25, opacity: 1.0)  // #34623F 深翠绿
    )
    private static let heatmapLevel2: Color = adaptive(
        light: Color(.sRGB, red: 0.56, green: 0.87, blue: 0.61, opacity: 1.0), // #8EDF9C 清新中绿
        dark:  Color(.sRGB, red: 0.21, green: 0.53, blue: 0.27, opacity: 1.0)  // #368645 生机翡翠绿
    )
    private static let heatmapLevel3: Color = adaptive(
        light: Color(.sRGB, red: 0.39, green: 0.85, blue: 0.47, opacity: 1.0), // #64D977 明艳草绿
        dark:  Color(.sRGB, red: 0.22, green: 0.67, blue: 0.30, opacity: 1.0)  // #37AC4C 高亮活跃绿
    )
    private static let heatmapLevel4: Color = adaptive(
        light: Color(.sRGB, red: 0.22, green: 0.83, blue: 0.33, opacity: 1.0), // #39D353 饱和亮绿
        dark:  Color(.sRGB, red: 0.22, green: 0.83, blue: 0.33, opacity: 1.0)  // #39D353 荧光极高亮
    )

    /// 热力图等级颜色数组，索引 0-4 分别对应无活跃到极高活跃
    static let heatmapLevels: [Color] = [
        heatmapLevel0, heatmapLevel1, heatmapLevel2, heatmapLevel3, heatmapLevel4
    ]

    /// Trend chart fill gradient.
    static let trendFill = Color.accentColor.opacity(0.15)

    /// Trend chart line color.
    static let trendLine = Color.accentColor

    /// Refined dot colors for model list, ordered by rank.
    private static let modelDotPalette: [Color] = [
        Color(.sRGB, red: 0.35, green: 0.55, blue: 0.95, opacity: 1.0),  // soft blue
        Color(.sRGB, red: 0.60, green: 0.45, blue: 0.90, opacity: 1.0),  // lavender
        Color(.sRGB, red: 0.30, green: 0.72, blue: 0.65, opacity: 1.0),  // teal
        Color(.sRGB, red: 0.90, green: 0.55, blue: 0.35, opacity: 1.0),  // warm amber
        Color(.sRGB, red: 0.70, green: 0.50, blue: 0.75, opacity: 1.0),  // muted plum
    ]

    /// Returns a dot color for model list by rank index.
    static func modelDot(index: Int) -> Color {
        modelDotPalette[index % modelDotPalette.count]
    }

    // MARK: - Usage Limit Bars

    /// Track background for usage limit progress bars.
    static let limitTrack = Color.gray.opacity(0.10)

    /// Usage limit bar color by fraction (0.0–1.0): green → amber → red as the
    /// window fills. Unified across providers (no per-provider brand tint).
    static func limitBar(fraction: Double) -> Color {
        if fraction >= 0.9 { return Color(.sRGB, red: 0.90, green: 0.30, blue: 0.30, opacity: 1.0) }
        if fraction >= 0.7 { return Color(.sRGB, red: 0.85, green: 0.65, blue: 0.20, opacity: 1.0) }
        return Color(.sRGB, red: 0.20, green: 0.72, blue: 0.40, opacity: 1.0)
    }

    /// Returns a brand color for the given AI source/provider name.
    static func sourceColor(_ source: String) -> Color {
        switch source.lowercased() {
        case "claude":    return .purple
        case "codex":     return .green
        case "gemini":    return .blue
        case "opencode":  return .orange
        case "openclaw":  return .pink
        case "cursor":    return .yellow
        case "everycode": return .cyan
        default:          return .gray
        }
    }
}
