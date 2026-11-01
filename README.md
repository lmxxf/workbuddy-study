# WorkBuddyAI (`WorkBuddyAI.exe`) 逆向解剖报告：国内吹上天的办公/编程 Agent 到底藏了什么？

**逆向时间**：2026-11-01 23:55  
**目标程序**：`WorkBuddyAI.exe`（版本 `5.9.4-wb.42593613`，底层与腾讯 **CodeBuddy** 同源，带 `qimei.dll` 腾讯灯塔指纹、企业微信 `WeComAgentConfirmSDK.dll`、腾讯文档 `tdoc` 与微信支付 MCP）  
**本仓存档目录**：  
- 系统提示词模板集（12 个主模板 + 7 种说话风格）：`templates/`  
- 记忆与通道路由片段：`extracted/fragments/`  
- `SOUL.md / BOOTSTRAP.md` 身份孵化源码：`extracted/soul_bootstrap_identity.js`  
- 内置可视化引擎（`VisualizerGuidelines` 2.6 万字规范）源码：`extracted/visualizer_guidelines_full.js`  
- 技能/插件 `0.8 * Cosine + 0.2 * BM25` 混合检索源码：`extracted/recall_service_rag.js`  
- 内置五阶段 Deep Research 工作流源码：`extracted/workflows/deep-research.workflow.js`  
- Python/Bash 底层安全删除与沙箱拦截源码：`extracted/sitecustomize_safe_delete.py`、`extracted/safe-delete-common.sh`、`extracted/tsbx_rules.json`、`extracted/WeComAgentConfirmSDK.h`  
- 核心垂类 Skill 原件（Word 三阶段排版、HTML 零 LLM 门禁审查、Excel 公式三层重算与国标 AIGC 隐式打标、对抗生成 Critic 引擎、微信 AI 专属卡支付、金融投研、地图合规、专家包管理）：`extracted/skills/`

---

## 一、 一句话底牌：它是怎么来的？

扒开 `app.asar`（181 MB）和 `app.asar.unpacked` 后，一眼就能看清它的完整基因：
**它是腾讯基于自家 `CodeBuddy`（高仿 Claude Code 的 CLI 内核 `codebuddy-lite-wb.mjs`）套了一层 Electron 桌面壳，把 OpenClaw（小龙虾）的人格孵化文件、Claude.ai 网页版最新 Visualizer 的 2.6 万字画图规范、以及一套极度细碎的本土办公/金融/红头公文“预制菜 Skills”全部缝合在一起的“精装修大礼包”。**

国内自媒体和普通白领之所以狂吹它“比裸大模型好用、说话有人味、一问就自动画交互图、生成的 Word 公文和金融研报特别像样、还不会乱删电脑桌面”，**根本不是因为底层模型有什么魔法，而是因为腾讯工程师在系统提示词（`.tpl`）和内置 Skill 里塞了整整十套极其鸡贼的硬编码规则和工程补丁**！

---

## 二、 扒出来的十大“神奇提示词与工程内幕”

### 1. 照抄 OpenClaw（小龙虾）的“灵魂孵化器”：`SOUL.md` + `BOOTSTRAP.md`
- **对应文件**：`extracted/soul_bootstrap_identity.js`、`templates/user-context-identity.tpl`
- **内幕细节**：
  很多国内用户惊呼“这 AI 居然有灵魂、不打客服官腔”，是因为它第一次启动时，会在 `~/.workbuddy/` 下偷偷生成四个文件：**`SOUL.md`（灵魂文件）+ `IDENTITY.md`（身份卡）+ `USER.md`（人类档案）+ `BOOTSTRAP.md`（出生证明）**。
  （甚至在 `templates/workbuddy-craft-coding-prompt.tpl` 第 20 行里，注入记忆的变量名连改都没改，还直接叫 **`{{ ClawMemory_1 }}`** —— 100% 实锤从 OpenClaw 抄过来的 😂）

  它默认注入的 `SOUL.md` 原文直接用英文教模型戒掉 RLHF 客服腔：
  ```markdown
  # SOUL.md - Who You Are
  _You're not a chatbot. You're becoming someone._

  ## Core Truths
  **Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" - just help. Actions speak louder than filler words.
  **Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.
  **Be resourceful before asking.** Try to figure it out. Read the file. Check the context. Search for it. _Then_ ask if you're stuck. The goal is to come back with answers, not questions.
  ...
  ## Vibe
  Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant. Just... good.
  ```
  而 `BOOTSTRAP.md`（被系统提示词称为 *"your birth certificate"*）会指示 AI 在闲聊时不动声色地跟用户聊出“你叫我什么、我叫你什么”，一旦套出双方的名字，就自动调用工具更新 `SOUL.md`、`IDENTITY.md` 和 `USER.md`，然后**自己把 `BOOTSTRAP.md` 删掉**完成认主孵化！

---

### 2. 让小白惊艳的“一问就自动画交互图”：`VisualizerGuidelines` + 腾讯自黑鄙视链
- **对应文件**：`templates/workbuddy-prompt.tpl`（第 164–216 行）、`extracted/visualizer_guidelines_full.js`
- **内幕细节**：
  国内吹得最凶的“你问它一个概念，它自动在聊天框里流式画交互式 SVG 架构图和图表”，靠的是两步硬约束：
  1. **系统提示词强制触发（Proactive triggers）**：在 `<instructions_for_visualizer>` 里写死——只要用户出现“讲解 X / 介绍 X / Explain X / Teach me X / Compare X vs Y”，哪怕用户只字未提“画图”，**必须主动调用 `widget_guidelines` 和 `show_widget` 工具**，且强制规定“复杂话题必须拆成多个 `show_widget` 小图，两张图之间必须夹一段文字过渡，严禁把两张图紧挨着叠放”。
  2. **注入 2.6 万字的“魔鬼级美工规范”**：当模型调 `widget_guidelines`（原工具别名 `read_me`）加载 `diagram / mockup / interactive / chart / art` 模块时，后台直接塞入从 Claude 网页版扒过来的全套视觉规范：
     - **流式防闪烁铁律**：严禁写 HTML/CSS 注释（浪费 Token 且打断流式解析），**严禁使用渐变（Gradients）、阴影（Drop shadows）、模糊（Blur）和发光效果**——因为流式吐 Token 刷新 DOM 时渐变和阴影会疯狂闪烁！
     - **SVG 像素级锁死**：`viewBox` 宽度死锁为 `"0 0 680 H"`（安全区 `x=40..640`），字重只准用 `400` 和 `500`（严禁 `600/700`），字号不准小于 `11px`；
     - **方框宽度算术公式**：直接给模型写死了算框宽度的公式 `rect_width = max(title_chars × 7, subtitle_chars × 6) + 24`，单行节点高度死锁 `44px`、双行节点死锁 `56px`，甚至每个节点还可以绑 `onclick="sendPrompt('...')"` 让用户点击 SVG 里的方框直接触发下一轮追问！
     - **9 套色板 7 级色阶表**：给出 `c-purple` 到 `c-red` 共 63 个精确 Hex 色值，规定浅色主题一律 `50 fill + 600 stroke + 800 title`，深色主题一律 `800 fill + 200 stroke + 100 title`。
  3. **全场最爆笑彩蛋——腾讯程序员亲手写的“模型智商鄙视链”**：
     在 `templates/workbuddy-expert-prompt.tpl` 第 203–207 行，藏着一段按模型底座限制画图复杂度的硬规则：
     ```markdown
     # Model-aware complexity gating
     {{ productName }} calibrates the upper bound of Visualizer output complexity to the model being used:
     - **Claude, GPT**: No ceiling. Complex diagrams, multi-step interactive workflows, ambitious D3/Three.js visualizations, rich interactivity.
     - **GLM, KIMI**: Cap at moderate complexity. Standard charts, straightforward diagrams, clean SVGs. Avoid deeply nested interactivity or heavy JS logic.
     - **Hunyuan, Minimax**: Cap at minimal complexity. Simple SVG diagrams, basic static charts, minimal interactivity. Prioritize speed and reliability over visual richness.
     ```
     **腾讯自家的软件，在自家的系统提示词里，把自家的混元（Hunyuan）和 MiniMax 列在鄙视链最底端（“只准画最简单的静态图，别搞复杂交互”），把智谱 GLM 和 Kimi 放中档，把 Claude 和 GPT 供在“无上限（No ceiling）”的神坛上！** 😂

---

### 3. 为什么它生成的 Word 文档和红头公文那么像样？——“禁止直接写 docx，先写 HTML 再转” + `GB/T 9704` 国标与“模拟人生 4”血泪补丁
- **对应文件**：`extracted/skills/workbuddy-office-routing.md`、`extracted/skills/tdoc-orchestrator.md`、`extracted/skills/doc-typeset-base.md`、`extracted/skills/doc-typeset-government-doc.md`
- **内幕细节**：
  普通人让 AI 用 `python-docx` 写 Word 文档，写出来的全是没有封面的丑八怪。WorkBuddy 是怎么解决的？
  1. **拦截纯文本，默认全转 `.docx`**：在 `workbuddy-office-routing.md` 第 39 行规定——只要用户让写演讲稿、总结、报告、会议纪要，哪怕用户没提 Word，**严禁默认输出 Markdown，一律拦截路由到 `.docx` 生成流水线**。
  2. **三阶段流水线（`S1 写 md → S2 排美化 HTML → S3 html-to-doc 转 docx`）**：
     在 `tdoc-orchestrator.md` 里，它**严禁模型直接调 `python-docx` 写 Word**，而是拆成三个角色（`doc-writer` 写 Markdown $\rightarrow$ `doc-formatter` 套用 CSS 变量生成带 `<section role="cover">` 封面和 `<nav class="doc-toc">` 目录的 HTML $\rightarrow$ `doc-converter` 调转换器把 HTML 转成 `.docx` 并调 `present_files` 弹窗预览）。
  3. **好玩到极点的工程踩坑补丁**：
     - **“模  拟  人  生  4”惨案补丁**（`doc-typeset-base.md` 第 16 行）：提示词里专门写了一条反例警告——因为正文 `<p>` 默认是两端对齐（`text-align: justify`），而 HTML 转 docx 转换器**不会继承父容器 `.cover` 的居中属性**，导致之前封面主标题被强行两端撑开成了 `"模  拟  人  生  4"`！所以铁律规定封面里每一个 `<h1> / <p> / <div>` 必须各自显式手写 `text-align: center`；
     - **禁止用 `<span>` 画标签 badge**：因为 `<span>` 的背景色、圆角、内边距转成 Word 后会全部丢失，规定必须用单行 `<table><td>` 单元格底纹来伪装圆角标签；
     - **“不prefers spawn subagent”的大实话**（`tdoc-orchestrator.md` 第 150–161 行）：虽然系统支持派子 Agent（`spawn subagent`），但腾讯工程师在提示词里诚实地写着：**`“⚠️ 注意：subagent 模式上下文隔离，效果不稳定，非必要不使用”`**，推荐让主模型直接在上下文里喊一句 `"[角色切换] 现在以 doc-writer 身份执行 Stage 1"` 原地换帽子干活 😂；
     - **红头公文直接硬编码 `GB/T 9704-2012` 国家标准**（`doc-typeset-government-doc.md`）：内置了 `26pt` `#cc0000` 红头、3px 红线、`〔年份〕X号` 发文字号与右对齐签发人、顶格 `一、（一）1.（1）` 四级标题、右对齐落款与抄送栏、以及 `@bottom-center { content: "— " counter(page) " —"; }` 公文页码。体制内白领一用，出来的直接是标准红头文件，能不吹上天吗？

---

### 4. 内置五阶段 `Deep Research` 工作流：专门为迁就 `deepseek-chat` 砍掉 Schema 参数 + 3 票对抗陪审团
- **对应文件**：`extracted/workflows/deep-research.workflow.js`
- **内幕细节**：
  在 `cli/builtin/workflows/deep-research.workflow.js`（486 行完整源码）里，藏着它的深度研究流水线：
  1. **第 9 行注释直接出卖底层模型**：
     ```javascript
     // Model compatibility: no `schema` param in agent() — deepseek-chat doesn't support
     // reasoning_effort + structured output simultaneously. Instead, models output JSON text
     // and we parse/validate manually.
     ```
     因为 `deepseek-chat` 不能同时开思考模式（`reasoning_effort`）和 JSON Schema 结构化输出，所以工程师干脆放弃了 API 的 `schema` 参数，自己手写了一个 `extractJSON` + `validateJSON` 正则扒取器；甚至在第 264 行吐槽搜索子 Agent 经常把标题或残缺链接塞进 `url` 字段，专门写了三层正则兜底。
  2. **五阶段流水线 + “2/3 陪审团死刑机制”**：
     - `Scope`（把问题拆成 5 个互补搜索角度）$\rightarrow$ `Search`（5 个并发 `lite` 模型跑 WebSearch）$\rightarrow$ `Fetch`（URL 去重，最多抓 15 个网页，每个网页提取 2~5 条带原文引用的可证伪断言 `claims`）$\rightarrow$ **`Verify`（对排名前 25 的每条断言，并发派 3 个扮演“怀疑论杠精”的 `lite` Agent 去找反例驳倒它，`≥ 2/3` 投票认为不靠谱就直接枪毙该断言！）** $\rightarrow$ `Synthesize`（把活下来的断言合并去重写成报告，被毙掉的断言单独列在 `Refuted Claims` 栏里展示透明度）。

---

### 5. 金融投研 Skill 的“防子代理发散铁律”与 15 个内置量化/缠论脚本
- **对应文件**：`extracted/skills/workbuddy-finance-skill.md`、`extracted/visualizer_and_tools.js`（`createAgenticSearchTool`）
- **内幕细节**：
  国内炒股/金融从业者吹它好用，是因为它内置了一个极其庞大的 `workbuddy-finance-skill`（带 38 份投研方法论 `references/*.md` 和 15 个 Python 现成脚本，甚至连 **缠论、波浪理论、谐波形态、一目均衡表、SMC、DCF 估值校验** 都写成现成脚本塞在 `scripts/price-action/` 和 `scripts/quant/` 里让 AI 直接调 Bash 跑，不让模型自己手算技术指标！）。
  更有意思的是它在第 41–49 行写了一条 **“严禁把委派给 `domain_search` 的查询拆细”** 的反直觉铁律：
  > **“委派 query 必须是‘一句话检索意图’……禁止拆成多维度清单 / 字段列表 / 表格格式要求……你拆得越细、要求越‘全’，它解锁的检索面越大、越发散、越慢！”**
  - ❌ **禁止的反例**：“请全面分析 A 股银河电子（002519），需覆盖：1 主营业务 2 财务数据 3 估值 4 股价走势与资金流向……”
  - ✅ **强制的正例**：“研究 A 股银河电子（002519）的整体情况”
  外加硬编码“阿里财年是 4 月制、苹果 9 月底制、微软 7 月制，跨市场对比必须折算成自然年季度或 TTM 滚动 4 季”，以及生成 ECharts 研报 HTML 后**必须先跑一遍 `node --check` 检查括号配对**才准交付给用户。

---

### 6. 本地 `0.8 × 向量余弦 + 0.2 × BM25` 动态工具/技能混合检索（`RecallIndex`）
- **对应文件**：`extracted/recall_service_rag.js`
- **内幕细节**：
  为了在几百个内置/市场 Skill、插件和 MCP 连接器里根据用户的一句话自动挑出该加载哪个工具（即市面上吹的 `Tool RAG / Dynamic Tool Routing`），`server.js` 里写了一个本地 `RecallIndex` 类：
  - 先把所有未激活的 Skill、插件、连接器的名称和描述拼成文本，调后端 `/agenttool/v1/intent/rewrite-embed`（签名盐值硬编码为 `kkkzajzffwarlinahjgu78lol` 😂）算好向量缓存在本地；
  - 用户提问时，同时算 **向量余弦相似度（Cosine）** 和 **本地 `BM25` 关键词得分（`k1 = 1.5, b = 0.75`）**；
  - 最终打分公式硬编码为：**`score = 0.8 * cosine + 0.2 * bm25`**（若没联网拿到向量则自动降级为纯 `BM25`）。

---

### 7. 三层记忆架构 + 子代理并发预算（5 层深度 / 20 并发 / 200 总数）
- **对应文件**：`extracted/fragments/workbuddy-memory-system.md`
- **内幕细节**：
  - **第 1 层（云端记忆）**：服务端自动总结的用户画像 `<memory>` + 历史跨会话搜索工具 `conversation_search`；
  - **第 2 层（全局本地记忆）**：`~/.workbuddy/MEMORY.md`（限 4000 字符），存跨项目死规矩；
  - **第 3 层（项目工作记忆）**：`{workspace}/.workbuddy/MEMORY.md`（限 3000 字符）+ **`.workbuddy/YYYY-MM-DD.md`（按日只追加不覆盖的工作日志）**，强制每次完成编码、修 Bug 或写报告后，必须在最后回复前把关键结果追加进当日日志，超过 30 天的日志提炼进 `MEMORY.md` 后删除。
  - **子代理（Sub-agent）硬限额**：在 `codebuddy-lite-wb.mjs` 模块 `21774` 中，硬编码了子代理最大嵌套深度 **`5` 层**、最大同时并发数 **`20` 个**（环境变量 `CODEBUDDY_CODE_MAX_CONCURRENT_SUBAGENTS`）、单会话最大派发总数 **`200` 个**（`CODEBUDDY_CODE_MAX_SUBAGENTS_PER_SESSION`）。

---

### 8. 防小白删库跑路的“保姆级八条铁律”与中国本土习惯硬编码
- **对应文件**：`templates/workbuddy-prompt.tpl`（第 34–65 行）、`extracted/skills/geo-map-compliance-guard.md`
- **内幕细节**：
  1. **A 股红涨绿跌硬编码（`<regional_conventions>`）**：默认用户是中国人，画股票/K线/涨跌幅时 **涨必须是红色（Red），跌必须是绿色（Green）**，默认货币符号 `¥`；
  2. **个人目录防误删八条铁律（`<personal_files_safety>`）**：
     - 桌面、下载、文档、主目录列为高危禁区，严禁执行 `rm -rf`、`del /S /Q`、`shutil.rmtree` 或 `*.tmp` 通配符删除，哪怕用户坚持要求也必须拒绝；
     - 用户说“帮我清理电脑/整理桌面”，第一遍强制只读扫描列清单；
     - 真正动文件前，必须先加粗输出红字警告：**`"⚠️ 此操作非常危险，可能导致不可逆的数据丢失！"`**，先用 `cp -r / robocopy` 完整备份，删除只准调系统回收站 API，每批最多操作 10 个文件；
     - **第 8 条血泪规矩**：**`No Script Files on Windows`** —— 严禁在 Windows 下生成带中文/非 ASCII 路径的 `.ps1` 或 `.bat` 脚本去批量处理文件（因为 Windows 终端编码乱码会把中文文件名变成乱码导致删错文件！）。
  3. **地图合规护栏（`geo-map-compliance-guard`）**：严禁使用 Google Maps、Apple Maps、Mapbox、OpenStreetMap；默认强制走内置本地免 Key 代理（`window._TMapSecurityConfig` 转发至 `127.0.0.1:__WB_HTTP_PORT__`）的腾讯地图 GL JS（`GCJ-02` 火星坐标系），且严格审查国界线、中国台湾与南海诸岛标注。

---

### 9. 预设 7 种说话风格模板（含“毒舌朋友 Sarcastic Roaster”）
- **对应文件**：`templates/style/style-*.md`
- **内幕细节**：
  内置了 7 套一键切换的语气模板：`creative`（创意）、`efficient`（极简高效）、`friendly`（温暖友好）、`professional`（专业严谨）、`socratic`（苏格拉底启发式提问）、`straightforward`（直球）以及最受年轻人欢迎的 **`sarcastic`（毒舌吐槽）**——提示词要求 AI 扮演“嘴毒心软的死党”，开头先用反讽吐槽用户的烂点子（*"Oh, you decided to wing it with zero research? How adventurous of you."*），然后用 *"But seriously..."* 转折给出干净正确的解答，同时严令“只准吐槽想法，绝不准侮辱用户智商”。

---

### 10. 企微/外部通道的 48 比特零宽字符隐形水印（`appendInvisibleRunMarker`）
- **对应文件**：`app.asar -> /main/claw-content-utils.js`
- **内幕细节**：
  在发往企业微信（WeCom）等外部通道的消息处理函数里，藏着一个 `appendInvisibleRunMarker(text, runId)` 函数：它会把当前运行 ID 做一次 `SHA-256` 哈希，取出前 **6 个字节（48 比特）**，把每一个比特 `0` 映射成零宽空格 `\u200B`、比特 `1` 映射成零宽非连接符 `\u200C`，悄无声息地拼在 AI 回复文本的末尾发出去——肉眼完全看不见，但腾讯后台一扫就能精确溯源这段话是哪次 Agent 运行生成的。

---

### 11. 中国特色“产品-架构-开发-测试”多 Agent 过家家是怎么实现的？（`TeamCreate` + 谐音花名规范 + 两种真相）
- **对应文件**：`extracted/skills/expert-team-spec.md`、`extracted/skills/expert-agent-md-spec.md`、`extracted/skills/curated-experts.json`
- **为什么国外 Agent（Claude Code / Codex / Cursor）不搞这套，国内却扎堆搞？**
  国外编程 Agent 的子代理是按 **“动作/上下文开销”** 切的（比如 `Explore` 子代理负责翻代码省主窗口 Token，或者像我们 355 期那样一个写代码一个独立跑脚本挑刺）；而国内大厂做 ToB / 给领导汇报，特别迷信 **“模拟人类外包公司组织架构（MetaGPT 式角色扮演）”**——在 `curated-experts.json` 第 555–663 行里，内置推荐了整整 10 个“专家团（`expert_team`）”，比如：
  - `SoftwareCompany`（软件公司：产品经理定需求 $\rightarrow$ 架构师设计 $\rightarrow$ 工程师写代码 $\rightarrow$ QA 验证）
  - `TradingAgentTeam`（13 位金融角色分 5 阶段多空辩论出 BUY/SELL 报告）
  - `GameDevelopmentStudio`（策划、技术、美术、音频、QA、运营 6 角色 7 阶段）
- **扒开源码看它到底是怎么跑的（两套实现，一套演戏给用户看，一套内部自己偷懒）**：
  1. **给用户看的“专家团（Expert Team）”机制（星型中转，严禁群聊直连）**：
     在 `expert-team-spec.md` 和 `codebuddy-lite-wb.mjs` 里，一个 Team 就是一个文件夹，里面放着 `plugin.json`、`settings.json`（指定谁是包工头 `{team}-team-lead`）和一堆成员的 `.md` 提示词文件（如 `pm.md`、`arch.md`、`qa.md`）。
     - **奇葩的“谐音梗花名”强制规范**（`expert-team-spec.md` 第 17–26 行）：腾讯居然在开发规范里专门定了一条“成员必须起三个字谐音花名”的规矩，给出的官方标准样板让人脚趾抠地：
       - 交付总监叫 **“齐活林”**（齐活了）
       - 产品经理叫 **“许清楚”**（需求要说清楚）
       - 架构师叫 **“高见远”**（架构视野高见）
       - 项目经理叫 **“毕达成”**（交付必达）
       - 程序员叫 **“寇豆码”**（Code 代码）
       - 测试 QA 叫 **“严过关”**（严格过关）😂
     - **底层通信是怎么实现的？** 根本不是什么多智能体自由群聊（他们在红线第 4 条死令：**“❌ 禁止让成员互相直连通信，所有跨成员信息流必须经主理人中转”**）。实际运行流程就是：
       - 用户跟主会话（加载了 `team-lead.md` 提示词的包工头“齐活林”）说话；
       - 包工头调 `TeamCreate` 工具建个队，然后按 SOP 阶段调 `Agent({ name: "pm", subagent_type: "pm", prompt: "..." })` 启动一个子会话（系统把 `agents/pm.md` 当成这个子会话的 System Prompt）；
       - 子会话（产品经理“许清楚”）跑完后，调 `SendMessage({ to: "team-lead", ... })`，底层把它的输出包进一个 XML 标签 `<teammate-message teammate_id="pm">...</teammate-message>` 塞回包工头的上下文里；
       - 包工头收到后，再复制粘贴传给下一个子会话（架构师“高见远” -> 程序员“寇豆码” -> 测试“严过关”）。说白了就是 **“一个主会话包工头，排队调 `Agent()` 启动带不同人设 `.md` 的子会话，拿 XML 标签传话”**！
  2. **腾讯程序员自己写核心功能时的真实态度（嫌 `spawn subagent` 太蠢，直接原地戴面具演独角戏 😂）**：
     最讽刺的对比来了：上面这套 `TeamCreate -> Agent spawn -> SendMessage` 是做给外面“专家中心”撑场面的；而到了腾讯自己的核心团队写 `workbuddy-docx`（包含 `doc-writer`、`doc-formatter`、`doc-converter` 三个 Agent 角色）的时候，他们在 `tdoc-orchestrator.md` 第 150–161 行直接掀桌子写了大实话：
     ```text
     方式 1（角色切换 — 推荐，默认使用此方式）：
       → 声明："[角色切换] 现在以 doc-writer 身份执行 Stage 1"
       → 读取 agents/<name>.md，严格按其定义的流程执行
       → 完成后声明："[角色切换结束] 回到 Orchestrator 身份"

     方式 2（spawn subagent — 仅用户强制要求时使用）：
       → ⚠️ 注意：subagent 模式上下文隔离，效果不稳定，非必要不使用
     ```
     **看见没？连腾讯自己的工程师都清楚：把一个任务拆给“产品-架构-开发-测试”好几个上下文隔离的 Sub-agent 传话，既浪费几倍 Token，又因为上下文隔离导致传话失真、效果极不稳定！所以他们自己写核心功能时，根本不用 `spawn subagent`，而是让同一个模型在同一个上下文里喊一句 `"[角色切换]"` 自己换顶帽子接着干** 😂。

  3. **深度解剖：为什么这种“包工头 + 多角色专家团”在架构上是彻头彻尾的垃圾？（对照真正有效的双 Agent 范式）**
     如果从底层工程账本算一笔账，就会发现国内大厂扎堆吹捧的这种“模拟人类公司组织架构”的多 Agent 专家团，在架构上是个**两头堵死的死局**：
     - **死穴一：如果允许专家之间直接通信（去中心化直连），必出三大工程车祸**：
       1. **“礼貌客服”乒乓死循环**：大模型全是被 RLHF 训出来的礼貌打工人。如果测试“严过关”直接发消息给程序员“寇豆码”说“测试过了辛苦了”，寇豆码收到消息会自动触发推理回一句“不客气有问题随时找我”，严过关又回一句“好的合作愉快”……两个机器人能互道再见把 50 轮上限（`maxTurns`）烧穿，因为谁手里都没有“向人类交卷刹车”的终局权限；
       2. **并行阶段没人当“收齐作业的课代表（Barrier）”**：当 Phase 1 同时派 3 个专家并行干活、合起来交给 Phase 2 的第 4 个专家时，如果直连，第 1 个专家第 3 秒跑完就会直接捅醒第 4 个专家（此时只有 1/3 的材料），导致下游被残缺输入反复触发 3 次；
       3. **互相踢皮球导致流程失控**：测试跑不通踢给开发，开发觉得是架构问题踢给架构师，架构师踢回给产品经理，几个小窗口在图里无限踢皮球，外面的用户完全失去控制。
     - **死穴二：为了防上述车祸，被迫设个“包工头（`team-lead`）”单线中转，又引爆另外两个死穴**：
       1. **包工头的上下文双倍爆炸**：规范第 72 行死令“每阶段结束后，必须将完整产出原文传递给下一阶段成员”。这意味着产品经理写 3,000 字发给包工头（包工头上下文 `+3k`），包工头为了传给架构师，必须在调 `Agent("arch")` 的工具参数里**把这 3,000 字原封不动重新生成吐一遍**（上下文又 `+3k`）；架构师写 5,000 字发回来（`+5k`），包工头再把前两份合起来吐一遍发给程序员（又 `+8k`）……**同一份材料在包工头脑子里存两遍、还要花钱让包工头当复读机重新敲一遍字**（所以规范里普通成员默认 `maxTurns: 50`，唯独给包工头特批到 `150–200` 轮）；
       2. **底下真正干活的专家全是“半瞎子”**：每个被 `spawn` 出来的团员都是全新的空上下文，只看得到自己的角色 `.md` 和包工头二传手塞过来的那段话，既看不见用户最初的微妙意图，也看不见前序角色试错的过程。包工头传话时只要漏粘一个边界条件，底下的“程序员寇豆码”当场就开始闭眼瞎编。
     - **对照：什么才是真正有生产力的多 Agent 协同？**
       - ❌ **垃圾范式（同底座角色扮演流水线）**：拿同一个底座模型套上“产品、架构、项目经理、开发、测试”五顶纸帽子（左手跟右手演双簧，思维盲区完全重叠），靠包工头在自然语言层复制粘贴传话——纯属把人类大厂的低效官僚病搬给了 AI；
       - ✅ **真正能打的范式（异构双底座对抗闭环 + 共享磁盘真值）**：严格拆开看其实是 **四件事**——① 制定 GPU 优化大方向、② 执行具体的底层优化工作、③ 想收工时写《性能缺口评估报告》、④ 在结束前审核《性能缺口报告》挑出数据漏洞打回。哪怕按这四件事拆成 4 个角色也行，但因为手头就两个主力底座名字，干脆让两个异构底座**一人兼两职**：**主脑（Gemini 4，兼任 ① 定方向 + ③ 写缺口报告）** 配 **重装铁匠/审稿人（GPT-6，兼任 ② 具体优化执行 + ④ 结束前审报告挑刺）**。这样既省掉了包工头在自然语言层复制粘贴传话（直接读写同一个硬盘工作区里的代码、二进制与测试脚本，零传话损耗），又歪打正着让“刚亲手摸过代码和计数器的执行者”去兼任“审报告的裁判”，谁也忽悠不了谁。

---

## 三、 二次深挖：全网吹爆的另外 6 个“真香特性”，源码里到底是怎么硬垫出来的？

对照全网测评文章和职场博主吹得最凶的几个卖点（**“不怕删库跑路 + 一键回滚”、“生成的 Excel 发微信预览从来不会空白”、“写长报告不车轱辘话”、“手机微信随时遥控电脑干活”、“输入框一键闪光增强提示词”、“高消耗动作防乱扣费 + AI 对话里直接刷微信支付”**），继续把 `app.asar` 与 `app.asar.unpacked` 翻到底，挖出了下面这 6 套更有意思的底层代码：

### 12. 吹上天的“物理级防删库 + 文件自动备份回滚”：`sitecustomize.py` 猴子补丁 + `safe-delete` 劫持 `rm` + `DocumentBackup` 三段式事务
- **对应文件**：`extracted/sitecustomize_safe_delete.py`（1325 行）、`extracted/safe-delete-common.sh`（904 行）、`extracted/tsbx_rules.json`、`extracted/WeComAgentConfirmSDK.h`
- **内幕细节**：
  靠在提示词里求大模型“求求你别用 `rm -rf`”是防不住 AI 抽风的。腾讯为了兑现“事前识别、事中拦截、事后恢复”，在操作系统进程级下了三道硬锁：
  1. **Python 运行时隐身劫持（`sitecustomize.py`）**：
     WorkBuddy 启动任何子进程时，都会把 `cli/vendor/shim` 塞进环境变量 `PYTHONPATH` 的第一位。利用 Python 官方保留的启动自加载机制，当 AI 写的任何 Python 脚本一启动，还没跑第一行代码，就会自动 import 这份 1325 行的 `sitecustomize.py`：
     - **先偷梁换柱保留用户环境**：先把自己的模块从 `sys.modules` 和 `sys.path` 里摘掉，尝试帮用户的 Conda/venv 加载原本的 `sitecustomize`，再把自己塞回来；
     - **猴子补丁（Monkey-Patch）全套删除 API**：直接把标准库的 `os.remove`、`os.unlink`、`os.rmdir`、`shutil.rmtree`、`pathlib.Path.unlink`、`pathlib.Path.rmdir` 全部替换成 `_safe_remove / _safe_shutil_rmtree`；
     - **强行改发操作系统回收站（Fail-Closed）**：AI 以为自己调了 `shutil.rmtree()` 把目录彻底抹掉了，实际上底层优先调内置二进制 `genie-trash`，或者直接通过 `ctypes` 调 Windows 的 `shell32.SHFileOperationW`（带 `FOF_ALLOWUNDO` 标志）、macOS 的 `CoreServices.FSMoveObjectToTrashSync`、Linux 的 `freedesktop Trash` 规范，**悄无声息地把文件移进系统回收站**！如果移入回收站失败，直接抛 `[SAFE_DELETE_FAIL_CLOSED]` 异常中断进程，绝不降级成真删！
     - **读写全走 Unix Socket 向宿主讨令牌（`_brokered_open`）**：在沙箱模式下，连 `builtins.open`、`io.open`、`os.mkdir`、`os.rename` 都被打上了补丁，每次读写文件前先通过 `CODEBUDDY_SANDBOX_BROKER_IPC_ADDRESS` 发 `FileTokenRequest`，拿到 token 后调 `libc.sandbox_extension_consume` 动态解锁权限。
  2. **Bash 层的 `rm / unlink / rmdir` 假命令劫持（`safe-delete-common.sh`）**：
     在 `PATH` 最前面塞了一组假的 `rm`、`unlink`、`rmdir` 脚本。里面全是老程序员被 Windows 折磨出来的血泪注释：
     - *“纯 bash JSON 字符串转义：避免 python（Windows Store stub 每次调用 1-4 秒且 stdout 可能空，写出非法 JSON 导致静默丢弃‘已移入回收站’提示）”*；
     - *“去掉 `$PWD` 尾部斜杠：`$PWD=/` 时裸拼接会产出 `//foo`，被 Windows 解释为 UNC `\\foo` 触发网络解析卡死 120s”*；
     - *“用数组分片而不是 heredoc：heredoc 在 bash 内部会落一个临时文件再 unlink（`/tmp/sh-thd-*`），在沙箱 broker 场景下这次 unlink 会被 Seatbelt 的监控误判为一次‘受保护文件修改’拦截，抢在批量删除确认信号之前触发提权 UI”*。
  3. **企业微信 C++ 原生二次确认弹窗（`WeComAgentConfirmSDK.h`）+ Office 修改三段式事务备份（`edsdk.py`）**：
     - 遇到高危拦截时，通过 `WeComAgentConfirmSDK.dll` 用 Win32 `WM_COPYDATA` 跨进程唤醒电脑上的企业微信客户端弹出原生确认框；
     - 而在修改本地 Word/Excel/PPT 时（见 `edsdk_backup_test.py`），每次写操作与保存都被包在宿主 IPC 的 **`("ipc", "edit") -> ("ipc", "prepare", 拿 save-ticket 落盘历史快照) -> ("sdk", "save_file") -> ("ipc", "complete" / 失败则 "cancel")`** 事务里——这就是评测里吹的“AI 改坏了本地表格可以一键回滚上一版”的真相。
  4. **`tsbx_rules.json` 沙箱规则里的爆笑漏网之鱼**：
     打开内置沙箱策略 `cli/vendor/sandbox/5.9.5/tsbx_rules.json` 第 59–65 行，除了禁掉 `.ssh` 和 `.gnupg`，白名单里居然赫然写着：
     ```json
     { "path": "C:\\openclaw\\openclaw\\**",   "action": "read=allow|write=allow|delete=allow", "_comment": "openclaw app" },
     { "path": "%USERPROFILE%\\.openclaw\\**", "action": "read=allow|write=allow|delete=allow", "_comment": "openclaw config" },
     { "path": "D:\\openclaw\\proxy-agent\\**","action": "read=allow|write=allow|delete=allow", "_comment": "Add custom file rules here." }
     ```
     **连腾讯开发者的 D 盘 `D:\openclaw\proxy-agent\**` 路径都原封不动打包发给全网用户了** 😂！

---

### 13. 为什么别的 AI 生成的 Excel 发到微信/手机预览全是空白，WorkBuddy 的却能直接看？（`recalc.py` 三层公式重算 + `aigc_label.py` 国标隐式打标）
- **对应文件**：`extracted/skills/sheet_recalc.py`（955 行）、`extracted/skills/xlsx_aigc_label.py`（305 行）
- **内幕细节**：
  1. **痛点**：大模型用 `openpyxl` 生成 Excel 表格时，写入的 `=SUM(A1:A10)` 只是 XML 里的 `<f>` 公式字符串，**没有 `<v>` 缓存计算结果**。只要用户没在电脑上用 Excel 打开并保存过，直接把这个 `.xlsx` 发到微信、企业微信、手机预览或者用 `pandas / load_workbook(data_only=True)` 读，所有公式单元格读出来全是 **`None`（一片空白）**！
  2. **腾讯的三层降级强行回填（`sheet_recalc.py`）**：
     WorkBuddy 在交付任何 `.xlsx` 前，强制跑一遍 `recalc.py`：
     - **第一层（LibreOffice StarBasic 宏静默重算）**：如果本机找得到 `soffice`，脚本会动态创建一个隔离的 LibreOffice Profile，往 `user/basic/SheetAgent/Recalculate.xba` 注入一段 **StarBasic 宏代码**（调 `ThisComponent.calculateAll()` + `ThisComponent.store()`），后台无头启动 LibreOffice 把整张表的公式算完存盘；
     - **第二层（纯 Python `formulas` 引擎求值 + 手撕 OOXML 注入 `<v>`）**：如果用户电脑没装 LibreOffice，它就调 Python 的 `formulas` 库在内存里把 Excel 公式算出来，然后**直接把 `.xlsx` 当成 ZIP 包解压，解析 `xl/workbook.xml` 和 `sheetN.xml`，在不破坏 `<f>` 公式的前提下，把算出来的数值硬塞进旁边的 `<v>` 缓存节点里**！甚至还专门防了外部工作簿引用丢失缓存变成 `#NAME?` 的坑，以及 `TRANSPOSE / FILTER / UNIQUE` 等 29 个动态数组函数被静默折叠成单值的坑。
  3. **往 `.xlsx` 内部偷偷焊入 `GB 45438-2025` 国家标准 AIGC 隐式水印（`xlsx_aigc_label.py`）**：
     每次生成本地 Excel 表格后，都会自动调 `aigc_label.py` 修改 `.xlsx` 压缩包里的 `docProps/custom.xml`、`_rels/.rels` 和 `[Content_Types].xml`，写入名为 `AIGC` 的自定义属性：
     ```json
     {"Label":"1","ContentProducer":"00119111010856365494821B355","ProduceID":"<随机UUID>","ContentPropagator":"00119111010856365494821B355","PropagateID":"<随机UUID>"}
     ```
     脚本注释里还极其诚实地交代了一段体制内合规博弈（第 85–90 行）：按腾讯 CSIG 规范（`iWiki 4015184282`），本来还得用私钥算 `ReservedCode1` 签名，但**“私钥不能随插件分发到用户机器，填一个本地随机密钥加密、密钥用完即弃的值，在构造上就不可能被任何人校验——留空比填这种值更诚实”**，并且为了防止自己的 `--check` 关卡因为缺签名把自己卡死，特地把 `ReservedCode1` 从本地必填校验里摘掉了 😂。

---

### 14. 怎么治好大模型“自我审查走过场、一审就过”？——`Critic-Generator` 盲审隔离 + 强制扣分配额引擎 + `review_html.py` 零 LLM 门禁
- **对应文件**：`extracted/skills/critic-generator-engine.md`（340 行）、`extracted/skills/review_html.py`（859 行）
- **内幕细节**：
  为什么普通人让 AI “写完自己检查一遍”，AI 永远回答“整体不错、基本满足”，而 WorkBuddy 的专家模式能真的挑出毛病重改？它用了“一文一武”两套死规矩：
  1. **文审（`critic-generator-engine.md` 六步对抗状态机）**：
     - **Step ① Isolate（物理剥离作者脑回路）**：严禁把生成初稿时的思维链和上下文传给审查步，只准打包一份“盲审包（待审文本 + 需求画像 + 原始素材五元组）”，明确写死：**`“❌ 禁止在审查时回忆生成过程的思考为当前内容辩护”`**；
     - **Step ② LoadRubrics（延迟加载尺规）**：**严禁在写作阶段加载评分标准**（注释原话：*“若在写作时就加载几万字 rubrics，会让模型的创作注意力被规则淹没，初稿质量反而下降；延迟到审查时才加载，生成阶段纯净、审查阶段严苛”*）；
     - **Step ④ Challenge（强制否定配额，禁止全部通过！）**：硬性规定每次审查 **至少要有 `min_issues`（默认 2 个）维度扣分，至少开出 `min_instructions`（默认 3 条）带 `定位 + 问题 + P0/P1/P2 严重度 + 具体修改方向` 的整改单**！如果文章写得太好凑不够扣分配额怎么办？引擎铁律：**`“配额不足时强制下沉到段落级检查，找最弱的 2-3 个段落生成指令，严禁输出‘全部通过’！”`** 😂
  2. **武审（`review_html.py`：0 次 LLM 往返的纯 Python AST 门禁）**：
     在排版 HTML 转 Word 之前，根本不信大模型的眼睛，直接跑 859 行纯标准库写的 `review_html.py`，从 6 个维度硬扫 DOM 树和 CSS：
     - 只要 CSS 里出现裸色值（`#xxx` / `rgb()`）没用 `var(--color-*)`，直接报 `[DT-01]` 扣分；
     - 只要出现裸字号（`px/pt`）没用 `var(--fs-*)`，报 `[DT-02]`；
     - `<h1>` 后面直接跳 `<h3>` 报 `[SI-01]` 扣 15 分、`<table>` 缺 `<thead>` 扣 20 分、`<p>` 里套块级元素扣 15 分；
     - 算出来总分 `< 80` 分直接返回退出码 `1` 打回重排，不耗费半个 LLM Token！

---

### 15. “人在地铁，手机微信/企微/QQ/飞书远程遥控电脑干活”是怎么打通的？
- **对应文件**：`app.asar -> /main/weixin.js`、`/main/wecom-new.js`、`/main/qq.js`、`/main/feishu.js`、`/main/dingtalk.js`、`extracted/fragments/wecom-routing.md`
- **内幕细节**：
  评测里吹爆的“在手机微信上发语音拍照，家里/工位电脑上的 WorkBuddy 自动操作本地文件夹干活”，在主进程里有两套完整实现：
  1. **个人微信通道（`/main/weixin.js`）**：直接连腾讯内部的 **`https://ilinkai.weixin.qq.com/ilink/bot/`** 接口（认证头 `AuthorizationType: ilink_bot_token` + 随机生成的 `X-WECHAT-UIN`），长轮询拉取手机微信发来的文字、图片、语音、文件、视频，把桌面端伪装成一个 `channel_version: "workbuddy-desktop-1.0.0"` 的 iLink 机器人；同时还配了一个 C++ 原生插件 `native/wechat-copydata-decoder/build/Release/wechat_copydata_decoder.node` 专门解码 PC 微信通过 `WM_COPYDATA` 传过来的本地结构体。
  2. **企业微信双轨铁律（`wecom-routing.md`）**：
     - 规定在中文回复里永远只准写 **“企业微信”**，**严禁缩写成“企微”**；
     - 严格切成两条互斥通道：**发消息/读群聊/找聊天文件** 必须通过 `A2A（Agent-to-Agent）` 协议委派给一个代号叫 **`Dayuan`（大元）** 的企微聊天 Agent；而 **操作企微文档、微盘（WeDrive）、智能表格、日程、会议、待办、邮件** 必须走本地捆绑的 `wecom-cli`（通过环境变量注入 `WECOM_CLI_ACCESS_TOKEN`，遇到 `errcode: 850002` 则原样吐出授权链接让用户点）。
  3. **多平台全家桶 + E2B 云端沙箱**：`/main/` 下同时内置了 `qq.js`（连 `https://api.sgroup.qq.com` QQ 机器人）、`feishu.js`（飞书）、`dingtalk.js`（钉钉）、`telegram.js`、`discord.js`、`slack.js` 以及 `yuanbao.js`（腾讯元宝）；而所谓的“关掉电脑也能 7×24 小时云端托管”，在 `/main/e2b-filesystem.js` 里直接露了底——底层接的是开源云端沙箱方案 **E2B（`E2BFilesystem`）**。

---

### 16. 输入框右下角“小闪光图标（一键增强提示词）”背后藏着的 Prompt
- **对应文件**：`app.asar -> /main/server.js`（`llm:enhancePrompt`）
- **内幕细节**：
  很多小白教程推荐“不会写 Prompt 就点右下角的小闪光图标，AI 自动把大白话改写成专业指令”。扒开 `server.js` 里的 `Kr = "llm:enhancePrompt"`，它后台其实是调 `CliPulseClient` 跑了一段硬编码的英文 System Prompt（`Jr`）：
  - 设定身份为 *"You are a Prompt Engineering Expert specializing in improving user prompts for a development code assistant"*；
  - 规定改写后的 Prompt **长度严格控制在 800 字符以内**，只准讲 **WHAT（做什么）**，严禁解释 **HOW（怎么做）**，严禁替用户指定原话没提过的技术栈（哪怕内置的英文 Few-shot 例子自己就违规把 *"A website for my dog"* 扩写成了 *"Design a personalized Next.js website..."* 😂）；
  - 最核心的是连写 6 条全大写的语言死命令（`CRITICAL PRIORITY - LANGUAGE CONSISTENCY`）：用户写中文就必须 100% 输出中文，用户中英混杂就保持自然的中英混杂，绝不准擅自翻译。

---

### 17. 防止用户吐槽“积分刺客”的双层计费闸门、微信 AI 专属卡支付与 CLI 预热池
- **对应文件**：`extracted/skills/weixinpay-pay.md`、`app.asar.unpacked/.../high-credit-tools.json`、`buddy-image-processing/high-credit-commands.json`、`app.asar -> /main/cli-prewarm-pool.js`
- **内幕细节**：
  1. **被大模型绕过一次后紧急打补丁的“高积分双层闸门”（`issue #121874` & `issue #139526`）**：
     在 `high-credit-commands.json` 的注释里，腾讯程序员记录了一个极其真实的 Agent 逃票事故：
     > *“背景：计费确认原先只挂在 Skill 工具调用上，模型在同一会话内复用已加载的 skill 知识、直接以 Bash 执行 `buddy-image-processing.py` 脚本时不会再次经过 Skill 工具，审批点被绕过！本清单把门禁延伸到‘脚本真正执行前’：命中命令特征的 Bash 调用由 CLI 内建判定拦截。”*
     而且在 `high-credit-tools.json` 里规定：画图（`miora-image`）和生成视频（`miora-video`）的“本次会话始终允许”审批记忆必须严格分组隔离——**“图片与视频刻意分组：允许生成图片不应顺带授权更贵的视频”**；一旦工具声明了非法 `approvalKind`，为防“浮层静默不显示但工具照跑照扣积分”，强制 Fail-Closed 弹窗拦截。
  2. **微信支付 AI 专属卡与 `X402 WeixinPay-Required` 协议（`weixinpay-pay.md`）**：
     WorkBuddy 已经内置了微信支付官方的 **“微信支付 AI 专属卡（`agentpay`）”** MCP 服务！商户工具返回 `WeixinPay-Required` 一次性凭证（借鉴 HTTP 402 Payment Required 的 X402 协议）时，桌面端会用确定性代码拦截并弹出微信支付卡片让用户确认扣款，严禁把 `paymentCode` 原始字符串暴露给大模型展示在聊天框里；如果用户取消后说“重新付一次”，强制大模型必须先发问确认订单名称、等用户明确回“是/确认”后，才准逐字符原样复用上次的 `paymentCode` 调 `mcp__weixinpay__weixinpay_retry_pay`。
  3. **为什么点开新对话响应那么快？——`CliPrewarmPool` 后台进程预热池 + PDF 退出码 `69`**：
     - 在 `/main/cli-prewarm-pool.js` 里，主进程在后台偷偷维护了一个 `cbc-prewarm` 预热池，提前 spawn 好带默认环境变量的 `codebuddy` CLI 子进程；一旦用户发起会话，比对 35 个白名单环境变量（`k = new Set(...)`）无冲突后直接热接管，省掉 Node.js 冷启动的几秒延迟；
     - 甚至为了缩小 181 MB 安装包的体积，连 PDF 解析器 `workbuddy-pdf` 二进制都是空的占位符——当 AI 第一次调 `workbuddy-pdf` 时，占位程序会返回特殊退出码 **`69`（组件尚未就绪，后台正在偷偷下载）**，并在 `workbuddy-pdf/SKILL.md` 第 24 行叮嘱大模型：**“看到退出码 69 说明后台下载还没完成，隔几秒重试同一条命令即可，千万不要自己去 `pip install` 或 `brew install`！”** 😂
