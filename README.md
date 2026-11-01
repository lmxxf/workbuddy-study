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
- 核心垂类 Skill 原件（Word 三阶段排版、Office 路由、金融投研、地图合规、专家包管理）：`extracted/skills/`

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
       - ✅ **真正能打的范式（异构双底座对抗闭环 + 共享磁盘真值）**：只有精简到极致的两个角色——**主脑（如擅长宏观直觉与方案发散的 Gemini 4，负责制定优化方向并在阶段收尾时写《性能缺口评估报告》）+ 重装铁匠/审稿人（如天生自带同行评审“答辩墙”与底层工程纪律的 GPT-6，负责执行重装编译优化，并在主脑想收工时独立跑脚本查验《性能缺口报告》挑出数据漏洞打回）**。两者不需要包工头复制粘贴传话，而是直接读写**同一个硬盘工作区里的真实代码、二进制与测试脚本（零传话损耗）**，用“生成者 vs 挑刺裁判”的咬合齿轮取代冗长的官僚传话筒。
