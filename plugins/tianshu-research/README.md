# Tianshu-Research (天枢科研能力扩展包)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-JSON--RPC_2.0-green.svg)](https://modelcontextprotocol.io/)

天枢理工科研扩展包（**Tianshu-Research Overlay**）。Tianshu-Research 并非独立的科研 Agent，亦非孤立的外部工具服务，而是依附于 Tianshu-Harness 的**第一方原生科研能力扩展包**。Tianshu-Harness 始终是唯一的认知中枢、会话中枢和多智能体编排器（“Harness 负责思考，Research 负责实测与沉淀”）。

提供开放获取文献检索（arXiv / OpenAlex）、结构化证据账本（Evidence Ledger）、科学门禁审查（Scientific Gate）与顶刊绘图配色能力。

---

## 核心定位与原则

1. **原生扩展而非独立 Agent**：依附于 Harness 已有架构（CVM、Prefix Cache、Team/Council），不重复造轮子。
2. **按需启用与隔离（Opt-in Overlay）**：默认不预装、不常驻、不侵入核心编程智能体的工具面与默认配置，确保基线会话前缀缓存命中率稳定在 95%–99%。
3. **收敛网关与防幻觉账本**：通过 Discriminated Union 收敛为 4 个公开工具；将文献精读与观点提取落盘为结构化证据账本，严厉杜绝虚构页码或实验结论。
4. **零外部运行时依赖**：Node.js 端采用纯标准库 ESM 实现，无任何第三方 npm 依赖；配色计算在 Node 内存中即时插值，不强依赖 Python 子进程。
5. **三档自适应使用**：短用纯对话零文件写入；中用利用宿主写 Markdown 读卡；长用显式写入账本并经科学门禁验证。

---

## 公开工具体系 (4 大工具)

1. **`research_query` (统一学术检索与解析网关)**
   - `action: "search_papers"`：并发检索 arXiv 与 OpenAlex 开放文献。
   - `action: "resolve_paper"`：按 arXiv ID 或 DOI 查询单篇文献元数据并直链 OA PDF。

2. **`research_evidence` (结构化证据账本与材料入口网关)**
   - `action: "ingest_document"`：导入已读纯文本材料至工作区（安全单段 docId，拒绝 PDF 混入），为真实定位提供全文基准。
   - `action: "add_source"`：录入参考文献元数据。
   - `action: "add_evidence"`：记录包含真实 Locator（章节、行号、字符偏移或真实 PDF 页码）与原文摘录的证据片段。
   - `action: "add_claim"`：基于已录入的证据创建科学主张，建立双向追踪链条。
   - `action: "query_evidence"`：按来源、支持/反驳关系或关键词筛选证据。
   - `action: "read_section"`：按章节定向提取已入库材料（默认限制 2000 字符，支持 offset），严格压制上下文暴涨，杜绝整篇论文全量回显撑爆 20 万 Token。
   - `action: "get_summary"`：统计当前工作区账本整体规模。
   - `action: "verify_ledger"`：触发科学门禁审查（默认 90% 定位阈值、接地真实性检查、支持关系小枚举、占位符拦截）。
   - `action: "export_csl_json"` / `action: "export_ris"`：将账本中的文献元数据与证据关联导出为标准 CSL-JSON 或 RIS 格式，落盘至 `<workspace>/.rivet/research/export/`，一键拖入 Zotero 替代商业 EndNote。

3. **`journal_palette` (顶刊出版规范配色)**
   - 查询 100 套顶刊出版规范配色（Nature, Science, IEEE, ColorBrewer, Okabe-Ito 色盲友好色板）。

4. **`research_status` (科研工作区状态诊断)**
   - 快速获取当前工作区路径、证据账本落盘统计（Sources/Evidence/Claims）、检索引擎状态（默认 unprobed）与顶刊色板角色目录。

---

## 结构化证据账本 (Evidence Ledger)

精读与提取数据持久化于工作区目录 `<workspace>/.rivet/research/`：
- `sources.jsonl`：文献元数据（DOI, 标题, 作者, 年份, PDF 链接）。
- `evidence.jsonl`：证据事实片段与物理定位（`page`, `section`, `equation`, `figure`, `table`）。
- `claims.jsonl`：从证据中提炼的学术主张（`tentative` / `verified`），显式绑定 `evidenceIds`。

---

## 快捷斜杠指令 (Slash Commands)

- `/research [topic]`：启动科研环境检查与初筛工作流。
- `/research-status`：查看当前工作区科研状态快照与账本数据统计。

---

## 多 Agent 科研协作与 WorkOrder 规范

基于 Tianshu-Harness 原生的 `/team` 与 `/council`，全面吸收五阶段闭环科研协作体系（详见 `skills/research-flow/references/team-templates.md`）：
1. **Wave 1: Scout (学术初筛员)**：初筛 OA 文献，提取真实 DOI/arXiv ID。
2. **Wave 2: Strategist (方案架构员)**：分析 Research Gap，提炼创新假设与数值验证方案。
3. **Wave 3: Coder (实验复现员)**：编写并运行仿真算法代码，验证 Exit 0。
4. **Wave 4: Writer (学术撰写员)**：应用 `journal_palette` 顶刊配色，撰写论文草稿与导出 CSL-JSON/RIS。
5. **Wave 5: Council Gatekeeper (双重科学门禁席)**：
   - **一级证据链门禁**：核验 100% Locator 覆盖与全文 Grounding 匹配。
   - **二级代码复现门禁**：独立复跑实验脚本确保结果一致性；未通过闭环打回前序 Wave 迭代。

---

## Python 绘图伴生库

将 `figure/journal_palette.py` 与 `figure/journal_palette.json` 放置于绘图同级目录：

```python
import matplotlib.pyplot as plt
import numpy as np
from journal_palette import journal_palette, apply_journal_style

# 应用顶刊排版规范
apply_journal_style()

# 获取色盲安全色板
colors = journal_palette('colorblind')

fig, ax = plt.subplots(figsize=(6, 4))
x = np.linspace(0, 10, 100)
for i in range(len(colors)):
    ax.plot(x, np.sin(x + i * 0.5), color=colors[i], label=f'Series {i+1}')

ax.set_title("Journal Figure Demonstration")
ax.legend(loc='upper right', frameon=False)
plt.show()
```

---

## 自动化测试与质量指标

```bash
# 运行 Node.js 严苛单测（42 项断言：包含 MCP 协议、检索解析、Gateway 与账本状态机）
npm test

# 运行 Python 单元测试（6 项断言：包含色板插值、样式规范与错误参数校验）
npm run test:python
```

---

## 目录结构

```text
Tianshu-Research/
├── commands/
│   ├── research.md              # /research 斜杠指令
│   └── research-status.md       # /research-status 斜杠指令
├── gates/
│   └── scientific-verifier.js   # 科学门禁审计器 (Evidence Ledger 闭环校验)
├── ledger/
│   └── evidence-ledger.js       # 结构化证据账本核心读写与约束
├── figure/
│   ├── journal_palette.json     # 100 套顶刊色板数据
│   └── journal_palette.py       # Python 绘图伴生库
├── skills/
│   └── research-flow/
│       ├── SKILL.md             # 智能体科研工作流技能定义
│       └── references/
│           ├── reading-card.md   # 精读卡规范
│           ├── polishing.md      # 学术润色不变量规范
│           └── team-templates.md # /team 与 /council 多 Agent 工单模版
├── test/
│   ├── arxiv-sample.xml         # 离线 Atom 样卷
│   ├── gateway.test.js          # 网关工具单测
│   ├── ledger.test.js           # 证据账本与门禁单测
│   ├── mcp-server.test.js       # MCP JSON-RPC 2.0 协议测试
│   ├── search.test.js           # arXiv / OpenAlex 解析器单测
│   └── test_journal_palette.py  # Python 色板单测
├── tools/
│   └── research-status.js       # 状态诊断工具实现
├── figure.js                    # Node 端色板插值与角色查询
├── gateway-evidence.js          # 证据账本 Gateway
├── gateway-query.js             # 学术检索 Gateway
├── index.js                     # 插件导出入口
├── mcp-server.js                # 标准 stdio MCP 服务实现
├── package.json                 # 模块元数据与脚本
├── search.js                    # 文献检索与清洗实现
├── tool-contracts.js            # 共享工具契约与 Schema 校验
├── THIRD_PARTY_NOTICES.md      # 第三方授权与声明
├── LICENSE                      # Apache-2.0
└── README.md
```

---

## 许可证与致谢

- 本项目遵循 [Apache-2.0](LICENSE) 许可证。
- 色板数据整理自 ColorBrewer 2.0 (Apache 2.0)、Okabe-Ito (CC0) 及公开科研绘图规范，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 学术数据接口来自 [arXiv API](https://arxiv.org/help/api) 与 [OpenAlex API](https://openalex.org/)。

---

## 项目级隔离与日常编程防干扰规范 (Zero-Pollution Guide)

### 1. 为什么不推荐全局常驻？

- **工具面预算保护**：天枢遵循认知虚拟机（CVM）最小工具原则（核心工具 <= 26）。常驻科研工具会额外占用约 850 tokens 的 System Prompt 工具定义。在进行纯前端、后端或常规业务编程时，多出的科研工具会分散模型的注意力。
- **前缀缓存（KV Cache）保护**：天枢针对 DeepSeek V4 实现了长会话 95%–99% 的前缀缓存命中率。如果在会话中途通过 `/mcp enable/disable` 开关工具，会彻底改变 System Prompt 字节结构，导致当前会话的 KV Cache 瞬间失效并触发重建。

### 2. 最佳实践：项目级局部挂载

天枢配置体系严格遵循「项目级配置优先于全局配置」的继承哲学。推荐**全局保持关闭**，仅在专门的科研工程根目录下配置 `.rivet-config.json`：

```json
{
  "mcpServers": {
    "tianshu-research": {
      "command": "node",
      "args": ["D:/1_Research/Develop_Research/plugins/tianshu-research/mcp-server.js"]
    }
  }
}
```

- **效果**：进入该科研目录时，天枢自动加载 4 大科研工具；切换至日常其他项目时，工具面自动收缩恢复为纯净的 26 个核心编程工具，实现 **0 额外 Token 消耗、0 缓存抖动、0 注意力干扰**。
