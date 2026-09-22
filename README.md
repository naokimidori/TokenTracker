# TokenTracker (Simplified Local-First Fork)

[English](./README.md) · [简体中文](./README.zh-CN.md)

> **About this Fork**  
> This project is a streamlined fork of the upstream project [xiufengsun/TokenTracker](https://github.com/xiufengsun/TokenTracker). Huge thanks to the original author for the wonderful foundation.  
> This fork includes the following adjustments:
> - **Removed non-essential features**: Removed Desktop Pet, Achievements & Badges, Leaderboard & Public Profiles, Cloud Accounts, and Cloud Sync. Stripped all promotional ads and Star history trackers.
> - **100% Local & Offline**: No sign-ups, no logins, no cloud backend required. All token parsing, aggregation, and cost analysis happen strictly on your machine.
> - **Stability Fix**: Fixed a Swift concurrency task deallocation crash in the native macOS Menu Bar app during widget snapshot updates, ensuring robust, persistent background operation.

---

## ✨ Key Features

- 🔌 **39 AI Coding Tools Supported Out-of-the-Box**  
  Works seamlessly with Claude Code, Codex CLI, Cursor, Windsurf, Gemini CLI, Antigravity, OpenCode, Kiro, Every Code, Hermes Agent, GitHub Copilot, Zed Agent, Goose, Devin CLI, DeepSeek Harness, and more.
- 🏠 **100% Local & Privacy-First**  
  All metrics are gathered from local application logs and session databases. **Never reads prompt texts, never touches your code, and makes zero network uploads**.
- 📊 **Insightful Web Dashboard**  
  Visualizes token usage trends, breakdown by model and provider, GitHub-style activity heatmaps, per-project attribution, and provider service status.
- 🖥️ **Native Desktop Integration**  
  Native macOS Menu Bar application with popup overview and desktop widgets, plus Windows system tray integration.
- 📈 **Real-Time Rate Limits Tracking**  
  Monitors quota windows, usage percentages, and reset countdowns for supported providers (Claude, Codex, Cursor, Gemini, Antigravity, etc.).
- 🧩 **Agent Skills Management**  
  Browse 250+ community skills and synchronize them across multiple AI agents with single-click toggle and rollback.

---

## ⚡ Quick Start

### Option 1: CLI (One-Liner)

```bash
# Automatically detects installed tools and opens http://localhost:7680
npx tokentracker-cli
```

Or install globally:

```bash
npm i -g tokentracker-cli

# Common commands
tokentracker            # Start server and launch local dashboard
tokentracker status     # View hooked tools and detection status
tokentracker sync       # Trigger a manual sync of all local sources
tokentracker doctor     # Health check for hooks and runtime environment
```

### Option 2: Native macOS Menu Bar App

For macOS users, you can build the native application from source and run it in your menu bar with desktop widget support.

---

## 🔌 Supported AI Coding Tools

TokenTracker automatically recognizes and parses local logs from:

| Category | Supported Tools / Clients |
| :--- | :--- |
| **CLI Assistants** | Claude Code, Codex, Gemini CLI, Kiro, OpenCode, OpenClaw, Every Code, Hermes Agent, Kilo CLI, Devin CLI, Kimi Code, CodeBuddy, WorkBuddy, Grok Build, oh-my-pi, OmO, pi |
| **IDEs & Editor Extensions** | Cursor, Windsurf, GitHub Copilot, Zed Agent, Antigravity, Roo Code, AStudio, Qoder, ZCode, TRAE Work CN, Kilo Code |
| **Autonomous Agents & Harnesses** | DeepSeek Harness, Goose, Droid, Mimo Code, Prime Agent, Craft Agents, Reasonix, Dots, Claude Science |
| **Local Inference & Desktop UIs** | LM Studio, AnythingLLM Desktop, Unsloth Studio |

### Custom Paths & Environment Overrides

If your tools store logs or databases in custom directories, override them via environment variables:
- `TOKENTRACKER_ACODE_HOME`: Custom path for AStudio directory
- `TOKENTRACKER_LMSTUDIO_HOME`: Custom path for LM Studio directory
- `TOKENTRACKER_UNSLOTH_DB`: Custom path for Unsloth Studio database
- `TOKENTRACKER_DEVIN_DB`: Custom path for Devin CLI database

---

## 🛠️ Development & Building from Source

### 1. Web Dashboard & CLI

```bash
# Clone the repository
git clone https://github.com/naokimidori/TokenTracker.git
cd TokenTracker

# Install dependencies
npm install
cd dashboard && npm install && npm run build && cd ..

# Run local CLI
node bin/tracker.js

# Run test suite and guardrails
npm test
npm run validate:guardrails
```

### 2. Building the Native macOS Menu Bar App

Requirements: macOS, **Xcode 16+**, and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

```bash
# 1. Enter the macOS project folder
cd TokenTrackerBar

# 2. Build the latest dashboard and bundle embedded Node.js
npm run dashboard:build
./scripts/bundle-node.sh

# 3. Generate Xcode project and build Release binary
xcodegen generate
ruby scripts/patch-pbxproj-icon.rb
xcodebuild -scheme TokenTrackerBar -configuration Release clean build

# 4. Install to /Applications
rm -rf /Applications/TokenTracker.app
cp -R build/Build/Products/Release/TokenTracker.app /Applications/
open /Applications/TokenTracker.app
```

---

## 🛡️ Privacy & Security

- **Zero Telemetry**: All cloud backend communication, user accounts, and remote synchronization have been completely stripped out.
- **Local Parsing Only**: Only reads structured metadata (token counts, timestamps, model identifiers) produced locally by your tools.
- **Fully Offline Capable**: The dashboard and menu bar app function completely offline without an internet connection.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
