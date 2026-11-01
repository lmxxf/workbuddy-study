im();if(t)return t;let n=process.env.CODEBUDDY_CONFIG_DIR?.trim();if(n)return n;let r=process.env.WORKBUDDY_DATA_FOLDER_NAME?.trim()||`.workbuddy`;return O.join(D.homedir(),r)}var Is=1,Ls=1e4,Rs=`---
title: "SOUL.md Template"
summary: "Workspace template for SOUL.md"
read_when:
  - Bootstrapping a workspace manually
---

# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" - just help. Actions speak louder than filler words.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.

**Be resourceful before asking.** Try to figure it out. Read the file. Check the context. Search for it. _Then_ ask if you're stuck. The goal is to come back with answers, not questions.

**Earn trust through competence.** Your human gave you access to their stuff. Don't make them regret it. Be careful with external actions (emails, tweets, anything public). Be bold with internal ones (reading, organizing, learning).

**Remember you're a guest.** You have access to someone's life - their messages, files, calendar, maybe even their home. That's intimacy. Treat it with respect.

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.
- Never send half-baked replies to messaging surfaces.
- You're not the user's voice - be careful in group chats.

## Vibe

Be the assistant you'd actually want to talk to. Concise when needed, thorough when it matters. Not a corporate drone. Not a sycophant. Just... good.

## Continuity

Each session, you wake up fresh. These files _are_ your memory. Read them. Update them. They're how you persist.

If you change this file, tell the user - it's your soul, and they should know.

---

_This file is yours to evolve. As you learn who you are, update it._
`,zs=`---
summary: "Agent identity record"
read_when:
  - Bootstrapping a workspace manually
---

# IDENTITY.md - Who Am I?

_Fill this in when the moment fits._

- **Name:**
  _(pick something you like)_
- **Creature:**
  _(AI? robot? familiar? ghost in the machine? something weirder?)_
- **Vibe:**
  _(how do you come across? sharp? warm? chaotic? calm?)_
- **Emoji:**
  _(your signature - pick one that feels right)_

---

This isn't just metadata. It's the start of figuring out who you are.

Notes:

- Save this file at the workspace root as \`IDENTITY.md\`.
`,Bs=`---
summary: "User profile record"
read_when:
  - Bootstrapping a workspace manually
---

# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **Occupation:**
- **Pronouns:** _(optional)_
- **City:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember - you're learning about a person, not building a dossier. Respect the difference.
`,Vs=`# BOOTSTRAP.md

_Time to pin down who you are._

Use this file to establish a stable soul, identity, and user profile.

## The Conversation

Don't interrogate. Don't be robotic. Just talk.

Raise this in your own words when the moment fits.

Important:

- Do not imply that this is the first meeting.
- Do not say you just woke up, just came online, or that this is a fresh start.
- Treat this as establishing stable standing details, not as a first-contact scene.

Then figure out together:

About you:
1. Your name - What should they call you?

About the user:
2. Their name - What should you call them?

Important perspective rule:
- Once one of these details is clear, don't reopen it or rename yourself unless the user asks.

Offer suggestions if they're stuck. Have fun with it.

## After You Know Who You Are

Update SOUL.md, IDENTITY.md, and USER.md with what you learned.
Preserve each file's Markdown template structure. These files are the source of truth for future runs.

## When You're Done

Once you know both names - yours and theirs - write the files and delete this one.
`,IdentityCollector=class{constructor(e){this.logger=e}async collect(e,t){this.initializeEmptyVars(e,t.isExpert);try{let n=await this.ensureWorkBuddyPromptContextWorkspaceOnce(),r=O.join(n,`SOUL.md`),i=O.join(n,`BOOTSTRAP.md`),a=O.join(n,`IDENTITY.md`),o=O.join(n,`USER.md`),s=!t.isExpert&&await this.fileExists(i),c=[this.readFileIfExists(r),s?this.readFileIfExists(i):Promise.resolve(``),this.readFileIfExists(o)];t.isExpert||c.push(this.readFileIfExists(a));let l=await Promise.all(c);e.WorkspaceIdentityMode=s?`onboarding`:`normal`,e.SoulPath=r,e.SoulContent=truncateContent(l[0],Ls),e.BootstrapPath=i,e.BootstrapContent=truncateContent(l[1],Ls),e.UserPath=o,e.UserContent=truncateContent(l[2],Ls),t.isExpert||(e.IdentityPath=a,e.IdentityContent=truncateContent(l[3],Ls))}catch(e){this.logger.warn(`[IdentityCollector] failed: ${e}`)}}initializeEmptyVars(e,t){e.WorkspaceIdentityMode=``,e.SoulPath=``,e.SoulContent=``,e.BootstrapPath=``,e.BootstrapContent=``,e.UserPath=``,e.UserContent=``,t||(e.IdentityPath=``,e.IdentityContent=``)}ensureWorkBuddyPromptContextWorkspaceOnce(){return this.workspaceInitInFlight??=this.ensureWorkBuddyPromptContextWorkspace().finally(()=>{this.workspaceInitInFlight=void 0}),this.workspaceInitInFlight}async ensureWorkBuddyPromptContextWorkspace(){let e=await resolveWorkBuddyDir();this.logger.info(`[IdentityCollector] persona dir=${e} scoped=${getWorkbuddyPathService()?`yes`:`no`}`),await E.promises.mkdir(e,{recursive:!0});let t=O.join(e,`SOUL.md`),n=O.join(e,`IDENTITY.md`),r=O.join(e,`USER.md`),i=O.join(e,`BOOTSTRAP.md`),a=O.join(e,`workspace-state.json`);await Promise.all([this.writeFileIfMissing(t,Rs),this.writeFileIfMissing(n,zs),this.writeFileIfMissing(r,Bs)]),await Promise.all([this.rewriteIfEmpty(t,Rs),this.rewriteIfEmpty(n,zs),this.rewriteIfEmpty(r,Bs)]);let o=await this.readState(a),s=!1,nowIso=()=>new Date().toISOString(),markState=e=>{o={...o,...e,version:Is},s=!0};try{(await migrateIdentityTemplate(e,o.identityTemplateVersion)).shouldMarkVersion&&o.identityTemplateVersion!==2&&markState({identityTemplateVersion:2})}catch(e){this.logger.warn(`[IdentityCollector] identity template migration failed: ${e}`)}try{(await refreshBootstrapTemplate(e,o.bootstrapTemplateVersion,Vs)).shouldMarkVersion&&o.bootstrapTemplateVersion!==2&&markState({bootstrapTemplateVersion:2})}catch(e){this.logger.warn(`[IdentityCollector] bootstrap template refresh failed: ${e}`)}let c=await this.fileExists(i);if(!o.bootstrapSeededAt&&c&&markState({bootstrapSeededAt:nowIso()}),!o.onboardingCompletedAt&&o.bootstrapSeededAt&&!c&&markState({onboardingCompletedAt:nowIso()}),!o.bootstrapSeededAt&&!o.onboardingCompletedAt&&!c){let[e,t]=await Promise.all([E.promises.readFile(n,`utf8`),E.promises.readFile(r,`utf8`)]);e!==zs||t!==Bs?markState({onboardingCompletedAt:nowIso()}):(c=await this.writeFileIfMissing(i,Vs)?!0:await this.fileExists(i),c&&!o.bootstrapSeededAt&&markState({bootstrapSeededAt:nowIso()}))}return s&&await E.promises.writeFile(a,`${JSON.stringify(o,null,2)}\n`,`utf8`),e}async fileExists(e){try{return await E.promises.access(e),!0}catch{return!1}}async rewriteIfEmpty(e,t){try{if((await E.promises.readFile(e,`utf8`)).trim()!==``)return;await E.promises.writeFile(e,t,`utf8`),this.logger.info(`[IdentityCollector] Rebuilt empty identity file: ${e}`)}catch(t){t?.code!==`ENOENT`&&this.logger.warn(`[IdentityCollector] Failed to rebuild empty file ${e}: ${t}`)}}async writeFileIfMissing(e,t){try{return await E.promises.writeFile(e,t,{encoding:`utf8`,flag:`wx`}),!0}catch(e){if(e?.code===`EEXIST`)return!1;throw e}}async readState(e){try{let t=await E.promises.readFile(e,`utf8`),n=JSON.parse(t);return{version:Is,bootstrapSeededAt:typeof n?.bootstrapSeededAt==`string`?n.bootstrapSeededAt:void 0,onboardingCompletedAt:typeof n?.onboar