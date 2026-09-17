# Tianshu-Research 开发计划书

> **项目定位**：Tianshu-Research 是依附于 **Tianshu-Harness** 的科研能力层（Research Capability Layer），面向 Tianshu CLI/TUI 与 Desktop/Tauri 两个终端，复用同一 Agent Runtime、CVM、Memory、Team/Council/Worker 与 DeliveryGate，不重新实现一套科研 Agent Runtime。  
> **计划基线**：Tianshu-Harness `main`（核对日期：2026-09-17）；参考项目：`lanlan0811/tianshu-mcp` v0.5.x。  
> **核心原则**：**一套科研内核、两个交互表面；Harness 负责思考与编排，Research 负责科研方法、科研工具、证据链和科学验收。**

---

## 1. 项目目标

Tianshu-Research 的目标不是给大模型增加一段“你是一名科研专家”的提示词，而是把 Tianshu-Harness 从以 coding 为主要语义中心的 Agent Runtime，扩展为可执行、可验证、可追溯的科研工作环境。

最终应形成如下能力闭环：

\[
\text{Research Question}
\rightarrow
\text{Search}
\rightarrow
\text{Read}
\rightarrow
\text{Evidence}
\rightarrow
\text{Reason}
\rightarrow
\text{Verify}
\rightarrow
\text{Synthesize}
\rightarrow
\text{Research Artifact}
\]

科研结论必须进一步满足：

\[
\boxed{
\text{Claim}
\rightarrow
\text{Evidence}
\rightarrow
\text{Source}
\rightarrow
\text{Exact Locator}
}
\]

即：重要事实、论文观点、公式、数值与推导结论应尽可能能够追溯到论文、页码、章节、公式号、图表、计算记录或用户输入。

---

## 2. 对 Tianshu-Harness 当前架构的关键判断

### 2.1 CLI 与 Desktop 应共享同一 Research Core

Tianshu-Harness 当前并不是“CLI Agent + Desktop Agent”两套实现。

- CLI/TUI 直接运行 AgentLoop；
- Desktop/Tauri 通过 `src/server/` sidecar 创建和维护 AgentLoop；
- Desktop 会话与 CLI 共享 Agent 核心、工具体系、Skill、MCP、Memory、CVM 和多 Agent 编排能力；
- Desktop sidecar 已存在 `plugin-session-cache`，用于启动暖场插件并在每个桌面会话中合并插件 Tools、Hooks 与 Commands；
- 插件 Skills 在插件初始化时进入 SkillRegistry；
- 插件安装/启停遵循“下一新会话生效”的缓存纪律。

因此 Tianshu-Research 应坚持：

```text
                    Tianshu-Harness
                          │
                 Shared Agent Runtime
                          │
               ┌──────────┴──────────┐
               │                     │
             CLI/TUI             Desktop/Tauri
               │                 (server sidecar)
               └──────────┬──────────┘
                          │
                  Tianshu-Research
```

**禁止**为 CLI 与 Desktop 分别实现两套科研状态、科研工具或科研工作流。

---

### 2.2 当前 Plugin 是 Tianshu-Research 的最佳宿主

Tianshu-Harness 原生插件 Manifest 已支持：

- Tools
- Skills
- Hooks
- Slash Commands
- 权限声明
- 插件生命周期管理

因此 Tianshu-Research 本体应首先是一个 **Tianshu Native Plugin**。

MCP 不应成为 Tianshu-Research 的“本体”，而是 Research Plugin 使用的科研基础设施后端之一。

推荐关系：

```text
Tianshu-Harness
    │
    └── Tianshu-Research Plugin
          ├── Commands
          ├── Skills
          ├── Hooks
          ├── Lightweight Plugin Tools
          │
          └── Research MCP
                ├── Scholarly Retrieval
                ├── Scientific Documents
                ├── Evidence Store
                ├── Research Jobs
                └── Optional Compute Backend
```

---

### 2.3 借鉴 tianshu-mcp，但不复制其 Agent 编排层

`tianshu-mcp` 最值得借鉴的部分包括：

1. **宿主与执行层分离**；
2. **异步任务契约**：长任务返回 `taskId`，通过 query 工具轮询；
3. **显式状态机**；
4. **事件日志 + 最新快照双持久化**；
5. **执行与验收解耦**；
6. **验收失败后的返修闭环**；
7. **fail-closed** 的验收思想；
8. **CLI/GUI 外部执行器被统一包装为 Adapter**。

但 Tianshu-Research **不应复制** `tianshu-mcp` 的外部 Agent Orchestrator，因为 Tianshu-Harness 已经拥有：

- Worker
- `/team`
- `/council`
- `/galaxy`
- Plan Mode
- Adaptive routing
- DeliveryGate
- CVM

因此：

\[
\boxed{\text{Research Multi-Agent Orchestration belongs to Harness}}
\]

而：

\[
\boxed{\text{Research Infrastructure belongs to Tianshu-Research}}
\]

---

## 3. 总体架构

```text
┌───────────────────────────────────────────────────────────────┐
│                      Tianshu Surfaces                         │
│                                                               │
│       CLI / TUI                         Desktop / Tauri        │
│                                           │                   │
│                                  server / sidecar / SSE       │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Tianshu-Harness Core                       │
│                                                               │
│ AgentLoop · CVM · Prompt · Memory · Tools · MCP · Skills      │
│ Team · Council · Worker · Plan · DeliveryGate · Artifact      │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                  Tianshu-Research Plugin                      │
│                                                               │
│ Commands        Skills         Hooks          Core Tool       │
│ /research       research-*     evidence       research_status │
│ /research-*                    scientific                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Research MCP Server                        │
│                                                               │
│ research_query   research_document   research_evidence        │
│ research_job     research_compute(optional capability)        │
└───────────────┬──────────────┬───────────────┬────────────────┘
                │              │               │
         Scholar APIs      PDF/Document    Research Store
                │              │               │
                └──────────────┴───────────────┘
                               │
                    Optional Compute Backend
                    Python / SymPy / SciPy
```

---

## 4. 核心设计原则

### P1. 一套 Research Core，两端功能同构

CLI 与 Desktop 必须调用完全相同的：

- Research Skills；
- Research MCP；
- Evidence Ledger；
- Research Job 状态机；
- Scientific Gate；
- Research Profiles；
- 项目级 Research 配置。

UI 只负责显示方式不同。

---

### P2. 首版不开发 Desktop 专属 Research UI

当前 Tianshu Plugin Manifest 没有通用 Desktop Panel/UI Extension 接口。

因此 v0.x 的最佳路线是：

- CLI：通过 slash commands、普通消息、tool result、artifact 使用；
- Desktop：使用相同 slash commands、消息、工具结果和 artifact；
- 利用 Desktop 已有的文件预览、任务时间线、终端、SideChat、Council/Team UI；
- 不 fork Desktop；
- 不维护 Research 专属 React 页面。

只有当科研后端和工作流稳定后，再讨论原生：

```text
Research Panel
├── Papers
├── Evidence
├── Claims
├── Jobs
└── Verification
```

此时优先给 Tianshu-Harness 提交一个**通用插件 UI Contribution API**，而不是在 Tianshu-Research 内硬改 Desktop。

---

### P3. 核心安装不强制依赖 Python

Tianshu Desktop 的价值之一是“安装即可运行”。

因此：

**Core 必须做到 Node/TypeScript 可运行。**

核心能力包括：

- 学术元数据检索；
- DOI/论文解析；
- Citation graph；
- 文献任务状态机；
- Evidence/Claim Ledger；
- Research Artifact；
- Citation Verification；
- Research Profiles。

Python 仅作为增强能力：

```text
Compute Backend
├── SymPy
├── NumPy
├── SciPy
├── Jupyter
└── mechanics scripts
```

未安装 Python 时：

```text
research_compute capability = degraded
```

而不是让整个 `/research` 不可用。

---

### P4. 工具面必须克制

Tianshu-Harness 对工具数量和上下文成本较敏感，Tianshu-Research 不应一次暴露几十个细粒度工具。

推荐只暴露 **5 个 Research MCP Gateway Tools**：

```text
research_query
research_document
research_evidence
research_job
research_compute
```

各工具通过 `action` 参数承载子操作。

例如：

```json
{
  "action": "search_papers",
  "query": "...",
  "year_from": 2018
}
```

而不是注册：

```text
search_papers
resolve_paper
get_references
get_citations
find_related
verify_doi
...
```

二十多个独立 Tool Schema。

目标：

\[
\boxed{\text{稳定 Tool Prefix + 较低认知负担 + 较好缓存稳定性}}
\]

Plugin 本身只保留一个极轻量工具：

```text
research_status
```

用于诊断 Research 环境与能力状态。

---

### P5. Research MCP 是“科研仪器”，不是“第二个 Agent”

Research MCP 不负责：

- 自主制定科研计划；
- 自己再创建多 Agent；
- 自己决定研究结论；
- 自己承担主上下文；
- 自己实现 Council。

它只提供：

- 数据；
- 结构化文献；
- 证据操作；
- 科学计算；
- 长任务执行；
- 可验证结果。

即：

\[
\boxed{\text{Harness thinks; Research MCP measures.}}
\]

---

## 5. 推荐仓库组织

建议初期使用 **单仓库 Monorepo**，避免 Plugin、MCP、Shared Schema 版本漂移。

```text
Tianshu-Research/
│
├── package.json
├── README.md
├── AGENTS.md
├── ARCHITECTURE.md
├── CHANGELOG.md
│
├── packages/
│  │
│  ├── plugin/
│  │  ├── src/
│  │  │  ├── index.ts
│  │  │  ├── tools/
│  │  │  │  └── research-status.ts
│  │  │  └── runtime/
│  │  └── package.json
│  │
│  ├── mcp/
│  │  ├── src/
│  │  │  ├── server.ts
│  │  │  ├── query/
│  │  │  ├── document/
│  │  │  ├── evidence/
│  │  │  ├── jobs/
│  │  │  └── compute/
│  │  └── package.json
│  │
│  └── shared/
│     ├── src/
│     │  ├── schemas/
│     │  ├── protocol/
│     │  └── types/
│     └── package.json
│
├── commands/
│  ├── research.md
│  ├── research-literature.md
│  ├── research-paper.md
│  ├── research-review.md
│  ├── research-derive.md
│  ├── research-verify.md
│  └── research-status.md
│
├── skills/
│  ├── research-core/
│  │  ├── SKILL.md
│  │  └── references/
│  ├── literature-search/
│  ├── systematic-review/
│  ├── paper-deep-read/
│  ├── citation-audit/
│  ├── research-synthesis/
│  ├── academic-writing/
│  ├── equation-derivation/
│  ├── scientific-verification/
│  └── mechanics/
│     ├── solid-mechanics/
│     ├── fracture-mechanics/
│     ├── fabrikant-potential/
│     ├── crack-interaction/
│     ├── fem-analysis/
│     └── fsi-analysis/
│
├── hooks/
│  ├── research-pre-turn.ts
│  ├── evidence-post-tool.ts
│  ├── scientific-post-turn.ts
│  └── research-post-session.ts
│
├── optional/
│  └── python/
│     ├── pyproject.toml
│     └── tianshu_research_compute/
│        ├── symbolic/
│        ├── numerical/
│        └── mechanics/
│
└── tests/
   ├── contract/
   ├── plugin/
   ├── mcp/
   ├── cli/
   ├── desktop-sidecar/
   └── e2e/
```

---

## 6. Slash Command 设计

### 6.1 总入口

```text
/research
```

职责不是塞入一个“大提示词”，而是：

1. 检查 Research 环境；
2. 激活 `research-core` Skill；
3. 识别用户科研意图；
4. 选择 Research Profile；
5. 引导 Harness 使用对应 Skill、MCP 和验证规则。

建议输出：

```text
Tianshu Research

Workspace       ready
Evidence Store  ready
Research MCP    connected

Capabilities
  Scholar       ready
  Documents     ready
  Evidence      ready
  Compute       optional / ready / unavailable

Profile         exploratory
Evidence Policy standard
Scientific Gate advisory
```

---

### 6.2 首版命令

```text
/research
/research-literature
/research-paper
/research-review
/research-derive
/research-verify
/research-status
```

不建议在 v0.x 为漂亮语法强改 Harness command parser。

未来若 Harness 支持 command subcommands，再演进为：

```text
/research literature
/research paper
/research review
/research derive
/research verify
/research status
```

---

## 7. Research Profiles

定义任务级科研策略，而不是模型 Profile。

### exploratory

适合早期方向探索。

- 可使用 Abstract 作为候选发现依据；
- 允许 tentative claims；
- Citation Gate = advisory；
- 强调 breadth。

### deep-read

适合精读单篇论文。

- Full text required；
- Equation/Figure/Table locator；
- Claim extraction；
- Method/Assumption/Limitations 强制结构化。

### systematic

适合系统综述/Scoping Review。

- Query log；
- 去重；
- inclusion/exclusion；
- forward/backward chaining；
- screening ledger；
- Evidence Gate = strict。

### theoretical

适合数学/理论力学问题。

- Assumption；
- governing equations；
- BC/IC；
- dimension check；
- limiting case；
- symbolic/numerical spot check。

### computational

适合数值方法与仿真。

- parameter provenance；
- code/script artifact；
- reproducibility；
- convergence；
- numerical verification。

### engineering

适合工程有限元/FSI。

- geometry；
- material；
- BC；
- mesh；
- solver；
- convergence；
- result interpretation。

### writing

适合论文与研究报告写作。

- 只能使用已存在 Evidence Ledger 的事实；
- 防止“写作时顺手产生新事实”。

---

## 8. Skill 体系

### 8.1 General Research Skills

```text
research-core
literature-search
systematic-review
paper-deep-read
citation-audit
research-synthesis
academic-writing
equation-derivation
scientific-verification
```

Skill 的职责是：

> **规定 Tianshu 应如何开展科研任务。**

Skill 不承担：

- 网络数据存储；
- PDF 数据库；
- 计算后端；
- Evidence 数据库实现。

---

### 8.2 Mechanics Domain Pack

已有的 mechanics-agent-skills 应作为 Tianshu-Research 的首个领域能力包，而不是被替代。

建议逐步形成：

```text
mechanics/
├── solid-mechanics
├── elasticity
├── fracture-mechanics
├── fabrikant-potential
├── crack-interaction
├── contact-mechanics
├── vibration
├── composite-mechanics
├── fem-analysis
└── fsi-analysis
```

General Research Skills 规定科研规范；

Mechanics Skills 规定领域规范。

二者叠加。

---

## 9. Research MCP 工具面

### 9.1 `research_query`

负责科研信息发现。

Actions：

```text
search_papers
resolve_paper
get_references
get_citations
find_related
verify_metadata
```

首批 Provider：

- Semantic Scholar；
- Crossref。

后续可扩：

- OpenAlex；
- arXiv；
- PubMed；
- 用户自定义 Provider。

Provider 与上层 schema 解耦。

---

### 9.2 `research_document`

负责 Scientific Document。

Actions：

```text
ingest
inspect
read_section
locate_text
locate_equation
list_figures
list_tables
extract_references
```

统一中间结构：

```text
ScientificDocument
├── metadata
├── sections
├── paragraphs
├── equations
├── figures
├── tables
└── references
```

PDF 解析器只是 Adapter：

```text
ParserAdapter
├── Node parser
├── GROBID adapter
└── future parser
```

首版必须保留原 PDF locator，不允许“解析后的文本”成为唯一真源。

---

### 9.3 `research_evidence`

负责可追溯科研知识。

Actions：

```text
add_source
add_evidence
add_claim
query_claims
query_evidence
verify_link
invalidate_claim
```

核心关系：

\[
Source \rightarrow Evidence \rightarrow Claim
\]

---

### 9.4 `research_job`

借鉴 `tianshu-mcp` 的异步任务模式。

Actions：

```text
start
query
cancel
report
list
```

用于：

- 批量文献搜索；
- citation graph；
- 系统综述；
- 批量 PDF ingest；
- 批量 metadata verification；
- 大规模 evidence extraction。

---

### 9.5 `research_compute`

首版为 capability-gated 工具。

Actions：

```text
dimension_check
symbolic_check
numeric_eval
compare
run_script
```

若 Python backend 未安装：

```json
{
  "available": false,
  "reason": "optional_compute_backend_not_installed"
}
```

而不是整个 Research MCP 启动失败。

---

## 10. Research Job 状态机

建议：

```text
queued
  │
  ▼
searching
  │
  ▼
screening
  │
  ▼
retrieving
  │
  ▼
parsing
  │
  ▼
extracting
  │
  ▼
verifying
  │
  ▼
synthesizing
  │
  ▼
completed
```

旁路：

```text
needs_user
needs_attention
partial
failed
cancelled
```

规则：

- 缺少高价值论文全文 → `needs_attention`，不得静默忽略；
- 需要用户提供授权文献 → `needs_user`；
- 部分数据库不可用但结果仍可交付 → `partial`；
- 所有状态转移写入事件流。

---

## 11. Evidence Ledger

### 11.1 Source

```ts
interface ResearchSource {
  id: string
  type: 'paper' | 'book' | 'dataset' | 'web' | 'user' | 'computation'
  title: string

  doi?: string
  authors?: string[]
  year?: number

  verification: 'unverified' | 'metadata_verified' | 'fulltext_verified'
}
```

### 11.2 Evidence

```ts
interface Evidence {
  id: string
  sourceId: string

  locator?: {
    page?: number
    section?: string
    equation?: string
    figure?: string
    table?: string
  }

  relation:
    | 'supports'
    | 'contradicts'
    | 'defines'
    | 'derives'

  excerpt?: string

  verification:
    | 'unverified'
    | 'metadata_verified'
    | 'fulltext_verified'
    | 'reproduced'
}
```

### 11.3 Claim

```ts
interface ResearchClaim {
  id: string
  statement: string

  type:
    | 'reported'
    | 'derived'
    | 'computed'
    | 'hypothesis'

  evidenceIds: string[]

  status:
    | 'tentative'
    | 'supported'
    | 'verified'
    | 'rejected'
    | 'superseded'
}
```

---

## 12. 数据目录

### 12.1 项目级状态优先

为保证 CLI/Desktop 在相同项目目录下天然共享科研状态，核心科研数据应放：

```text
<project>/.rivet/research/
```

而不是依赖 CLI/Desktop 不完全相同的数据根解析链。

建议：

```text
.rivet/
└── research/
    ├── config.json
    ├── sources.jsonl
    ├── evidence.jsonl
    ├── claims.jsonl
    ├── bibliography.bib
    │
    ├── papers/
    ├── documents/
    ├── artifacts/
    │
    ├── index/
    │   └── research.sqlite
    │
    └── runs/
        └── <run-id>/
            ├── events.jsonl
            ├── run.json
            ├── query.json
            ├── candidates.jsonl
            ├── screening.jsonl
            ├── evidence.jsonl
            └── report.md
```

---

### 12.2 与 Harness Memory 分工

`.rivet/knowledge/memory.jsonl`：

存储：

- 项目稳定偏好；
- 已确认研究决策；
- 长期研究约束；
- 已验证的高层结论；
- 用户明确的符号/建模约定。

`.rivet/research/`：

存储：

- 论文；
- 文献索引；
- Evidence；
- Claims；
- Research Runs；
- 结构化科学文档。

禁止将大量 paper chunks 直接灌入 Harness Memory。

---

## 13. CLI/Desktop 多会话安全

Desktop sidecar 是多 session 的，Research 不能假设“进程 cwd = 当前科研项目”。

因此所有 Research MCP 的**状态型操作**必须显式携带：

```text
workspace_id
或
workspace_path
```

并在 MCP 内执行：

- realpath；
- 路径规范化；
- workspace root 验证；
- 防路径逃逸；
- 不允许跨 workspace 写入。

在未来的 Harness 上游 PR 中，建议增加 Plugin Tool Context：

```ts
interface PluginToolContext {
  cwd: string
  sessionId: string
  surface: 'tui' | 'desktop' | 'headless'
}
```

并把插件 ABI 从：

```ts
execute(args)
```

向后兼容扩展为：

```ts
execute(args, context?)
```

现有插件忽略第二参数即可，不破坏 ABI。

这能让 `research_status` 等插件工具可靠知道当前 session workspace，而不要求模型手工传 cwd。

---

## 14. Scientific Gate

### 14.1 v0.x：Advisory Gate

插件 Hooks：

```text
postTool
postTurn
postSession
```

先实现：

- Citation completeness；
- Metadata verification；
- Evidence linkage；
- 未验证 Claim 提醒；
- 重要来源缺全文提醒。

不建议第一版就在 postTurn 强硬阻塞交付。

---

### 14.2 v1.x：Strict Gate

当 Evidence Ledger 足够稳定后增加严格模式：

```text
Citation Gate
Evidence Gate
Equation Gate
Dimension Gate
Assumption Gate
Boundary Condition Gate
Limiting Case Gate
Numerical Gate
Reproducibility Gate
```

---

## 15. Mechanics Verification Gate

作为首个 Domain Gate。

### 15.1 Dimension Check

例如：

\[
[K_I]=[\sigma]\sqrt{L}
\]

Agent 给出：

\[
K_I=f(p,a)
\]

则必须确认右侧维度满足：

\[
[p\sqrt a]=[\sigma]\sqrt L.
\]

---

### 15.2 Boundary Condition Check

裂纹问题中必须记录：

- 裂纹面牵引边界；
- 裂纹外位移/连续条件；
- 无穷远条件；
- 对称性条件；
- 界面连续条件。

---

### 15.3 Symmetry Check

轴对称问题：

\[
\frac{\partial}{\partial\theta}=0.
\]

若最终解无合理原因保留 \(\theta\)，必须提出验证警告。

---

### 15.4 Limiting Case

例如多裂纹间距：

\[
d\rightarrow\infty
\]

应退化为相互独立单裂纹。

---

### 15.5 Numerical Spot Check

解析与数值结果：

\[
\varepsilon_r=
\frac{|Q_\mathrm{analytic}-Q_\mathrm{numerical}|}
{|Q_\mathrm{numerical}|}.
\]

阈值由具体问题/Profile 定义，不在核心中硬编码。

---

## 16. Multi-Agent Research

不实现新的 Research Agent Runtime。

利用 Harness：

```text
/team
/council
/scout
/galaxy
worker
```

Research Skill 只定义：

- 角色；
- WorkOrder；
- wave；
- 验收条件；
- 交付 schema。

典型 Literature Review：

```text
Main Researcher
      │
      ├── Wave 1
      │    ├── Literature Scout A
      │    ├── Literature Scout B
      │    └── Citation Chaser
      │
      ├── Wave 2
      │    ├── Paper Reader A
      │    ├── Paper Reader B
      │    └── Evidence Extractor
      │
      ├── Wave 3
      │    ├── Synthesizer
      │    └── Contradiction Finder
      │
      └── Council
           ├── Citation Reviewer
           ├── Method Reviewer
           ├── Domain Reviewer
           └── Skeptic
```

最后走 Scientific Gate。

---

## 17. Research 配置

项目配置：

```text
.rivet/research/config.json
```

示例：

```json
{
  "version": 1,

  "profile": "exploratory",

  "evidence": {
    "policy": "standard",
    "requirePrimarySource": true,
    "requireFulltextForVerifiedClaim": true,
    "requireLocator": true
  },

  "literature": {
    "providers": [
      "semantic-scholar",
      "crossref"
    ],
    "citationChasing": true
  },

  "verification": {
    "citation": true,
    "equations": true,
    "dimensions": true,
    "limitingCases": true
  },

  "compute": {
    "backend": "auto"
  }
}
```

---

## 18. 安装与分发

### 18.1 一个发行包

建议最终发布：

```text
tianshu-research
```

其中同时携带：

- Native Plugin；
- Commands；
- Skills；
- Hooks；
- Node Research MCP；
- CLI installer；
- Shared schemas。

可选 Python backend 独立安装。

---

### 18.2 推荐安装体验

理想目标：

```powershell
npx tianshu-research install
```

完成：

```text
[1] Detect Tianshu
[2] Install/Update Research Plugin
[3] Register Research MCP
[4] Validate Skills
[5] Initialize Research config
[6] Probe optional compute backend
[7] Smoke test
```

然后：

```text
Restart/new Tianshu session
/research
```

---

### 18.3 CLI 与 Desktop 数据根差异

Tianshu CLI 与 Desktop 的全局数据根解析链并不完全相同，因此安装器**不能简单假设**：

```text
~/.rivet
```

永远是当前 Desktop 数据根。

策略：

1. 项目科研状态统一存 `.rivet/research/`；
2. 安装器优先使用 Harness 官方配置/路径解析能力；
3. Desktop portable mode 必须测试；
4. 不直接硬编码 `%USERPROFILE%\.rivet`；
5. CLI、Desktop setup、Desktop portable 三种场景单独做 E2E。

---

## 19. 建议向 Tianshu-Harness 提交的最小上游增强

### PR-A：Plugin Tool Context

目的：

为插件工具提供可靠的 session 信息。

```ts
execute(args, {
  cwd,
  sessionId,
  surface
})
```

要求：

- 完全向后兼容；
- CLI/serve-agent 都填充；
- 不改变冻结 Tool Definition；
- 不影响 prefix cache key。

**优先级：高。**

---

### PR-B：Plugin-declared MCP Service（可选）

当前 Plugin manifest 没有 bundled MCP service 声明。

后续可以增加：

```json
{
  "mcpServers": [
    {
      "id": "tianshu-research",
      "command": "node",
      "args": ["dist/mcp/server.js"]
    }
  ]
}
```

由 Harness 管理：

- 启动；
- 停止；
- enable/disable；
- plugin remove；
- CLI/Desktop 一致性；
- Server-level MCP connection pool。

在此能力进入 Harness 前，Tianshu-Research installer 可以负责写入 MCP 配置。

**优先级：中。**

---

### PR-C：Generic Desktop Plugin Panel API（后期）

不是 `ResearchPanel` 专用 API，而是：

```text
Plugin UI Contribution
```

例如：

```json
{
  "desktop": {
    "panels": [...]
  }
}
```

研究插件可贡献：

- Papers；
- Evidence；
- Claims；
- Jobs。

但这是 v1.x 之后的事情。

**优先级：低。**

---

## 20. 测试矩阵

Tianshu-Research 不能只测 MCP 单元测试，必须测试两个 Surface。

### 20.1 Unit

```text
schemas
evidence ledger
claim state
provider adapter
job state machine
citation validation
path safety
```

### 20.2 Contract

```text
Plugin Manifest ↔ Harness
Skill Loader ↔ Plugin
Hook Context ↔ Plugin
Research MCP ↔ Harness MCP Client
ScientificDocument schema
```

### 20.3 CLI E2E

```text
install
new session
/research
skill discovery
MCP tool call
research run
evidence persist
resume session
```

### 20.4 Desktop Sidecar E2E

```text
plugin warmup
new desktop session
plugin tools merged
plugin commands available
plugin hooks active
skills discoverable
MCP available
multi-session workspace isolation
```

### 20.5 Cross-Surface

同一个项目：

```text
CLI 创建 Evidence
     ↓
关闭 CLI
     ↓
Desktop 打开项目
     ↓
读取相同 Evidence
```

以及反向：

```text
Desktop 创建 Research Run
     ↓
CLI resume / research-status
     ↓
看到同一项目状态
```

---

## 21. 验收标准

### Functional Parity

同一 cwd 下：

\[
\text{CLI Research Capability}
=
\text{Desktop Research Capability}
\]

除 UI 呈现外，能力不能有差异。

---

### Isolation

两个 Desktop session：

```text
Project A
Project B
```

并发运行时不得发生：

- Evidence 串库；
- PDF 串库；
- Job 串库；
- workspace path 泄漏；
- cache 误归属。

---

### Cache Discipline

- Plugin tool schema 会话内稳定；
- Skill discovery 不改变 frozen system prefix；
- MCP tool surface 稳定；
- 不在每轮动态注册/移除工具；
- 插件升级/启停在新会话生效。

---

### Failure Isolation

Research MCP 崩溃：

```text
Tianshu core remains usable
```

Compute backend 不可用：

```text
literature/evidence functions remain usable
```

单个 Provider 不可用：

```text
Research Job => partial / fallback
```

不得拖垮 AgentLoop。

---

## 22. 里程碑

### M0 — Cross-Surface Skeleton

实现：

- Plugin；
- `/research`；
- `research-core` Skill；
- `research_status`；
- CLI 加载；
- Desktop sidecar 加载；
- Cross-surface E2E。

**完成定义：**

> 同一个 Research Plugin 在 CLI 与 Desktop 新会话均可被发现、调用并正常卸载，不修改 AgentLoop。

---

### M1 — Research Skill Foundation

实现：

```text
research-core
literature-search
paper-deep-read
citation-audit
research-synthesis
scientific-verification
```

迁入/整理 Mechanics skills。

**完成定义：**

> 不依赖 Research MCP 时，Tianshu 已具有规范化科研任务 SOP 与领域科研方法。

---

### M2 — Research MCP Core

实现：

```text
research_query
research_document
research_evidence
research_job
```

首批：

- Semantic Scholar；
- Crossref；
- ScientificDocument；
- Evidence Store；
- Job state machine。

**完成定义：**

> 可以完成“检索 → 解析 → Evidence → Claim”的端到端闭环。

---

### M3 — Evidence-First Research

实现：

- Source Registry；
- Evidence Ledger；
- Claim Ledger；
- Research Run；
- Citation Verification；
- Research Report。

**完成定义：**

> 重要科研结论均可映射到结构化 Evidence。

---

### M4 — Scientific Gate

先实现：

```text
Citation Gate
Evidence Gate
Metadata Gate
```

再实现：

```text
Equation Gate
Dimension Gate
Limiting Case Gate
Numerical Gate
```

**完成定义：**

> Research 输出不再只依赖模型自检，而有独立验证链。

---

### M5 — Optional Compute Backend

接入：

```text
Python
SymPy
NumPy
SciPy
```

不改变 Core 的可安装性。

**完成定义：**

> Python 不存在时 graceful degradation；存在时自动提升 compute capability。

---

### M6 — Multi-Agent Research Workflows

基于 Harness `/team`、`/council`、Worker 构建：

```text
literature review
paper reproduction
theory verification
engineering analysis
```

**完成定义：**

> Research 只定义 WorkOrder/roles/gates，不新建第二套 multi-agent runtime。

---

### M7 — Desktop Research Experience

在科研内核稳定后再评估：

- Research Panel；
- Evidence viewer；
- Paper graph；
- Job monitor；
- Verification report。

优先通过通用 Harness Plugin UI API 实现。

**完成定义：**

> Desktop 获得更好的科研可视化，但 Research Core 仍与 CLI 完全共享。

---

## 23. 明确不做的事情

Tianshu-Research 第一阶段不应：

- fork AgentLoop；
- 重新实现 Memory；
- 重做 Council；
- 重做 Team；
- 重做 Worker routing；
- 实现另一套 Context Compression；
- 自建模型 Router；
- 强绑定 Python；
- 为 Desktop 单独复制 Research Backend；
- 一开始就做复杂 Knowledge Graph；
- 一开始接入十几个论文 Provider；
- 一开始开发大型科研 GUI。

开发资源应集中在 Harness 当前没有的科研能力：

\[
\boxed{
\text{Scientific Method}
+
\text{Scientific Evidence}
+
\text{Scientific Documents}
+
\text{Scientific Verification}
}
\]

---

## 24. 首个可交付版本建议：Tianshu-Research v0.1

v0.1 只包含：

```text
Native Plugin
│
├── /research
├── /research-status
│
├── research-core
├── literature-search
├── paper-deep-read
├── citation-audit
│
├── research_status tool
│
└── Research MCP
    ├── research_query
    ├── research_document
    ├── research_evidence
    └── research_job
```

支持：

```text
CLI       ✓
Desktop   ✓
Windows   ✓
macOS     ✓
Linux CLI ✓
```

不包含：

```text
Native Research Panel
Heavy Knowledge Graph
Mandatory Python
Full Mechanics Gate
```

---

## 25. v0.1 代表性用户流程

### 场景 A：文献调研

```text
/research-literature
调研共面 penny-shaped cracks 相互作用研究。
```

执行：

```text
research-core
     ↓
literature-search
     ↓
Harness /team
     ↓
research_query
     ↓
candidate papers
     ↓
research_document
     ↓
paper-deep-read
     ↓
research_evidence
     ↓
citation-audit
     ↓
Council
     ↓
Scientific Gate
     ↓
report.md
```

---

### 场景 B：理论推导

```text
/research-derive
检查该裂纹相互作用表达式是否满足单裂纹极限。
```

执行：

```text
equation-derivation
      ↓
assumptions
      ↓
dimension check
      ↓
limiting case
      ↓
optional research_compute
      ↓
scientific-verification
      ↓
Evidence/Computation artifact
```

---

### 场景 C：跨 CLI/Desktop

CLI：

```text
/research-paper Fabrikant1987.pdf
```

生成：

```text
.rivet/research/evidence.jsonl
.rivet/research/claims.jsonl
```

之后打开 Desktop，同一项目中：

```text
/research-status
```

必须直接看到同一 Research State。

这将作为 Tianshu-Research 的核心跨端验收用例。

---

## 26. 最终项目定义

### 中文

> **Tianshu-Research 是 Tianshu-Harness 的科研能力层。**  
> 它通过原生 Plugin、Skills、Hooks、Slash Commands 与 Research MCP，在不重新实现 Agent Runtime 的前提下，为 Tianshu CLI 与 Desktop 提供统一的文献检索、论文精读、科研证据追踪、科学计算验证、多 Agent 科研协作和 Scientific Gate。

### English

> **Tianshu-Research is the scientific research capability layer for Tianshu-Harness.**  
> It extends the same Tianshu agent runtime across CLI and Desktop through native plugins, skills, hooks, slash commands, and research MCP services, providing evidence-grounded literature research, scientific document understanding, verification, and multi-agent research workflows.

---

## 27. 参考实现与架构基线

- Tianshu-Harness  
  <https://github.com/huiliyi37/Tianshu-harness>

- Tianshu-Harness Plugin architecture  
  `src/plugins/manifest.ts`  
  `src/plugins/plugin-loader.ts`  
  `docs/plugins.md`

- Tianshu Desktop/sidecar plugin integration  
  `src/server/serve-agent.ts`  
  `src/server/plugin-session-cache.ts`

- Tianshu Skills architecture  
  `src/skills/skill-loader.ts`  
  `docs/skills-architecture.md`  
  `docs/skills-guide.md`

- tianshu-mcp  
  <https://github.com/lanlan0811/tianshu-mcp>

- tianshu-mcp architecture  
  `ARCHITECTURE.md`

---

## 28. 当前建议的工程决策摘要

| 决策 | 选择 |
|---|---|
| Tianshu-Research 本体 | Native Tianshu Plugin |
| CLI/Desktop | 共享同一 Research Core |
| Desktop v0.x | 不做专属 Research GUI |
| Research MCP | 科研基础设施，不做第二层 Agent |
| 工具数量 | Gateway 化，约 4–5 个 MCP 工具 |
| 长任务 | `taskId` + 状态机 + 轮询 |
| 数据主目录 | `<project>/.rivet/research/` |
| Research Memory | 与 Harness memory 分离 |
| Multi-Agent | 完全复用 Harness |
| Python | 可选 Compute Backend |
| 科研输出核心 | Evidence-first |
| 首个领域包 | Mechanics |
| 上游优先 PR | Plugin Tool Context |
| 后期上游 PR | bundled MCP / generic Desktop plugin panel |

---

**推荐下一步：直接以 M0 为第一开发目标，先完成 Plugin + `/research` + CLI/Desktop 双端装配验证，再进入科研功能实现。**
