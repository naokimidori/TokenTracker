# TokenTracker (精简纯本地版)

> **关于此 Fork**  
> 本项目 Fork 自上游开源项目 [xiufengsun/TokenTracker](https://github.com/xiufengsun/TokenTracker)，衷心感谢原作者的开创性贡献。  
> 为了打造更加轻量、纯粹、隐私至上的开发者体验，本版本进行了深度精简与优化：
> - **移除冗余模块**：移除了桌面宠物（Desktop Pet）、成就徽章系统、社区排行榜与云端账户登录/云同步，剔除所有广告、推广引流与 Star 趋势展示。
> - **100% 纯本地离线**：无需注册、无需登录、无需配置云服务，所有数据与分析均在本地机器完成。
> - **稳定性增强**：修复了 macOS 原生菜单栏 App 在快照刷新时的 Swift 并发栈释放崩溃问题，确保菜单栏常驻极其稳定。

---

## ✨ 核心特性

- 🔌 **开箱支持 39 款主流 AI 工具**  
  支持 Claude Code、Codex CLI、Cursor、Windsurf、Gemini CLI、Antigravity、OpenCode、Kiro、Every Code、Hermes Agent、GitHub Copilot、Zed Agent、Goose、Devin CLI、DeepSeek Harness 等主流编程助手。
- 🏠 **100% 纯本地与隐私第一**  
  所有统计均通过本地解析客户端日志与元数据完成。**绝不读取代码内容、绝不收集 Prompt、无任何云端外传**。
- 📊 **可视化 Dashboard**  
  提供用量趋势、按模型/提供商的花费分析、GitHub 风格活跃度热力图、项目用量归因及服务状态看板。
- 🖥️ **原生客户端集成**  
  提供轻量级原生 macOS 菜单栏（Menu Bar）App 与 Windows 系统托盘应用，支持桌面小组件常驻查看。
- 📈 **实时限额追踪**  
  支持检测并显示 Claude、Codex、Cursor、Gemini、Antigravity 等主流工具的剩余配额窗口与重置时间。
- 🧩 **Agent Skills 管理**  
  统一浏览并管理 250+ 公开 Skill，一键在各大 Agent 之间同步与撤销。

---

## ⚡ 快速开始

### 方式一：CLI 一键运行

```bash
# 无需手动配置，自动检测本地 AI 工具并打开 Dashboard
npx tokentracker-cli
```

也可以全局安装：

```bash
npm i -g tokentracker-cli

# 常用命令
tokentracker            # 启动服务并打开 Dashboard (http://localhost:7680)
tokentracker status     # 查看各 AI 工具 Hook 挂接与识别状态
tokentracker sync       # 手动触发本地日志全量同步
tokentracker doctor     # 运行环境与挂接健康检查
```

### 方式二：macOS 原生菜单栏应用

如果你使用 macOS，可直接从源码编译原生菜单栏应用并放入「应用程序」，享受常驻状态栏与原生小组件支持。

---

## 🔌 已支持的 AI 编程工具

TokenTracker 会自动检测并解析本地安装的以下工具日志：

| 分类 | 支持的工具 / 客户端 |
| :--- | :--- |
| **主流 AI 编程 CLI** | Claude Code, Codex, Gemini CLI, Kiro, OpenCode, OpenClaw, Every Code, Hermes Agent, Kilo CLI, Devin CLI, Kimi Code, CodeBuddy, WorkBuddy, Grok Build, oh-my-pi, OmO, pi |
| **IDE 与编辑器插件** | Cursor, Windsurf, GitHub Copilot, Zed Agent, Antigravity, Roo Code, AStudio, Qoder, ZCode, TRAE Work CN, Kilo Code |
| **自主 Agent 与 Harness** | DeepSeek Harness, Goose, Droid, Mimo Code, Prime Agent, Craft Agents, Reasonix, Dots, Claude Science |
| **本地推理与桌面模型** | LM Studio, AnythingLLM Desktop, Unsloth Studio |

### 自定义路径与环境变量配置

若你的工具使用了非默认数据或数据库路径，可通过环境变量进行覆盖：
- `TOKENTRACKER_ACODE_HOME`: AStudio 数据目录
- `TOKENTRACKER_LMSTUDIO_HOME`: LM Studio 目录覆盖
- `TOKENTRACKER_UNSLOTH_DB`: Unsloth Studio 数据库路径
- `TOKENTRACKER_DEVIN_DB`: Devin CLI 数据库路径

---

## 🛠️ 本地开发与从源码构建

### 1. 运行本地 Web Dashboard 与 CLI

```bash
# 克隆仓库
git clone https://github.com/naokimidori/TokenTracker.git
cd TokenTracker

# 安装根依赖与前端依赖
npm install
cd dashboard && npm install && npm run build && cd ..

# 启动本地开发服务
node bin/tracker.js

# 运行自动化测试与架构校验
npm test
npm run validate:guardrails
```

### 2. 构建原生 macOS 菜单栏应用

构建需要环境：macOS、**Xcode 16+** 及 [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)。

```bash
# 1. 进入 macOS App 目录
cd TokenTrackerBar

# 2. 构建最新前端并打包嵌入式 Node 运行环境
npm run dashboard:build
./scripts/bundle-node.sh

# 3. 生成 Xcode 工程并编译 Release 版本
xcodegen generate
ruby scripts/patch-pbxproj-icon.rb
xcodebuild -scheme TokenTrackerBar -configuration Release clean build

# 4. 安装到本地系统应用程序目录
rm -rf /Applications/TokenTracker.app
cp -R build/Build/Products/Release/TokenTracker.app /Applications/
open /Applications/TokenTracker.app
```

---

## 🛡️ 隐私与数据安全

- **零数据上报**：本精简版已彻底移除了所有云端账号与数据上传逻辑。
- **本地日志解析**：仅读取本地 AI 工具生成的会话元数据（Token 计数、时间戳、模型名称）。
- **完全离线可用**：即使在无网络环境下，本地 Web 仪表盘与菜单栏依然正常工作。

---

## 📄 开源协议

本项目采用 [MIT License](./LICENSE) 开源协议。
