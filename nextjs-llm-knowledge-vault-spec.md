# Next.js + LLM 碎片知识库（个人）产品与交互规格 v0.2

> 目的：把用户散落在多个文件/格式里的碎片信息（网址、一行命令、备忘录、片段文本等）快速录入到一个应用中，并做到“一键搜索直达”。  
> 核心思想：**0 摩擦 Capture（先存原文）→ LLM 整理 →（无需归纳则自动归档 / 需要归纳则用户确认）→ 可追溯**。  
> 本文档用于驱动 AI/工程实现（Next.js 技术栈），优先给出明确的数据结构、页面交互与 API 约定。  
> v0.2 更新：补充 CLI（只查询）规格。

---

## 1. 背景与目标

### 1.1 用户痛点
- 碎片信息分散在多个 txt/md/doc 等文件里，查找成本高。
- 录入时不想填写大量字段，希望“粘贴即保存”。
- 希望系统能在后台自动整理、归类，并在必要时将新内容**归纳合并**到已有条目中。
- 合并必须**可控**：由用户确认；并能展示“归纳后效果”和“写入改动”。
- 搜索应当简单：一个输入框，直接得到可用结果（命令可复制、网址可打开）。
- 跨设备存储：希望能接入 GitHub（用 Git 仓库同步内容）。
- 希望支持 **CLI 查询**：在终端里快速查到需要的命令/片段，不进入 Web UI。

### 1.2 MVP 目标（必须做到）
1) **快速录入**：用户粘贴/拖拽后立刻保存为“未归纳（Inbox）”。  
2) **后台整理**：LLM 对 Inbox 生成结构化建议 + 归纳候选（但不自动写入归档）。  
3) **自动归档（无归纳场景）**：当 LLM 判断“不需要归纳到已有条目”时，系统可自动将其新建为一个 Library 条目（无需用户确认）。  
4) **归纳确认（需要归纳场景）**：当 LLM 判断“应归纳到已有条目”时，展示推荐归纳目标、归纳后的预览、以及对目标文件的 diff；用户确认后再写入。  
5) **搜索直达**：单输入框搜索，优先展示归档（Library）结果，同时能搜到 Inbox。  
6) **Git 仓库存储**：内容以可 diff 的文本形式存放在本地工作区，并可 push/pull 到 GitHub 私库实现跨设备同步。  
7) **CLI 查询**：提供极简命令 `kb <query...>` 直接查询（不做录入/归纳）。

### 1.3 非目标（暂不做）
- 复杂规则引擎（LLM 失效兜底的规则体系先放弃）。  
- 自动无确认地改写/合并已有条目（必须用户确认）。  
- 多人协作权限系统（默认个人单用户）。  
- 移动端原生 App（可后续做 PWA）。  
- CLI 侧的录入/归纳能力（CLI 只做查询）。

---

## 2. 核心概念与信息架构

### 2.1 两层数据（强烈建议）
为保证可追溯与可控合并，数据分两层：

1) **Inbox（Raw/未归纳）**：只追加、不改写。存储用户粘贴的原文、来源、时间戳、附件引用等。  
2) **Library（Curated/归档）**：可整理、可合并、可被持续完善。每条主题/命令集/知识卡片在这里。

> 合并写入只作用于 Library；Inbox 永远保留原文作为“证据层”。

### 2.2 内容组织（Git 友好）
推荐本地工作区结构（一个 Git 仓库）：

```
repo-root/
  inbox/                 # 未归纳条目（只追加）
    2026/04/raw-uuid.md
  library/               # 归档条目（主题卡片/命令集/指南）
    elasticsearch/test-commands.md
    firewall/commands.md
  assets/                # 附件（可选）
  .kv-meta/              # 应用元数据（索引、缓存、版本等；不入 git）
```

### 2.3 文件格式（统一 Markdown + YAML frontmatter）
所有条目采用 Markdown，顶部用 YAML frontmatter 存结构化字段，便于 diff、便于 AI/程序处理。

**Inbox 示例：** `inbox/2026/04/raw-uuid.md`
```md
---
id: raw-uuid
created_at: 2026-04-16T10:00:00+08:00
source: clipboard | file-import | web-clipper | manual
status: inbox
content_type: unknown | command | url | note | snippet
hash: "optional-normalized-hash"
---
curl -X PUT "http://localhost:9200/my-index" -H 'Content-Type: application/json' -d '...'
```

**Library 示例（命令集）：** `library/elasticsearch/test-commands.md`
```md
---
id: elasticsearch-test-commands
title: ES 本地测试命令集
tags: [elasticsearch, commands]
updated_at: 2026-04-16T10:05:00+08:00
---

## 索引

### 创建索引
```bash
curl -X PUT ...
```
来源：raw-uuid

### 删除索引/清数据
...
```

---

## 3. 交互流程（用户视角）

### 3.1 快速录入（Capture）
**入口：**
- 首页顶部输入框（粘贴即保存）
- “+”按钮打开 Capture 弹窗
- 支持拖拽文件到页面（MVP 可只提取纯文本；doc/pdf 后续增强）

**交互：**
1) 用户粘贴文本/URL/命令
2) 立即保存到 Inbox（显示 toast：已保存）
3) UI 将该条目标记为“正在整理…”（异步任务）
4) 整理完成后，该条出现“归纳建议”入口（按钮/提示条）

### 3.2 LLM 整理（后台异步）
保存后系统触发 LLM：
- 识别 content_type（命令/URL/备忘录…）
- 生成标题、摘要、标签、领域（如 Elasticsearch/Firewall）
- 生成归纳候选（可能归纳到哪些 Library 条目）
- 生成“写入补丁建议（patch suggestion）”（不直接写入已有条目）

#### 3.2.1 无归纳场景：自动归档（无需确认）
当 LLM 判断“没有足够把握归纳到某个已有条目”（例如：没有候选、或最高置信度低于阈值），系统可以：
1) 基于 `new_file_suggestion` 自动在 `library/` 新建一个条目文件；
2) 将该 raw 条目标记为 `processed`（或 `processed_method: archive_new_auto`）；
3) 在新建条目中写入“来源：raw_id”，保证可追溯；
4) 搜索结果中优先展示新建的 Library 条目（用户无需再手动归档）。

> 自动归档只允许“新建文件”，不得修改任何已有 Library 文件（确保安全与可回滚）。

### 3.3 归纳确认（需要归纳时，用户确认后写入）
当 LLM 给出“可归纳候选”，且最高置信度达到阈值时，弹出/进入确认页：

**页面展示：**
- 推荐归纳目标（例如：`ES 本地测试命令集`）+ 置信度 + 理由（2~3条）
- 归纳后的预览（合并后目标条目将呈现的内容）
- diff 视图（对目标文件的增量改动：新增了哪些段落）

**用户操作：**
- ✅ 归纳到推荐条目（写入 library）
- ➕ 新建为独立归档（在 library 新建一个条目）
- ⏸ 稍后处理（留在 inbox，不做归档）

**确认写入后：**
- 更新 library 文件（应用 patch）
- inbox 条目状态：`processed`，并记录 `merged_to`（目标 id/路径）
- 在 library 中插入“来源 raw_id”引用，保证可追溯

### 3.4 搜索直达（一个框）
**搜索 UX 原则：**
- 单输入框
- 默认展示“最可用信息”：命令块可复制、URL 可打开、片段可展开
- 不要求用户懂语法/筛选器（MVP 不提供复杂高级检索）

**排序建议：**
1) Library 命中优先  
2) Inbox 次之（但始终可见，防止“以为丢了”）  
3) 综合关键字匹配、近期、常用（后续可加向量检索）

---

## 4. 页面与组件清单（Next.js App Router）

### 4.1 页面（Routes）
- `/`：主界面（Capture + Search + 结果列表）
- `/inbox`：Inbox 列表（未归纳/可批量处理）
- `/item/[rawId]`：Inbox 条目详情（原文、LLM 建议、归纳入口）
- `/merge/[rawId]`：归纳确认页（目标选择、预览、diff、确认写入）
- `/library/[id]`：归档条目详情（渲染 Markdown、复制命令块、显示引用来源）
- `/settings`：仓库路径/GitHub 设置、LLM 设置（API Key/模型/本地模型）、索引设置

### 4.2 关键组件
- `CaptureBar`：顶部粘贴输入框（Enter 保存）
- `SearchBar`：搜索输入框（可与 CaptureBar 合并为同一栏位：自动识别“粘贴保存”还是“搜索”模式）
- `ResultList`：搜索结果列表（卡片化）
- `ItemCard`：结果卡（命令复制、URL 打开、标签显示）
- `MergeDialog/MergePage`：归纳确认 UI（预览 + diff）
- `DiffViewer`：展示 patch（建议用现成 diff 组件）

---

## 5. LLM 设计（MVP）

### 5.1 核心原则
- LLM 只输出**结构化建议**与**补丁建议**，不直接改写仓库文件。  
- “写入已有信息（修改既有 Library 文件）”必须用户确认。  
- “自动归档”仅允许新建 Library 文件（不改既有文件），可无需确认。  
- 写入采用确定性 patch 机制（系统执行），避免 LLM 重写整篇文档导致漂移。

### 5.2 LLM 输出 Schema（建议固定 JSON）
> 下方为建议 schema（工程可用 Zod/JSON Schema 校验）。

```json
{
  "raw_id": "raw-uuid",
  "content_type": "command | url | note | snippet | unknown",
  "title": "创建 ES 索引",
  "summary": "用于本地测试创建索引的命令…",
  "tags": ["elasticsearch", "索引", "测试"],
  "domain": "elasticsearch",
  "decision": "auto_archive | needs_confirmation",
  "decision_reason": "为何可以自动归档 / 为何建议归纳到已有条目（2~3句）",
  "extracted": {
    "commands": [
      {
        "language": "bash",
        "command": "curl -X PUT ...",
        "danger_level": "low | medium | high",
        "platform": ["mac", "linux", "windows"],
        "notes": "可选说明"
      }
    ],
    "urls": ["https://..."]
  },
  "merge_candidates": [
    {
      "target_id": "elasticsearch-test-commands",
      "target_path": "library/elasticsearch/test-commands.md",
      "confidence": 0.78,
      "reasons": [
        "同属 Elasticsearch 本地测试命令",
        "关键词匹配：索引/PUT/9200"
      ],
      "patch_suggestion": {
        "insert_strategy": "append_to_section",
        "section_heading": "索引",
        "content_block_markdown": "### 创建索引\\n```bash\\n...\\n```\\n来源：raw-uuid\\n"
      }
    }
  ],
  "new_file_suggestion": {
    "suggested_path": "library/elasticsearch/create-index.md",
    "content_markdown": "---\\n...\\n---\\n"
  }
}
```

### 5.3 “归纳预览”生成方式（推荐）
归纳确认页需要“合并后会变成什么样”。推荐做法：
- 读取目标文件内容
- 以 patch_suggestion 在内存中应用（不落盘）
- 渲染出“合并后预览”
- 同时生成 diff（目标内容 vs 合并后内容）

---

## 6. 写入与合并策略（保证可控与可追溯）

### 6.1 写入动作类型
写入动作分为“自动写入（无确认）”与“用户确认写入”两类：

**自动写入（无确认）：**
0) **ARCHIVE_NEW_AUTO**：当 LLM 判定无需归纳到既有条目时，自动新建一个 Library 文件（仅新建，不修改既有文件）。

**用户确认写入：**
1) **MERGE**：归纳写入已有 Library 文件（应用 patch）
2) **ARCHIVE_NEW**：将该条目生成一个新的 Library 文件
3) **DEFER**：暂不归档，仍留 Inbox

### 6.2 最小去重（可选但建议）
对命令类内容可做轻量去重：
- 将命令 normalize（去提示符、去多余空格、统一换行）
- 计算 hash
- 若目标条目已有相同 hash，提示用户：“疑似重复，是否改为补充说明/参数变体？”

### 6.3 追溯字段（建议）
当 raw 被处理后，在 inbox 文件 frontmatter 更新：
- `status: processed`
- `processed_at`
- `merged_to: {target_id, target_path}`（如果是 merge）

并在 library 写入块中保留：`来源：raw_id`

---

## 7. 搜索与索引（MVP 实现建议）

### 7.1 MVP 方案：本地全文索引
优先实现“够用、轻量、可离线”：
- 方案 A：SQLite FTS5（本地文件索引到 sqlite，不进 git）
- 方案 B：纯 JS 简易索引（小规模可行，但规模增长后体验会差）

建议：**SQLite FTS5**（可控、快、实现成本合理）。

### 7.2 索引对象
- Library 文档：title、正文、tags、路径
- Inbox 文档：原文（但权重略低）

### 7.3 结果展现
每条结果至少展示：
- 标题（LLM 生成或文件名）
- 命中片段高亮
- 标签/领域
- 快捷操作：复制命令 / 打开链接 / 打开条目详情

---

## 8. CLI（只查询）规格

### 8.1 目标
在终端中以极简方式查询知识库内容：**一个命令 + 关键词 = 结果**。CLI 不做录入、不做归纳，只读取索引并输出结果。

### 8.2 技术选型（推荐）
- 语言/运行时：**Node.js + TypeScript**
- 参数解析：`commander`（或 `yargs`）
- 索引读取：SQLite（推荐 `better-sqlite3`）
- 输出：纯文本（默认）+ `--json`（可选）

### 8.3 命令行接口（最简）
#### 基本用法（默认就是搜索，不需要 `search` 子命令）
```bash
kb <query...>
```

示例：
```bash
kb es 创建索引
kb 防火墙 开端口
kb "curl -X PUT"
```

#### 常用参数
- `-n, --limit <number>`：返回条数（默认 10）
- `--json`：以 JSON 输出（便于脚本管道处理）
- `--open [index]`：用系统默认方式打开结果文件（默认打开第 1 条；也可指定第 N 条）
- `--type <library|inbox|all>`：限制搜索范围（默认 all，但排序 library 优先）

#### 无 query 行为（推荐）
当用户仅执行 `kb` 不带 query：
- 输出 usage 帮助：`kb <query...>`  
- 退出码为 `2`（表示用法错误）

### 8.4 仓库路径发现（Repo Discovery）
CLI 需要找到知识库仓库根目录（repo-root）。推荐优先级：
1) 环境变量：`KV_REPO=/abs/path/to/repo-root`
2) 配置文件：`~/.config/kb/config.json`（或 `~/.kbrc`）
3) 从当前目录向上查找：同时存在 `inbox/` 与 `library/` 目录则视为 repo-root

### 8.5 索引依赖与位置
CLI 建议直接读取本地索引库（离线、速度快）：
- 索引文件路径：`repo-root/.kv-meta/index.sqlite`
- 注意：`.kv-meta/` 目录不入 git（写入 `.gitignore`）

> 若索引不存在或过旧：CLI 给出提示（例如“请在 Web 应用中重建索引 / 或运行 kb reindex（可选未来扩展）”）。

### 8.6 输出格式（默认文本）
建议输出每条结果至少包含：
- 序号（1..N）
- 标题（或文件名）
- 类型（library/inbox）
- 命中片段（高亮可选）
- 文件相对路径

---

## 9. GitHub / Git 同步（跨设备存储）

### 9.1 原则
- **进入 Git 的只能是可 diff 的内容文件（md/yaml + assets）**  
- 索引数据库、缓存、临时文件不进 Git（写入 `.gitignore`）

### 9.2 同步方式（两条路线）
- 路线 A（推荐）：用户在设置页绑定一个本地仓库路径，应用提供按钮：`Pull / Commit / Push`  
- 路线 B：应用只读写本地目录，由用户自行用 Git 工具同步（最省工程）

MVP 建议做路线 B 或 A 的最简版（只做 Pull/Push 按钮 + 失败提示）。

### 9.3 冲突建议
- Inbox 只追加，冲突概率很低。
- Library 冲突：
  - 建议合并写入尽量“追加块”，减少编辑同一行的概率
  - 若发生冲突：提示用户用 Git 客户端解决；或提供“只读模式”避免写入

---

## 10. API 与服务（Next.js 实现建议）

### 10.1 MVP 运行形态
两种实现任选其一：
1) **纯本地桌面/自托管**：Next.js + Node runtime，拥有文件系统读写权限（推荐用于个人本地）。  
2) **Web 部署**：需要服务器侧读写一个挂载卷（仍可实现，但注意权限与隔离）。

> 因你要写本地文件并用 Git，同步体验更像“本地应用/自托管”。若是纯 Web（Vercel）会受限于文件系统。

### 10.2 API（建议）
- `POST /api/capture`：写入 inbox raw 文件，返回 raw_id
- `POST /api/llm/organize`：触发整理（可异步队列），返回 task_id  
  - 该任务在“无归纳场景”允许自动新建 Library 文件（ARCHIVE_NEW_AUTO）
- `GET /api/item/:rawId`：读取 raw + LLM 建议（若存在）
- `GET /api/merge/:rawId/preview?targetId=...`：返回合并预览 + diff
- `POST /api/merge/confirm`：用户确认 merge/new/defer，执行写入
- `GET /api/search?q=...`：返回搜索结果（library+inbox）
- `POST /api/git/pull|push|status`（可选）：封装 git 操作

---

## 11. 状态机（Inbox 条目生命周期）

### 11.1 状态
- `inbox`：刚录入未归纳
- `organizing`：LLM 整理中
- `suggested`：已生成归纳建议（需要用户确认归纳/新建/稍后）
- `processed`：已归档（自动新建 / 用户确认新建 / 用户确认合并）
- `deferred`：用户选择稍后处理
- `failed`：整理失败（可重试）

---

## 12. 安全与隐私（最低要求）
- LLM API Key 存储：本地加密（或至少不进入 git）。  
- 默认不把内容上传到第三方，除非用户启用在线 LLM。  
- 若启用在线 LLM：在设置中明确提示“内容会发送到模型服务”。  

---

## 13. MVP 验收清单（用于开发完成自测）
1) 粘贴保存：100ms 级反馈，inbox 文件落盘。  
2) LLM 整理：能生成 title/tags/merge_candidates（任意一个即可）。  
3) 自动归档：LLM 判定无归纳时，系统可自动新建 library 文件，raw 标记为 processed。  
4) 归纳确认：能展示合并预览与 diff；用户确认后既有 library 文件发生预期改动。  
5) 搜索：能搜到 library 与 inbox，library 排名优先。  
6) Git：内容以 md 文件形式存在，可被 git diff 清晰展示；索引库不入 git。  
7) CLI：`kb <query...>` 能基于索引返回结果；`kb` 无 query 输出 usage 并返回非 0。  

---

## 14. 未来扩展（不影响 MVP，但设计需留口）
- 规则引擎：将 LLM 产出的结构化结果转为可测试规则（YAML/DSL），并引入 CI fixture。  
- 向量检索：在现有全文索引基础上增加 embeddings，提高语义搜索与“相关候选”召回。  
- Web clipper / CLI 扩展：录入、归纳确认、reindex 等能力。  
- 内容解析：doc/pdf/截图 OCR。  
